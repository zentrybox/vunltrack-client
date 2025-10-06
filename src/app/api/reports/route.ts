import { NextResponse } from "next/server";

import { ApiError, listReports } from "@/lib/api";
import { getSession } from "@/lib/auth";

const unauthorized = NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return unauthorized;
  }

  try {
    const reports = await listReports(session.tenantId, session.token);
    return NextResponse.json({ reports });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load reports";
    return NextResponse.json({ message }, { status });
  }
}
