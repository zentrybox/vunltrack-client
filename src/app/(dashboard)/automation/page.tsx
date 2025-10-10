'use client';

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";

type ScanSchedule = {
  id: string;
  name: string;
  cadence: string;
  status: "ACTIVE" | "PAUSED";
};

const schedules: ScanSchedule[] = [
  {
    id: "weekly-core",
    name: "Weekly core sweep",
    cadence: "Every Monday 02:00 UTC",
    status: "ACTIVE" as const,
  },
  {
    id: "daily-delta",
    name: "Delta diff scan",
    cadence: "Daily 23:00 UTC",
    status: "PAUSED" as const,
  },
];

export default function AutomationPage() {
  return (
    <div className="space-y-8">
      <CoalCard
        title="Scan automation"
        subtitle="Manage scheduled sweeps and continuous monitoring"
        action={
          <CoalButton variant="primary" size="sm">
            New schedule
          </CoalButton>
        }
      >
        <CoalTable
          data={schedules}
          isLoading={false}
          columns={[
            {
              key: "name",
              header: "Workflow",
              render: (item) => (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.cadence}</p>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (item) => (
                <StatusBadge tone={item.status === "ACTIVE" ? "safe" : "warning"}>
                  {item.status}
                </StatusBadge>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              align: "right",
              render: () => (
                <CoalButton variant="ghost" size="sm">
                  Run now
                </CoalButton>
              ),
            },
          ]}
        />
      </CoalCard>
      <CoalCard
        title="Automation policy"
        subtitle="Define escalation rules for detected vulnerabilities"
      >
        <div className="space-y-4 text-sm text-gray-600">
          <p>
            Configure guardrails to automatically raise incidents, tag devices, or notify external systems when
            severity thresholds are reached. Integrate with Slack, PagerDuty, or SIEM targets.
          </p>
          <CoalButton variant="secondary" size="sm">
            Configure escalation matrix
          </CoalButton>
        </div>
      </CoalCard>
    </div>
  );
}
