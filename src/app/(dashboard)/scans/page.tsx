'use client';

import { useEffect, useMemo, useState } from "react";
import { analyzeWithClaude, generateReport } from "@/lib/claudeClient";
import type { VulnerabilityAnalysis, CVE, ScanResultRecord } from "@/lib/types";

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
  const [deviceAnalyses, setDeviceAnalyses] = useState<Record<string, VulnerabilityAnalysis | null>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("deviceAnalyses");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportTarget, setExportTarget] = useState<ScanResultRecord | null>(null);

  // Persist analyses across navigation using localStorage

  useEffect(() => {
    try {
      localStorage.setItem("deviceAnalyses", JSON.stringify(deviceAnalyses));
    } catch {
      // ignore
    }
  }, [deviceAnalyses]);

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

  // helpers to export
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const buildCsv = (result: ScanResultRecord) => {
    const device = devices.find(d => d.id === result.deviceId);
    const analysis = deviceAnalyses[result.deviceId] || null;
    const headers = [
      "deviceId",
      "vendor",
      "product",
      "version",
      "cveCount",
      "cves",
      "riskLevel",
      "summary",
      "recommendations",
    ];
    const cves = (result.cves || []).join(";");
    const recommendations = (analysis?.recommendations || []).join(" | ");
    const row = [
      result.deviceId,
      device?.vendor ?? "",
      device?.product ?? "",
      device?.version ?? "",
      String(result.cveCount ?? (result.cves?.length ?? 0)),
      cves,
      analysis?.riskLevel ?? "",
      (analysis?.summary ?? "").replace(/\n/g, " ").replace(/"/g, '""'),
      recommendations.replace(/\n/g, " ").replace(/"/g, '""'),
    ];
    const csv = [headers.join(","), row.map(v => `"${String(v)}"`).join(",")].join("\n");
    return new Blob([csv], { type: "text/csv;charset=utf-8" });
  };

  const openExportModal = (result: ScanResultRecord) => {
    setExportTarget(result);
    setExportModalOpen(true);
  };

  const closeExportModal = () => {
    setExportModalOpen(false);
    setExportTarget(null);
  };

  const handleExportJSON = async () => {
    if (!exportTarget) return;
    setExporting(true);
    try {
      const device = devices.find(d => d.id === exportTarget.deviceId);
      const cves: CVE[] = (exportTarget.cves || []).map((c: string) => ({ cveId: c }));
      const analysis = deviceAnalyses[exportTarget.deviceId] ?? undefined;
      let template = 'default';
      try { const t = localStorage.getItem('reportTemplate'); if (t) template = t; } catch {}
      const report = await generateReport(
        device?.vendor ?? "",
        device?.product ?? "",
        device?.version ?? "",
        cves,
        analysis,
        template,
      );
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      triggerDownload(blob, `report-${report.id}.json`);
      closeExportModal();
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!exportTarget) return;
    try {
      const blob = buildCsv(exportTarget);
      triggerDownload(blob, `report-${exportTarget.deviceId}.csv`);
      closeExportModal();
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to export CSV");
    }
  };

  // Note: loader handled in state initializer; saver defined earlier

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
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
                    render: (result) => {
                      const device = devices.find(d => d.id === result.deviceId);
                      const deviceName = device?.name || device?.product || result.deviceId;
                      return (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-900">{deviceName}</p>
                          <p className="text-xs text-gray-500">
                            Started {formatDateLabel(result.startedAt)}
                          </p>
                        </div>
                      );
                    },
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
                  {
                    key: "actions",
                    header: "Actions",
                    align: "right",
                    render: (result) => (
                      <div className="flex items-center gap-2">
                        {!deviceAnalyses[result.deviceId] && (
                          <CoalButton
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              setAnalysisError(null);
                              setAnalysisLoading(true);
                              try {
                                const scanRes = result as ScanResultRecord;
                                const cves: CVE[] = (scanRes.cves || []).map((c: string) => ({ cveId: c }));
                                const device = devices.find(d => d.id === result.deviceId);
                                const analysis = await analyzeWithClaude(
                                  device?.vendor ?? "",
                                  device?.product ?? "",
                                  device?.version ?? "",
                                  cves,
                                );
                                setDeviceAnalyses((prev) => ({ ...prev, [result.deviceId]: analysis }));
                              } catch (err) {
                                setAnalysisError(err instanceof Error ? err.message : "Failed to analyze");
                              } finally {
                                setAnalysisLoading(false);
                              }
                            }}
                          >
                            Analyze
                          </CoalButton>
                        )}
                        <CoalButton
                          variant="ghost"
                          size="sm"
                          onClick={() => openExportModal(result as ScanResultRecord)}
                        >
                          Export
                        </CoalButton>
                      </div>
                    ),
                  },
                ]}
                emptyState="No device results yet."
              />
              {analysisError ? (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {analysisError}
                </p>
              ) : null}
              {analysisLoading ? (
                <p className="mt-3 text-sm text-gray-500">Running analysis…</p>
              ) : null}
              {Object.entries(deviceAnalyses).filter(([, a]) => a).length > 0 && (
                <div className="space-y-3">
                  {Object.entries(deviceAnalyses)
                    .filter(([, a]) => a)
                    .map(([deviceId, analysis]) => {
                      const a = analysis as VulnerabilityAnalysis;
                      return (
                        <CoalCard key={deviceId} title={`Analysis ${deviceId}`} subtitle={a.riskLevel}>
                          <p className="text-sm text-gray-700">{a.summary}</p>
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-900">Recommendations</p>
                            <ul className="list-disc pl-5 text-sm text-gray-700">
                              {a.recommendations?.map((r: string, i: number) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        </CoalCard>
                      );
                    })}
                </div>
              )}
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

      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Export selected device results</h3>
            <p className="mt-1 text-sm text-gray-600">Choose the format you prefer for your export.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <CoalButton variant="secondary" onClick={handleExportCSV} disabled={exporting}>Export CSV</CoalButton>
              <CoalButton variant="primary" onClick={handleExportJSON} disabled={exporting}>Export JSON</CoalButton>
            </div>
            <div className="mt-4 text-right">
              <CoalButton variant="ghost" size="sm" onClick={closeExportModal} disabled={exporting}>Cancel</CoalButton>
            </div>
          </div>
        </div>
      )}

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
