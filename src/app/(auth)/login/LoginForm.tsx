'use client';

import { useActionState } from "react";
import Link from "next/link";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";

import { authenticate, type LoginFormState } from "./actions";

const initialState: LoginFormState = { status: "idle" };

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(authenticate, initialState);

  return (
    <CoalCard
      title="VulnTrack Access"
      subtitle="Authenticate with your operator credentials to enter the command center."
    >
      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="analyst@tenant.io"
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-semibold text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        {state.status === "error" ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.message ?? "Login failed. Please verify your credentials."}
          </p>
        ) : null}
        <CoalButton type="submit" className="w-full" isLoading={isPending} disabled={isPending}>
          Enter Command Center
        </CoalButton>
  <p className="text-center text-sm text-gray-600">
          First time tenant?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Create a root account
          </Link>
        </p>
      </form>
    </CoalCard>
  );
}
