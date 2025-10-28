import { NextResponse } from "next/server";

import { ApiError, createDevice, getDevices } from "@/lib/api";
import { getSession } from "@/lib/auth";
import type { CreateDevicePayload, DeviceState } from "@/lib/types";

const unauthorized = NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return unauthorized;
  }
  try {
    const devices = await getDevices(session.tenantId, session.token);
    return NextResponse.json({ devices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch devices";
    return NextResponse.json({ message }, { status: 500 });
  }
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

  function isValidIPv4(ip: string): boolean {
    const re = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    return re.test(ip);
  }

  function normalizeState(value: unknown): DeviceState | undefined {
    if (typeof value !== "string") return undefined;
    const upper = value.toUpperCase();
    return ["ACTIVE", "INACTIVE", "RETIRED"].includes(upper as DeviceState)
      ? (upper as DeviceState)
      : undefined;
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Missing payload" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const payload: CreateDevicePayload = {
    vendor: String(raw.vendor ?? "").trim(),
    product: String(raw.product ?? "").trim(),
    version: String(raw.version ?? "").trim(),
    name: typeof raw.name === "string" ? raw.name.trim() : "",
    ip: typeof raw.ip === "string" ? raw.ip.trim() : "",
    serial: typeof raw.serial === "string" ? raw.serial.trim() : "",
    state: normalizeState(raw.state),
  };

  if (!payload.vendor || !payload.product || !payload.version || !payload.name || !payload.ip || !payload.serial || !payload.state) {
    return NextResponse.json({ message: "Missing required fields (vendor, product, version, name, ip, serial, state)" }, { status: 400 });
  }

  // Format checks
  if (!isValidIPv4(payload.ip)) {
    return NextResponse.json({ message: "Invalid IP format (expected IPv4)" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9-_.:\s]+$/.test(payload.vendor)) {
    return NextResponse.json({ message: "Invalid vendor format" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9-_.:\s]+$/.test(payload.product)) {
    return NextResponse.json({ message: "Invalid product format" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9-_.()\s]+$/.test(payload.version)) {
    return NextResponse.json({ message: "Invalid version format" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9-_.:\s]+$/.test(payload.name)) {
    return NextResponse.json({ message: "Invalid name format" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9-]+$/.test(payload.serial)) {
    return NextResponse.json({ message: "Invalid serial format (alphanumeric and hyphens only)" }, { status: 400 });
  }

  try {
    const device = await createDevice(session.tenantId, session.token, {
      vendor: payload.vendor,
      product: payload.product,
      version: payload.version,
      name: payload.name,
      ip: payload.ip,
      serial: payload.serial,
      state: payload.state,
    });
    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to create device";
    return NextResponse.json({ message }, { status });
  }
}
