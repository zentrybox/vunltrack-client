import { CVE, VulnerabilityAnalysis } from "./types";

// Use same-origin internal API routes so browser sends session cookies.
export async function analyzeWithClaude(
  vendor: string,
  product: string,
  version: string,
  cves: CVE[],
): Promise<VulnerabilityAnalysis> {
  const resp = await fetch(`/api/analysis/claude`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ vendor, product, version, cves }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "Failed to analyze");
  }

  const data = await resp.json();
  return data.analysis as VulnerabilityAnalysis;
}

export async function generateReport(
  vendor: string,
  product: string,
  version: string,
  cves: CVE[],
  analysis?: VulnerabilityAnalysis,
  template?: string,
) {
  const resp = await fetch(`/api/reports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ vendor, product, version, cves, analysis, template }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "Failed to generate report");
  }

  const data = await resp.json();
  return data.report;
}

export async function generatePdfReport(
  vendor: string,
  product: string,
  version: string,
  cves: CVE[] | string[],
  analysis: VulnerabilityAnalysis | null,
  scan?: { id: string; type: string; status: string; startedAt: string; totalDevices?: number },
  options?: { generatedAt?: string; locale?: string; timeZone?: string; template?: string },
) {
  const resp = await fetch(`/api/reports/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ vendor, product, version, cves, analysis, scan, ...options }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "Failed to generate PDF report");
  }

  const blob = await resp.blob();
  return blob;
}
