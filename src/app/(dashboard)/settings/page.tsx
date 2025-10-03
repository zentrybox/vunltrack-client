'use client';

import Link from "next/link";

import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import { formatDateLabel } from "@/lib/utils";

const settingLinks = [
  {
    href: "/users",
    label: "User directory",
    description: "Invite, revoke, or update collaborator roles.",
  },
  {
    href: "/subscription",
    label: "Subscription",
    description: "Track plan usage and simulate downgrades.",
  },
  {
    href: "/automation",
    label: "Automation policies",
    description: "Harden escalation routes for high impact findings.",
  },
  {
    href: "/reports",
    label: "Integrations",
    description: "Connect SIEM, SOAR, and ticketing workflows.",
  },
];

const auditLog = [
  {
    id: "log-1",
    actor: "Sasha Moreno",
    action: "Updated scan cadence",
    timestamp: "2025-10-02T12:21:00.000Z",
  },
  {
    id: "log-2",
    actor: "Alex Singh",
    action: "Invited collaborator",
    timestamp: "2025-10-02T10:12:00.000Z",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <CoalCard title="Tenant settings" subtitle="Administrative controls for VulnTrack">
        <div className="grid gap-4 md:grid-cols-2">
          {settingLinks.map((item) => {
            const initials = item.label
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((segment) => segment[0]?.toUpperCase())
              .join("");

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">
                  {initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CoalCard>

      <CoalCard title="Audit log" subtitle="Recent administrative activity">
        <CoalTable
          data={auditLog}
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
                <span className="text-xs text-gray-500">{item.action}</span>
              ),
            },
            {
              key: "timestamp",
              header: "Timestamp",
              render: (item) => (
                <span className="text-xs text-gray-500">
                  {formatDateLabel(item.timestamp)}
                </span>
              ),
            },
          ]}
        />
      </CoalCard>
    </div>
  );
}
