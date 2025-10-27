'use client';

import { useCallback, useEffect, useMemo, useState } from "react";

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

      // Enhance with latest scan detail if available
      try {
        const scansAll = (data.scans ?? [])
          .slice()
          .sort((a: ScanSummary, b: ScanSummary) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        const latest = scansAll[0];
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
            derived.lastScanAt = detail.scan?.startedAt ?? derived.lastScanAt ?? null;
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
  };
}
