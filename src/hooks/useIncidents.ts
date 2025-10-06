'use client';

import { useCallback, useEffect, useState } from "react";

import type {
  IncidentHistoryEntry,
  IncidentRecord,
  UpdateIncidentPayload,
} from "@/lib/types";

interface IncidentListResponse {
  incidents: IncidentRecord[];
}

interface IncidentUpdateResponse {
  incident: IncidentRecord;
}

interface IncidentHistoryResponse {
  history: IncidentHistoryEntry[];
}

export function useIncidents() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/incidents", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load incidents");
      }
      const data = (await response.json()) as IncidentListResponse;
      setIncidents(data.incidents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  const update = useCallback(
    async (incidentId: string, payload: UpdateIncidentPayload) => {
      setMutating(true);
      setError(null);
      try {
        const response = await fetch(`/api/incidents/${incidentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const details = await response.json().catch(() => null);
          throw new Error(details?.message ?? "Failed to update incident");
        }

        const data = (await response.json()) as IncidentUpdateResponse;
        setIncidents((prev) =>
          prev.map((incident) =>
            incident.id === incidentId ? data.incident : incident,
          ),
        );
        return data.incident;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update incident");
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [],
  );

  const getHistory = useCallback(async (incidentId: string) => {
    const response = await fetch(`/api/incidents/${incidentId}/history`, {
      cache: "no-store",
    });
    if (!response.ok) {
      const details = await response.json().catch(() => null);
      throw new Error(details?.message ?? "Failed to load incident history");
    }
    const data = (await response.json()) as IncidentHistoryResponse & {
      data?: IncidentHistoryEntry[];
    };

    if (Array.isArray(data.history)) {
      return data.history;
    }

    if (Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  }, []);

  return {
    incidents,
    loading,
    error,
    mutating,
    refresh: loadIncidents,
    updateIncident: update,
    getHistory,
  };
}
