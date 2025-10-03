import { NextResponse } from "next/server";

import { ApiError, createDevice, getDevices } from "@/lib/api";
import { getSession } from "@/lib/auth";

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

  if (
    !body ||
    typeof body !== "object" ||
    !("vendor" in body) ||
    !("product" in body) ||
    !("version" in body)
  ) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  try {
    const device = await createDevice(session.tenantId, session.token, body as {
      vendor: string;
      product: string;
      version: string;
    });
    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to create device";
    return NextResponse.json({ message }, { status });
  }
}
