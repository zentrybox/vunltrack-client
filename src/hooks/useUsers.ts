'use client';

import { useCallback, useEffect, useState } from "react";

import type {
  CollaboratorRecord,
  CreateCollaboratorPayload,
} from "@/lib/types";

interface UsersResponse {
  users: CollaboratorRecord[];
}

export function useUsers() {
  const [users, setUsers] = useState<CollaboratorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load users");
      }
      const data = (await response.json()) as UsersResponse;
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const addUser = useCallback(
    async (payload: CreateCollaboratorPayload) => {
      setMutating(true);
      setError(null);
      try {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const details = await response.json().catch(() => null);
          throw new Error(details?.message ?? "Failed to create user");
        }
        await loadUsers();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create user");
      } finally {
        setMutating(false);
      }
    },
    [loadUsers],
  );

  const removeUser = useCallback(
    async (id: string) => {
      setMutating(true);
      setError(null);
      try {
        const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
        if (!response.ok) {
          const details = await response.json().catch(() => null);
          throw new Error(details?.message ?? "Failed to remove user");
        }
        await loadUsers();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove user");
      } finally {
        setMutating(false);
      }
    },
    [loadUsers],
  );

  return { users, loading, mutating, error, refresh: loadUsers, addUser, removeUser };
}
