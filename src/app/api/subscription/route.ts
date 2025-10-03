import { NextResponse } from "next/server";

import { ApiError, getSubscription } from "@/lib/api";
import { getSession } from "@/lib/auth";

const unauthorized = NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return unauthorized;
  }
  try {
    const subscription = await getSubscription(session.tenantId, session.token);
    return NextResponse.json({ subscription });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load subscription";
    return NextResponse.json({ message }, { status });
  }
}
