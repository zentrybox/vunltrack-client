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
      if (!response.ok) {
        throw new Error("Unable to load dashboard");
      }
      const data = (await response.json()) as DashboardResponse;
      setMetrics(data.metrics);
      setQueue(data.queue);
      setScans(data.scans ?? []);
      setIncidents(data.incidents ?? []);
      setSystemMetrics(data.systemMetrics ?? null);
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
