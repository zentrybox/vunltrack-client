'use client';

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [zeroOnly, setZeroOnly] = useState(false);
  const [scanDetailCache, setScanDetailCache] = useState<Record<string, ScanDetailResponse>>({});
  // Critical vulnerabilities popup
  const [criticalPopupOpen, setCriticalPopupOpen] = useState(false);
  const [criticalPopupScanId, setCriticalPopupScanId] = useState<string | null>(null);
  const [criticalDevicesCount, setCriticalDevicesCount] = useState(0);
  // Progress UI when launching a scan
  const [scanProgressActive, setScanProgressActive] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [launchedScanId, setLaunchedScanId] = useState<string | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const accelerateIntervalRef = useRef<number | null>(null);

  const finishProgressSmoothly = () => {
    // stop slow tick
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    // clear previous accelerate
    if (accelerateIntervalRef.current) {
      clearInterval(accelerateIntervalRef.current);
      accelerateIntervalRef.current = null;
    }
    setScanProgressActive(true);
    accelerateIntervalRef.current = window.setInterval(() => {
      setScanProgress((p) => {
        if (p >= 100) {
          if (accelerateIntervalRef.current) {
            clearInterval(accelerateIntervalRef.current);
            accelerateIntervalRef.current = null;
          }
          return 100;
        }
        const remaining = 100 - p;
        const step = Math.max(2, Math.ceil(remaining / 5));
        return Math.min(100, p + step);
      });
    }, 50);
  };

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
  setCriticalOnly(false);
  setZeroOnly(false);
    try {
      const detail = await getScanDetail(scanId);
      setScanDetail(detail);
      // If this is the launched scan and it's already done, fast-finish progress
      if (
        launchedScanId === scanId &&
        (detail.scan.status === 'completed' || detail.scan.status === 'failed' || detail.scan.status === 'cancelled')
      ) {
        finishProgressSmoothly();
      }
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
      // reset any previous progress
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setScanProgress(0);
      setScanProgressActive(true);
      const scanId = await startScan(selectedDevices);
      setSelectedDevices([]);
      if (scanId) {
        setLaunchedScanId(scanId);
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

  // Animate time-based progress up to 95% until completion detected
  useEffect(() => {
    if (!scanProgressActive) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }
    progressIntervalRef.current = window.setInterval(() => {
      setScanProgress((p) => (p >= 95 ? p : Math.min(p + 1, 95)));
    }, 300);
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [scanProgressActive]);

  // Poll for scan completion and finish progress
  useEffect(() => {
    if (!scanProgressActive || !launchedScanId) return;
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const detail = await getScanDetail(launchedScanId);
        setScanDetail(detail);
        if (detail.scan.status === 'completed' || detail.scan.status === 'failed' || detail.scan.status === 'cancelled') {
          finishProgressSmoothly();
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          // Check for critical vulnerabilities and show popup
          if (detail.scan.status === 'completed' && detail.results) {
            const criticalDevices = detail.results.filter((r) => {
              const device = devices.find(d => d.id === r.deviceId);
              const highCritFromDevice = (device?.criticalFindings ?? 0) > 0 || (device?.highFindings ?? 0) > 0;
              const highCritFromCount = (r.cveCount ?? (r.cves?.length ?? 0)) >= 5;
              return highCritFromDevice || highCritFromCount;
            });
            
            if (criticalDevices.length > 0) {
              setCriticalDevicesCount(criticalDevices.length);
              setCriticalPopupScanId(launchedScanId);
              setCriticalPopupOpen(true);
            }
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 1000);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [scanProgressActive, launchedScanId, getScanDetail, devices]);

  // Auto-load scan details when filters are applied
  useEffect(() => {
    if ((criticalOnly || zeroOnly) && scans.length > 0) {
      // Load scan details for filtering
      scans.forEach(async (scan) => {
        if (!scanDetailCache[scan.id]) {
          try {
            const detail = await getScanDetail(scan.id);
            setScanDetailCache(prev => ({ ...prev, [scan.id]: detail }));
          } catch {
            // ignore errors
          }
        }
      });
    }
  }, [criticalOnly, zeroOnly, scans, getScanDetail]);

  // After reaching 100%, hide the progress after a short delay
  useEffect(() => {
    if (scanProgress !== 100) return;
    const t = window.setTimeout(() => {
      setScanProgressActive(false);
      setLaunchedScanId(null);
    }, 500);
    return () => clearTimeout(t);
  }, [scanProgress]);

  // Filter scans based on actual CVE data  
  const getFilteredScans = () => {
    if (!criticalOnly && !zeroOnly) return scans;
    
    return scans.filter(scan => {
      const cachedDetail = scanDetailCache[scan.id];
      if (!cachedDetail?.results) {
        // If we don't have scan details yet, include it in the list
        // so user can inspect it and get the data
        return true;
      }
      
      const results = cachedDetail.results;
      const criticalCount = results.filter(r => (r.cveCount ?? (r.cves?.length ?? 0)) >= 5).length;
      const zeroCount = results.filter(r => (r.cveCount ?? (r.cves?.length ?? 0)) === 0).length;
      
      if (criticalOnly) {
        return criticalCount > 0;
      }
      if (zeroOnly) {
        return zeroCount > 0;
      }
      
      return true;
    });
  };
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
          footer={scanProgressActive ? (
            <div className="w-full">
              <div className="mb-1 flex items-center justify-between text-xs text-white/80">
                <span>Scan progress</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-white/10">
                <div
                  className="h-2.5 rounded-full bg-[var(--color-accent1)] transition-all"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          ) : null}
        >
          <form className="space-y-5" onSubmit={handleStartScan}>
            <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-4">
              {devicesLoading ? (
                <p className="text-sm">Loading devices…</p>
              ) : selectableDevices.length === 0 ? (
                <p className="text-sm">
                  No devices available. Add devices from the inventory first.
                </p>
              ) : (
                <ul className="space-y-3 text-sm">
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
                          <p className="font-semibold">{label}</p>
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

  <div id="selected-scan" className="min-w-0">
  <CoalCard
    title="Selected scan"
    subtitle="Drill into device-level findings"
    className="min-w-0"
  >
          {detailLoading ? (
            <p className="text-sm text-blue-300 animate-pulse">Loading scan detail…</p>
          ) : scanDetail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-lg font-bold text-white">{devices.find(d => d.id === scanDetail.results?.[0]?.deviceId)?.name || scanDetail.scan.id}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-300">
                      Started {formatDateLabel(scanDetail.scan.startedAt)}
                    </p>
                    <span className="text-slate-500">•</span>
                    <StatusBadge tone={statusTone[scanDetail.scan.status] ?? "neutral"}>
                      {scanDetail.scan.status}
                    </StatusBadge>
                  </div>
                  {(() => {
                    const device = devices.find(d => d.id === scanDetail.results?.[0]?.deviceId);
                    if (device?.cpe) {
                      return (
                        <p className="text-xs font-mono text-blue-300 bg-slate-800/50 px-2 py-1 rounded mt-2 inline-block">
                          CPE: {device.cpe}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-md border border-blue-500/30 bg-slate-800/50 p-4 text-sm">
                <div className="space-y-2">
                  <p className="font-semibold text-blue-300">Devices</p>
                  <p className="text-slate-200">Total: <span className="font-bold text-white">{scanDetail.scan.totalDevices}</span></p>
                  <p className="text-slate-200">Completed: <span className="font-bold text-green-400">{scanDetail.scan.completedDevices}</span></p>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-blue-300">Outcomes</p>
                  <p className="text-slate-200">Successful: <span className="font-bold text-green-400">{scanDetail.scan.successful}</span></p>
                  <p className="text-slate-200">With issues: <span className="font-bold text-orange-400">{scanDetail.scan.withIssues}</span></p>
                </div>
              </div>
              <CoalTable
                data={scanDetail?.results || []}
                columns={[
                  {
                    key: "deviceId",
                    header: "Device",
                    render: (result) => {
                      const device = devices.find(d => d.id === result.deviceId);
                      const deviceName = device?.name || device?.product || result.deviceId;
                      return (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-100">{deviceName}</p>
                          <p className="text-xs">
                            <span className="text-slate-300">Started {formatDateLabel(result.startedAt)}</span>
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
                      <span className={cn("text-sm font-semibold", result.cveCount > 0 ? "text-red-400" : "text-emerald-400")}
                      >
                        {result.cveCount}
                      </span>
                    ),
                  },
                  {
                    key: "finishedAt",
                    header: "Completed",
                    render: (result) => (
                      <span className="text-xs text-slate-300">
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
                emptyState={criticalOnly
                  ? "No critical devices found (≥5 CVEs) in this scan."
                  : zeroOnly
                    ? "No devices with zero vulnerabilities found."
                    : "No device results available yet."}
              />
              {analysisError ? (
                <p className="mt-3 rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                  {analysisError}
                </p>
              ) : null}
              {analysisLoading ? (
                <p className="mt-3 text-sm text-blue-300 animate-pulse">Running analysis…</p>
              ) : null}
              {Object.entries(deviceAnalyses).filter(([, a]) => a).length > 0 && (
                <div className="space-y-3">
                  {scanDetail && scanDetail.results && Object.keys(deviceAnalyses).length > 0 && (
                    (() => {
                      // Find the device in the current scan whose analysis exists
                      const analyzedDeviceId = scanDetail.results.find(r => deviceAnalyses[r.deviceId])?.deviceId;
                      if (!analyzedDeviceId) return null;
                      const a = deviceAnalyses[analyzedDeviceId] as VulnerabilityAnalysis;
                      if (!a) return null;
                      return (
                        <CoalCard key={analyzedDeviceId} title={`Analysis for Device`} subtitle={a.riskLevel}>
                          <div className="space-y-4">
                            <div className="rounded-lg bg-slate-800/50 p-3">
                              <p className="text-sm text-slate-100 leading-relaxed">{a.summary}</p>
                            </div>
                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-blue-300">Security Recommendations</p>
                              <ul className="space-y-2">
                                {a.recommendations?.map((r: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-blue-400 mt-1">•</span>
                                    <span className="text-sm text-slate-200">{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CoalCard>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          ) : detailError ? (
            <p className="rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {detailError}
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              Select a scan from the history to view device-level results.
            </p>
          )}
  </CoalCard>
  </div>
      </section>

      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-blue-500/30 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">Export selected device results</h3>
            <p className="mt-1 text-sm text-slate-300">Choose the format you prefer for your export.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <CoalButton
                variant="secondary"
                onClick={handleExportCSV}
                disabled={exporting}
                className="bg-slate-800 text-slate-200 border-blue-400/40 disabled:text-slate-500 disabled:bg-slate-800/60 disabled:border-blue-400/20"
              >
                Export CSV
              </CoalButton>
              <CoalButton
                variant="primary"
                onClick={handleExportJSON}
                disabled={exporting}
                className="bg-gradient-to-r from-blue-600 to-blue-400 text-white border-blue-400/60 disabled:from-blue-900 disabled:to-blue-700 disabled:text-slate-400"
              >
                Export JSON
              </CoalButton>
            </div>
            <div className="mt-4 text-right">
              <CoalButton
                variant="ghost"
                size="sm"
                onClick={closeExportModal}
                disabled={exporting}
                className="text-slate-300 border-blue-400/40 disabled:text-slate-500 disabled:border-blue-400/20"
              >
                Cancel
              </CoalButton>
            </div>
          </div>
        </div>
      )}

      <CoalCard
        title="Scan history"
        subtitle="Chronological record of all tenant scans"
        action={
          <div className="flex items-center gap-2">
            <CoalButton
              variant={criticalOnly ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setCriticalOnly((v) => !v);
                setZeroOnly(false);
              }}
              className={criticalOnly ? 'border-red-400 text-red-300' : ''}
            >
              {criticalOnly ? 'Show all': 'Scans with critical devices'}
              <span className="ml-1 bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded text-xs">
                {scans.filter(scan => {
                  const cached = scanDetailCache[scan.id];
                  if (!cached?.results) return false;
                  return cached.results.filter(r => (r.cveCount ?? (r.cves?.length ?? 0)) >= 5).length > 0;
                }).length}
              </span>
            </CoalButton>
            <CoalButton
              variant={zeroOnly ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setZeroOnly((v) => !v);
                setCriticalOnly(false);
              }}
              className={zeroOnly ? 'border-green-400 text-green-300' : ''}
            >
              {zeroOnly ? 'Show all' : 'Scans with clean devices'}
              <span className="ml-1 bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded text-xs">
                {scans.filter(scan => {
                  const cached = scanDetailCache[scan.id];
                  if (!cached?.results) return false;
                  return cached.results.filter(r => (r.cveCount ?? (r.cves?.length ?? 0)) === 0).length > 0;
                }).length}
              </span>
            </CoalButton>
          </div>
        }
      >
        {error ? (
          <p className="mb-4 rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <CoalTable
          data={getFilteredScans()}
          isLoading={loading}
          columns={[
            {
              key: "id",
              header: "Scan",
              render: (scan) => {
                // Get real CVE data from cache if available
                const cachedDetail = scanDetailCache[scan.id];
                let criticalCount = 0;
                let zeroCount = 0;
                let totalCVEs = 0;
                
                if (cachedDetail?.results) {
                  const results = cachedDetail.results;
                  criticalCount = results.filter(r => (r.cveCount ?? (r.cves?.length ?? 0)) >= 5).length;
                  zeroCount = results.filter(r => (r.cveCount ?? (r.cves?.length ?? 0)) === 0).length;
                  totalCVEs = results.reduce((sum, r) => sum + (r.cveCount ?? (r.cves?.length ?? 0)), 0);
                }
                
                return (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-100">{scan.id}</p>
                      {totalCVEs > 0 && (
                        <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                          {totalCVEs} CVEs
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Started {formatDateLabel(scan.startedAt)}
                    </p>
                    {cachedDetail && (
                      <div className="flex items-center gap-2 text-xs">
                        {criticalCount > 0 && (
                          <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                            {criticalCount} critical
                          </span>
                        )}
                        {zeroCount > 0 && (
                          <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded">
                            {zeroCount} clean
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              },
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
                <span className="text-sm font-semibold">
                  <span className="text-green-400">{scan.successful}</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-300">{scan.totalDevices}</span>
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
          emptyState={
            criticalOnly 
              ? "No scans found with critical devices (≥5 CVEs)."
              : zeroOnly
                ? "No scans found with clean devices (0 CVEs)."
                : "No scans have been recorded. Launch your first scan above."
          }
        />
      </CoalCard>

      {/* Critical Vulnerabilities Popup */}
      {criticalPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-red-500/40 bg-slate-900 p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-3xl">🔥</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-red-300">Critical Vulnerabilities Detected!</h3>
                <p className="text-sm text-slate-300">
                  Found <span className="font-bold text-red-400">{criticalDevicesCount} device{criticalDevicesCount === 1 ? '' : 's'}</span> with 
                  5 or more CVEs in your latest scan.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <CoalButton
                  variant="primary"
                  onClick={() => {
                    setCriticalPopupOpen(false);
                    if (criticalPopupScanId) {
                      handleSelectScan(criticalPopupScanId);
                      setCriticalOnly(true);
                      setZeroOnly(false);
                    }
                  }}
                  className="bg-gradient-to-r from-red-600 to-red-500 text-white border-red-400/60"
                >
                  View Critical Devices
                </CoalButton>
                <CoalButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCriticalPopupOpen(false);
                    if (criticalPopupScanId) {
                      handleSelectScan(criticalPopupScanId);
                    }
                  }}
                  className="text-slate-400 border-slate-600"
                >
                  View All Results
                </CoalButton>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
