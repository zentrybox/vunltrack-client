'use client';

import { useMemo, useState } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useDevices } from "@/hooks/useDevices";
import { useScans } from "@/hooks/useScans";
import type { ScanDetailResponse } from "@/lib/types";
import { cn, formatDateLabel } from "@/lib/utils";

const statusTone = {
  pending: "info" as const,
  running: "info" as const,
  completed: "safe" as const,
  failed: "critical" as const,
  cancelled: "neutral" as const,
};

export default function ScansPage() {
  const { devices, loading: devicesLoading } = useDevices();
  const { scans, loading, error, mutating, startScan, getScanDetail } = useScans();

  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [scanDetail, setScanDetail] = useState<ScanDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const selectableDevices = useMemo(
    () => devices.slice().sort((a, b) => (a.name ?? a.product).localeCompare(b.name ?? b.product)),
    [devices],
  );

  const handleToggleDevice = (deviceId: string) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId],
    );
  };

  const handleSelectScan = async (scanId: string) => {
    setSelectedScanId(scanId);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const detail = await getScanDetail(scanId);
      setScanDetail(detail);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load detail");
      setScanDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStartScan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedDevices.length === 0) {
      setFormError("Select at least one device");
      return;
    }
    setFormError(null);
    try {
      const scanId = await startScan(selectedDevices);
      setSelectedDevices([]);
      if (scanId) {
        await handleSelectScan(scanId);
      }
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Failed to start scan");
      }
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <CoalCard
          title="Start new scan"
          subtitle="Choose devices and launch an on-demand exposure sweep"
        >
          <form className="space-y-5" onSubmit={handleStartScan}>
            <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-4">
              {devicesLoading ? (
                <p className="text-sm text-gray-500">Loading devices…</p>
              ) : selectableDevices.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No devices available. Add devices from the inventory first.
                </p>
              ) : (
                <ul className="space-y-3 text-sm text-gray-700">
                  {selectableDevices.map((device) => {
                    const label = device.name
                      ? `${device.name} · ${device.vendor} ${device.product}`
                      : `${device.vendor} ${device.product}`;
                    return (
                      <li key={device.id} className="flex items-start gap-3">
                        <input
                          id={`device-${device.id}`}
                          type="checkbox"
                          checked={selectedDevices.includes(device.id)}
                          onChange={() => handleToggleDevice(device.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`device-${device.id}`} className="flex-1 cursor-pointer space-y-1">
                          <p className="font-semibold text-gray-900">{label}</p>
                          <p className="text-xs text-gray-500">
                            Last scan {device.lastScanAt ? formatDateLabel(device.lastScanAt) : "—"}
                          </p>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {formError ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {formError}
              </p>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {selectedDevices.length} device{selectedDevices.length === 1 ? "" : "s"} selected
              </span>
              <CoalButton type="submit" isLoading={mutating} disabled={selectableDevices.length === 0}>
                Launch scan
              </CoalButton>
            </div>
          </form>
        </CoalCard>

        <CoalCard title="Selected scan" subtitle="Drill into device-level findings">
          {detailLoading ? (
            <p className="text-sm text-gray-500">Loading scan detail…</p>
          ) : scanDetail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Scan {scanDetail.scan.id}</p>
                  <p className="text-xs text-gray-500">
                    Started {formatDateLabel(scanDetail.scan.startedAt)} • {scanDetail.scan.status}
                  </p>
                </div>
                <StatusBadge tone={statusTone[scanDetail.scan.status] ?? "neutral"}>
                  {scanDetail.scan.status}
                </StatusBadge>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">Devices</p>
                  <p>Total: {scanDetail.scan.totalDevices}</p>
                  <p>Completed: {scanDetail.scan.completedDevices}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">Outcomes</p>
                  <p>Successful: {scanDetail.scan.successful}</p>
                  <p>With issues: {scanDetail.scan.withIssues}</p>
                </div>
              </div>
              <CoalTable
                data={scanDetail.results}
                columns={[
                  {
                    key: "deviceId",
                    header: "Device",
                    render: (result) => (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-900">{result.deviceId}</p>
                        <p className="text-xs text-gray-500">
                          Started {formatDateLabel(result.startedAt)}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (result) => (
                      <StatusBadge tone={statusTone[result.status] ?? "neutral"}>
                        {result.status}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: "cveCount",
                    header: "CVEs",
                    align: "center",
                    render: (result) => (
                      <span className={cn("text-sm font-semibold", result.cveCount > 0 ? "text-red-600" : "text-emerald-600")}
                      >
                        {result.cveCount}
                      </span>
                    ),
                  },
                  {
                    key: "finishedAt",
                    header: "Completed",
                    render: (result) => (
                      <span className="text-xs text-gray-500">
                        {result.finishedAt ? formatDateLabel(result.finishedAt) : "—"}
                      </span>
                    ),
                  },
                ]}
                emptyState="No device results yet."
              />
            </div>
          ) : detailError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {detailError}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Select a scan from the history to view device-level results.
            </p>
          )}
        </CoalCard>
      </section>

      <CoalCard
        title="Scan history"
        subtitle="Chronological record of all tenant scans"
        action={
          <CoalButton variant="ghost" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Start another scan
          </CoalButton>
        }
      >
        {error ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <CoalTable
          data={scans}
          isLoading={loading}
          columns={[
            {
              key: "id",
              header: "Scan",
              render: (scan) => (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{scan.id}</p>
                  <p className="text-xs text-gray-500">
                    Started {formatDateLabel(scan.startedAt)}
                  </p>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (scan) => (
                <StatusBadge tone={statusTone[scan.status] ?? "neutral"}>{scan.status}</StatusBadge>
              ),
            },
            {
              key: "successful",
              header: "Success",
              align: "center",
              render: (scan) => (
                <span className="text-xs font-semibold text-gray-800">
                  {scan.successful}/{scan.totalDevices}
                </span>
              ),
            },
            {
              key: "withIssues",
              header: "With issues",
              align: "center",
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (scan) => (
                <CoalButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSelectScan(scan.id)}
                  className={cn(selectedScanId === scan.id && "border-blue-500 text-blue-600")}
                >
                  Inspect
                </CoalButton>
              ),
            },
          ]}
          emptyState="No scans have been recorded. Launch your first scan above."
        />
      </CoalCard>
    </div>
  );
}
