'use client';

import { useState, memo, useCallback } from "react";
import Link from "next/link";

import CoalButton from "@/components/CoalButton";
import { cn } from "@/lib/utils";

interface TopBarProps {
  userName?: string;
  onSignOut?: () => void;
}

const TopBar = memo(function TopBar({ userName, onSignOut }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const initials = userName
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("") ?? "A";

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (onSignOut) {
        onSignOut();
      } else {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }
    } finally {
      setSigningOut(false);
    }
  }, [signingOut, onSignOut]);

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gray-500">
            VulnTrack Command
          </p>
          <h2 className="text-sm font-semibold text-gray-900">
            Active perimeter monitoring
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/scans">
          <CoalButton variant="primary" size="sm">
            Start scan
          </CoalButton>
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={toggleMenu}
            className={cn(
              "flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50",
              menuOpen && "bg-gray-100",
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-600">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold text-gray-900">
                {userName ?? "Analyst"}
              </span>
              <span className="block text-xs text-gray-500">Security Lead</span>
            </span>
            <span className="text-xs text-gray-500">▾</span>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white p-2 text-sm text-gray-700 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void handleSignOut();
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                <span>{signingOut ? "Signing out…" : "Sign out"}</span>
                <span aria-hidden className="text-xs text-gray-400">
                  ⌦
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
});

export default TopBar;
