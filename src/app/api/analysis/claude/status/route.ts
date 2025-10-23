import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.CLAUDE_API_KEY;
  if (!key) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({ configured: true, keyLength: key.length });
}
