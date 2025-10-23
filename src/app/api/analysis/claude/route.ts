import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { VulnerabilityAnalysis, CVE } from "@/lib/types";

// Lightweight Anthropic client using the Messages API (required for Claude 3 models)
async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const url = "https://api.anthropic.com/v1/messages";
  const model = process.env.CLAUDE_MODEL ?? "claude-3-haiku-20240307";
  const maxTokens = Number(process.env.CLAUDE_MAX_TOKENS ?? "2000");
  const temperature = Number(process.env.CLAUDE_TEMPERATURE ?? "0.3");
  const anthropicVersion = process.env.ANTHROPIC_VERSION ?? "2023-06-01";

  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: "user", content: prompt },
    ],
  };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    // Messages API requires this header; default to a widely supported version
    "anthropic-version": anthropicVersion,
  };

  let resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    // If the version is invalid for this account, retry once with a safe fallback
    if (/anthropic-version/i.test(text) && /not a valid version/i.test(text)) {
      headers["anthropic-version"] = "2023-06-01";
      resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    }
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new ApiError(`Claude API error: ${text}`, resp.status);
  }

  const data = await resp.json();
  // Messages API: content is an array; join text segments if present
  type ClaudeContent = { text?: string; content?: string };
  const segments: string[] = Array.isArray(data?.content)
    ? (data.content as ClaudeContent[])
        .map((c) => (typeof c?.text === "string" ? c.text : c?.content ?? ""))
        .filter(Boolean)
    : [];
  const textOut = segments.length > 0 ? segments.join("\n\n") : (data?.content?.[0]?.text as string);
  return textOut ?? JSON.stringify(data);
}

function buildPrompt(vendor: string, product: string, version: string, cves: CVE[]) {
  const cvesList = cves.map((c) => ({
    cveId: c.cveId,
    severity: c.severity ?? null,
    cvss: c.cvssScore ?? null,
  }));

  // Instruct Claude to return strict JSON so we can parse reliably
  return `You are a senior cybersecurity analyst. Analyze the following device and its CVEs and return ONLY valid JSON.

DEVICE: ${vendor} ${product} ${version}
TOTAL_CVES: ${cves.length}
CVES: ${JSON.stringify(cvesList)}

Respond strictly in this JSON schema (no extra prose):
{
  "riskLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "summary": string, // concise English executive summary
  "recommendations": string[], // comprehensive, actionable items — provide at least one item per CVE (you may group overlaps). Prefix items with the related CVE id when possible, e.g., "CVE-2024-1234: ..."
  "priorities": Array<{ "cveId": string, "rationale": string, "cvss": number | null }>
}

Rules:
- If CVSS is unknown, set "cvss" to null.
- Ensure every CVE listed appears at least once in "recommendations" (either individually or grouped, but include the CVE id in the text).
- Keep the writing in English, clear and actionable.
- Prefer specific mitigations (patch version, config hardening, compensating controls) over generic advice.
- Limit priorities to the top 5–10 highest-impact CVEs.
`;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { vendor, product, version, cves } = body as {
    vendor: string;
    product: string;
    version: string;
    cves: CVE[];
  };

  if (!Array.isArray(cves)) {
    return NextResponse.json({ message: "cves must be an array" }, { status: 400 });
  }

  // Pull API key from environment; keep server-side secret
  const claudeKey = process.env.CLAUDE_API_KEY;
  if (!claudeKey) {
    return NextResponse.json({ message: "Claude API key not configured" }, { status: 500 });
  }

  const prompt = buildPrompt(vendor ?? "", product ?? "", version ?? "", cves);

  try {
    const text = await callClaude(prompt, claudeKey);

    let analysis: VulnerabilityAnalysis | null = null;
    // Try JSON first
    try {
      const obj = JSON.parse(text) as {
        riskLevel?: string;
        summary?: string;
        recommendations?: string[];
        priorities?: Array<{ cveId?: string; rationale?: string; cvss?: number | null }>;
      };
      if (obj && (obj.summary || obj.recommendations || obj.priorities)) {
        analysis = {
          riskLevel: (obj.riskLevel || "UNKNOWN").toUpperCase(),
          summary: obj.summary || "",
          // Allow a large set of recommendations to cover all CVEs
          recommendations: Array.isArray(obj.recommendations) ? obj.recommendations.slice(0, 100) : [],
          // Keep top 10 priority actions by default
          priorityActions: Array.isArray(obj.priorities)
            ? obj.priorities
                .slice(0, 10)
                .map((p) => {
                  const id = p.cveId || "(no-id)";
                  const cvss = typeof p.cvss === "number" ? ` (CVSS ${p.cvss})` : "";
                  const why = p.rationale ? `: ${p.rationale}` : "";
                  return `${id}${cvss}${why}`.trim();
                })
            : [],
        };
      }
    } catch {
      // ignore, fall back to text parsing
    }

    if (!analysis) {
      // Fallback: parse headings
      const fallback: VulnerabilityAnalysis = {
        riskLevel: "UNKNOWN",
        summary: "",
        recommendations: [],
        priorityActions: [],
      };
      
      // Support both English and Spanish section headers in fallback parsing
      const upper = text.toUpperCase();
      const getSection = (keys: string[]) => {
        for (const key of keys) {
          const k = key.toUpperCase();
          if (upper.includes(k)) {
            const start = upper.indexOf(k);
            const after = text.slice(start + k.length + 1);
            return after.split(/\n[A-Z\- ]{3,}:|\n\n/m)[0].trim();
          }
        }
        return null;
      };

      const summaryTxt = getSection(["SUMMARY:", "RESUMEN:"]) ?? text.slice(0, 400);
      fallback.summary = summaryTxt.slice(0, 2000);

      const rec = getSection(["RECOMMENDATIONS:", "RECOMENDACIONES:"]);
      if (rec) {
        fallback.recommendations = rec
          .split(/\n|\r|\d+\.|•|-/)
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 100);
      }

      const pr = getSection(["PRIORITIES:", "PRIORIDADES:"]);
      if (pr) {
        fallback.priorityActions = pr
          .split(/\n|\r|\d+\.|•|-/)
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 10);
      }

      if (!fallback.recommendations.length) {
        fallback.recommendations = [
          "Apply vendor patches and security updates",
          "Restrict administrative access and enforce MFA",
          "Enable monitoring and alerting for exploitation attempts",
        ];
      }

      if (!fallback.priorityActions.length) {
        fallback.priorityActions = cves.map((c) => c.cveId).slice(0, 5);
      }

      const lvl = (summaryTxt.match(/CRITICAL|HIGH|MEDIUM|LOW|CR[IÍ]TICO|ALTO|MEDIO|BAJO/) || [])[0];
      if (lvl) fallback.riskLevel = lvl.toUpperCase();
      analysis = fallback;
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to analyze";
    // If the error message contains an Anthropic error JSON, try to keep it concise
    return NextResponse.json({ message }, { status });
  }
}
