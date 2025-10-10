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
    label: "Scans",
    href: "/scans",
  },
  {
    label: "Incidents",
    href: "/incidents",
  },
  {
    label: "Device Inventory",
    href: "/devices",
  },
  {
    label: "Scheduling",
    href: "/scheduling",
  },
  {
    label: "User Directory",
    href: "/users",
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
    <>
      <div className="hidden min-h-screen w-full bg-gray-100 text-gray-900 lg:flex">
        {/* Fixed Sidebar */}
        <div className="fixed left-0 top-0 z-40 h-screen w-[280px] flex-shrink-0">
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
        </div>

        {/* Main Content Area */}
        <div className="ml-[280px] flex min-h-screen flex-1 flex-col">
          <TopBar userName={session.user?.name} />
          <main className="flex-1 overflow-y-auto px-6 pb-12 pt-10">
            <div className="mx-auto w-full max-w-[1440px] space-y-8">{children}</div>
          </main>
        </div>
      </div>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center text-white lg:hidden">
        <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
          Desktop experience only
        </span>
        <h2 className="text-2xl font-semibold">Use a larger screen</h2>
        <p className="max-w-sm text-sm text-gray-300">
          VulnTrack is optimised for desktop resolutions. Please access the dashboard from a device with a wider
          display.
        </p>
      </div>
    </>
  );
}
