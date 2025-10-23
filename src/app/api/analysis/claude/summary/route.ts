import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { callClaude } from "@/lib/api";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { prompt } = body as { prompt: string };
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ message: "Missing prompt" }, { status: 400 });
  }

  try {
    // Llama a Claude con el prompt amigable
    const summary = await callClaude(prompt, session.token);
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json({ message: "Claude error", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
