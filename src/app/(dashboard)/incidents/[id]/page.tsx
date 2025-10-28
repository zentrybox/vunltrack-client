'use client';

import { useEffect, useState, useRef, type ComponentProps } from 'react';
import { useParams, useRouter } from 'next/navigation';

import CoalButton from '@/components/CoalButton';
import CoalCard from '@/components/CoalCard';
import StatusBadge from '@/components/StatusBadge';
import { useDevices } from '@/hooks/useDevices';
import { useIncidents } from '@/hooks/useIncidents';
import { useScans } from '@/hooks/useScans';
import { analyzeWithClaude, generatePdfReport } from '@/lib/claudeClient';
import type {
  DeviceDetail,
  IncidentHistoryEntry,
  IncidentRecord,
  IncidentStatus,
  ScanDetailResponse,
  UpdateIncidentPayload,
  VulnerabilityAnalysis,
} from '@/lib/types';
import { formatDateLabel } from '@/lib/utils';

const statusTone: Record<IncidentStatus, ComponentProps<typeof StatusBadge>['tone']> = {
  open: 'critical',
  in_progress: 'warning',
  escalated: 'warning',
  resolved: 'safe',
  closed: 'neutral',
  false_positive: 'neutral',
};

const scanStatusTone: Record<string, ComponentProps<typeof StatusBadge>['tone']> = {
  running: 'warning',
  completed: 'safe',
  failed: 'critical',
  cancelled: 'neutral',
};

const statusOrder: IncidentStatus[] = ['open', 'in_progress', 'escalated', 'resolved', 'closed', 'false_positive'];

