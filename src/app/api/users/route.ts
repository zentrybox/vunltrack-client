import { NextResponse } from "next/server";

import { ApiError, addCollaborator, listCollaborators } from "@/lib/api";
import { getSession } from "@/lib/auth";

const unauthorized = NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return unauthorized;
  }
  try {
    const users = await listCollaborators(session.tenantId, session.token);
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.tenantId || !session.token) {
    return unauthorized;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("name" in payload) ||
    !("email" in payload) ||
    !("password" in payload)
  ) {
    return NextResponse.json({ message: "Name, email, and password are required" }, { status: 400 });
  }
  try {
    const user = await addCollaborator(session.tenantId, session.token, payload as {
      name: string;
      email: string;
      password: string;
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ message }, { status });
  }
}
