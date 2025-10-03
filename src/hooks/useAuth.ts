'use client';

import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";

interface SessionResponse {
  user?: AuthUser;
  tenantId?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/session", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load session");
      }

      const data = (await response.json()) as SessionResponse;
      setUser(data.user ?? null);
      setTenantId(data.tenantId ?? null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setUser(null);
      setTenantId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setTenantId(null);
  }, []);

  return { user, tenantId, loading, error, refresh: fetchSession, logout };
}
