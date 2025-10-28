'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  DashboardMetrics,
  IncidentRecord,
  MetricsSnapshot,
  ScanSummary,
  VulnerabilityQueueItem,
} from "@/lib/types";

interface DashboardResponse {
  metrics: DashboardMetrics;
  queue: VulnerabilityQueueItem[];
  scans: ScanSummary[];
  incidents: IncidentRecord[];
  systemMetrics?: MetricsSnapshot;
}

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [queue, setQueue] = useState<VulnerabilityQueueItem[]>([]);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [liveUpdating, setLiveUpdating] = useState(false);
  const prevStatusRef = useRef<Map<string, ScanSummary["status"]>>(new Map());
  const [lastCompletedScan, setLastCompletedScan] = useState<ScanSummary | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load dashboard");
      const data = (await response.json()) as DashboardResponse;

      // Always set lists first
      setQueue(data.queue);
      setScans(data.scans ?? []);
      // Detect transitions running -> completed to raise a one-off event
      try {
        const current = new Map<string, ScanSummary["status"]>();
        (data.scans ?? []).forEach((s) => current.set(s.id, s.status));
        const prev = prevStatusRef.current;
        for (const [id, statusNow] of current.entries()) {
          const statusPrev = prev.get(id);
          if (statusPrev === "running" && statusNow === "completed") {
            const scanObj = (data.scans ?? []).find((s) => s.id === id) ?? null;
            if (scanObj) setLastCompletedScan(scanObj);
          }
        }
        prevStatusRef.current = current;
      } catch {
        // ignore toast detection errors
      }
      setIncidents(data.incidents ?? []);
      setSystemMetrics(data.systemMetrics ?? null);

      // Start from server-provided metrics
      const derived: DashboardMetrics = {
        totalDevices: data.metrics?.totalDevices ?? 0,
        criticalFindings: data.metrics?.criticalFindings ?? 0,
        highFindings: data.metrics?.highFindings ?? 0,
        mediumFindings: data.metrics?.mediumFindings ?? 0,
        lowFindings: data.metrics?.lowFindings ?? 0,
        lastScanAt: data.metrics?.lastScanAt ?? null,
      };

      // Enhance with latest completed scan detail if available (fallback to latest regardless of status)
      try {
        const scansAll = (data.scans ?? []).slice();
        const latestCompleted = scansAll
          .filter((s) => s.status === 'completed')
          .sort((a: ScanSummary, b: ScanSummary) => new Date(b.finishedAt ?? b.startedAt).getTime() - new Date(a.finishedAt ?? a.startedAt).getTime())[0];
        const latestAny = scansAll
          .sort((a: ScanSummary, b: ScanSummary) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
        const latest = latestCompleted ?? latestAny;
        if (latest) {
          const detailResp = await fetch(`/api/scans/${latest.id}`, { cache: "no-store" });
          if (detailResp.ok) {
            const detail = (await detailResp.json()) as {
              scan: ScanSummary;
              results: { cveCount?: number; cves?: string[] }[];
            };
            const getCount = (r: { cveCount?: number; cves?: string[] }) =>
              typeof r.cveCount === "number" ? r.cveCount : r.cves?.length ?? 0;
            const results = detail.results || [];
            const totalCves = results.reduce((sum, r) => sum + getCount(r), 0);
            // Critical findings: total CVEs across all devices in latest scan
            derived.criticalFindings = totalCves;
            // Device buckets by simple CVE count threshold
            const highDevices = results.filter((r) => getCount(r) >= 3).length; // High Priority
            const mediumDevices = results.filter((r) => {
              const c = getCount(r);
              return c >= 1 && c <= 2;
            }).length; // Medium Priority
            derived.highFindings = highDevices;
            derived.mediumFindings = mediumDevices;
            derived.totalDevices = detail.scan?.totalDevices ?? derived.totalDevices;
            derived.lastScanAt = detail.scan?.finishedAt ?? detail.scan?.startedAt ?? derived.lastScanAt ?? null;
          }
        }
      } catch {
        // ignore and keep server metrics
      }

      setMetrics(derived);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Poll while there are running scans; stop when none running
  useEffect(() => {
    const hasRunning = scans.some((s) => s.status === "running");
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(() => {
        void loadDashboard();
      }, 5000);
    }
    if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setLiveUpdating(hasRunning);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [scans, loadDashboard]);

  // Refresh on window focus to catch up quickly after user returns
  useEffect(() => {
    const onFocus = () => void loadDashboard();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') onFocus();
      });
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, [loadDashboard]);

  const latestScans = useMemo(() => {
    return scans
      .slice()
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      )
      .slice(0, 5);
  }, [scans]);
  const activeIncidents = useMemo(
    () =>
      incidents
        .filter((incident) => incident.status !== 'resolved')
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 6),
    [incidents],
  );

  return {
    metrics,
    queue,
    scans: latestScans,
    incidents: activeIncidents,
    systemMetrics,
    loading,
    error,
    refresh: loadDashboard,
    liveUpdating,
    lastCompletedScan,
    ackLastCompleted: () => setLastCompletedScan(null),
  };
}
