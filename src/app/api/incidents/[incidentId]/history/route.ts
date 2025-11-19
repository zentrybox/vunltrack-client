import { NextResponse } from "next/server";

import { ApiError, getIncidentHistory } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ incidentId: string }> },
) {
  const { incidentId } = await context.params;
  const session = await getSession();
  if (!session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await getIncidentHistory(incidentId, session.token);
    return NextResponse.json({ history });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load incident history";
    return NextResponse.json({ message }, { status });
  }
}