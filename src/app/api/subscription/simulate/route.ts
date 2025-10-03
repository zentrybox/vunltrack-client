import { NextResponse } from "next/server";

import { ApiError, simulateSubscriptionChange } from "@/lib/api";
import { getSession } from "@/lib/auth";
import type { SubscriptionStatus } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const targetPlan =
    body && typeof body === "object" && "targetPlan" in body
      ? (body as { targetPlan?: string }).targetPlan
      : undefined;

  const allowedPlans: SubscriptionStatus["plan"][] = [
    "BASIC",
    "STANDARD",
    "ENTERPRISE",
  ];

  if (!targetPlan || !allowedPlans.includes(targetPlan as SubscriptionStatus["plan"])) {
    return NextResponse.json({ message: "targetPlan is required" }, { status: 400 });
  }

  try {
    const simulation = await simulateSubscriptionChange(
      session.tenantId,
      session.token,
      targetPlan as SubscriptionStatus["plan"],
    );
    return NextResponse.json({ simulation });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Simulation failed";
    return NextResponse.json({ message }, { status });
  }
}
