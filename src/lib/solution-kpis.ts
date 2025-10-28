import type { IncidentRecord, IncidentStatus, ScanResultRecord, ScanSummary } from "./types";

// --- Utilities ---
function isWithinDays(dateStr?: string | null, days = 30): boolean {
  if (!dateStr) return false;
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return false;
  const now = Date.now();
  const diff = now - dt.getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const arr = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
}

// --- Average scan time ---
export function computeAverageScanDuration(scans: ScanSummary[], windowDays = 30): {
  averageMs?: number;
  medianMs?: number;
  sample: number;
} {
  const durations = scans
    .filter((s) => isWithinDays(s.startedAt, windowDays))
    .map((s) => {
      const start = new Date(s.startedAt).getTime();
      const endStr = s.finishedAt ?? s.startedAt;
      const end = new Date(endStr).getTime();
      const ms = end - start;
      return Number.isFinite(ms) && ms > 0 ? ms : null;
    })
    .filter((v): v is number => typeof v === 'number');

  if (!durations.length) return { sample: 0 };

  const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const med = median(durations)?.valueOf();
  return { averageMs: avg, medianMs: med, sample: durations.length };
}

// --- Detection quality ---
export interface DetectionQualityInput {
  // Optional ground truth by device: set of CVE IDs that should be detected in the window.
  groundTruthByDevice?: Record<string, Set<string>>;
  // Detected by device: set of CVE IDs actually detected in the window.
  detectedByDevice?: Record<string, Set<string>>;
  // If ground truth isn't available, we approximate using incident status as FP marker.
  incidents?: IncidentRecord[];
}

export function computeDetectionQuality(input: DetectionQualityInput): {
  precision?: number; // TP / (TP + FP)
  recall?: number;    // TP / (TP + FN)
  f1?: number;
  counts: { TP: number; FP: number; FN: number };
  method: 'ground-truth' | 'incident-proxy';
} {
  const { groundTruthByDevice, detectedByDevice, incidents } = input;

  // Prefer strict ground-truth if provided.
  if (groundTruthByDevice && detectedByDevice) {
    let TP = 0, FP = 0, FN = 0;
    const devices = new Set<string>([
      ...Object.keys(groundTruthByDevice),
      ...Object.keys(detectedByDevice),
    ]);
    devices.forEach((dev) => {
      const gt = groundTruthByDevice[dev] ?? new Set<string>();
      const det = detectedByDevice[dev] ?? new Set<string>();
      det.forEach((cve) => {
        if (gt.has(cve)) TP++; else FP++;
      });
      gt.forEach((cve) => {
        if (!det.has(cve)) FN++;
      });
    });
    const precision = TP + FP > 0 ? TP / (TP + FP) : undefined;
    const recall = TP + FN > 0 ? TP / (TP + FN) : undefined;
    const f1 = precision && recall && (precision + recall > 0)
      ? (2 * precision * recall) / (precision + recall)
      : undefined;
    return { precision, recall, f1, counts: { TP, FP, FN }, method: 'ground-truth' };
  }

  // Fallback proxy using incident statuses (no strict recall possible without FN labels)
  const fp = (incidents ?? []).filter((i) => i.status === 'false_positive').length;
  const tp = (incidents ?? []).filter((i) => i.status === 'resolved' || i.status === 'closed').length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : undefined;
  return { precision, recall: undefined, f1: undefined, counts: { TP: tp, FP: fp, FN: 0 }, method: 'incident-proxy' };
}

// --- False negatives estimation ---
export interface FNHeuristicInput {
  resultsByDevice: Record<string, ScanResultRecord[]>; // pre-fetched and grouped by device
  windowDays?: number;
  minGapMinutes?: number; // min time between scans to consider "newly appeared" suspicious
}

export function estimateFalseNegativesHeuristic(input: FNHeuristicInput): {
  estimatedFN: number;
  inspectedDevices: number;
  method: 'consecutive-scan-appearance';
} {
  const { resultsByDevice, windowDays = 30, minGapMinutes = 10 } = input;
  let estimatedFN = 0;
  let inspectedDevices = 0;

  const minGapMs = minGapMinutes * 60 * 1000;

  for (const results of Object.values(resultsByDevice)) {
    const filtered = results
      .filter((r) => isWithinDays(r.startedAt ?? r.finishedAt ?? undefined, windowDays))
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    if (filtered.length < 2) continue;
    inspectedDevices++;

    for (let i = 1; i < filtered.length; i++) {
      const prev = filtered[i - 1];
      const curr = filtered[i];
      const gap = new Date(curr.startedAt).getTime() - new Date(prev.finishedAt ?? prev.startedAt).getTime();
      if (gap < minGapMs) continue; // scans too close – likely same window

      const prevSet = new Set(prev.cves ?? []);
      const currSet = new Set(curr.cves ?? []);

      // Count CVEs that "appear" in current that were not in previous.
      // This is ambiguous (could be newly introduced vulnerabilities),
      // but in steady environments these can hint missed detections previously.
      let newCves = 0;
      currSet.forEach((c) => { if (!prevSet.has(c)) newCves++; });
      estimatedFN += newCves;
    }
  }

  return { estimatedFN, inspectedDevices, method: 'consecutive-scan-appearance' };
}

// --- Time savings ---
export interface TimeSavingsInput {
  incidents: IncidentRecord[];
  windowDays?: number; // default 30
  manualMinutesPerDetection?: number; // baseline (e.g., 20)
  automatedMinutesPerDetection?: number; // system time (e.g., 2)
  countFromStatuses?: Array<'resolved' | 'closed' | 'in_progress' | 'open'>; // which are considered "handled"
}

export function computeTimeSavings(input: TimeSavingsInput): {
  detectionsHandled: number;
  minutesSaved: number;
  hoursSaved: number;
  assumptions: string[];
} {
  const {
    incidents,
    windowDays = 30,
    manualMinutesPerDetection = 20,
    automatedMinutesPerDetection = 2,
    countFromStatuses = ['resolved', 'closed'],
  } = input;

  const countSet = new Set<IncidentStatus>(countFromStatuses as IncidentStatus[]);
  const handled = incidents
    .filter((i) => isWithinDays(i.updatedAt ?? i.createdAt, windowDays))
    .filter((i) => countSet.has(i.status)).length;

  const minutesPerDetection = Math.max(0, manualMinutesPerDetection - automatedMinutesPerDetection);
  const minutesSaved = handled * minutesPerDetection;
  const hoursSaved = minutesSaved / 60;

  const assumptions = [
    `Manual por detección: ${manualMinutesPerDetection} min`,
    `Automatizado por detección: ${automatedMinutesPerDetection} min`,
    `Estados contados: ${countFromStatuses.join(', ')}`,
  ];

  return { detectionsHandled: handled, minutesSaved, hoursSaved, assumptions };
}
