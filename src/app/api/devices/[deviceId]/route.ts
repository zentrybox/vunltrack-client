import { NextResponse } from "next/server";

import { ApiError, deleteDevice, getDeviceDetail, updateDevice } from "@/lib/api";
import { getSession } from "@/lib/auth";

type UpdateDevicePayload = Partial<{
  vendor: string;
  product: string;
  version: string;
  ip?: string | null;
  name?: string | null;
  serial?: string | null;
  state?: string;
}>;

export async function GET(
  _request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await context.params;
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const device = await getDeviceDetail(session.tenantId, deviceId, session.token);
    return NextResponse.json(device);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to get device";
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await context.params;
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    await deleteDevice(session.tenantId, deviceId, session.token);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to remove device";
    return NextResponse.json({ message }, { status });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await context.params;
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Missing payload" }, { status: 400 });
  }

  try {
    const normalized: UpdateDevicePayload = { ...body };
    if (typeof normalized.state === 'string') {
      normalized.state = normalized.state.toLowerCase();
    }
    console.log('[api/devices/:id] PATCH outgoing state =', normalized.state);
    const device = await updateDevice(session.tenantId, deviceId, session.token, normalized as UpdateDevicePayload);
    return NextResponse.json({ device });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    // Surface backend error details for easier debugging in dev
    const message = error instanceof Error ? error.message : "Failed to update device";
    const details = error instanceof ApiError ? error.details : undefined;
    console.error("Device update failed", { deviceId, status, message, details });
    return NextResponse.json({ message, details }, { status });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await context.params;
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Missing payload" }, { status: 400 });
  }

  try {
    const normalized: UpdateDevicePayload = { ...body };
    if (typeof normalized.state === 'string') {
      normalized.state = normalized.state.toLowerCase();
    }
    console.log('[api/devices/:id] PUT outgoing state =', normalized.state);
    const device = await updateDevice(session.tenantId, deviceId, session.token, normalized as UpdateDevicePayload);
    return NextResponse.json({ device });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to update device";
    const details = error instanceof ApiError ? error.details : undefined;
    console.error("Device update failed (PUT)", { deviceId, status, message, details });
    return NextResponse.json({ message, details }, { status });
  }
}
