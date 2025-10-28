import { NextResponse } from "next/server";

import { ApiError, createDevice } from "@/lib/api";
import { getSession } from "@/lib/auth";
import type { CreateDevicePayload, DeviceState } from "@/lib/types";

const unauthorized = NextResponse.json({ message: "Unauthorized" }, { status: 401 });

function normalizeState(value: unknown): DeviceState | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.toUpperCase();
  return ["ACTIVE", "INACTIVE", "RETIRED"].includes(upper as DeviceState)
    ? (upper as DeviceState)
    : undefined;
}

function isValidIPv4(ip: string): boolean {
  const re = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  return re.test(ip);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return unauthorized;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  // Accept either { devices: [...] } or an array directly
  const list: unknown = Array.isArray(body)
    ? body
    : (body && typeof body === "object" && "devices" in body
        ? (body as { devices: unknown }).devices
        : null);

  if (!Array.isArray(list)) {
    return NextResponse.json({ message: "Expected an array of devices or { devices: [...] }" }, { status: 400 });
  }

  const results: Array<{ index: number; status: "created" | "failed"; id?: string; error?: string }>
    = [];

  for (let i = 0; i < list.length; i++) {
    const raw = list[i] as Partial<CreateDevicePayload> | null | undefined;
    if (!raw || typeof raw !== "object") {
      results.push({ index: i, status: "failed", error: "Invalid entry" });
      continue;
    }

    const payload: CreateDevicePayload = {
      vendor: String(raw.vendor ?? "").trim(),
      product: String(raw.product ?? "").trim(),
      version: String(raw.version ?? "").trim(),
      name: raw.name?.toString().trim() || "",
      ip: raw.ip?.toString().trim() || "",
      serial: raw.serial?.toString().trim() || "",
      state: normalizeState(raw.state),
    };

    if (!payload.vendor || !payload.product || !payload.version || !payload.name || !payload.ip || !payload.serial || !payload.state) {
      results.push({ index: i, status: "failed", error: "Missing required fields (vendor, product, version, name, ip, serial, state)" });
      continue;
    }

    // Format checks
    if (!isValidIPv4(payload.ip)) {
      results.push({ index: i, status: "failed", error: "Invalid IP format (expected IPv4)" });
      continue;
    }
    if (!/^[A-Za-z0-9-_.:\s]+$/.test(payload.vendor)) {
      results.push({ index: i, status: "failed", error: "Invalid vendor format" });
      continue;
    }
    if (!/^[A-Za-z0-9-_.:\s]+$/.test(payload.product)) {
      results.push({ index: i, status: "failed", error: "Invalid product format" });
      continue;
    }
    if (!/^[A-Za-z0-9-_.()\s]+$/.test(payload.version)) {
      results.push({ index: i, status: "failed", error: "Invalid version format" });
      continue;
    }
    if (!/^[A-Za-z0-9-_.:\s]+$/.test(payload.name)) {
      results.push({ index: i, status: "failed", error: "Invalid name format" });
      continue;
    }
    if (!/^[A-Za-z0-9-]+$/.test(payload.serial)) {
      results.push({ index: i, status: "failed", error: "Invalid serial format (alphanumeric and hyphens only)" });
      continue;
    }

    try {
      const created = await createDevice(session.tenantId, session.token, payload);
      results.push({ index: i, status: "created", id: created.id });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : (error as Error)?.message || "Failed";
      results.push({ index: i, status: "failed", error: message });
    }
  }

  const summary = {
    total: list.length,
    created: results.filter((r) => r.status === "created").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };

  return NextResponse.json(summary, { status: 200 });
}
