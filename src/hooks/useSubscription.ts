'use client';

import { useCallback, useEffect, useState } from "react";

import type {
  SubscriptionSimulation,
  SubscriptionStatus,
} from "@/lib/types";

interface SubscriptionResponse {
  subscription: SubscriptionStatus;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/subscription", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load subscription");
      }
      const data = (await response.json()) as SubscriptionResponse;
      setSubscription(data.subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const simulateChange = useCallback(
    async (targetPlan: SubscriptionStatus["plan"]) => {
      setMutating(true);
      try {
        const response = await fetch("/api/subscription/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPlan }),
        });
        if (!response.ok) {
          const details = await response.json().catch(() => null);
          throw new Error(details?.message ?? "Simulation failed");
        }
        const data = (await response.json()) as { simulation: SubscriptionSimulation };
        return data.simulation;
      } finally {
        setMutating(false);
      }
    },
    [],
  );

  return { subscription, loading, error, mutating, refresh: loadStatus, simulateChange };
}
