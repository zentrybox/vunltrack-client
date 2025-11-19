import { NextResponse } from "next/server";

import { ApiError, listScans } from "@/lib/api";
import { getSession } from "@/lib/auth";

// dynamic, no-store to avoid stale scan lists
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const scans = await listScans(session.tenantId, session.token);
    return NextResponse.json({ scans }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load scans";
    return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}