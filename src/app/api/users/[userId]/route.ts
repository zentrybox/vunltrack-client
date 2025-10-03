import { NextResponse } from "next/server";

import { ApiError, removeCollaborator } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: { userId: string } },
) {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    await removeCollaborator(session.tenantId, params.userId, session.token);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to remove user";
    return NextResponse.json({ message }, { status });
  }
}
