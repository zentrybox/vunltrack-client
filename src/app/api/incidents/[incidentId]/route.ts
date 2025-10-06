import { NextResponse } from "next/server";

import { ApiError, updateIncident } from "@/lib/api";
import { getSession } from "@/lib/auth";
import type { UpdateIncidentPayload } from "@/lib/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ incidentId: string }> },
) {
  const { incidentId } = await context.params;
  const session = await getSession();
  if (!session.token) {
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

  const payload = body as UpdateIncidentPayload;

  if (
    payload.status === undefined &&
    payload.assignedTo === undefined &&
    payload.comment === undefined
  ) {
    return NextResponse.json({ message: "No fields provided" }, { status: 400 });
  }

  try {
    const incident = await updateIncident(incidentId, session.token, payload);
    return NextResponse.json({ incident });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to update incident";
    return NextResponse.json({ message }, { status });
  }
}
