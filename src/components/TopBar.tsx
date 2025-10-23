'use client';

import { useState, memo, useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";

import CoalButton from "@/components/CoalButton";
import { cn } from "@/lib/utils";

interface TopBarProps {
  userName?: string;
  onSignOut?: () => void;
}

const TopBar = memo(function TopBar({ userName, onSignOut }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 dark:border-blue-900 bg-white dark:bg-blue-950 px-6 shadow-sm dark:shadow-blue-900/40">
      <div className="flex items-center space-x-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gray-500 dark:text-blue-300">
            VulnTrack Command
          </p>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-blue-100">
            Active perimeter monitoring
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Theme toggle button */}
        <button
          type="button"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleTheme}
          className={cn(
            "inline-flex items-center justify-center rounded-full border border-gray-200 bg-white dark:bg-gray-900 p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150 mr-2 shadow-sm"
          )}
        >
          {theme === 'dark' ? (
            // Sol (light mode)
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <circle cx="10" cy="10" r="4" fill="currentColor" />
              <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" d="M10 2v2m0 12v2m8-8h-2M4 10H2m14.142-4.142l-1.414 1.414M5.272 5.272L3.858 3.858m12.284 12.284l-1.414-1.414M5.272 14.728l-1.414 1.414" />
            </svg>
          ) : (
            // Luna (dark mode)
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" d="M17 13a7 7 0 1 1-7-7c0 .34.03.67.08 1A5 5 0 0 0 13 17c.33.05.66.08 1 .08a7 7 0 0 0 3-4.08Z" />
            </svg>
          )}
        </button>
        <CoalButton variant="ghost" size="sm" className="hidden md:inline-flex">
          Export CSV
        </CoalButton>
        <CoalButton variant="secondary" size="sm" className="hidden sm:inline-flex">
          Pause scans
        </CoalButton>
        <CoalButton variant="primary" size="sm">
          Start scan
        </CoalButton>
        <div className="relative">
          <button
            type="button"
            onClick={toggleMenu}
            className={cn(
              "flex items-center gap-3 rounded-md border border-gray-200 bg-white dark:bg-gray-900 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800",
              menuOpen && "bg-gray-100 dark:bg-gray-800",
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-base font-semibold text-blue-600 dark:text-blue-200">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                {userName ?? "Analyst"}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Security Lead</span>
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">▾</span>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 dark:border-blue-900 bg-white dark:bg-blue-950 p-2 text-sm text-gray-700 dark:text-gray-100 shadow-lg dark:shadow-blue-900/40">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void handleSignOut();
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
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
