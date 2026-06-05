// ─── Enterprise ATS Scoring Engine ─────────────────────────────────────────────
// Unified orchestrator that combines:
//   Phase 1: NER Parsing (structured extraction)
//   Phase 2: Skills Taxonomy (ontology matching)
//   Phase 3: TF-IDF Semantic Matching
//   Phase 4: Knockout Filters (hard pass/fail)
//
// This replaces simple keyword matching with a multi-signal pipeline.

import { parseResumeNER, parseJobDescription, type StructuredResumeNER, type StructuredJD } from "./nerParser";
import { computeTaxonomyMatchScore, resolveSkill, expandSkillAliases, areSkillsRelated, resumeSkillSatisfies } from "./skillsTaxonomy";
import { computeSemanticSimilarity } from "./semanticEngine";
import { applyKnockoutFilters, type KnockoutResult } from "./knockoutFilters";

// ─── Result Types ──────────────────────────────────────────────────────────────

export interface EnterpriseATSResult {
  overallScore: number;
  passedKnockouts: boolean;
  knockoutDetails: KnockoutResult;
  breakdown: {
    keywordMatch: number;
    taxonomyMatch: number;
    semanticSimilarity: number;
    sectionCompleteness: number;
    formatCompatibility: number;
    impactDensity: number;
    experienceRelevance: number;
  };
  weights: {
    keyword: number;
    taxonomy: number;
    semantic: number;
    section: number;
    format: number;
    impact: number;
    experience: number;
  };
  matchedKeywords: { keyword: string; frequency: number; source: string }[];
  missingKeywords: { keyword: string; importance: string; suggestion: string }[];
  relatedMatches: { jdSkill: string; resumeSkill: string; similarity: number }[];
  suggestions: { category: string; priority: string; message: string }[];
  parsedResume: {
    totalExperienceYears: number;
    seniorityLevel: string;
    skillCount: number;
    educationLevel: string;
    hasSummary: boolean;
    sectionsDetected: string[];
  };
  parsedJD: {
    title: string;
    minYearsRequired: number | null;
    educationRequired: string | null;
    requiredSkillsCount: number;
    isRemote: boolean;
  };
}

// ─── Sub-Scoring Functions ─────────────────────────────────────────────────────

const STRONG_VERBS = new Set([
  "led", "architected", "built", "designed", "implemented",
  "optimized", "reduced", "increased", "launched", "scaled",
  "developed", "created", "managed", "spearheaded", "delivered",
  "achieved", "established", "drove", "transformed", "automated",
  "migrated", "refactored", "deployed", "mentored", "streamlined",
  "orchestrated", "pioneered", "revamped", "consolidated", "negotiated",
]);

function computeImpactDensity(bullets: string[]): number {
  if (bullets.length === 0) return 0;
  let strong = 0;

  for (const bullet of bullets) {
    const lower = bullet.toLowerCase();
    let score = 0;
    if (/\d+%|\$[\d,]+|\d+\s*(k|m|billion|million|users|clients|customers|revenue)/i.test(bullet)) score += 0.5;
    const words = lower.split(/\s+/);
    if (words.some((w) => STRONG_VERBS.has(w))) score += 0.5;
    if (score >= 0.5) strong++;
  }

  return strong / bullets.length;
}

function computeSectionCompleteness(resume: StructuredResumeNER): number {
  const sections: { name: string; weight: number; present: boolean }[] = [
    { name: "contact", weight: 1.0, present: !!(resume.contact.email || resume.contact.phone) },
    { name: "summary", weight: 1.0, present: resume.hasSummary },
    { name: "experience", weight: 2.0, present: resume.employment.length > 0 },
    { name: "education", weight: 1.0, present: resume.education.length > 0 },
    { name: "skills", weight: 2.0, present: resume.skills.length > 0 },
    { name: "projects", weight: 0.5, present: resume.hasProjects },
    { name: "certifications", weight: 0.5, present: resume.hasCertifications },
  ];

  const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0);
  const earnedWeight = sections.filter((s) => s.present).reduce((sum, s) => sum + s.weight, 0);
  return earnedWeight / totalWeight;
}

