import { NextResponse } from "next/server";

import { ApiError, getScanResultByDevice } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ scanId: string; deviceId: string }> },
) {
  const { scanId, deviceId } = await context.params;
  const session = await getSession();
  if (!session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getScanResultByDevice(scanId, deviceId, session.token);
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to get scan result";
    return NextResponse.json({ message }, { status });
  }
}