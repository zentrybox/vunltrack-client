'use server';

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_TENANT_COOKIE,
  AUTH_TOKEN_COOKIE,
  AUTH_USER_COOKIE,
} from "./config";
import type { AuthUser, LoginResponse } from "./types";

export interface Session {
  token?: string;
  tenantId?: string;
  user?: AuthUser;
}

const COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function createSession(payload: LoginResponse) {
  if (!payload?.auth?.token || !payload?.user) {
    throw new Error("Invalid authentication response from server.");
  }

  const store = await cookies();

  const tenantId = payload.tenant?.id ?? payload.user.tenantId;
  const tenantName = payload.tenant?.name ?? payload.user.tenantName;

  store.set({
    name: AUTH_TOKEN_COOKIE,
    value: payload.auth.token,
    ...COOKIE_OPTIONS,
    httpOnly: true,
  });

  if (tenantId) {
    store.set({
      name: AUTH_TENANT_COOKIE,
      value: tenantId,
      ...COOKIE_OPTIONS,
      httpOnly: false,
    });
  }

  const userPayload = { ...payload.user, tenantName };
  const encodedUser = Buffer.from(JSON.stringify(userPayload)).toString("base64url");

  store.set({
    name: AUTH_USER_COOKIE,
    value: encodedUser,
    ...COOKIE_OPTIONS,
    httpOnly: false,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(AUTH_TOKEN_COOKIE);
  store.delete(AUTH_TENANT_COOKIE);
  store.delete(AUTH_USER_COOKIE);
}

export async function getSession(): Promise<Session> {
  const store = await cookies();
  const token = store.get(AUTH_TOKEN_COOKIE)?.value;
  const tenantId = store.get(AUTH_TENANT_COOKIE)?.value;
  const encodedUser = store.get(AUTH_USER_COOKIE)?.value;
  let user: AuthUser | undefined;

  if (encodedUser) {
    try {
      const json = Buffer.from(encodedUser, "base64url").toString("utf-8");
      user = JSON.parse(json) as AuthUser;
    } catch (error) {
      console.warn("Failed to decode user session", error);
    }
  }

  return { token, tenantId, user };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session.token || !session.tenantId) {
    redirect("/login");
  }
  return session;
}
