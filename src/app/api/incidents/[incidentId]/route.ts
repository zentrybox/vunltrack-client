import { NextResponse } from "next/server";

import {
  ApiError,
  getIncident,
  putIncident,
  changeIncidentStatus,
  assignIncident,
  updateIncident,
} from "@/lib/api";
import { getSession } from "@/lib/auth";
import type { UpdateIncidentPayload } from "@/lib/types";

const unauthorized = NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export async function GET(
  _request: Request,
  context: { params: Promise<{ incidentId: string }> },
) {
  const { incidentId } = await context.params;
  const session = await getSession();
  if (!session.token) return unauthorized;

  try {
    const incident = await getIncident(incidentId, session.token);
    if (!incident) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ data: incident });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load incident";
    return NextResponse.json({ message }, { status });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ incidentId: string }> },
) {
  const { incidentId } = await context.params;
  const session = await getSession();
  if (!session.token) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  // Normalize client payload -> backend expected shape.
  const payload = { ...(body as Record<string, unknown>) } as Record<string, unknown>;
  // client uses `assignedTo` in UpdateIncidentPayload; backend expects `assignTo`.
  if (Object.prototype.hasOwnProperty.call(payload, "assignedTo")) {
    // preserve explicit nulls
    payload["assignTo"] = payload["assignedTo"];
    delete payload["assignedTo"];
  }

  // Normalize status to backend-preferred casing (backend returns lowercase values).
  if (typeof payload.status === "string") {
    payload.status = (payload.status as string).toLowerCase();
  }

  // If the session has a user id, and the client didn't provide changedBy/assignedBy,
  // populate them so the backend has an actor for the change.
  const userId = session.user?.id;
  if (userId) {
    if (payload.status && !Object.prototype.hasOwnProperty.call(payload, "changedBy")) {
      payload["changedBy"] = userId;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "assignTo") && !Object.prototype.hasOwnProperty.call(payload, "assignedBy")) {
      payload["assignedBy"] = userId;
    }
  }

  try {
    // Debug: log outgoing payload to server console for faster diagnosis.
    console.debug(`[incidents:put] incidentId=${incidentId} outgoingPayload=`, payload);
    const updated = await putIncident(incidentId, session.token, payload as any);
    return NextResponse.json({ data: updated });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to update incident";
    const details = error instanceof ApiError ? error.details : undefined;
    // Include details from the upstream API when available to aid debugging.
    // In development, also return the outgoing payload so we can quickly see
    // what was forwarded to the backend. Avoid this in production to reduce
    // risk of leaking sensitive info.
    const body: Record<string, unknown> = { message };
    if (details) body.details = details;
    if (process.env.NODE_ENV !== "production") body.outgoingPayload = payload;
    console.error(`[incidents:put] incidentId=${incidentId} error=`, message, details);
    return NextResponse.json(body, { status });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ incidentId: string }> },
) {
  // This file will also accept POST for /status and /assign via URL pathname
  const { incidentId } = await context.params;
  const session = await getSession();
  if (!session.token) return unauthorized;

  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // parts ends with ['api','incidents',incidentId,...]
  const action = parts[parts.length - 1];

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (action === "status") {
      const updated = await changeIncidentStatus(incidentId, session.token, body as any);
      return NextResponse.json({ data: updated });
    }

    if (action === "assign") {
      const updated = await assignIncident(incidentId, session.token, body as any);
      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to perform action";
    const details = error instanceof ApiError ? error.details : undefined;
    return NextResponse.json({ message, details }, { status });
  }
}

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
    const details = error instanceof ApiError ? error.details : undefined;
    return NextResponse.json({ message, details }, { status });
  }
}
