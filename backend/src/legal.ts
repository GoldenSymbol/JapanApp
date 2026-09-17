// Single source of truth for which version of the Terms of Service is currently in force.
// The document text itself lives only on the frontend (frontend/src/legal/content.ts) — the
// backend only needs to know the version string, to gate access and to record exactly what a
// user agreed to.
//
// Bump this ONLY for a substantive change to the terms (new obligations, new data use, a scope
// change) — never for a wording/typo fix or a Privacy Policy-only update. Bumping it means every
// user, including ones who already accepted an earlier version, will be asked to accept again the
// next time they open the app (see RequireAuth's terms gate on the frontend).
export const TERMS_VERSION = "1.1";
