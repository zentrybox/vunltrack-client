'use client';

import { useEffect, useMemo, useState, type ComponentProps } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useIncidents } from "@/hooks/useIncidents";
import { useScans } from "@/hooks/useScans";
import type { IncidentStatus, ScanDetailResponse, UpdateIncidentPayload } from "@/lib/types";
import { cn, formatDateLabel } from "@/lib/utils";

const statusTone: Record<IncidentStatus, ComponentProps<typeof StatusBadge>["tone"]> = {
  open: "critical",
  in_progress: "warning",
  escalated: "warning",
  resolved: "safe",
  closed: "neutral",
  false_positive: "neutral",
};

const scanStatusTone: Record<string, ComponentProps<typeof StatusBadge>["tone"]> = {
  running: "info",
  completed: "safe",
  failed: "critical",
  cancelled: "neutral",
};

const statusOrder: IncidentStatus[] = [
  "open",
  "in_progress",
  "escalated",
  "resolved",
  "closed",
  "false_positive",
];

const statusLabel = (status: string) =>
  status
    .replace(/_/g, " ")
    .replace(/(^|\s)(\w)/g, (_, space, letter: string) => `${space}${letter.toUpperCase()}`);

export default function IncidentsPage() {
  const { incidents, loading, error, mutating, updateIncident, getHistory } = useIncidents();
  const { getScanDetail } = useScans();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getHistory>>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<IncidentStatus>("open");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [scanDetail, setScanDetail] = useState<ScanDetailResponse | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const sortedIncidents = useMemo(
    () =>
      incidents
        .slice()
        .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)),
    [incidents],
  );

  const selectedIncident = useMemo(
    () => sortedIncidents.find((incident) => incident.id === selectedId) ?? null,
    [sortedIncidents, selectedId],
  );

  useEffect(() => {
    if (selectedIncident) {
      const normalizedStatus = (selectedIncident.status as string).toLowerCase() as IncidentStatus;
      setStatus(normalizedStatus);
      setAssignee(selectedIncident.assignedTo ?? null);
      setComment("");
      setHistoryLoading(true);
      setHistoryError(null);
      void getHistory(selectedIncident.id)
        .then((entries) => setHistory(entries))
        .catch((err) => {
          setHistory([]);
          setHistoryError(err instanceof Error ? err.message : "Failed to load history");
        })
        .finally(() => setHistoryLoading(false));

      // Fetch scan details
      setScanLoading(true);
      setScanError(null);
      void getScanDetail(selectedIncident.scanId)
        .then((detail) => setScanDetail(detail))
        .catch((err) => {
          setScanDetail(null);
          setScanError(err instanceof Error ? err.message : "Failed to load scan details");
        })
        .finally(() => setScanLoading(false));
    } else {
      setHistory([]);
      setScanDetail(null);
    }
  }, [selectedIncident, getHistory, getScanDetail]);  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedIncident) return;

    const payload: UpdateIncidentPayload = {};
    if (status !== selectedIncident.status) {
      payload.status = status;
    }
    if ((assignee ?? null) !== (selectedIncident.assignedTo ?? null)) {
      payload.assignedTo = assignee ?? null;
    }
    if (comment.trim().length > 0) {
      payload.comment = comment.trim();
    }

    if (Object.keys(payload).length === 0) {
      setFormMessage("No changes to submit.");
      return;
    }

    setFormMessage(null);
    try {
      const updated = await updateIncident(selectedIncident.id, payload);
      setFormMessage(`Incident updated (${updated.status}).`);
      setComment("");
  setStatus((updated.status as string).toLowerCase() as IncidentStatus);
      setAssignee(updated.assignedTo ?? null);
      setHistoryLoading(true);
      setHistoryError(null);
      void getHistory(selectedIncident.id)
        .then((entries) => setHistory(entries))
        .catch((err) => {
          setHistory([]);
          setHistoryError(err instanceof Error ? err.message : "Failed to load history");
        })
        .finally(() => setHistoryLoading(false));
    } catch (err) {
      setFormMessage(err instanceof Error ? err.message : "Failed to update incident");
    }
  };

  return (
    <div className="space-y-8">
      <CoalCard
        title="Incident queue"
        subtitle="Prioritised vulnerabilities requiring action"
      >
        {error ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <CoalTable
          data={sortedIncidents}
          isLoading={loading}
          columns={[
            {
              key: "scanId",
              header: "Scan",
              render: (incident) => (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{incident.scanId}</p>
                  <p className="text-xs text-gray-500">Device {incident.deviceId}</p>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (incident) => (
                <StatusBadge
                  tone={
                    statusTone[(incident.status as string).toLowerCase() as IncidentStatus] ??
                    "neutral"
                  }
                >
                  {statusLabel(incident.status)}
                </StatusBadge>
              ),
            },
            {
              key: "assignedTo",
              header: "Owner",
              render: (incident) => (
                <span className="text-xs text-gray-700">
                  {incident.assignedTo ?? "Unassigned"}
                </span>
              ),
            },
            {
              key: "updatedAt",
              header: "Updated",
              render: (incident) => (
                <span className="text-xs text-gray-500">
                  {formatDateLabel(incident.updatedAt)}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (incident) => (
                <CoalButton
                  variant="secondary"
                  size="sm"
                  className={cn(
                    "min-w-[96px]",
                    selectedIncident?.id === incident.id && "border-blue-500 text-blue-600",
                  )}
                  onClick={() => setSelectedId(incident.id)}
                >
                  Review
                </CoalButton>
              ),
            },
          ]}
          emptyState="No incidents detected. You're in the clear."
        />
      </CoalCard>

      <CoalCard
        title="Incident detail"
        subtitle={selectedIncident ? `Review incident triggered by scan ${selectedIncident.scanId}` : "Select an incident to view details"}
      >
        {selectedIncident ? (
          <div className="space-y-8">
            {/* Incident Overview */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Incident Details
                </p>
                <dl className="mt-3 space-y-2 text-sm text-gray-700">
                  <div>
                    <dt className="font-semibold text-gray-900">ID</dt>
                    <dd>{selectedIncident.id}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-900">Status</dt>
                    <dd>
                      <StatusBadge tone={statusTone[selectedIncident.status] ?? "neutral"}>
                        {statusLabel(selectedIncident.status)}
                      </StatusBadge>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-900">Assigned To</dt>
                    <dd>{selectedIncident.assignedTo ?? "Unassigned"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-900">Created</dt>
                    <dd>{formatDateLabel(selectedIncident.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-900">Last Updated</dt>
                    <dd>{formatDateLabel(selectedIncident.updatedAt)}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Scan Information
                </p>
                {scanLoading ? (
                  <p className="mt-3 text-sm text-gray-500">Loading scan details…</p>
                ) : scanError ? (
                  <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {scanError}
                  </p>
                ) : scanDetail ? (
                  <dl className="mt-3 space-y-2 text-sm text-gray-700">
                    <div>
                      <dt className="font-semibold text-gray-900">Scan ID</dt>
                      <dd>{scanDetail.scan.id}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-900">Type</dt>
                      <dd>{scanDetail.scan.type}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-900">Status</dt>
                      <dd>
                        <StatusBadge tone={scanStatusTone[scanDetail.scan.status] ?? "neutral"}>
                          {scanDetail.scan.status}
                        </StatusBadge>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-900">Started</dt>
                      <dd>{formatDateLabel(scanDetail.scan.startedAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-900">Devices Scanned</dt>
                      <dd>{scanDetail.scan.totalDevices}</dd>
                    </div>
                  </dl>
                ) : null}
              </div>

              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Device Information
                </p>
                <dl className="mt-3 space-y-2 text-sm text-gray-700">
                  <div>
                    <dt className="font-semibold text-gray-900">Device ID</dt>
                    <dd>{selectedIncident.deviceId}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-900">Tenant ID</dt>
                    <dd>{selectedIncident.tenantId ?? "—"}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* CVEs Found */}
            {scanDetail && (
              <CoalCard title="Vulnerabilities Detected" subtitle="CVEs found during the scan">
                {(() => {
                  const deviceResult = scanDetail.results.find(r => r.deviceId === selectedIncident.deviceId);
                  if (!deviceResult) {
                    return <p className="text-sm text-gray-500">No scan results found for this device.</p>;
                  }
                  if (deviceResult.cves.length === 0) {
                    return <p className="text-sm text-gray-500">No CVEs detected for this device.</p>;
                  }
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-700">
                          {deviceResult.cveCount} CVE{deviceResult.cveCount !== 1 ? 's' : ''} found
                        </p>
                        <StatusBadge tone="critical">
                          High Priority
                        </StatusBadge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {deviceResult.cves.map((cve) => (
                          <div key={cve} className="rounded-md border border-red-200 bg-red-50 p-3">
                            <p className="font-semibold text-red-900">{cve}</p>
                            <CoalButton
                              variant="secondary"
                              size="sm"
                              className="mt-2"
                              onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${cve}`, '_blank')}
                            >
                              View Details
                            </CoalButton>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CoalCard>
            )}

            {/* Update Form */}
            <CoalCard title="Update Incident" subtitle="Modify status, assignment, and add comments">
              <form className="space-y-5" onSubmit={handleUpdate}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as IncidentStatus)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {statusOrder.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusLabel(statusOption)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Assignee
                    </label>
                    <input
                      type="text"
                      value={assignee ?? ""}
                      onChange={(event) => setAssignee(event.target.value || null)}
                      placeholder="Add owner (optional)"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Comment
                  </label>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={4}
                    placeholder="Document mitigation steps"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                {formMessage ? (
                  <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {formMessage}
                  </p>
                ) : null}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Last updated {formatDateLabel(selectedIncident.updatedAt)}
                  </p>
                  <CoalButton type="submit" isLoading={mutating}>
                    Apply changes
                  </CoalButton>
                </div>
              </form>
            </CoalCard>

            {/* Timeline */}
            <CoalCard title="Incident Timeline" subtitle="History of status changes and comments">
              {historyLoading ? (
                <p className="text-sm text-gray-500">Loading history…</p>
              ) : historyError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {historyError}
                </p>
              ) : history.length === 0 ? (
                <p className="text-sm text-gray-500">No history yet.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((entry) => (
                    <li key={entry.id} className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            Status: {statusLabel(entry.fromStatus || 'N/A')} → {statusLabel(entry.toStatus)}
                          </p>
                          <p className="text-sm text-gray-500">{formatDateLabel(entry.timestamp)}</p>
                          {entry.comment && (
                            <p className="mt-2 text-gray-700">{entry.comment}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CoalCard>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Choose an incident from the queue above to triage and track remediation progress.
          </p>
        )}
      </CoalCard>
    </div>
  );
}
