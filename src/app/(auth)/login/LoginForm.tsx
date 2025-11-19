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
          <label htmlFor="email" className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="analyst@tenant.io"
            className="w-full rounded-md px-4 py-2 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(30,144,255,0.12)', color: 'var(--color-text-primary)' }}
            aria-label="email"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full rounded-md px-4 py-2 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(30,144,255,0.12)', color: 'var(--color-text-primary)' }}
            aria-label="password"
          />
        </div>
        {state.status === "error" ? (
          <p className="rounded-md px-3 py-2 text-sm" style={{ border: '1px solid var(--color-alert)', backgroundColor: 'rgba(255,0,255,0.06)', color: 'var(--color-text-primary)' }}>
            {state.message ?? "Login failed. Please verify your credentials."}
          </p>
        ) : null}
        <CoalButton type="submit" className="w-full" isLoading={isPending} disabled={isPending}>
          Enter Command Center
        </CoalButton>
  <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          First time tenant?{' '}
          <Link href="/register" style={{ color: 'var(--color-accent1)' }} className="hover:underline">
            Create a root account
          </Link>
        </p>
      </form>
    </CoalCard>
  );
}
