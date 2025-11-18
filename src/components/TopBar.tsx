'use client';

import { useState, memo, useCallback } from "react";
// import Link from "next/link";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/icons";

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
  <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-white/5 px-6 shadow-sm backdrop-blur">
      <div className="flex items-center space-x-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/80">
            VulnTrack Command
          </p>
          <h2 className="text-sm font-semibold text-white/90">
            Active perimeter monitoring
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Quick actions removed per request */}
        <div className="relative">
          <button
            type="button"
            onClick={toggleMenu}
            className={cn(
              "flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10",
              menuOpen && "bg-white/10",
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-base font-semibold text-white">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold text-white/90">
                {userName ?? "Analyst"}
              </span>
              <span className="block text-xs text-white/70">Security Lead</span>
            </span>
            <Icon name="chevron-down" className="h-4 w-4 text-white/70" aria-hidden />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 mt-2 w-48 rounded-md border border-white/10 bg-white/5 p-2 text-sm text-white/90 shadow-lg backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void handleSignOut();
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="sign-out" className="h-4 w-4" />
                  {signingOut ? "Signing out…" : "Sign out"}
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
