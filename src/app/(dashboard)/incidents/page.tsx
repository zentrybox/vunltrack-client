'use client';

import { useMemo, type ComponentProps } from "react";
import Link from "next/link";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useIncidents } from "@/hooks/useIncidents";
import type { IncidentStatus } from "@/lib/types";
import { formatDateLabel } from "@/lib/utils";

const statusTone: Record<IncidentStatus, ComponentProps<typeof StatusBadge>["tone"]> = {
  open: "critical",
  in_progress: "warning",
  escalated: "warning",
  resolved: "safe",
  closed: "neutral",
  false_positive: "neutral",
};

const statusOrder: IncidentStatus[] = [
  "open",
  "in_progress",
  "escalated",
  "resolved",
  "closed",
  "false_positive",
];

const statusLabel = (status: string) =>
  status
    .replace(/_/g, " ")
    .replace(/(^|\s)(\w)/g, (_, space, letter: string) => `${space}${letter.toUpperCase()}`);

export default function IncidentsPage() {
  const { incidents, loading, error } = useIncidents();

  const sortedIncidents = useMemo(
    () =>
      incidents
        .slice()
        .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)),
    [incidents],
  );

  return (
    <div className="space-y-8">
      <CoalCard
        title="Incident queue"
        subtitle="Prioritised vulnerabilities requiring action"
      >
        {error ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <CoalTable
          data={sortedIncidents}
          isLoading={loading}
          columns={[
            {
              key: "scanId",
              header: "Scan",
              render: (incident) => (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{incident.scanId}</p>
                  <p className="text-xs text-gray-500">Device {incident.deviceId}</p>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (incident) => (
                <StatusBadge
                  tone={
                    statusTone[(incident.status as string).toLowerCase() as IncidentStatus] ??
                    "neutral"
                  }
                >
                  {statusLabel(incident.status)}
                </StatusBadge>
              ),
            },
            {
              key: "assignedTo",
              header: "Owner",
              render: (incident) => (
                <span className="text-xs text-gray-700">
                  {incident.assignedTo ?? "Unassigned"}
                </span>
              ),
            },
            {
              key: "updatedAt",
              header: "Updated",
              render: (incident) => (
                <span className="text-xs text-gray-500">
                  {formatDateLabel(incident.updatedAt)}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (incident) => (
                <Link href={`/incidents/${incident.id}`}>
                  <CoalButton variant="secondary" size="sm" className="min-w-[96px]">
                    View Details
                  </CoalButton>
                </Link>
              ),
            },
          ]}
          emptyState="No incidents detected. You're in the clear."
        />
      </CoalCard>
    </div>
  );
}
