import { API_BASE_URL } from "./config";
import {
  CollaboratorRecord,
  CreateCollaboratorPayload,
  CreateDevicePayload,
  DashboardMetrics,
  DeviceDetail,
  IncidentHistoryEntry,
  IncidentRecord,
  IncidentStatus,
  DeviceRecord,
  MetricsSnapshot,
  LoginResponse,
  ReportSummary,
  RegisterRootPayload,
  ScanDetailResponse,
  ScanResultRecord,
  ScanSummary,
  ScheduledScanRecord,
  SchedulePayload,
  SubscriptionSimulation,
  SubscriptionStatus,
  StartScanPayload,
  StartScanResponse,
  UpdateIncidentPayload,
  VulnerabilityQueueItem,
} from "./types";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(
  path: string,
  { token, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const requestHeaders = new Headers(headers ?? {});

  if (init.body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: requestHeaders,
      cache: "no-store",
    });
  } catch (error) {
    const details = error instanceof Error ? { message: error.message } : undefined;
    throw new ApiError(
      "Unable to reach the VulnTrack API. Ensure the backend service is running.",
      503,
      details,
    );
  }

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }

    const message = (() => {
      if (typeof details === "string" && details.trim().length > 0) {
        return details;
      }
      if (typeof details === "object" && details !== null && "message" in details) {
        const candidate = (details as { message?: unknown }).message;
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          return candidate;
        }
      }
      return response.statusText;
    })();

    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

const INCIDENT_STATUS_VALUES: IncidentStatus[] = [
  "open",
  "in_progress",
  "escalated",
  "resolved",
  "closed",
  "false_positive",
];

function normalizeIncidentStatus(value: unknown): IncidentStatus {
  if (typeof value !== "string" || value.length === 0) {
    return "open";
  }

  const normalized = (value as string).toLowerCase();
  return (INCIDENT_STATUS_VALUES.includes(normalized as IncidentStatus)
    ? (normalized as IncidentStatus)
    : "open");
}

function normalizeIncidentRecord(incident: IncidentRecord): IncidentRecord {
  return {
    ...incident,
    status: normalizeIncidentStatus(incident.status),
  };
}

