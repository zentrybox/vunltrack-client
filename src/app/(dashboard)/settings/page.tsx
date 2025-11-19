'use client';

import Link from "next/link";
import { useMemo, useState } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import { useSubscription } from "@/hooks/useSubscription";
import type { SubscriptionSimulation, SubscriptionStatus } from "@/lib/types";
import { formatDateLabel } from "@/lib/utils";

const quickLinks = [
  {
    href: "/scans",
    label: "Scans",
    description: "Launch ad-hoc assessments and inspect results.",
  },
  {
    href: "/incidents",
    label: "Incidents",
    description: "Coordinate remediation steps across the team.",
  },
  {
    href: "/users",
    label: "User directory",
    description: "Invite collaborators and manage access roles.",
  },
];

// Audit entries will be derived from current admin inviting collaborators.

const plans: SubscriptionStatus["plan"][] = ["BASIC", "STANDARD", "ENTERPRISE"];

export default function SettingsPage() {
  const { user: authUser } = useAuth();
  const {
    subscription,
    loading: subscriptionLoading,
    error: subscriptionError,
    simulateChange,
    mutating: subscriptionMutating,
    refresh: refreshSubscription,
  } = useSubscription();
  const { users: collaborators } = useUsers();
  

  const [targetPlan, setTargetPlan] = useState<SubscriptionStatus["plan"]>("STANDARD");
  const [simulation, setSimulation] = useState<SubscriptionSimulation | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const usageSummary = useMemo(() => {
    if (!subscription) return [];
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
      <CoalCard title="Tenant controls" subtitle="Shortcut to the most-used operational tools">
        <div className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((link) => {
            const initials = link.label
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((segment) => segment[0]?.toUpperCase())
              .join("");

            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">
                  {initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{link.label}</p>
                  <p className="text-xs text-gray-500">{link.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CoalCard>

      <CoalCard
        title="Subscription overview"
        subtitle="Track plan allocation, usage, and scenario testing"
        action={
          <CoalButton variant="secondary" size="sm" onClick={refreshSubscription}>
            Refresh data
          </CoalButton>
        }
      >
        {subscriptionError ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {subscriptionError}
          </p>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                  Current plan
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {subscriptionLoading ? "Loading…" : subscription?.plan ?? "—"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {plans.map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => setTargetPlan(plan)}
                    className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
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
            <p className="text-sm text-slate-200 font-semibold">
              Plans unlock higher device and user capacity, priority alerting, and dedicated support. Simulate changes
              before committing to ensure your tenant remains within limits.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {usageSummary.map((item) => (
                <div key={item.id} className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {item.label}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {item.used}
                    {item.limit !== null ? ` / ${item.limit}` : " / ∞"}
                  </p>
                  <StatusBadge tone={item.canAdd ? "safe" : "warning"}>
                    {item.canAdd ? "Capacity available" : "Limit reached"}
                  </StatusBadge>
                </div>
              ))}
            </div>
            <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Simulate plan change
              </p>
              {simulationError ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {simulationError}
                </p>
              ) : null}
              <CoalButton
                variant="primary"
                size="sm"
                onClick={handleSimulate}
                isLoading={subscriptionMutating}
                disabled={!subscription}
                className="w-fit"
              >
                Simulate {targetPlan}
              </CoalButton>
              {simulation ? (
                <div className="space-y-4 text-sm text-gray-700">
                  <StatusBadge tone={simulation.allowed ? "safe" : "warning"}>
                    {simulation.allowed ? "Change allowed" : "Action required"}
                  </StatusBadge>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Current usage</p>
                      <p>Users: {simulation.usage.users}</p>
                      <p>Devices: {simulation.usage.devices}</p>
                    </div>
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Target capacity</p>
                      <p>Users: {simulation.targetLimits.userLimit ?? "∞"}</p>
                      <p>Devices: {simulation.targetLimits.deviceLimit ?? "∞"}</p>
                    </div>
                  </div>
                  {simulation.reasons.length > 0 ? (
                    <ul className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-700">
                      {simulation.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-black">Plan capabilities</span>
            </p>
            <ul className="space-y-3 text-sm text-slate-200">
              <li className="text-black">• API rate limits scale with plan tier.</li>
              <li className="text-black">• Dedicated Slack channel available on ENTERPRISE.</li>
              <li className="text-black">• Incident SLA drops to 30 minutes on STANDARD and above.</li>
            </ul>
          </div>
        </div>
      </CoalCard>

      {/* Reports library templates hidden per request; incidents flow will use its existing template logic. */}

      {/* Audit log: visible only to account administrator (ROOT/ADMIN) */}
      {authUser && (authUser.role === 'ROOT' || authUser.role === 'ADMIN') ? (
        <CoalCard title="Audit log" subtitle="Recent administrative activity">
          <CoalTable
            data={collaborators
              .filter((u) => u.id !== authUser.id)
              .map((u) => ({
                id: u.id,
                actor: authUser.name,
                action: `Invited ${u.name || u.email}`,
                timestamp: u.createdAt,
              }))}
            isLoading={false}
            columns={[
              {
                key: "actor",
                header: "Actor",
                render: (item) => (
                  <span className="text-sm text-gray-900">{item.actor}</span>
                ),
              },
              {
                key: "action",
                header: "Action",
                render: (item) => (
                  <span className="text-xs text-slate-200 font-medium">{item.action}</span>
                ),
              },
              {
                key: "timestamp",
                header: "Timestamp",
                render: (item) => (
                  <span className="text-xs text-slate-200 font-medium">{formatDateLabel(item.timestamp)}</span>
                ),
              },
            ]}
            emptyState="No invitations yet."
          />
        </CoalCard>
      ) : null}
    </div>
  );
}
