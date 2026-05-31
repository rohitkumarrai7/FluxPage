// ─── ATS Scoring Module (Re-exports from Enterprise Engine) ────────────────────
// This file now delegates to the enterprise-grade ATS engine.
// All existing consumers (http.ts, drafts.ts, tailoringRuns.ts) continue to work.

export { scoreResumeAgainstJD } from "./atsEngine";
export { scoreEnterpriseATS, type EnterpriseATSResult } from "./atsEngine";
