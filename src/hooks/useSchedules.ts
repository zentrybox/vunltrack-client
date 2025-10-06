'use client';

import { useCallback, useEffect, useState } from "react";

import type { SchedulePayload, ScheduledScanRecord } from "@/lib/types";

interface ScheduleListResponse {
  schedules: ScheduledScanRecord[];
}

interface ScheduleResponse {
  schedule: ScheduledScanRecord;
}

export function useSchedules() {
  const [schedules, setSchedules] = useState<ScheduledScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/schedules", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load schedules");
      }
      const data = (await response.json()) as ScheduleListResponse;
      setSchedules(data.schedules ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const create = useCallback(async (payload: SchedulePayload) => {
    setMutating(true);
    setError(null);
    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.message ?? "Failed to create schedule");
      }

      const data = (await response.json()) as ScheduleResponse;
      setSchedules((prev) => [...prev, data.schedule]);
      return data.schedule;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const update = useCallback(
    async (scheduleId: string, payload: SchedulePayload) => {
      setMutating(true);
      setError(null);
      try {
        const response = await fetch(`/api/schedules/${scheduleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const details = await response.json().catch(() => null);
          throw new Error(details?.message ?? "Failed to update schedule");
        }

        const data = (await response.json()) as ScheduleResponse;
        setSchedules((prev) =>
          prev.map((schedule) =>
            schedule.id === scheduleId ? data.schedule : schedule,
          ),
        );
        return data.schedule;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update schedule");
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [],
  );

  const remove = useCallback(async (scheduleId: string) => {
    setMutating(true);
    setError(null);
    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.message ?? "Failed to delete schedule");
      }

      setSchedules((prev) => prev.filter((schedule) => schedule.id !== scheduleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete schedule");
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  return {
    schedules,
    loading,
    error,
    mutating,
    refresh: loadSchedules,
    createSchedule: create,
    updateSchedule: update,
    deleteSchedule: remove,
  };
}
