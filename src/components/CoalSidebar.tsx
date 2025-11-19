'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, memo, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/icons";

export interface SidebarItem {
  label: string;
  href: string;
  badge?: ReactNode;
}

interface CoalSidebarProps {
  tenantName?: string;
  userName?: string;
  items: SidebarItem[];
}

const SidebarItem = memo(function SidebarItem({
  item,
  isActive,
}: {
  item: SidebarItem & { initials: string };
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150",
        "hover:bg-white/10 hover:scale-[1.02]",
        isActive
          ? "bg-[rgba(30,144,255,0.06)] text-[var(--color-text-primary)] border-l-4 border-[var(--color-accent1)] ring-1 ring-[var(--color-accent1)]/10"
          : "text-[var(--color-text-secondary)] border-l-4 border-transparent",
      )}
      data-active={isActive}
      aria-current={isActive ? "page" : undefined}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xs font-bold text-white",
          isActive && "ring-electric"
        )}
        aria-hidden
      >
  <Icon name={labelToIcon(item.label)} className="h-4 w-4 text-[var(--color-accent1)]" />
      </span>
      <span className="flex flex-1 flex-col text-left">
        <span className={cn("text-base font-semibold tracking-tight", isActive ? "text-white" : "text-white/90")}>
          {item.label}
        </span>
      </span>
      {item.badge}
    </Link>
  );
});

const CoalSidebar = memo(function CoalSidebar({ tenantName, userName, items }: CoalSidebarProps) {
  const pathname = usePathname();

  const navItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        initials: item.label
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((segment) => segment[0]?.toUpperCase())
          .join(""),
      })),
    [items],
  );

  const content = (
    <nav className="flex h-full flex-col">
      <div className="space-y-2 px-6 pt-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/80 drop-shadow-sm">
          {tenantName ?? "VulnTrack"}
        </p>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Network Command Center</h1>
        <p className="text-sm text-white/80">Active perimeter monitoring</p>
      </div>
  <div className="mt-8 flex-1 space-y-2 overflow-y-auto px-3 pb-12 min-h-0 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-white/10">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (pathname ?? "").startsWith(`${item.href}/`);
          return (
            <SidebarItem
              key={item.href}
              item={item}
              isActive={isActive}
            />
          );
        })}
      </div>
      <div className="border-t px-6 py-6 text-sm" style={{ borderColor: 'rgba(255,255,255,0.04)', color: 'var(--color-text-secondary)', backgroundColor: 'transparent' }}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Operator</p>
        <p className="text-base font-bold text-white">{userName ?? "Analyst"}</p>
        <p className="text-xs text-white/70">Secure channel</p>
        {/* Espacio para selector de tema en el futuro */}
      </div>
    </nav>
  );

  return (
    <aside
      className="flex h-full w-full flex-col border-r text-white shadow-xl surface"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex h-full w-full flex-col">{content}</div>
    </aside>
  );
});

export default CoalSidebar;

function labelToIcon(label: string): import("./icons").IconName {
  const key = label.toLowerCase();
  if (key.includes("inventory") || key.includes("devices")) return "devices";
  if (key.includes("radar")) return "radar";
  if (key.includes("scan")) return "scans";
  if (key.includes("automation")) return "automation";
  if (key.includes("report")) return "reports";
  if (key.includes("incident")) return "incidents";
  if (key.includes("user")) return "users";
  if (key.includes("setting")) return "settings";
  if (key.includes("subscription")) return "subscription";
  if (key.includes("dashboard") || key.includes("command")) return "dashboard";
  return "dashboard";
}
