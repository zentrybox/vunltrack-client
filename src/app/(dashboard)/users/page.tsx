'use client';

import { useState } from "react";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";
import CoalTable from "@/components/CoalTable";
import StatusBadge from "@/components/StatusBadge";
import { useUsers } from "@/hooks/useUsers";
import type { CreateCollaboratorPayload } from "@/lib/types";
import { formatDateLabel } from "@/lib/utils";

const initialForm: CreateCollaboratorPayload = {
  name: "",
  email: "",
  password: "",
};

export default function UsersPage() {
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
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => removeUser(user.id)}
                  isLoading={mutating}
                >
                  Remove
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
            <label className="text-sm font-semibold text-gray-700" htmlFor="name">
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
            <label className="text-sm font-semibold text-gray-700" htmlFor="email">
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
            <label className="text-sm font-semibold text-gray-700" htmlFor="password">
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
