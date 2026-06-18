/** Centralized query keys so invalidation stays consistent across the app. */
export const qk = {
  me: ['users', 'me'] as const,

  pits: ['pits'] as const,
  pit: (id: string) => ['pits', id] as const,
  readings: (pitId: string) => ['pits', pitId, 'readings'] as const,

  householdMe: ['households', 'me'] as const,
  householdJobs: ['households', 'me', 'jobs'] as const,

  providerMe: ['providers', 'me'] as const,
  providerEarnings: ['providers', 'me', 'earnings'] as const,
  providerJobs: ['jobs', 'provider', 'mine'] as const,
  providers: ['providers'] as const,
  provider: (id: string) => ['providers', id] as const,

  jobs: ['jobs'] as const,
  job: (id: string) => ['jobs', id] as const,

  reportSummary: ['reports', 'summary'] as const,
  reportByDistrict: ['reports', 'by-district'] as const,

  settings: ['settings'] as const,

  adminFacilities: ['admin', 'facilities'] as const,
  adminFacility: (id: string) => ['admin', 'facilities', id] as const,
  adminUsers: ['admin', 'users'] as const,

  districtOverview: ['district', 'overview'] as const,
  districtFacilities: ['district', 'facilities'] as const,
  districtAlerts: ['district', 'alerts'] as const,
  districtReports: ['district', 'reports'] as const,

  priceQuote: (size: string, zone: string) => ['pricing', 'quote', size, zone] as const,

  locations: ['locations', 'regions'] as const,
};
