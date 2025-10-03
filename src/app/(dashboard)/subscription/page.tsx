'use client';

import { useMemo, useState } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import StatusBadge from "@/components/StatusBadge";
import { useSubscription } from "@/hooks/useSubscription";
import type { SubscriptionSimulation, SubscriptionStatus } from "@/lib/types";

const plans: SubscriptionStatus["plan"][] = ["BASIC", "STANDARD", "ENTERPRISE"];

export default function SubscriptionPage() {
  const { subscription, loading, error, simulateChange, mutating } = useSubscription();
  const [targetPlan, setTargetPlan] = useState<SubscriptionStatus["plan"]>("STANDARD");
  const [simulation, setSimulation] = useState<SubscriptionSimulation | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const usageSummary = useMemo(() => {
    if (!subscription) return null;
    return [
      {
        id: "users",
        label: "Users",
        used: subscription.usage.users,
        limit: subscription.limits.userLimit,
        canAdd: subscription.canAddUser,
      },
      {
        id: "devices",
        label: "Devices",
        used: subscription.usage.devices,
        limit: subscription.limits.deviceLimit,
        canAdd: subscription.canAddDevice,
      },
    ];
  }, [subscription]);

  const handleSimulate = async () => {
    setSimulationError(null);
    try {
      const result = await simulateChange(targetPlan);
      setSimulation(result);
    } catch (err) {
      setSimulation(null);
      setSimulationError(err instanceof Error ? err.message : "Simulation failed");
    }
  };

  return (
    <div className="space-y-8">
      <CoalCard
        title="Subscription overview"
        subtitle="VulnTrack plan allocation"
        action={
          <CoalButton
            variant="secondary"
            size="sm"
            onClick={handleSimulate}
            isLoading={mutating}
          >
            Simulate change
          </CoalButton>
        }
      >
        {error ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-gray-900">
              {loading ? "Loading…" : subscription?.plan ?? "—"}
            </h3>
            <p className="text-sm text-gray-600">
              Plans unlock higher device and user capacity, priority alerting, and dedicated support.
            </p>
            <div className="flex flex-wrap gap-3">
              {plans.map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setTargetPlan(plan)}
                  className={`rounded-md border px-4 py-2 text-sm transition ${
                    targetPlan === plan
                      ? "border-blue-500 bg-blue-100 text-blue-700"
                      : "border-gray-300 text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {plan}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-5">
            <h4 className="text-base font-semibold text-gray-900">Usage</h4>
            {usageSummary?.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {item.used}
                    {item.limit !== null ? ` / ${item.limit}` : " / ∞"}
                  </p>
                </div>
                <StatusBadge tone={item.canAdd ? "safe" : "warning"}>
                  {item.canAdd ? "Capacity" : "Limit reached"}
                </StatusBadge>
              </div>
            ))}
          </div>
        </div>
      </CoalCard>

      {simulationError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {simulationError}
        </p>
      ) : null}

      {mutating ? (
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-400" aria-hidden />
          Calculating scenario…
        </div>
      ) : simulation ? (
        <CoalCard title="Simulation result" subtitle={`Target plan: ${simulation.targetPlan}`}>
          <div className="space-y-4">
            <StatusBadge tone={simulation.allowed ? "safe" : "warning"}>
              {simulation.allowed ? "Change allowed" : "Action required"}
            </StatusBadge>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Current usage</p>
                <p className="text-sm text-gray-700">
                  Users: {simulation.usage.users}, Devices: {simulation.usage.devices}
                </p>
              </div>
              <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Target limits</p>
                <p className="text-sm text-gray-700">
                  Users: {simulation.targetLimits.userLimit ?? "∞"}, Devices: {simulation.targetLimits.deviceLimit ?? "∞"}
                </p>
              </div>
            </div>
            {simulation.reasons.length > 0 ? (
              <div className="space-y-2">
                <p className="text-base font-semibold text-gray-900">Notes</p>
                <ul className="space-y-1 text-sm text-amber-700">
                  {simulation.reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="mt-1 inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-amber-500"
                      />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </CoalCard>
      ) : null}
    </div>
  );
}
