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

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const { analysis, lang } = body as { analysis?: unknown; lang?: string };

  if (!analysis) {
    return NextResponse.json({ message: 'Missing analysis' }, { status: 400 });
  }

  // Try Gemini first when API key is set
  const geminiKey = process.env.GEMINI_API_KEY;

  // Build a short friendly prompt that instructs the model to produce a single short paragraph
  // and nothing else. The client expects only the summary text.
  const buildPrompt = (analysisObj: unknown, language = 'es') => {
    const langName = language.startsWith('en') ? 'English' : 'Spanish';
    return `You are an empathetic security engineer. Read the following vulnerability recommendations JSON and produce a single short friendly paragraph summary in ${langName} suitable for speaking aloud. Say only the summary (no headings, no extra commentary). Keep it clear and action-oriented, so a busy operator understands the top steps to take.\n\nANALYSIS_JSON:\n${JSON.stringify(analysisObj)}`;
  };

  try {
    const prompt = buildPrompt(analysis, lang ?? 'es');

    const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
    if (geminiKey) {
      try {
        // Google Generative Language API (Generative Models) text generation endpoint
        // Uses API key via query string for simple setups. In prod prefer OAuth.
        const glUrl = `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(geminiModel)}:generateText?key=${encodeURIComponent(geminiKey)}`;
        const body = {
          prompt: { text: prompt },
          maxOutputTokens: 300,
          temperature: 0.3,
        };

        const resp = await fetch(glUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (resp.ok) {
          const data = await resp.json();
          // Try common fields used by Google: candidates[].output or candidates[].content or text
          let summary: string | null = null;
          if (typeof data?.candidates === 'object' && Array.isArray(data.candidates) && data.candidates.length > 0) {
            const first = data.candidates[0];
            if (first && typeof first === 'object') {
              const f = first as { [k: string]: unknown };
              if (typeof f.output === 'string') summary = f.output;
              else if (typeof f.content === 'string') summary = f.content;
            }
          }
          if (!summary && typeof data?.output === 'string') summary = data.output;
          if (!summary && typeof data?.text === 'string') summary = data.text;
          // As a last resort, stringify the whole response carefully
          if (!summary && data) {
            const maybe = JSON.stringify(data).slice(0, 1500);
            summary = maybe;
          }

          if (summary) return NextResponse.json({ summary: String(summary) });
        } else {
          const errText = await resp.text().catch(() => '');
          console.warn('Gemini generateText returned non-ok:', resp.status, errText);
        }
      } catch (err) {
        console.warn('Gemini (Generative Language) request failed, falling back to Claude:', err);
      }
    }

    // Fallback to Claude via server-side call
    const text = await callClaude(prompt, process.env.CLAUDE_API_KEY ?? '');
    // callClaude may return multi-line; trim
    const summary = (text || '').trim();
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: `AI summarization failed: ${message}` }, { status: 500 });
  }
}
