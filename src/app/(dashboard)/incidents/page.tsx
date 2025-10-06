'use client';

import { useEffect, useMemo, useState, type ComponentProps } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useIncidents } from "@/hooks/useIncidents";
import type { IncidentStatus, UpdateIncidentPayload } from "@/lib/types";
import { cn, formatDateLabel } from "@/lib/utils";

const statusTone: Record<IncidentStatus, ComponentProps<typeof StatusBadge>["tone"]> = {
  OPEN: "critical",
  INVESTIGATING: "warning",
  CONTAINED: "info",
  RESOLVED: "safe",
  DISMISSED: "neutral",
};

const statusOrder: IncidentStatus[] = [
  "OPEN",
  "INVESTIGATING",
  "CONTAINED",
  "RESOLVED",
  "DISMISSED",
];

const statusLabel = (status: string) =>
  status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/(^|\s)(\w)/g, (_, space, letter: string) => `${space}${letter.toUpperCase()}`);

export default function IncidentsPage() {
  const { incidents, loading, error, mutating, updateIncident, getHistory } = useIncidents();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getHistory>>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<IncidentStatus>("OPEN");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

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
      const normalizedStatus = (selectedIncident.status as string).toUpperCase() as IncidentStatus;
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
    } else {
      setHistory([]);
    }
  }, [selectedIncident, getHistory]);

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
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
  setStatus((updated.status as string).toUpperCase() as IncidentStatus);
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
              key: "cveId",
              header: "CVE",
              render: (incident) => (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{incident.cveId}</p>
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
                    statusTone[(incident.status as string).toUpperCase() as IncidentStatus] ??
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
        subtitle={selectedIncident ? `Inspect and remediate CVE ${selectedIncident.cveId}` : "Select an incident to view details"}
      >
        {selectedIncident ? (
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
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
            <div className="space-y-4">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Overview
                </p>
                <dl className="mt-3 space-y-2 text-sm text-gray-700">
                  <div>
                    <dt className="font-semibold text-gray-900">Scan</dt>
                    <dd>{selectedIncident.scanId}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-900">Device</dt>
                    <dd>{selectedIncident.deviceId}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-gray-900">Tenant</dt>
                    <dd>{selectedIncident.tenantId ?? "—"}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-md border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Timeline
                </p>
                {historyLoading ? (
                  <p className="mt-3 text-sm text-gray-500">Loading history…</p>
                ) : historyError ? (
                  <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {historyError}
                  </p>
                ) : history.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">No history yet.</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-xs text-gray-600">
                    {history.map((entry) => (
                      <li key={entry.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="font-semibold text-gray-900">
                          {statusLabel(entry.fromStatus)} → {statusLabel(entry.toStatus)}
                        </p>
                        <p className="text-gray-500">{formatDateLabel(entry.timestamp)}</p>
                        {entry.comment ? (
                          <p className="mt-1 text-gray-600">{entry.comment}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
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