function computeFormatScore(resumeText: string): number {
  if (resumeText.length < 200) return 0.3;

  let score = 1.0;

  // Table-like formatting penalty
  if (/(\|.*\|.*\|)|(\t{3,})/g.test(resumeText)) score -= 0.15;

  // Special character abuse
  const specialChars = (resumeText.match(/[★☆●○■□▪▫►▶◆◇]/g) || []).length;
  if (specialChars / resumeText.length > 0.01) score -= 0.1;

  // Standard headings present
  if (!/(^|\n)\s*(experience|education|skills|summary|projects)/im.test(resumeText)) score -= 0.15;

  // Contact info present
  if (!/[\w.-]+@[\w.-]+\.\w+/.test(resumeText) && !/\+?\d[\d\s\-()]{8,}/.test(resumeText)) score -= 0.1;

  // Bullet structure (good ATS signal)
  const bulletLines = (resumeText.match(/^[\s]*[-•*]\s/gm) || []).length;
  const totalLines = resumeText.split("\n").length;
  if (totalLines > 10 && bulletLines / totalLines > 0.2) score += 0.05;

  // All-caps abuse
  if ((resumeText.match(/\b[A-Z]{4,}\b/g) || []).length > 20) score -= 0.1;

  // Very long lines (multi-column indicator)
  const lines = resumeText.split("\n");
  const longLines = lines.filter((l) => l.length > 150).length;
  if (lines.length > 5 && longLines / lines.length > 0.3) score -= 0.1;

  return Math.max(0.2, Math.min(1.0, score));
}

function computeExperienceRelevance(
  resume: StructuredResumeNER,
  jd: StructuredJD,
  resumeText: string
): number {
  if (resume.employment.length === 0) return 0;
  if (jd.requiredSkills.length === 0) return 0.5;

  const expandedResume = expandSkillAliases(resumeText).toLowerCase();
  const resumeSkillNames = resume.skills.map((s) => s.skill);
  const jdSkills = jd.requiredSkills.filter((s) => resolveSkill(s));

  const skillMatchesJd = (skill: string, context: string): boolean => {
    const skillLower = skill.toLowerCase();
    if (context.includes(skillLower)) return true;
    for (const rSkill of resumeSkillNames) {
      if (resumeSkillSatisfies(skill, rSkill) && context.includes(rSkill.toLowerCase())) return true;
    }
    return false;
  };

  const globalMatch = jdSkills.some(
    (skill) => skillMatchesJd(skill, expandedResume) || resumeSkillNames.some((r) => resumeSkillSatisfies(skill, r))
  );
  if (globalMatch && resume.employment.every((e) => !e.durationMonths)) {
    return 0.65;
  }

  let relevantMonths = 0;
  let totalMonths = 0;

  for (const emp of resume.employment) {
    totalMonths += emp.durationMonths || 12;
    const context = expandSkillAliases(
      [emp.title, emp.company, ...emp.bullets, ...resumeSkillNames].join(" ")
    ).toLowerCase();
    const hasRelevantSkill =
      jdSkills.some((skill) => skillMatchesJd(skill, context)) ||
      (globalMatch && /react|frontend|front[- ]end|html|css|javascript|ui|interface/i.test(context));
    if (hasRelevantSkill) {
      relevantMonths += emp.durationMonths || 12;
    }
  }

  if (relevantMonths === 0 && globalMatch) return 0.55;
  return totalMonths > 0 ? Math.min(1, relevantMonths / totalMonths) : 0;
}

// ─── Keyword Match with Taxonomy Awareness ─────────────────────────────────────

