import { NextResponse } from "next/server";

import { ApiError, startScan } from "@/lib/api";
import { getSession } from "@/lib/auth";

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

  const devicesInput =
    body && typeof body === "object" && "devices" in body
      ? (body as { devices?: unknown }).devices
      : undefined;

  if (!Array.isArray(devicesInput) || devicesInput.length === 0) {
    return NextResponse.json({ message: "devices array is required" }, { status: 400 });
  }

  const devices = devicesInput
    .map((item) => {
      if (typeof item === "string") {
        return { deviceId: item };
      }
      if (item && typeof item === "object" && "deviceId" in item) {
        const deviceId = (item as { deviceId?: unknown }).deviceId;
        return typeof deviceId === "string" && deviceId
          ? { deviceId }
          : null;
      }
      return null;
    })
    .filter((entry): entry is { deviceId: string } => entry !== null);

  if (devices.length === 0) {
    return NextResponse.json({ message: "No valid device IDs supplied" }, { status: 400 });
  }

  try {
    const response = await startScan(session.token, {
      tenantId: session.tenantId,
      createdBy: session.user.id,
      devices,
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to start scan";
    return NextResponse.json({ message }, { status });
  }
}
