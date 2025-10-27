import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { CVE, VulnerabilityAnalysis } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { vendor, product, version, cves, analysis, template } = body as {
    vendor: string;
    product: string;
    version: string;
    cves: CVE[];
    analysis?: VulnerabilityAnalysis;
    template?: string;
  };

  const report = {
    id: uuidv4(),
    generatedAt: new Date().toISOString(),
    tenantId: session.tenantId ?? null,
    user: session.user ?? null,
  template: template || 'default',
    device: { vendor, product, version },
    cves: cves ?? [],
    analysis: analysis ?? null,
  };

  return NextResponse.json({ report }, { status: 201 });
}
