export const SESSIONS_RELEASE = {
  id: 'unified-platform-v1-phase5',
  phase: 5,
  phaseStatus: 'complete',
  brand: 'black-royal-blue-white',
  brandPrimary: '#4169E1',
  visualRevision: 'phase1-5-surface-consolidated-v20',
  source: 'github-main',
  deploymentModel: 'chatgpt-sites-versioned',
} as const;

export type SessionsRelease = typeof SESSIONS_RELEASE;
