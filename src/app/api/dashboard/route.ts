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

const unauthorized = NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return unauthorized;
  }
  try {
    const [metrics, queue, scans, incidents, systemMetrics] = await Promise.all([
      getDashboardMetrics(session.tenantId, session.token),
      getVulnerabilityQueue(session.tenantId, session.token),
      listScans(session.tenantId, session.token),
      listIncidents(session.tenantId, session.token),
      getMetricsSnapshot().catch(() => null),
    ]);
    return NextResponse.json({ metrics, queue, scans, incidents, systemMetrics });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load dashboard";
    return NextResponse.json({ message }, { status });
  }
}
