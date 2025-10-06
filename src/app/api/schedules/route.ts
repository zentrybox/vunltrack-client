import { NextResponse } from "next/server";

import { ApiError, createSchedule, listSchedules } from "@/lib/api";
import { getSession } from "@/lib/auth";
import type { SchedulePayload } from "@/lib/types";

const unauthorized = NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return unauthorized;
  }

  try {
    const schedules = await listSchedules(session.tenantId, session.token);
    return NextResponse.json({ schedules });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load schedules";
    return NextResponse.json({ message }, { status });
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

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Missing payload" }, { status: 400 });
  }

  const payload = body as SchedulePayload;

  if (!payload.name || !payload.cron) {
    return NextResponse.json({ message: "name and cron are required" }, { status: 400 });
  }

  try {
    const schedule = await createSchedule(session.tenantId, session.token, payload);
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to create schedule";
    return NextResponse.json({ message }, { status });
  }
}
