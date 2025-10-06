import { NextResponse } from "next/server";

import { ApiError, listScans } from "@/lib/api";
import { getSession } from "@/lib/auth";

const unauthorized = NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return unauthorized;
  }

  try {
    const scans = await listScans(session.tenantId, session.token);
    return NextResponse.json({ scans });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load scans";
    return NextResponse.json({ message }, { status });
  }
}
