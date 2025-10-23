# VulnTrack Frontend

## Development

Run the dev server on `0.0.0.0:4000`:

```bash
npm install
npm run dev
```

## Production Preview

Build and start the app on the same host/port:

```bash
npm run build
npm run start
```

## Claude integration (server-side)

This project includes a lightweight server-side integration that forwards CVE lists to Anthropic Claude and returns structured recommendations.

1. Set your Claude API key in the environment before starting Next.js:

```bash
export CLAUDE_API_KEY="sk-..."
```

2. Start the app (normally with `npm run dev`).

3. In the Dashboard → Scans, open a scan result and click "Analyze" next to a device to request recommendations from Claude. Use "Export" to generate and download a JSON report.

Notes
- The Anthropic API model and endpoint used by the server route are minimal; adjust `src/app/api/analysis/claude/route.ts` if you need a different model or parameters.
- Keep your CLAUDE_API_KEY secret; it's used only server-side.
# VulnTrack Frontend

## Development

Run the dev server on `0.0.0.0:4000`:

```bash
npm install
npm run dev
```

## Production Preview

Build and start the app on the same host/port:

```bash
npm run build
npm run start
```