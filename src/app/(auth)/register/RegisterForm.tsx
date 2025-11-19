'use client';

import { useActionState } from "react";
import Link from "next/link";

import CoalButton from "@/components/CoalButton";
import CoalCard from "@/components/CoalCard";

import { registerRoot, type RegisterFormState } from "./actions";

const initialState: RegisterFormState = { status: "idle" };

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerRoot, initialState);

  return (
    <CoalCard
      title="Create Root Access"
      subtitle="Stand up your VulnTrack tenant and bootstrap the first operator."
    >
      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Your name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Ada Lovelace"
                autoComplete="name"
                className="w-full rounded-md px-4 py-2 text-sm"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(30,144,255,0.12)', color: 'var(--color-text-primary)' }}
              />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="tenantName"
              className="text-sm font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Tenant name
            </label>
            <input
              id="tenantName"
              name="tenantName"
              type="text"
              required
              placeholder="Sentinel Networks"
              className="w-full rounded-md px-4 py-2 text-sm"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(30,144,255,0.12)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@sentinel.io"
            autoComplete="email"
            className="w-full rounded-md px-4 py-2 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(30,144,255,0.12)', color: 'var(--color-text-primary)' }}
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
            minLength={10}
            placeholder="••••••••••"
            autoComplete="new-password"
            className="w-full rounded-md px-4 py-2 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(30,144,255,0.12)', color: 'var(--color-text-primary)' }}
          />
        </div>
        {state.status === "error" ? (
          <p className="rounded-md px-3 py-2 text-sm" style={{ border: '1px solid var(--color-alert)', backgroundColor: 'rgba(255,0,255,0.06)', color: 'var(--color-text-primary)' }}>
            {state.message ??
              "Registration failed. Double-check your details and try again."}
          </p>
        ) : null}
        <CoalButton type="submit" className="w-full" isLoading={isPending} disabled={isPending}>
          Launch Command Center
        </CoalButton>
  <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Already onboarded?{" "}
          <Link href="/login" style={{ color: 'var(--color-accent1)' }} className="hover:underline">
            Return to login
          </Link>
        </p>
      </form>
    </CoalCard>
  );
}
