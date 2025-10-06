'use client';

import { useCallback, useEffect, useState } from "react";

import type { ReportSummary } from "@/lib/types";

interface ReportsResponse {
  reports: ReportSummary[];
}

export function useReports() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reports", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load reports");
      }
      const data = (await response.json()) as ReportsResponse;
      setReports(data.reports ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return { reports, loading, error, refresh: loadReports };
}
