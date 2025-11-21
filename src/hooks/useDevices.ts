'use client';

import { useCallback, useEffect, useState } from "react";

import type {
  CreateDevicePayload,
  DeviceDetail,
  DeviceRecord,
  DeviceState,
} from "@/lib/types";

interface DevicesResponse {
  devices: DeviceRecord[];
}

export function useDevices() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/devices", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load devices");
      }

      const data = (await response.json()) as DevicesResponse;
      setDevices(data.devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const addDevice = useCallback(
    async (payload: CreateDevicePayload) => {
      setMutating(true);
      setError(null);
      try {
        const normalized: CreateDevicePayload = {
          ...payload,
          state: payload.state ? (payload.state as string).toLowerCase() as DeviceState : undefined,
        };
        console.log('[devices] addDevice outgoing state =', normalized.state);
        const response = await fetch("/api/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(normalized),
        });

        if (!response.ok) {
          const details = await response.json().catch(() => null);
          throw new Error(details?.message ?? "Failed to add device");
        }

        await loadDevices();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add device");
      } finally {
        setMutating(false);
      }
    },
    [loadDevices],
  );

  const bulkAddDevices = useCallback(
    async (items: CreateDevicePayload[]) => {
      setMutating(true);
      setError(null);
      try {
        const normalizedItems = items.map((it) => ({
          ...it,
          state: it.state ? (it.state as string).toLowerCase() as DeviceState : undefined,
        }));
        console.log('[devices] bulkAddDevices outgoing states =', normalizedItems.map(d => d.state));
        const response = await fetch("/api/devices/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ devices: normalizedItems }),
        });

        if (!response.ok) {
          const details = await response.json().catch(() => null);
          throw new Error(details?.message ?? "Failed to import devices");
        }

        const summary = await response.json();
        await loadDevices();
        return summary as {
          total: number;
          created: number;
          failed: number;
          results: Array<{ index: number; status: string; id?: string; error?: string }>;
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import devices");
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [loadDevices],
  );

  const updateDevice = useCallback(
    async (deviceId: string, payload: Partial<CreateDevicePayload>) => {
      setMutating(true);
      setError(null);
      try {
        const normalized: Partial<CreateDevicePayload> = {
          ...payload,
          state: payload.state ? (payload.state as string).toLowerCase() as DeviceState : undefined,
        };
        console.log('[devices] updateDevice outgoing state =', normalized.state);
        const response = await fetch(`/api/devices/${deviceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(normalized),
        });

        if (!response.ok) {
          const details = await response.json().catch(() => null);
          throw new Error(details?.message ?? "Failed to update device");
        }

        await loadDevices();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update device");
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [loadDevices],
  );

  const removeDevice = useCallback(
    async (deviceId: string) => {
      setMutating(true);
      setError(null);
      try {
        const response = await fetch(`/api/devices/${deviceId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const details = await response.json().catch(() => null);
          throw new Error(details?.message ?? "Failed to remove device");
        }
        await loadDevices();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove device");
      } finally {
        setMutating(false);
      }
    },
    [loadDevices],
  );

  const getDeviceDetail = useCallback(async (deviceId: string) => {
    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.message ?? "Failed to get device");
      }

      return (await response.json()) as DeviceDetail;
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to get device");
    }
  }, []);

  return {
    devices,
    loading,
    error,
    mutating,
    refresh: loadDevices,
    addDevice,
    bulkAddDevices,
    removeDevice,
    updateDevice,
    getDeviceDetail,
  };
}