function normalizeIncidentHistoryEntry(
  entry: IncidentHistoryEntry,
): IncidentHistoryEntry {
  const format = (value: IncidentHistoryEntry["fromStatus"]) =>
    typeof value === "string" ? value.toLowerCase() : value;

  return {
    ...entry,
    fromStatus: format(entry.fromStatus),
    toStatus: format(entry.toStatus),
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerRoot(
  payload: RegisterRootPayload,
): Promise<LoginResponse> {
  return request<LoginResponse>("/api/users/register-root", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDevices(
  tenantId: string,
  token: string,
): Promise<DeviceRecord[]> {
  return request<DeviceRecord[]>(`/api/tenants/${tenantId}/devices`, {
    method: "GET",
    token,
  });
}

export async function createDevice(
  tenantId: string,
  token: string,
  payload: CreateDevicePayload,
): Promise<DeviceRecord> {
  return request<DeviceRecord>(`/api/tenants/${tenantId}/devices`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteDevice(
  tenantId: string,
  deviceId: string,
  token: string,
): Promise<void> {
  await request(`/api/tenants/${tenantId}/devices/${deviceId}`, {
    method: "DELETE",
    token,
  });
}

export async function updateDevice(
  tenantId: string,
  deviceId: string,
  token: string,
  payload: Partial<{
    vendor: string;
    product: string;
    version: string;
    ip?: string | null;
    name?: string | null;
    serial?: string | null;
    state?: string;
  }>,
): Promise<DeviceRecord> {
  // Normalize known fields to match backend expectations
  const bodyPayload = { ...payload } as Record<string, unknown>;
  if (typeof bodyPayload.state === "string") {
    bodyPayload.state = (bodyPayload.state as string).toUpperCase();
  }

  const device = await request<DeviceRecord>(
    `/api/tenants/${tenantId}/devices/${deviceId}`,
    {
      method: "PUT",
      token,
      body: JSON.stringify(bodyPayload),
    },
  );

  return device;
}

export async function getDeviceDetail(
  tenantId: string,
  deviceId: string,
  token: string,
): Promise<DeviceDetail> {
  return request<DeviceDetail>(`/api/tenants/${tenantId}/devices/${deviceId}`, {
    method: "GET",
    token,
  });
}

export async function listCollaborators(
  tenantId: string,
  token: string,
): Promise<CollaboratorRecord[]> {
  return request<CollaboratorRecord[]>(`/api/tenants/${tenantId}/collaborators`, {
    method: "GET",
    token,
  });
}

export async function addCollaborator(
  tenantId: string,
  token: string,
  payload: CreateCollaboratorPayload,
): Promise<CollaboratorRecord> {
  return request<CollaboratorRecord>(`/api/tenants/${tenantId}/collaborators`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function removeCollaborator(
  tenantId: string,
  collaboratorId: string,
  token: string,
): Promise<void> {
  await request(`/api/tenants/${tenantId}/collaborators/${collaboratorId}`, {
    method: "DELETE",
    token,
  });
}

export async function getSubscription(
  tenantId: string,
  token: string,
): Promise<SubscriptionStatus> {
  return request<SubscriptionStatus>(`/api/tenants/${tenantId}/subscription`, {
    method: "GET",
    token,
  });
}

export async function simulateSubscriptionChange(
  tenantId: string,
  token: string,
  targetPlan: SubscriptionStatus["plan"],
): Promise<SubscriptionSimulation> {
  return request<SubscriptionSimulation>(
    `/api/tenants/${tenantId}/subscription/simulate`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ targetPlan }),
    },
  );
}

export async function getDashboardMetrics(
  tenantId: string,
  token: string,
): Promise<DashboardMetrics> {
  const devices = await getDevices(tenantId, token);

  const aggregated = devices.reduce(
    (acc, device) => {
      acc.totalDevices += 1;
      acc.criticalFindings += device.criticalFindings ?? 0;
      acc.highFindings += device.highFindings ?? 0;
      acc.mediumFindings += device.mediumFindings ?? 0;
      acc.lowFindings += device.lowFindings ?? 0;
      if (device.lastScanAt ?? device.updatedAt) {
        const candidate = device.lastScanAt ?? device.updatedAt!;
        if (!acc.lastScanAt || new Date(candidate) > new Date(acc.lastScanAt)) {
          acc.lastScanAt = candidate;
        }
      }
      return acc;
    },
    {
      totalDevices: 0,
      criticalFindings: 0,
      highFindings: 0,
      mediumFindings: 0,
      lowFindings: 0,
      lastScanAt: null as string | null,
    },
  );

  return aggregated;
}

export async function getVulnerabilityQueue(
  tenantId: string,
  token: string,
): Promise<VulnerabilityQueueItem[]> {
  // Placeholder implementation until backend exposes a dedicated vulnerability queue endpoint.
  // Surface device data enriched with severity counts as interim queue items.
  const devices = await getDevices(tenantId, token);

  return devices.flatMap((device) => {
    const baseItem = {
      device: `${device.vendor} ${device.product}`,
      detectedAt: device.updatedAt ?? device.createdAt,
    };

    const items: VulnerabilityQueueItem[] = [];

    if ((device.criticalFindings ?? 0) > 0) {
      items.push({
        id: `${device.id}-critical`,
        title: `${device.criticalFindings} critical issues`,
        severity: "CRITICAL",
        status: "OPEN",
        ...baseItem,
      });
    }

    if ((device.highFindings ?? 0) > 0) {
      items.push({
        id: `${device.id}-high`,
        title: `${device.highFindings} high risk exposures`,
        severity: "HIGH",
        status: "IN_PROGRESS",
        ...baseItem,
      });
    }

    if (items.length === 0) {
      items.push({
        id: `${device.id}-info`,
        title: "Monitoring",
        severity: "LOW",
        status: "RESOLVED",
        ...baseItem,
      });
    }

    return items;
  });
}

export async function getMetricsSnapshot(): Promise<MetricsSnapshot> {
  return request<MetricsSnapshot>("/metrics", { method: "GET" });
}

export async function startScan(
  token: string,
  payload: StartScanPayload,
): Promise<StartScanResponse> {
  return request<StartScanResponse>("/api/scans/start", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function listScans(
  tenantId: string,
  token: string,
): Promise<ScanSummary[]> {
  const result = await request<{ data?: ScanSummary[] } | ScanSummary[]>(
    `/api/scans?tenantId=${tenantId}`,
    {
      method: "GET",
      token,
    },
  );

  if (Array.isArray(result)) {
    return result;
  }

  return result.data ?? [];
}

export async function getScanDetail(
  scanId: string,
  token: string,
): Promise<ScanDetailResponse> {
  return request<ScanDetailResponse>(`/api/scans/${scanId}`, {
    method: "GET",
    token,
  });
}

export async function getScanResultByDevice(
  scanId: string,
  deviceId: string,
  token: string,
): Promise<ScanResultRecord> {
  return request<ScanResultRecord>(`/api/scans/${scanId}/results/${deviceId}`, {
    method: "GET",
    token,
  });
}

export async function listIncidents(
  tenantId: string,
  token: string,
): Promise<IncidentRecord[]> {
  const result = await request<{ data?: IncidentRecord[] } | IncidentRecord[]>(
    `/api/incidents?tenantId=${tenantId}`,
    {
      method: "GET",
      token,
    },
  );

  const incidents = Array.isArray(result) ? result : result.data ?? [];

  return incidents.map((incident) => normalizeIncidentRecord(incident));
}

export async function updateIncident(
  incidentId: string,
  token: string,
  payload: UpdateIncidentPayload,
): Promise<IncidentRecord> {
  const incident = await request<IncidentRecord>(`/api/incidents/${incidentId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });

  return normalizeIncidentRecord(incident);
}

export async function getIncident(
  incidentId: string,
  token: string,
): Promise<IncidentRecord | null> {
  const result = await request<{ data?: IncidentRecord } | IncidentRecord>(
    `/api/incidents/${incidentId}`,
    { method: "GET", token },
  );
  if (result && typeof result === "object" && "data" in result) {
    const inner = (result as { data?: IncidentRecord }).data;
    return inner ? normalizeIncidentRecord(inner) : null;
  }

  return normalizeIncidentRecord(result as IncidentRecord);
}

export async function putIncident(
  incidentId: string,
  token: string,
  payload: Partial<{
    status?: string;
    changedBy?: string;
    comment?: string;
    assignTo?: string | null;
    assignedBy?: string;
  }>,
): Promise<IncidentRecord> {
  const incident = await request<{ data?: IncidentRecord } | IncidentRecord>(
    `/api/incidents/${incidentId}`,
    {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    },
  );

  let raw: IncidentRecord | undefined;
  if (incident && typeof incident === "object" && "data" in incident) {
    raw = (incident as { data?: IncidentRecord }).data;
  } else {
    raw = incident as IncidentRecord;
  }

  if (!raw) throw new ApiError("Incident not returned", 500);
  return normalizeIncidentRecord(raw as IncidentRecord);
}

export async function changeIncidentStatus(
  incidentId: string,
  token: string,
  payload: { status: string; changedBy: string; comment?: string },
): Promise<IncidentRecord> {
  const res = await request<{ data?: IncidentRecord } | IncidentRecord>(
    `/api/incidents/${incidentId}/status`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );

  let raw: IncidentRecord | undefined;
  if (res && typeof res === "object" && "data" in res) {
    raw = (res as { data?: IncidentRecord }).data;
  } else {
    raw = res as IncidentRecord;
  }

  if (!raw) throw new ApiError("Incident not returned", 500);
  return normalizeIncidentRecord(raw as IncidentRecord);
}

export async function assignIncident(
  incidentId: string,
  token: string,
  payload: { assignTo: string | null; assignedBy: string },
): Promise<IncidentRecord> {
  const res = await request<{ data?: IncidentRecord } | IncidentRecord>(
    `/api/incidents/${incidentId}/assign`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );

  let raw: IncidentRecord | undefined;
  if (res && typeof res === "object" && "data" in res) {
    raw = (res as { data?: IncidentRecord }).data;
  } else {
    raw = res as IncidentRecord;
  }

  if (!raw) throw new ApiError("Incident not returned", 500);
  return normalizeIncidentRecord(raw as IncidentRecord);
}

export async function getIncidentHistory(
  incidentId: string,
  token: string,
): Promise<IncidentHistoryEntry[]> {
  const result = await request<
    | IncidentHistoryEntry[]
    | { data?: IncidentHistoryEntry[]; history?: IncidentHistoryEntry[] }
  >(`/api/incidents/${incidentId}/history`, {
    method: "GET",
    token,
  });

  let entries: IncidentHistoryEntry[] = [];

  if (Array.isArray(result)) {
    entries = result;
  } else if (result?.history && Array.isArray(result.history)) {
    entries = result.history;
  } else if (result?.data && Array.isArray(result.data)) {
    entries = result.data;
  }

  return entries.map((entry) => normalizeIncidentHistoryEntry(entry));
}

export async function listSchedules(
  tenantId: string,
  token: string,
): Promise<ScheduledScanRecord[]> {
  const result = await request<{
    data?: ScheduledScanRecord[];
  } | ScheduledScanRecord[]>(`/api/tenants/${tenantId}/schedules`, {
    method: "GET",
    token,
  });

  if (Array.isArray(result)) {
    return result;
  }

  return result.data ?? [];
}

export async function createSchedule(
  tenantId: string,
  token: string,
  payload: SchedulePayload,
): Promise<ScheduledScanRecord> {
  return request<ScheduledScanRecord>(`/api/tenants/${tenantId}/schedules`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateSchedule(
  tenantId: string,
  scheduleId: string,
  token: string,
  payload: SchedulePayload,
): Promise<ScheduledScanRecord> {
  return request<ScheduledScanRecord>(
    `/api/tenants/${tenantId}/schedules/${scheduleId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteSchedule(
  tenantId: string,
  scheduleId: string,
  token: string,
): Promise<void> {
  await request(`/api/tenants/${tenantId}/schedules/${scheduleId}`, {
    method: "DELETE",
    token,
  });
}

export async function listReports(
  tenantId: string,
  token: string,
): Promise<ReportSummary[]> {
  const result = await request<{ data?: ReportSummary[] } | ReportSummary[]>(
    `/api/tenants/${tenantId}/reports`,
    {
      method: "GET",
      token,
    },
  );

  if (Array.isArray(result)) {
    return result;
  }

  return result.data ?? [];
}
