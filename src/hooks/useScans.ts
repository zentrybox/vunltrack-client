'use client';

import { useCallback, useEffect, useState } from "react";

import type {
  ScanDetailResponse,
  ScanResultRecord,
  ScanSummary,
  StartScanResponse,
} from "@/lib/types";

interface ScanListResponse {
  scans: ScanSummary[];
}

export function useScans() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const loadScans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scans", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load scans");
      }
      const data = (await response.json()) as ScanListResponse;
      setScans(data.scans ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadScans();
  }, [loadScans]);

  const startScan = useCallback(async (deviceIds: string[], type: 'soft' | 'deep' = 'soft') => {
    if (!deviceIds || deviceIds.length === 0) {
      throw new Error("Select at least one device");
    }

    setMutating(true);
    setError(null);
    try {
      const response = await fetch("/api/scans/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devices: deviceIds.map(deviceId => ({ deviceId })), type }),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.message ?? "Failed to start scan");
      }

      const data = (await response.json()) as StartScanResponse;
      await loadScans();
      return data.scanId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan");
      throw err;
    } finally {
      setMutating(false);
    }
  }, [loadScans]);

  const getScanDetail = useCallback(async (scanId: string) => {
    const response = await fetch(`/api/scans/${scanId}`, { cache: "no-store" });
    if (!response.ok) {
      const details = await response.json().catch(() => null);
      throw new Error(details?.message ?? "Failed to load scan detail");
    }
    return (await response.json()) as ScanDetailResponse;
  }, []);

  const getScanResultByDevice = useCallback(async (scanId: string, deviceId: string) => {
    const response = await fetch(`/api/scans/${scanId}/results/${deviceId}`, { cache: "no-store" });
    if (!response.ok) {
      const details = await response.json().catch(() => null);
      throw new Error(details?.message ?? "Failed to load scan result");
    }
    return (await response.json()) as ScanResultRecord;
  }, []);

  return {
    scans,
    loading,
    error,
    mutating,
    refresh: loadScans,
    startScan,
    getScanDetail,
    getScanResultByDevice,
  };
}