import { NextResponse } from "next/server";

import { ApiError, deleteSchedule, updateSchedule } from "@/lib/api";
import { getSession } from "@/lib/auth";
import type { SchedulePayload } from "@/lib/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ scheduleId: string }> },
) {
  const { scheduleId } = await context.params;
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
    const schedule = await updateSchedule(
      session.tenantId,
      scheduleId,
      session.token,
      body as SchedulePayload,
    );
    return NextResponse.json({ schedule });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to update schedule";
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ scheduleId: string }> },
) {
  const { scheduleId } = await context.params;
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteSchedule(session.tenantId, scheduleId, session.token);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to delete schedule";
    return NextResponse.json({ message }, { status });
  }
}
