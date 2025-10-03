'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

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

export default function CoalSidebar({ tenantName, userName, items }: CoalSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          {tenantName ?? "VulnTrack"}
        </p>
        <h1 className="text-xl font-semibold text-gray-900">Network Command Center</h1>
        <p className="text-sm text-gray-600">Active perimeter monitoring</p>
      </div>
      <div className="mt-8 flex-1 space-y-2 overflow-y-auto px-3 pb-12">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (pathname ?? "").startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors",
                isActive && "bg-gray-100 text-gray-900"
              )}
              data-active={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-600">
                {item.initials || "·"}
              </span>
              <span className="flex flex-1 flex-col text-left">
                <span className="text-sm font-semibold text-gray-900">
                  {item.label}
                </span>
              </span>
              {item.badge}
            </Link>
          );
        })}
      </div>
      <div className="border-t border-gray-200 px-6 py-6 text-sm text-gray-600">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
          Operator
        </p>
        <p className="text-sm font-semibold text-gray-900">{userName ?? "Analyst"}</p>
        <p className="text-xs text-gray-500">Secure channel</p>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="hidden h-screen w-[280px] flex-shrink-0 border-r border-gray-200 bg-white text-gray-900 lg:flex">
        <div className="flex h-full w-full flex-col">{content}</div>
      </aside>
      <div className="lg:hidden">
        <button
          type="button"
          aria-label="Toggle navigation"
          className="absolute left-4 top-4 z-50 rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-700 shadow-sm"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[260px] border-r border-gray-200 bg-white text-gray-900 transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col">{content}</div>
        </div>
        {mobileOpen ? (
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}
      </div>
    </>
  );
}
