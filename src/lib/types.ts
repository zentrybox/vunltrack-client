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

export interface DeviceRecord {
  id: string;
  tenantId: string;
  vendor: string;
  product: string;
  version: string;
  createdAt: string;
  updatedAt?: string;
  criticalFindings?: number;
  highFindings?: number;
  mediumFindings?: number;
  lowFindings?: number;
}

export interface CreateDevicePayload {
  vendor: string;
  product: string;
  version: string;
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

export interface ApiErrorShape {
  message: string;
  status: number;
  details?: unknown;
}
