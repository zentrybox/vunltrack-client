import { NextResponse } from "next/server";

import { ApiError, getScanDetail } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ scanId: string }> },
) {
  const { scanId } = await context.params;
  const session = await getSession();
  if (!session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const detail = await getScanDetail(scanId, session.token);
    return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load scan detail";
    return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

export const revalidate = 0;
export const dynamic = "force-dynamic";