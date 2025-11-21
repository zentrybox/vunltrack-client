export type UserRole = "ROOT" | "COLLABORATOR" | "VIEWER" | "ADMIN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName?: string;
}

export interface TenantSummary {
  id: string;
  name: string;
}

export interface LoginResponse {
  auth: {
    token: string;
    refreshToken?: string;
    expiresIn?: number;
  };
  user: AuthUser;
  tenant?: TenantSummary;
}

export interface RegisterRootPayload {
  name: string;
  email: string;
  tenantName: string;
  password?: string;
}

// Harmonized to lowercase to match backend storage & UI expectations
export type DeviceState = "active" | "inactive" | "retired";

export type DeviceScanStatus = "OK" | "ISSUES" | "FAILED";

export interface DeviceRecord {
  id: string;
  tenantId: string;
  vendor: string;
  product: string;
  version: string;
  name?: string | null;
  ip?: string | null;
  serial?: string;
  state?: DeviceState;
  lastScanAt?: string | null;
  lastScanStatus?: DeviceScanStatus | null;
  createdAt: string;
  updatedAt?: string;
  criticalFindings?: number;
  highFindings?: number;
  mediumFindings?: number;
  lowFindings?: number;
  cpe?: string | null;
}

export interface DeviceDetail {
  id: string;
  tenantId: string;
  vendor: string;
  product: string;
  version: string;
  createdAt: string;
  ip?: string | null;
  name?: string | null;
  serial: string;
  state: 'active' | 'inactive' | 'retired';
  lastScanAt?: string | null;
  lastScanStatus?: 'ok' | 'issues' | 'failed' | null;
  cpe?: string | null;
}

export interface CreateDevicePayload {
  vendor: string;
  product: string;
  version: string;
  name?: string;
  ip?: string;
  serial?: string;
  state?: DeviceState;
}

export interface CollaboratorRecord {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface CreateCollaboratorPayload {
  name: string;
  email: string;
  password: string;
}

export interface SubscriptionStatus {
  subscriptionId: string;
  tenantId: string;
  plan: "BASIC" | "STANDARD" | "ENTERPRISE";
  createdAt: string;
  updatedAt: string;
  limits: {
    userLimit: number | null;
    deviceLimit: number | null;
  };
  usage: {
    users: number;
    devices: number;
  };
  remaining: {
    users: number | null;
    devices: number | null;
  };
  unlimited: {
    users: boolean;
    devices: boolean;
  };
  canAddUser: boolean;
  canAddDevice: boolean;
}

export interface SubscriptionSimulation {
  tenantId: string;
  currentPlan: SubscriptionStatus["plan"];
  targetPlan: SubscriptionStatus["plan"];
  changeType: "UPGRADE" | "DOWNGRADE" | "LATERAL";
  allowed: boolean;
  reasons: string[];
  usage: SubscriptionStatus["usage"];
  currentLimits: SubscriptionStatus["limits"];
  targetLimits: SubscriptionStatus["limits"];
  targetCapacity?: {
    tenantId: string;
    plan: SubscriptionStatus["plan"];
    limits: SubscriptionStatus["limits"];
    usage: SubscriptionStatus["usage"];
    fits: boolean;
    exceeded?: Record<string, number>;
  };
  prorationEstimate?: unknown;
  notes?: string;
}

export interface DashboardMetrics {
  totalDevices: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  lastScanAt?: string | null;
}

export interface VulnerabilityQueueItem {
  id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  device: string;
  detectedAt: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
}

export interface MetricsSnapshot {
  averageScanDurationMs: number;
  deviceSuccessRatio: number;
  cveDetectionRate: number;
}

export type ScanStatus = "running" | "completed" | "failed" | "cancelled";

export interface ScanSummary {
  id: string;
  tenantId: string;
  startedAt: string;
  finishedAt?: string | null;
  status: ScanStatus;
  type: 'soft' | 'deep';
  totalDevices: number;
  completedDevices: number;
  successful: number;
  withIssues: number;
  createdBy: string;
}

export type ScanResultStatus = "pending" | "running" | "completed" | "failed";

export interface ScanResultRecord {
  id: string;
  scanId: string;
  deviceId: string;
  status: ScanResultStatus;
  cveCount: number;
  cves: string[];
  startedAt: string;
  finishedAt?: string | null;
}

export interface ScanDetailResponse {
  scan: ScanSummary;
  results: ScanResultRecord[];
}

export interface ScanStartDevice {
  jobId?: string;
  deviceId: string;
  vendor?: string;
  product?: string;
  version?: string;
}

export interface StartScanPayload {
  id?: string;
  tenantId: string;
  createdBy: string;
  type?: 'soft' | 'deep';
  devices: ScanStartDevice[];
}

export interface StartScanResponse {
  scanId: string;
}

// Backend uses lowercase statuses with underscores.
export type IncidentStatus =
  | 'open'
  | 'in_progress'
  | 'escalated'
  | 'resolved'
  | 'closed'
  | 'false_positive';

export interface IncidentRecord {
  id: string;
  scanId: string;
  deviceId: string;
  cveId: string;
  status: IncidentStatus;
  assignedTo?: string | null;
  tenantId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentHistoryEntry {
  id: string;
  incidentId: string;
  changedBy: string;
  fromStatus: IncidentStatus | string;
  toStatus: IncidentStatus | string;
  timestamp: string;
  comment?: string | null;
}

export interface UpdateIncidentPayload {
  status?: IncidentStatus;
  assignedTo?: string | null;
  comment?: string;
}

export interface ScheduledScanRecord {
  id: string;
  tenantId: string;
  name: string;
  cron: string;
  active: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
}

export interface SchedulePayload {
  name: string;
  cron: string;
  active?: boolean;
  deviceIds?: string[];
}

export interface ReportSummary {
  id: string;
  name: string;
  format: string;
  generatedAt: string;
}

// CVE shape used by the frontend analysis flow (adapted from python)
export interface CVE {
  cveId: string;
  severity?: string;
  cvssScore?: number | null;
  summary?: string;
  references?: string[];
}

export interface VulnerabilityAnalysis {
  riskLevel: string; // e.g. CRITICAL/HIGH/MEDIUM/LOW/UNKNOWN
  summary: string;
  recommendations: string[];
  priorityActions: string[];
  impact?: string;
}

export interface ApiErrorShape {
  message: string;
  status: number;
  details?: unknown;
}
