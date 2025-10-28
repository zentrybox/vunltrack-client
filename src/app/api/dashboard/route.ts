import { NextResponse } from "next/server";

import {
  ApiError,
  getDashboardMetrics,
  getMetricsSnapshot,
  getVulnerabilityQueue,
  listIncidents,
  listScans,
} from "@/lib/api";
import { getSession } from "@/lib/auth";

// Note: do not precompute a response object to avoid static caching references

export async function GET() {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const [metrics, queue, scans, incidents, systemMetrics] = await Promise.all([
      getDashboardMetrics(session.tenantId, session.token),
      getVulnerabilityQueue(session.tenantId, session.token),
      listScans(session.tenantId, session.token),
      listIncidents(session.tenantId, session.token),
      getMetricsSnapshot().catch(() => null),
    ]);
    return NextResponse.json(
      { metrics, queue, scans, incidents, systemMetrics },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load dashboard";
    return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

// Ensure this route is never statically cached
export const revalidate = 0;
export const dynamic = "force-dynamic";
