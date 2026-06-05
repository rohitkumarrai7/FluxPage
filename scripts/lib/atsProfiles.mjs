/**
 * ATS scoring profile calibration (test-only).
 * Recomputes overall score from breakdown using alternate weight profiles.
 */

export const ATS_PROFILES = {
  fluxpage: {
    id: "fluxpage",
    label: "Fluxpage (current)",
    weights: { keyword: 0.23, taxonomy: 0.15, semantic: 0.18, section: 0.1, format: 0.1, impact: 0.1, experience: 0.09, industry: 0.05 },
    knockoutCap: null,
  },
  keywordHeavy: {
    id: "keyword-heavy",
    label: "Keyword-heavy (Taleo-style)",
    weights: { keyword: 0.4, taxonomy: 0.15, semantic: 0.1, section: 0.1, format: 0.1, impact: 0.1, experience: 0.05 },
    knockoutCap: null,
  },
  semanticHeavy: {
    id: "semantic-heavy",
    label: "Semantic-heavy (modern AI-ATS)",
    weights: { keyword: 0.15, taxonomy: 0.15, semantic: 0.35, section: 0.1, format: 0.1, impact: 0.1, experience: 0.05 },
    knockoutCap: null,
  },
  knockoutStrict: {
    id: "knockout-strict",
    label: "Knockout-strict (Workday-style)",
    weights: { keyword: 0.23, taxonomy: 0.15, semantic: 0.18, section: 0.1, format: 0.1, impact: 0.1, experience: 0.09, industry: 0.05 },
    knockoutCap: 35,
  },
};

export function scoreWithProfile(breakdown, passedKnockouts, profileId = "fluxpage") {
  const profile = ATS_PROFILES[profileId] || ATS_PROFILES.fluxpage;
  const w = profile.weights;
  const raw =
    (breakdown.keywordMatch / 100) * w.keyword +
    (breakdown.taxonomyMatch / 100) * w.taxonomy +
    (breakdown.semanticSimilarity / 100) * w.semantic +
    (breakdown.sectionCompleteness / 100) * w.section +
    (breakdown.formatCompatibility / 100) * w.format +
    (breakdown.impactDensity / 100) * w.impact +
    (breakdown.experienceRelevance / 100) * w.experience +
    ((breakdown.industryAlignment ?? 55) / 100) * (w.industry || 0);

  let score = Math.round(raw * 100);
  if (profile.knockoutCap != null && !passedKnockouts) {
    score = Math.min(score, profile.knockoutCap);
  }
  return Math.max(0, Math.min(100, score));
}

export function scoreAllProfiles(breakdown, passedKnockouts) {
  const out = {};
  for (const key of Object.keys(ATS_PROFILES)) {
    out[key] = scoreWithProfile(breakdown, passedKnockouts, key);
  }
  return out;
}
