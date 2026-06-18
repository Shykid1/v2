export type Role = 'household' | 'provider' | 'admin' | 'district_officer';
export type PitSize = 'standard' | 'large_shared';
export type DistanceZone = 'near' | 'mid' | 'remote';
export type PaymentMethod = 'cash' | 'paystack';

export type JobStatus =
  | 'PENDING_APPROVAL'
  | 'CREATED'
  | 'OFFERED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'COMPLETED'
  | 'PAID'
  | 'PAID_CASH'
  | 'CLOSED'
  | 'SLA_BREACHED'
  | 'CANCELLED';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: Role;
}

export interface AuthResponse {
  access_token: string;
  mustChangePassword: boolean;
  user: AuthUser;
}

export interface Pit {
  id: string;
  code: string;
  name: string | null;
  sizeClass: PitSize;
  zone: DistanceZone;
  sensored: boolean;
  ghanaPostAddress: string | null;
  devices?: { deviceId: string; lastSeen: string | null }[];
  readings?: { fillPct: string; sensorTs: string }[];
}

export interface Job {
  id: string;
  status: JobStatus;
  triggerSource: string;
  paymentMethod: PaymentMethod;
  priceTotal: string | null;
  createdAt: string;
  approvalRequestedAt?: string | null;
  approvalDeadline?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
  pit: {
    code: string;
    name: string | null;
    zone?: DistanceZone;
    lat?: number | null;
    lng?: number | null;
    ghanaPostAddress?: string | null;
    district?: string | null;
    community?: string | null;
  };
  household?: { user: { name: string; phone: string; whatsappNumber?: string | null } };
  provider?: { businessName: string } | null;
  payment?: { method: string; status: string; amount: string } | null;
  offers?: { providerId: string; status: string; provider: { businessName: string } }[];
  overdue?: boolean;
}

export interface Provider {
  id: string;
  businessName: string;
  coverageZones: string[];
  region?: string | null;
  district?: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  kycStatus: string;
  paystackSubaccountCode: string | null;
  ledgerBalance: string;
  vehicleCapacityLiters?: number | null;
  user?: { name: string; phone: string; whatsappNumber: string | null };
}

export interface LocationDistrict {
  id: string;
  name: string;
}

export interface LocationRegion {
  id: string;
  name: string;
  districts: LocationDistrict[];
}

export interface ProviderLedgerEntry {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  note: string | null;
  createdAt: string;
}

export interface ProviderJobRow {
  id: string;
  status: JobStatus;
  priceTotal: string | null;
  paymentMethod: PaymentMethod;
  createdAt: string;
  completedAt: string | null;
  pit: { code: string; name: string | null };
}

export interface ProviderDetail extends Provider {
  user?: { name: string; phone: string; whatsappNumber: string | null; email?: string | null };
  jobs: ProviderJobRow[];
  ledgerEntries: ProviderLedgerEntry[];
}

export interface Earnings {
  ledgerBalance: number;
  creditLimit: number;
  payments: { id: string; amount: string; method: string; status: string; createdAt?: string }[];
}

export interface HouseholdProfile {
  id: string;
  tier: 'sensored' | 'unsensored';
  user: { name: string; phone: string; email: string | null; whatsappNumber: string | null };
  defaultPaymentMethod?: PaymentMethod;
  pits?: Pit[];
}

export interface PriceQuote {
  sizeClass: PitSize;
  zone: DistanceZone;
  basePrice: number;
  accessSurcharge: number;
  total: number;
  currency: string;
}

export interface ReportSummary {
  coverage: {
    households: number;
    totalPits: number;
    sensoredPits: number;
    sensoredPct: number;
    providersVerified: number;
  };
  operations: {
    jobsTotal: number;
    jobsCompleted: number;
    completionRatePct: number;
    floodPreemptiveJobs: number;
    cashJobs: number;
    digitalJobs: number;
  };
}

export interface DistrictReportRow {
  district: string;
  households: number;
  totalPits: number;
  sensoredPits: number;
  sensoredPct: number;
}

export type PlatformSettings = Record<string, unknown>;

export type FacilityStatus = 'ok' | 'warning' | 'critical' | 'unknown';

export interface AdminFacility {
  id: string;
  code: string;
  name: string | null;
  lat: number | null;
  lng: number | null;
  ghanaPostAddress: string | null;
  sizeClass: PitSize;
  zone: DistanceZone;
  sensored: boolean;
  pitDepthCm: number;
  district: string | null;
  community: string | null;
  active: boolean;
  household: { name: string; phone: string } | null;
  device: { deviceId: string; lastSeen: string | null; online: boolean; batteryMv: number | null } | null;
  fillPct: number | null;
  lastReadingAt: string | null;
  status: FacilityStatus;
}

export interface FacilityReading {
  fillPct: number;
  batteryMv: number | null;
  temperatureC: number | null;
  sensorTs: string;
}

export interface FacilityJobRow {
  id: string;
  status: JobStatus;
  triggerSource: string;
  priceTotal: string | null;
  paymentMethod: PaymentMethod;
  createdAt: string;
  completedAt: string | null;
}

export interface AdminFacilityDetail extends AdminFacility {
  readings: FacilityReading[];
  jobs: FacilityJobRow[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  whatsappNumber: string | null;
  role: Role;
  active: boolean;
  createdAt: string;
  household: { tier: HouseholdTier } | null;
  provider: { businessName: string; verificationStatus: 'pending' | 'verified' | 'rejected' } | null;
  districtOfficer: { district: string | null; region: string | null; title: string | null } | null;
}

export type HouseholdTier = 'sensored' | 'unsensored';

export interface DistrictOverview {
  district: string | null;
  totalPits: number;
  monitoredPits: number;
  criticalPits: number;
  warningPits: number;
  offlineSensors: number;
  pendingApprovals: number;
  overdueApprovals: number;
  slaBreaches: number;
  jobsTotal: number;
  jobsCompleted: number;
  completionRatePct: number;
}

export interface DistrictAlerts {
  pendingApprovals: Job[];
  slaBreaches: Job[];
  criticalPits: AdminFacility[];
}

export interface DistrictReports {
  summary: ReportSummary;
  byDistrict: DistrictReportRow[];
}
