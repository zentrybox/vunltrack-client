import { NextResponse } from "next/server";

import { ApiError, startScan } from "@/lib/api";
import { getSession } from "@/lib/auth";
import type { StartScanPayload } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.tenantId || !session.token || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  // Validate the payload structure
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const payload = body as Partial<StartScanPayload>;

  if (!payload.devices || !Array.isArray(payload.devices) || payload.devices.length === 0) {
    return NextResponse.json({ message: "devices array is required and must not be empty" }, { status: 400 });
  }

  // Validate each device entry
  const devices = payload.devices
    .map((item) => {
      if (!item || typeof item !== "object" || !("deviceId" in item)) {
        return null;
      }
      const device = item as { deviceId: string; jobId?: string; vendor?: string; product?: string; version?: string };
      if (typeof device.deviceId !== "string" || !device.deviceId.trim()) {
        return null;
      }
      return {
        deviceId: device.deviceId,
        jobId: device.jobId,
        vendor: device.vendor,
        product: device.product,
        version: device.version,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (devices.length === 0) {
    return NextResponse.json({ message: "No valid devices supplied" }, { status: 400 });
  }

  try {
    const response = await startScan(session.token, {
      id: payload.id,
      tenantId: session.tenantId,
      createdBy: session.user.id,
      type: payload.type || 'soft',
      devices,
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to start scan";
    return NextResponse.json({ message }, { status });
  }
}