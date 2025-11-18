'use client';

import { useState } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import type { CreateCollaboratorPayload } from "@/lib/types";
import { formatDateLabel } from "@/lib/utils";

const initialForm: CreateCollaboratorPayload = {
  name: "",
  email: "",
  password: "",
};

export default function UsersPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { users, loading, mutating, error, addUser, removeUser } = useUsers();
  const [form, setForm] = useState<CreateCollaboratorPayload>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setFormError("All fields are required");
      return;
    }
    setFormError(null);
    await addUser(form);
    setForm(initialForm);
  };

  // If not admin/root, show access message only
  if (!authLoading && authUser && authUser.role !== 'ROOT' && authUser.role !== 'ADMIN') {
    return (
      <div className="space-y-8">
        <CoalCard title="User directory" subtitle="Collaborators and access">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You do not have access to this section. Only the account administrator can manage the user directory.
          </div>
        </CoalCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CoalCard
        title="Operators"
        subtitle="Manage tenant collaborators and access levels"
        action={
          <CoalButton
            variant="primary"
            size="sm"
            form="user-form"
            type="submit"
            isLoading={mutating}
          >
            Invite user
          </CoalButton>
        }
      >
        {error ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <CoalTable
          data={users}
          isLoading={loading}
          columns={[
            {
              key: "name",
              header: "User",
              render: (user) => (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (user) => (
                <StatusBadge tone={user.role === "ROOT" ? "info" : "neutral"}>{user.role}</StatusBadge>
              ),
            },
            {
              key: "createdAt",
              header: "Joined",
              render: (user) => (
                <span className="text-xs text-gray-500">
                  {formatDateLabel(user.createdAt)}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (user) => (
                <CoalButton
                  variant="ghost"
                  size="icon"
                  aria-label="Remove user"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => removeUser(user.id)}
                  isLoading={mutating}
                >
                  {/* Basurero SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5v5m5-5v5M3.75 6.25h12.5M5.5 6.25v8.75a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6.25m-7.5 0V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.25" />
                  </svg>
                </CoalButton>
              ),
            },
          ]}
          emptyState="Invite your first collaborator to delegate operations."
        />
      </CoalCard>

      <CoalCard title="Invite collaborator" subtitle="Manual enrollment">
        <form id="user-form" className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Sasha Moreno"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="operator@tenant.io"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200" htmlFor="password">
              Temporary password
            </label>
            <input
              id="password"
              name="password"
              type="text"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Generate or paste"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </form>
        {formError ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {formError}
          </p>
        ) : null}
      </CoalCard>
    </div>
  );
}