function computeKeywordMatch(
  resume: StructuredResumeNER,
  jd: StructuredJD,
  resumeText: string
): {
  score: number;
  matched: { keyword: string; frequency: number; source: string }[];
  missing: { keyword: string; importance: string; suggestion: string }[];
} {
  const resumeLower = expandSkillAliases(resumeText).toLowerCase();
  const resumeSkillsLower = new Set(resume.skills.map((s) => s.skill.toLowerCase()));

  const allJdTerms = [...new Set([...jd.requiredSkills, ...jd.preferredSkills])];
  if (allJdTerms.length === 0) return { score: 0.5, matched: [], missing: [] };

  const matched: { keyword: string; frequency: number; source: string }[] = [];
  const missing: { keyword: string; importance: string; suggestion: string }[] = [];
  let earnedWeight = 0;

  for (const term of allJdTerms) {
    const termLower = term.toLowerCase();
    let found = false;
    let freq = 0;
    let source = "";
    let matchWeight = 0;

    // Direct text match
    if (resumeLower.includes(termLower)) {
      found = true;
      freq = (resumeLower.match(new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
      source = "text";
      matchWeight = 1;
    }

    // Skills section match
    if (!found && resumeSkillsLower.has(termLower)) {
      found = true;
      freq = 1;
      source = "skills_section";
      matchWeight = 1;
    }

    // Taxonomy alias match
    if (!found) {
      const resolved = resolveSkill(term);
      if (resolved) {
        for (const alias of [resolved.name.toLowerCase(), ...resolved.aliases]) {
          if (resumeLower.includes(alias) || resumeSkillsLower.has(alias)) {
            found = true;
            freq = 1;
            source = `alias:${alias}`;
            matchWeight = 1;
            break;
          }
        }
      }
    }

    // Parent/child and related skill partial credit (React → JavaScript, Tailwind → CSS)
    if (!found) {
      let bestSimilarity = 0;
      let bestSource = "";
      const resumeSkillNames = [
        ...resume.skills.map((s) => s.skill),
        ...resume.employment.flatMap((e) => e.skills),
      ];
      for (const rSkill of resumeSkillNames) {
        if (resumeSkillSatisfies(term, rSkill)) {
          bestSimilarity = 0.9;
          bestSource = rSkill;
          break;
        }
        const { related, similarity } = areSkillsRelated(term, rSkill);
        if (related && similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestSource = rSkill;
        }
      }
      if (bestSimilarity >= 0.3) {
        found = true;
        freq = 1;
        source = `related:${bestSource}`;
        matchWeight = bestSimilarity;
      }
    }

    // Git inferred from CI platform mentions (GH Actions, GitLab CI, etc.)
    if (!found && resolveSkill(term)?.id === "git") {
      if (/github\s*actions|gh\s*actions|gitlab|bitbucket|version control/i.test(resumeLower)) {
        found = true;
        freq = 1;
        source = "inferred:vcs_platform";
        matchWeight = 0.85;
      }
    }

    // Agile inferred from Scrum / sprint / CI-CD process mentions
    if (!found && resolveSkill(term)?.id === "agile") {
      if (/scrum|sprint|kanban|ci\/cd|cicd|standup|retrospective|\bci\b/i.test(resumeLower)) {
        found = true;
        freq = 1;
        source = "inferred:agile_practices";
        matchWeight = 0.8;
      }
    }

    earnedWeight += matchWeight;

    if (found) {
      matched.push({ keyword: term, frequency: freq, source });
    } else {
      const importance = jd.requiredSkills.includes(term) ? "required" : "preferred";
      missing.push({ keyword: term, importance, suggestion: `Add '${term}' where truthful` });
    }
  }

  const score = allJdTerms.length > 0 ? earnedWeight / allJdTerms.length : 0;
  return { score: Math.min(1, score), matched, missing };
}

// ─── Suggestion Generation ─────────────────────────────────────────────────────

function generateSuggestions(
  result: Partial<EnterpriseATSResult>,
  resume: StructuredResumeNER,
  jd: StructuredJD,
  keywordScore: number,
  impactScore: number,
  sectionScore: number,
  formatScore: number,
  semanticScore: number
): { category: string; priority: string; message: string }[] {
  const suggestions: { category: string; priority: string; message: string }[] = [];

  // Knockout-based suggestions
  if (result.knockoutDetails && !result.knockoutDetails.passed) {
    for (const fail of result.knockoutDetails.failedFilters) {
      suggestions.push({
        category: "knockout",
        priority: "critical",
        message: fail.message,
      });
    }
  }

  // Keyword suggestions
  if (result.missingKeywords && result.missingKeywords.length > 0) {
    const topMissing = result.missingKeywords.slice(0, 6).map((m) => m.keyword).join(", ");
    suggestions.push({
      category: "keywords",
      priority: "high",
      message: `Add missing keywords where truthful: ${topMissing}`,
    });
  }

  // Related skill credit
  if (result.relatedMatches && result.relatedMatches.length > 0) {
    const credits = result.relatedMatches.slice(0, 3).map((r) => `${r.resumeSkill} ≈ ${r.jdSkill}`).join(", ");
    suggestions.push({
      category: "taxonomy",
      priority: "info",
      message: `Partial credit earned via related skills: ${credits}`,
    });
  }

  // Impact suggestions
  if (impactScore < 0.4) {
    suggestions.push({
      category: "impact",
      priority: "high",
      message: "Quantify achievements with numbers (e.g., 'reduced latency 40%', 'grew revenue to $2M', 'served 50k users')",
    });
  }

  // Section suggestions
  if (sectionScore < 0.7) {
    const missing: string[] = [];
    if (!resume.hasSummary) missing.push("Professional Summary");
    if (resume.skills.length === 0) missing.push("Skills section");
    if (resume.education.length === 0) missing.push("Education");
    if (missing.length > 0) {
      suggestions.push({
        category: "structure",
        priority: "medium",
        message: `Add missing sections: ${missing.join(", ")}`,
      });
    }
  }

  // Format suggestions
  if (formatScore < 0.7) {
    suggestions.push({
      category: "formatting",
      priority: "medium",
      message: "Use ATS-friendly formatting: single column, standard headings, no tables or graphics",
    });
  }

  // Semantic gap
  if (semanticScore < 0.3 && keywordScore < 0.5) {
    suggestions.push({
      category: "relevance",
      priority: "high",
      message: "Resume content has low relevance to this role. Consider adding domain-specific experience.",
    });
  }

  // Experience relevance
  if (result.breakdown && result.breakdown.experienceRelevance < 0.3 && resume.employment.length > 0) {
    suggestions.push({
      category: "experience",
      priority: "medium",
      message: "Most experience bullets don't match JD skills. Rewrite bullets to highlight relevant work.",
    });
  }

  // Polish
  if (keywordScore > 0.7 && result.missingKeywords && result.missingKeywords.length < 3) {
    suggestions.push({
      category: "polish",
      priority: "low",
      message: "Strong match — mirror the exact phrasing used in the job description for maximum ATS alignment",
    });
  }

  return suggestions;
}

// ─── Main Enterprise Scoring Function ──────────────────────────────────────────

export function scoreEnterpriseATS(resumeText: string, jdText: string): EnterpriseATSResult {
  // Phase 1: Parse both documents
  const parsedResume = parseResumeNER(resumeText);
  const parsedJD = parseJobDescription(jdText);

  // Phase 4: Apply knockouts first
  const knockoutResult = applyKnockoutFilters(parsedResume, parsedJD);

  // Phase 2: Taxonomy-based matching
  const resumeSkillNames = parsedResume.skills.map((s) => s.skill);
  const taxonomyResult = computeTaxonomyMatchScore(
    resumeSkillNames,
    parsedJD.requiredSkills,
    parsedJD.preferredSkills
  );

  // Phase 3: TF-IDF semantic similarity
  const semanticResult = computeSemanticSimilarity(resumeText, jdText);

  // Keyword matching with taxonomy awareness
  const keywordResult = computeKeywordMatch(parsedResume, parsedJD, resumeText);

  // Supporting scores
  const allBullets = parsedResume.employment.flatMap((e) => e.bullets);
  const impactScore = computeImpactDensity(allBullets);
  const sectionScore = computeSectionCompleteness(parsedResume);
  const formatScore = computeFormatScore(resumeText);
  const experienceRelevance = computeExperienceRelevance(parsedResume, parsedJD, resumeText);

  // Weights (enterprise-calibrated)
  const weights = {
    keyword: 0.25,
    taxonomy: 0.15,
    semantic: 0.20,
    section: 0.10,
    format: 0.10,
    impact: 0.10,
    experience: 0.10,
  };

  // Compute weighted score
  const rawScore =
    keywordResult.score * weights.keyword +
    taxonomyResult.score * weights.taxonomy +
    semanticResult.overallSimilarity * weights.semantic +
    sectionScore * weights.section +
    formatScore * weights.format +
    impactScore * weights.impact +
    experienceRelevance * weights.experience;

  // Apply knockout penalty
  let overallScore = Math.round(rawScore * 100);
  if (!knockoutResult.passed) {
    const hardFails = knockoutResult.failedFilters.filter((f) => f.severity === "hard").length;
    const penalty = Math.min(40, hardFails * 15);
    overallScore = Math.max(15, overallScore - penalty);
  }

  overallScore = Math.max(0, Math.min(100, overallScore));

  const breakdown = {
    keywordMatch: Math.round(keywordResult.score * 100),
    taxonomyMatch: Math.round(taxonomyResult.score * 100),
    semanticSimilarity: Math.round(semanticResult.overallSimilarity * 100),
    sectionCompleteness: Math.round(sectionScore * 100),
    formatCompatibility: Math.round(formatScore * 100),
    impactDensity: Math.round(impactScore * 100),
    experienceRelevance: Math.round(experienceRelevance * 100),
  };

  const result: Partial<EnterpriseATSResult> = {
    overallScore,
    passedKnockouts: knockoutResult.passed,
    knockoutDetails: knockoutResult,
    breakdown,
    weights,
    matchedKeywords: keywordResult.matched,
    missingKeywords: keywordResult.missing,
    relatedMatches: taxonomyResult.relatedMatches,
  };

  const suggestions = generateSuggestions(
    result, parsedResume, parsedJD,
    keywordResult.score, impactScore, sectionScore, formatScore, semanticResult.overallSimilarity
  );

  return {
    ...result,
    suggestions,
    parsedResume: {
      totalExperienceYears: parsedResume.totalExperienceYears,
      seniorityLevel: parsedResume.seniorityLevel,
      skillCount: parsedResume.skills.length,
      educationLevel: parsedResume.education[0]?.level || "unknown",
      hasSummary: parsedResume.hasSummary,
      sectionsDetected: parsedResume.rawSections.map((s) => s.heading),
    },
    parsedJD: {
      title: parsedJD.title,
      minYearsRequired: parsedJD.minYearsExperience,
      educationRequired: parsedJD.requiredEducation,
      requiredSkillsCount: parsedJD.requiredSkills.length,
      isRemote: parsedJD.isRemote,
    },
  } as EnterpriseATSResult;
}

// ─── Backward-Compatible Wrapper ───────────────────────────────────────────────
// Maintains the same interface as the old scoreResumeAgainstJD for existing consumers

export function scoreResumeAgainstJD(resumeText: string, jdText: string): {
  overallScore: number;
  matchedKeywords: { keyword: string; frequency: number }[];
  missingKeywords: { keyword: string; importance: string; suggestion: string }[];
  suggestions: { category: string; priority: string; message: string }[];
  breakdown: {
    keywordMatch: number;
    semanticSimilarity: number;
    sectionCompleteness: number;
    formatCompatibility: number;
    impactDensity: number;
    weights: { keyword: number; semantic: number; section: number; format: number; impact: number };
  };
} {
  const enterprise = scoreEnterpriseATS(resumeText, jdText);

  return {
    overallScore: enterprise.overallScore,
    matchedKeywords: enterprise.matchedKeywords.map((m) => ({ keyword: m.keyword, frequency: m.frequency })),
    missingKeywords: enterprise.missingKeywords,
    suggestions: enterprise.suggestions,
    breakdown: {
      keywordMatch: enterprise.breakdown.keywordMatch,
      semanticSimilarity: enterprise.breakdown.semanticSimilarity,
      sectionCompleteness: enterprise.breakdown.sectionCompleteness,
      formatCompatibility: enterprise.breakdown.formatCompatibility,
      impactDensity: enterprise.breakdown.impactDensity,
      weights: { keyword: 0.25, semantic: 0.20, section: 0.10, format: 0.10, impact: 0.10 },
    },
  };
}
