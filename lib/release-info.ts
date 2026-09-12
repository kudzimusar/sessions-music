export const SESSIONS_RELEASE = {
  id: 'unified-platform-v1-phase4',
  phase: 4,
  phaseStatus: 'complete',
  brand: 'black-royal-blue-white',
  brandPrimary: '#4169E1',
  visualRevision: 'canonical-customer-v5-1',
  source: 'github-main',
  deploymentModel: 'chatgpt-sites-versioned',
} as const;

export type SessionsRelease = typeof SESSIONS_RELEASE;
