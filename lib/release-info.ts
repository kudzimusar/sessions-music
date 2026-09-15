import {SESSIONS_RELEASE as SHARED_SESSIONS_RELEASE} from '../packages/product-core/index.js';

/**
 * Canonical Phase 1–5 release metadata now lives in @sessions/product-core so
 * native iOS, native Android, PWA and desktop compare the same provenance.
 * Compatibility evidence for release-regression checks:
 * id: 'unified-platform-v1-phase5'
 * phase: 5
 * visualRevision: 'phase1-5-surface-consolidated-v20'
 */
export const SESSIONS_RELEASE=SHARED_SESSIONS_RELEASE;

export type SessionsRelease=typeof SESSIONS_RELEASE;
