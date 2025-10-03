import type { ReactNode } from "react";

import CoalSidebar from "@/components/CoalSidebar";
import TopBar from "@/components/TopBar";
import StatusBadge from "@/components/StatusBadge";
import { requireSession } from "@/lib/auth";

const navigation = [
  {
    label: "Command Center",
    href: "/dashboard",
  },
  {
    label: "Device Inventory",
    href: "/devices",
  },
  {
    label: "User Directory",
    href: "/users",
  },
  {
    label: "Vulnerability Radar",
    href: "/radar",
  },
  {
    label: "Scan Automation",
    href: "/automation",
  },
  {
    label: "Reports",
    href: "/reports",
  },
  {
    label: "Subscription",
    href: "/subscription",
  },
  {
    label: "Settings",
    href: "/settings",
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      <CoalSidebar
        tenantName={session.user?.tenantName ?? "Tenant"}
        userName={session.user?.name}
        items={navigation.map((item) => ({
          label: item.label,
          href: item.href,
          badge:
            item.href === "/dashboard" ? (
              <StatusBadge tone="info">Live</StatusBadge>
            ) : undefined,
        }))}
      />
      <div className="flex w-full flex-col">
        <TopBar userName={session.user?.name} />
        <main className="flex-1 px-6 pb-12 pt-10">
          <div className="mx-auto w-full max-w-[1440px] space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
