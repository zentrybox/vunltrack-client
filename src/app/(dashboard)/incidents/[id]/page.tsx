'use client';

import { useEffect, useState, type ComponentProps } from "react";
import { useParams, useRouter } from "next/navigation";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useDevices } from "@/hooks/useDevices";
import { useIncidents } from "@/hooks/useIncidents";
import { useScans } from "@/hooks/useScans";
import type { DeviceDetail, IncidentRecord, IncidentStatus, ScanDetailResponse, UpdateIncidentPayload } from "@/lib/types";
import { formatDateLabel } from "@/lib/utils";

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

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id as string;

  const { incidents, loading: incidentsLoading, error: incidentsError, mutating, updateIncident, getHistory } = useIncidents();
  const { getScanDetail } = useScans();
  const { getDeviceDetail } = useDevices();

  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [scanDetail, setScanDetail] = useState<ScanDetailResponse | null>(null);
  const [deviceDetail, setDeviceDetail] = useState<DeviceDetail | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getHistory>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<IncidentStatus>("open");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Find the incident
        const foundIncident = incidents.find(i => i.id === incidentId);
        if (!foundIncident) {
          throw new Error("Incident not found");
        }
        setIncident(foundIncident);

        // Load scan details
        const scanData = await getScanDetail(foundIncident.scanId);
        setScanDetail(scanData);

        // Load device details
        const deviceData = await getDeviceDetail(foundIncident.deviceId);
        setDeviceDetail(deviceData);

        // Load history
        const historyData = await getHistory(foundIncident.id);
        setHistory(historyData);

        // Set form values
        setStatus((foundIncident.status as string).toLowerCase() as IncidentStatus);
        setAssignee(foundIncident.assignedTo ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load incident details");
      } finally {
        setLoading(false);
      }
    };

    if (incidents.length > 0 && incidentId) {
      void loadData();
    }
  }, [incidents, incidentId, getScanDetail, getDeviceDetail, getHistory]);

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!incident) return;

    const payload: UpdateIncidentPayload = {};
    if (status !== incident.status) {
      payload.status = status;
    }
    if ((assignee ?? null) !== (incident.assignedTo ?? null)) {
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
      const updated = await updateIncident(incident.id, payload);
      setIncident(updated);
      setFormMessage(`Incident updated (${updated.status}).`);
      setComment("");

      // Reload history
      const historyData = await getHistory(incident.id);
      setHistory(historyData);
    } catch (err) {
      setFormMessage(err instanceof Error ? err.message : "Failed to update incident");
    }
  };

  if (incidentsLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-gray-500">Loading incident details…</p>
      </div>
    );
  }

  if (error || incidentsError || !incident) {
    return (
      <div className="space-y-4">
        <CoalButton variant="secondary" onClick={() => router.back()}>
          ← Back to Incidents
        </CoalButton>
        <CoalCard title="Error">
          <p className="text-sm text-red-700">{error || incidentsError || "Incident not found"}</p>
        </CoalCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <CoalButton variant="secondary" onClick={() => router.push("/incidents")}>
          ← Back to Incidents
        </CoalButton>
        <h1 className="text-2xl font-bold text-gray-900">Incident {incident.id}</h1>
      </div>

      {/* Incident Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <CoalCard title="Incident Details">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-gray-900">ID</dt>
              <dd className="text-gray-700">{incident.id}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Status</dt>
              <dd>
                <StatusBadge tone={statusTone[incident.status] ?? "neutral"}>
                  {statusLabel(incident.status)}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Assigned To</dt>
              <dd className="text-gray-700">{incident.assignedTo ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Created</dt>
              <dd className="text-gray-700">{formatDateLabel(incident.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Last Updated</dt>
              <dd className="text-gray-700">{formatDateLabel(incident.updatedAt)}</dd>
            </div>
          </dl>
        </CoalCard>

        <CoalCard title="Scan Information">
          {scanDetail ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-gray-900">Scan ID</dt>
                <dd className="text-gray-700">{scanDetail.scan.id}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Type</dt>
                <dd className="text-gray-700">{scanDetail.scan.type}</dd>
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
                <dd className="text-gray-700">{formatDateLabel(scanDetail.scan.startedAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Devices Scanned</dt>
                <dd className="text-gray-700">{scanDetail.scan.totalDevices}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Loading scan details…</p>
          )}
        </CoalCard>

        <CoalCard title="Device Information">
          {deviceDetail ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-gray-900">Name</dt>
                <dd className="text-gray-700">{deviceDetail.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Vendor</dt>
                <dd className="text-gray-700">{deviceDetail.vendor}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Product</dt>
                <dd className="text-gray-700">{deviceDetail.product}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Version</dt>
                <dd className="text-gray-700">{deviceDetail.version}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">IP Address</dt>
                <dd className="text-gray-700">{deviceDetail.ip ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Serial</dt>
                <dd className="text-gray-700">{deviceDetail.serial}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">State</dt>
                <dd className="text-gray-700 capitalize">{deviceDetail.state}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Last Scan</dt>
                <dd className="text-gray-700">
                  {deviceDetail.lastScanAt ? formatDateLabel(deviceDetail.lastScanAt) : "Never"}
                  {deviceDetail.lastScanStatus && (
                    <span className="ml-2">
                      <StatusBadge tone={
                        deviceDetail.lastScanStatus === 'ok' ? 'safe' :
                        deviceDetail.lastScanStatus === 'issues' ? 'warning' :
                        deviceDetail.lastScanStatus === 'failed' ? 'critical' : 'neutral'
                      }>
                        {deviceDetail.lastScanStatus}
                      </StatusBadge>
                    </span>
                  )}
                </dd>
              </div>
              {deviceDetail.cpe && (
                <div>
                  <dt className="font-semibold text-gray-900">CPE</dt>
                  <dd className="text-gray-700 font-mono text-xs">{deviceDetail.cpe}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Loading device details…</p>
          )}
        </CoalCard>
      </div>

      {/* CVEs Found */}
      {scanDetail && (
        <CoalCard title="Vulnerabilities Detected" subtitle="CVEs found during the scan for this device">
          {(() => {
            const deviceResult = scanDetail.results.find(r => r.deviceId === incident.deviceId);
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
                    <div key={cve} className="rounded-md border border-red-200 bg-red-50 p-4">
                      <p className="font-semibold text-red-900 text-lg">{cve}</p>
                      <p className="text-sm text-red-700 mt-1">Critical vulnerability detected</p>
                      <CoalButton
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${cve}`, '_blank')}
                      >
                        View NVD Details
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
              Last updated {formatDateLabel(incident.updatedAt)}
            </p>
            <CoalButton type="submit" isLoading={mutating}>
              Apply changes
            </CoalButton>
          </div>
        </form>
      </CoalCard>

      {/* Timeline */}
      <CoalCard title="Incident Timeline" subtitle="History of status changes and comments">
        {history.length === 0 ? (
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
  );
}