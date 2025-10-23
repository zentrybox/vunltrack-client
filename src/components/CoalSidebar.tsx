'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, memo, type ReactNode } from "react";

import { cn } from "@/lib/utils";

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
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150",
        "hover:bg-gray-900/10 dark:hover:bg-blue-950/40 hover:scale-[1.02]",
        isActive
          ? "bg-gray-900/5 dark:bg-blue-950/60 text-gray-900 dark:text-blue-100 border-l-4 border-gray-900 dark:border-blue-400 shadow"
          : "text-gray-600 dark:text-blue-300 border-l-4 border-transparent",
      )}
      data-active={isActive}
      aria-current={isActive ? "page" : undefined}
    >
      <span className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700",
        isActive && "ring-2 ring-gray-900 dark:ring-blue-400"
      )}>
        {item.initials || "·"}
      </span>
      <span className="flex flex-1 flex-col text-left">
        <span className={cn("text-base font-semibold tracking-tight", isActive ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-200")}>{item.label}</span>
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
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400 drop-shadow-sm">
          {tenantName ?? "VulnTrack"}
        </p>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Network Command Center</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Active perimeter monitoring</p>
      </div>
      <div className="mt-8 flex-1 space-y-2 overflow-y-auto px-3 pb-12 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-800 dark:scrollbar-track-gray-900">
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
      <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-6 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Operator</p>
        <p className="text-base font-bold text-gray-900 dark:text-white">{userName ?? "Analyst"}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Secure channel</p>
        {/* Espacio para selector de tema en el futuro */}
      </div>
    </nav>
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-gray-200 dark:border-gray-900 bg-white dark:bg-black text-gray-900 dark:text-white shadow-xl">
      <div className="flex h-full w-full flex-col">{content}</div>
    </aside>
  );
});

export default CoalSidebar;
