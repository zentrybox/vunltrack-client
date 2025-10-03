'use client';

import { useCallback, useEffect, useState } from "react";

import type {
  DashboardMetrics,
  VulnerabilityQueueItem,
} from "@/lib/types";

interface DashboardResponse {
  metrics: DashboardMetrics;
  queue: VulnerabilityQueueItem[];
}

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [queue, setQueue] = useState<VulnerabilityQueueItem[]>([]);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return { metrics, queue, loading, error, refresh: loadDashboard };
}
