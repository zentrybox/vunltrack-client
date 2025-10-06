import { NextResponse } from "next/server";

import { ApiError, deleteDevice } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await context.params;
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    await deleteDevice(session.tenantId, deviceId, session.token);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to remove device";
    return NextResponse.json({ message }, { status });
  }
}