function statusLabel(s: IncidentStatus | string) {
  switch (s) {
    case 'open':
      return 'Open';
    case 'in_progress':
      return 'In Progress';
    case 'escalated':
      return 'Escalated';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
    case 'false_positive':
      return 'False Positive';
    default:
      return String(s);
  }
}

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = String(params?.id ?? '');

  const { incidents, loading: incidentsLoading, error: incidentsError, mutating, updateIncident, getHistory } = useIncidents();
  const { getScanDetail } = useScans();
  const { getDeviceDetail } = useDevices();

  // Local page state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [scanDetail, setScanDetail] = useState<ScanDetailResponse | null>(null);
  const [deviceDetail, setDeviceDetail] = useState<DeviceDetail | null>(null);
  const [history, setHistory] = useState<IncidentHistoryEntry[]>([]);

  // Form state
  const [status, setStatus] = useState<IncidentStatus>('open');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);

  // Analysis state
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<VulnerabilityAnalysis | null>(null);

  // Voice summary state
  const [showLangModal, setShowLangModal] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load all data when incidents list changes or id changes
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const found = incidents.find((i) => i.id === incidentId);
        if (!found) throw new Error('Incident not found');
        setIncident(found);

        const scanData = await getScanDetail(found.scanId);
        setScanDetail(scanData);

        const device = await getDeviceDetail(found.deviceId);
        setDeviceDetail(device);

        const hist = await getHistory(found.id);
        setHistory(hist);

        // Preload cached analysis if any for this incident & CVE set
        try {
          const resultForDevice = scanData.results.find((r) => r.deviceId === found.deviceId);
          let cveIds: string[] = [];
          if (resultForDevice && Array.isArray(resultForDevice.cves) && resultForDevice.cves.length) {
            cveIds = resultForDevice.cves;
          } else if (found.cveId) {
            cveIds = [found.cveId];
          }
          if (typeof window !== 'undefined' && cveIds.length > 0) {
            const key = `incident:${found.id}:analysis:${cveIds.join(',')}`;
            const maybe = window.localStorage.getItem(key);
            if (maybe) setAnalysisResult(JSON.parse(maybe));
          }
        } catch {}

        // Initialize form
        setStatus(found.status);
        setAssignee(found.assignedTo ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    if (!incidentId) return;
    void loadData();
  }, [incidentId, incidents, getDeviceDetail, getHistory, getScanDetail]);

  // Stop any voice/audio
  function stopVoicePlayback() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      try { audioRef.current.src = ''; } catch {}
      audioRef.current = null;
    }
    setSpeaking(false);
  }

  // Frontend-only Gemini summary with audio-first attempt, fallback to text + Web Speech API
  async function handleStartGeminiVoice(lang: 'en' | 'es') {
    if (!analysisResult) {
      setFormMessage("Please generate recommendations first (click 'View recommendations').");
      return;
    }

    stopVoicePlayback();
    setSpeaking(true);
    setFormMessage(null);

    try {
  const apiKeyEnv = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const apiKey: string = apiKeyEnv as unknown as string;
  if (!apiKeyEnv) throw new Error('Gemini API key not configured. Set NEXT_PUBLIC_GEMINI_API_KEY in .env.local and restart.');

      const selectedLanguage = lang === 'es' ? 'Español' : 'English';
      const recs = (analysisResult.recommendations ?? []).filter(Boolean);
      const pri = (analysisResult.priorityActions ?? []).filter(Boolean);

      const contentLines: string[] = [];
      if (recs.length) contentLines.push(`Recommendations (EN):\n${recs.join('\n')}`);
      if (pri.length) contentLines.push(`Priority actions (EN):\n${pri.join('\n')}`);

      const prompt = `Estas son recomendaciones técnicas y acciones prioritarias en inglés. Genera un RESUMEN CORTO y fácil de entender en ${selectedLanguage}.\n\nRequisitos:\n- No leas literalmente las recomendaciones.\n- Explica qué significan y qué debería hacer el usuario.\n- Tono amigable y claro.\n- No seas muy largo (máx. 3-4 oraciones).\n- Usa únicamente ${selectedLanguage}.\n\nContenido:\n${contentLines.join('\n\n')}`;

      const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

      async function requestGemini(model: string, body: unknown) {
        const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const resp = await fetch(`${base}?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey as string },
          body: JSON.stringify(body),
        });
        const text = await resp.text();
        if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${text || 'no body'}`);
        try { return JSON.parse(text); } catch { throw new Error('Invalid JSON from Gemini'); }
      }

      const common = { contents: [{ role: 'user', parts: [{ text: prompt }] }] } as const;
      const attempts: Array<{ mime?: string }> = [
        { mime: 'audio/mp3' },
        { mime: 'audio/ogg' },
        { mime: undefined },
      ];

      let played = false;
      for (const model of models) {
        for (const a of attempts) {
          try {
            const body = a.mime ? { ...common, generationConfig: { response_mime_type: a.mime } } : common;
            const data = await requestGemini(model, body);
          const parts: unknown = data?.candidates?.[0]?.content?.parts ?? [];

          // Audio path (supports inlineData or inline_data depending on API variant)
          if (a.mime && Array.isArray(parts)) {
            type InlineModern = { data?: string; mimeType?: string };
            type InlineLegacy = { data?: string; mime_type?: string };
            type AudioPart = { inlineData?: InlineModern; inline_data?: InlineLegacy };
            const audioPart = parts.find((p: unknown): p is AudioPart => {
              const obj = p as AudioPart;
              const inline = obj?.inlineData || obj?.inline_data;
              const hasData = inline && typeof inline.data === 'string';
              const hasMime = inline && (typeof (inline as InlineModern).mimeType === 'string' || typeof (inline as InlineLegacy).mime_type === 'string');
              return Boolean(hasData && hasMime);
            });
            if (audioPart) {
              const inline = (audioPart.inlineData as InlineModern | undefined) || (audioPart.inline_data as InlineLegacy | undefined);
              if (!inline || typeof inline.data !== 'string') {
                // should not happen due to guard above, but extra safety
                continue;
              }
              const b64 = inline.data;
              const mime = (typeof (inline as InlineModern).mimeType === 'string'
                ? (inline as InlineModern).mimeType
                : typeof (inline as InlineLegacy).mime_type === 'string'
                ? (inline as InlineLegacy).mime_type
                : a.mime) as string;
              const byteStr = atob(b64);
              const bytes = new Uint8Array(byteStr.length);
              for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
              const blob = new Blob([bytes], { type: mime });
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audioRef.current = audio;
              audio.onended = () => { try { URL.revokeObjectURL(url); } catch {}; setSpeaking(false); };
              audio.onerror = () => { try { URL.revokeObjectURL(url); } catch {}; setFormMessage('Audio playback failed.'); setSpeaking(false); };
              await audio.play();
              played = true;
                break;
            }
          }

          // Text path
          if (!a.mime) {
            let summary = '' as string;
            if (Array.isArray(parts)) {
              const textPart = parts.find((p: unknown) => typeof (p as { text?: unknown })?.text === 'string') as { text?: unknown } | undefined;
              if (textPart && typeof textPart.text === 'string') summary = textPart.text;
            }
            if (!summary && typeof (data?.text) === 'string') summary = String(data.text);
            if (!summary) throw new Error('Empty summary from Gemini');

            if ('speechSynthesis' in window) {
              const utter = new SpeechSynthesisUtterance(summary.trim());
              utter.lang = lang === 'es' ? 'es-ES' : 'en-US';
              utter.rate = 1;
              utter.pitch = 1;
              utter.onend = () => setSpeaking(false);
              utter.onerror = () => { setFormMessage('Speech synthesis failed.'); setSpeaking(false); };
              window.speechSynthesis.speak(utter);
            } else {
              setFormMessage('Speech synthesis not supported in this browser.');
              setSpeaking(false);
            }
            played = true;
              break;
          }
          } catch (e) {
            setFormMessage(e instanceof Error ? e.message : String(e));
            continue; // try next attempt or next model
          }
        }
        if (played) break; // exit outer loop if successful
      }

      if (!played) throw new Error('Failed to get audio or text from Gemini after multiple attempts');
    } catch (err) {
      setFormMessage(err instanceof Error ? `No se pudo generar el resumen por IA: ${err.message}` : 'No se pudo generar el resumen por IA');
      setSpeaking(false);
    }
  }

  if (incidentsLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-gray-500">Loading incident details…</p>
      </div>
    );
  }

  if (error || incidentsError || !incident) {
    return (
      <div className="space-y-4">
        <CoalButton variant="secondary" onClick={() => router.back()}>
          ← Back to Incidents
        </CoalButton>
        <CoalCard title="Error">
          <p className="text-sm text-red-700">{error || incidentsError || 'Incident not found'}</p>
        </CoalCard>
      </div>
    );
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormMessage(null);
    updateIncident(incidentId, { status, assignedTo: assignee, comment } as UpdateIncidentPayload)
      .then(() => setFormMessage('Incident updated successfully.'))
      .catch((err) => setFormMessage(err instanceof Error ? err.message : 'Failed to update incident'));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <CoalButton variant="secondary" onClick={() => router.push('/incidents')}>
          ← Back to Incidents
        </CoalButton>
        <h1 className="text-2xl font-bold text-gray-900">Incident {incident.id}</h1>
      </div>

      {/* Incident Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <CoalCard title="Incident Details">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-gray-900">ID</dt>
              <dd className="text-gray-700">{incident.id}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Status</dt>
              <dd>
                <StatusBadge tone={statusTone[incident.status] ?? 'neutral'}>
                  {statusLabel(incident.status)}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Assigned To</dt>
              <dd className="text-gray-700">{incident.assignedTo ?? 'Unassigned'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Created</dt>
              <dd className="text-gray-700">{formatDateLabel(incident.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Last Updated</dt>
              <dd className="text-gray-700">{formatDateLabel(incident.updatedAt)}</dd>
            </div>
          </dl>

          <div className="mt-4">
            {!analysisResult && (
              <CoalButton
                variant="primary"
                size="sm"
                onClick={async () => {
                  setAnalysisError(null);
                  setAnalysisLoading(true);
                  try {
                    // CVE list for analysis from scanDetail or incident fallback
                    let cveIds: string[] = [];
                    const deviceResult = scanDetail?.results.find((r) => r.deviceId === incident.deviceId);
                    if (deviceResult && Array.isArray(deviceResult.cves) && deviceResult.cves.length) {
                      cveIds = deviceResult.cves;
                    } else if (incident.cveId) {
                      cveIds = [incident.cveId];
                    }
                    const cves = cveIds.map((id) => ({ cveId: id }));

                    const key = `incident:${incident.id}:analysis:${cveIds.join(',')}`;
                    if (typeof window !== 'undefined') {
                      const cached = window.localStorage.getItem(key);
                      if (cached) {
                        setAnalysisResult(JSON.parse(cached));
                        setAnalysisLoading(false);
                        return;
                      }
                    }

                    const result = await analyzeWithClaude(
                      deviceDetail?.vendor ?? '',
                      deviceDetail?.product ?? '',
                      deviceDetail?.version ?? '',
                      cves,
                    );
                    setAnalysisResult(result);
                    if (typeof window !== 'undefined') {
                      try { window.localStorage.setItem(key, JSON.stringify(result)); } catch {}
                    }
                  } catch (err) {
                    setAnalysisError(err instanceof Error ? err.message : String(err));
                  } finally {
                    setAnalysisLoading(false);
                  }
                }}
              >
                View recommendations
              </CoalButton>
            )}
            {analysisLoading ? <p className="mt-2 text-sm text-gray-500">Running analysis…</p> : null}
            {analysisError ? (
              <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{analysisError}</p>
            ) : null}
          </div>
        </CoalCard>

        <CoalCard title="Scan Information">
          {scanDetail ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-gray-900">Scan ID</dt>
                  <dd className="text-gray-700">{scanDetail.scan.id}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Type</dt>
                <dd className="text-gray-700">{scanDetail.scan.type}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Status</dt>
                <dd>
                  <StatusBadge tone={scanStatusTone[scanDetail.scan.status] ?? 'neutral'}>
                    {scanDetail.scan.status}
                  </StatusBadge>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Started</dt>
                <dd className="text-gray-700">{formatDateLabel(scanDetail.scan.startedAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Devices Scanned</dt>
                <dd className="text-gray-700">{scanDetail.scan.totalDevices}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Loading scan details…</p>
          )}
        </CoalCard>

        <CoalCard title="Device Information">
          {deviceDetail ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-gray-900">Name</dt>
                <dd className="text-gray-700">{deviceDetail.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Vendor</dt>
                <dd className="text-gray-700">{deviceDetail.vendor}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Product</dt>
                <dd className="text-gray-700">{deviceDetail.product}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Version</dt>
                <dd className="text-gray-700">{deviceDetail.version}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">IP Address</dt>
                <dd className="text-gray-700">{deviceDetail.ip ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Serial</dt>
                <dd className="text-gray-700">{deviceDetail.serial}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">State</dt>
                <dd className="text-gray-700 capitalize">{deviceDetail.state}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">Last Scan</dt>
                <dd className="text-gray-700">
                  {deviceDetail.lastScanAt ? formatDateLabel(deviceDetail.lastScanAt) : 'Never'}
                  {deviceDetail.lastScanStatus && (
                    <span className="ml-2">
                      <StatusBadge
                        tone={
                          deviceDetail.lastScanStatus === 'ok'
                            ? 'safe'
                            : deviceDetail.lastScanStatus === 'issues'
                            ? 'warning'
                            : deviceDetail.lastScanStatus === 'failed'
                            ? 'critical'
                            : 'neutral'
                        }
                      >
                        {deviceDetail.lastScanStatus}
                      </StatusBadge>
                    </span>
                  )}
                </dd>
              </div>
              {deviceDetail.cpe && (
                <div>
                  <dt className="font-semibold text-gray-900">CPE</dt>
                  <dd className="text-gray-700 font-mono text-xs">{deviceDetail.cpe}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Loading device details…</p>
          )}
        </CoalCard>
      </div>

      {/* CVEs Found */}
      {scanDetail && (
        <CoalCard title="Vulnerabilities Detected" subtitle="CVEs found during the scan for this device">
          {(() => {
            const deviceResult = scanDetail.results.find((r) => r.deviceId === incident.deviceId);
            if (!deviceResult) return <p className="text-sm text-gray-500">No scan results found for this device.</p>;
            if (deviceResult.cves.length === 0) return <p className="text-sm text-gray-500">No CVEs detected for this device.</p>;
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">
                    Last updated {formatDateLabel(incident.updatedAt)}
                  </p>
                  {(() => {
                    const count = typeof deviceResult.cveCount === 'number' ? deviceResult.cveCount : deviceResult.cves.length;
                    const label = count >= 3 ? 'High Priority' : count >= 1 ? 'Medium Priority' : 'Low Priority';
                    const tone: ComponentProps<typeof StatusBadge>['tone'] = count >= 3 ? 'critical' : count >= 1 ? 'warning' : 'safe';
                    return <StatusBadge tone={tone}>{label}</StatusBadge>;
                  })()}
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {deviceResult.cves.map((cve) => (
                    <div key={cve} className="rounded-md border border-red-200 bg-red-50 p-4">
                      <p className="font-semibold text-red-900 text-lg">{cve}</p>
                      <p className="text-sm text-red-700 mt-1">Critical vulnerability detected</p>
                      <CoalButton
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${cve}`, '_blank')}
                      >
                        View NVD Details
                      </CoalButton>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </CoalCard>
      )}

      {(analysisLoading || analysisError || analysisResult) && (
        <CoalCard
          title="Recommendations"
          subtitle={analysisLoading ? 'Analyzing…' : analysisError ? 'Error' : analysisResult ? analysisResult.riskLevel : ''}
        >
          {analysisLoading ? (
            <p className="text-sm text-gray-500">Running analysis — this may take a few seconds.</p>
          ) : analysisError ? (
            <div>
              <p className="text-sm text-red-700">{analysisError}</p>
              <p className="mt-2 text-xs text-gray-500">
                If this error mentions anthropic-version, remove or adjust the ANTHROPIC_VERSION variable in your `.env.local` and restart the server.
              </p>
            </div>
          ) : analysisResult ? (
            <div>
              <p className="text-sm text-gray-700">{analysisResult.summary}</p>
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-900">Recommendations</p>
                <ul className="list-disc pl-5 text-sm text-gray-700">
                  {analysisResult.recommendations?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              {analysisResult.priorityActions && analysisResult.priorityActions.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-900">Priority actions</p>
                  <ul className="list-decimal pl-5 text-sm text-gray-700">
                    {analysisResult.priorityActions.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>

                  <div className="mt-4">
                    <div className="flex gap-2">
                      <CoalButton
                        variant="primary"
                        size="sm"
                        onClick={async () => {
                          try {
                            // derive CVE list for PDF
                            const deviceResult = scanDetail?.results?.find((r) => r.deviceId === incident.deviceId);
                            let cveIds: string[] = [];
                            if (deviceResult && Array.isArray(deviceResult.cves)) cveIds = deviceResult.cves;
                            if (cveIds.length === 0 && incident.cveId) cveIds = [incident.cveId];
                            const cves = cveIds.map((id) => ({ cveId: id }));

                            const vendor = deviceDetail?.vendor ?? '';
                            const product = deviceDetail?.product ?? '';
                            const version = deviceDetail?.version ?? '';

                            const locale = navigator.language || 'es-PE';
                            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
                            const now = new Date();
                            const day = String(now.getDate()).padStart(2, '0');
                            const month = String(now.getMonth() + 1).padStart(2, '0');
                            const year = String(now.getFullYear());
                            const hour = String(now.getHours()).padStart(2, '0');
                            const minute = String(now.getMinutes()).padStart(2, '0');
                            const generatedAt = `${day}/${month}/${year} ${hour}:${minute}`;

                            const scanMeta = scanDetail
                              ? {
                                  id: scanDetail.scan.id,
                                  type: scanDetail.scan.type,
                                  status: scanDetail.scan.status,
                                  startedAt: formatDateLabel(scanDetail.scan.startedAt),
                                  totalDevices: scanDetail.scan.totalDevices,
                                }
                              : undefined;

                            let template = 'default';
                            try { const t = localStorage.getItem('reportTemplate'); if (t) template = t; } catch {}

                            const blob = await generatePdfReport(
                              vendor,
                              product,
                              version,
                              cves,
                              analysisResult,
                              scanMeta,
                              { generatedAt, locale, timeZone, template },
                            );

                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `vulntrack-report-${incident.id}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          } catch (err) {
                            setFormMessage(err instanceof Error ? err.message : 'Failed to export report');
                          }
                        }}
                      >
                        Export results
                      </CoalButton>

                      <CoalButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!analysisResult) {
                            setFormMessage("Please click 'View recommendations' first to generate analysis (cached to save tokens).");
                            return;
                          }
                          setShowLangModal(true);
                        }}
                      >
                        AI-assisted summary
                      </CoalButton>

                      {showLangModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                          <div className="relative bg-white rounded-xl shadow-2xl p-6 min-w-[300px] max-w-[90vw] text-center">
                            <button
                              aria-label="Close"
                              className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                              onClick={() => {
                                setShowLangModal(false);
                                setFormMessage(null);
                              }}
                            >
                              ✕
                            </button>
                            <h3 className="text-lg font-bold mb-4 text-gray-900">Select the language</h3>
                            <div className="flex gap-4 justify-center mb-4">
                              <button
                                className="px-4 py-2 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600"
                                onClick={() => {
                                  setShowLangModal(false);
                                  void handleStartGeminiVoice('es');
                                }}
                              >
                                Español
                              </button>
                              <button
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                                onClick={() => {
                                  setShowLangModal(false);
                                  void handleStartGeminiVoice('en');
                                }}
                              >
                                English
                              </button>
                            </div>
                            <p className="text-sm text-gray-600">A short and friendly summary will be played in the selected language.</p>
                          </div>
                        </div>
                      )}

                      <CoalButton
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          stopVoicePlayback();
                          setFormMessage(null);
                        }}
                        disabled={!speaking}
                      >
                        Stop AI-assisted summary
                      </CoalButton>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </CoalCard>
      )}

      {/* Update Form */}
      <CoalCard title="Update Incident" subtitle="Modify status, assignment, and add comments">
        <form className="space-y-5" onSubmit={handleUpdate}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Status</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as IncidentStatus)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {statusOrder.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Assignee</label>
              <input
                type="text"
                value={assignee ?? ''}
                onChange={(event) => setAssignee(event.target.value || null)}
                placeholder="Add owner (optional)"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Comment</label>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              placeholder="Document mitigation steps"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          {formMessage ? (
            <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{formMessage}</p>
          ) : null}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Last updated {formatDateLabel(incident.updatedAt)}</p>
            <CoalButton type="submit" isLoading={mutating}>
              Apply changes
            </CoalButton>
          </div>
        </form>
      </CoalCard>

      {/* Timeline */}
      <CoalCard title="Incident Timeline" subtitle="History of status changes and comments">
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No history yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((entry) => (
              <li key={entry.id} className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Status: {statusLabel(entry.fromStatus || 'N/A')} → {statusLabel(entry.toStatus)}
                    </p>
                    <p className="text-sm text-gray-500">{formatDateLabel(entry.timestamp)}</p>
                    {entry.comment && <p className="mt-2 text-gray-700">{entry.comment}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CoalCard>
    </div>
  );
}