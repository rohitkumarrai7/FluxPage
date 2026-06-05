export interface AtsBreakdown {
  keywordMatch: number;
  taxonomyMatch?: number;
  semanticSimilarity: number;
  sectionCompleteness: number;
  formatCompatibility: number;
  impactDensity: number;
  experienceRelevance?: number;
  industryAlignment?: number;
}

export interface AtsAnalysisResult {
  score: number;
  maxPossibleScore?: number;
  passedKnockouts?: boolean;
  knockoutDetails?: {
    passed: boolean;
    failedFilters: Array<{ type: string; message: string; severity: string }>;
    warnings: Array<{ type: string; message: string }>;
    passedFilters: string[];
  };
  breakdown?: AtsBreakdown;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  relatedMatches?: Array<{ jdSkill: string; resumeSkill: string; similarity: number }>;
  parsedResume?: {
    totalExperienceYears: number;
    seniorityLevel: string;
    skillCount: number;
    educationLevel: string;
  };
  parsedJD?: {
    title: string;
    minYearsRequired: number | null;
    educationRequired: string | null;
    requiredSkillsCount: number;
  };
  estimatedAtsPassRate?: string;
}

function toKeywordString(k: unknown): string {
  if (typeof k === "string") return k;
  if (k && typeof k === "object" && "keyword" in k) return String((k as { keyword: string }).keyword || "");
  return "";
}

function toSuggestionString(s: unknown): string {
  if (typeof s === "string") return s;
  if (s && typeof s === "object" && "message" in s) return String((s as { message: string }).message || "");
  return "";
}

export function normalizeAtsResponse(data: Record<string, unknown>): AtsAnalysisResult {
  return {
    score: Number(data.score) || 0,
    maxPossibleScore: Number(data.maxPossibleScore) || 100,
    passedKnockouts: data.passedKnockouts as boolean | undefined,
    knockoutDetails: data.knockoutDetails as AtsAnalysisResult["knockoutDetails"],
    breakdown: data.breakdown as AtsBreakdown | undefined,
    matchedKeywords: (Array.isArray(data.matchedKeywords) ? data.matchedKeywords : []).map(toKeywordString).filter(Boolean),
    missingKeywords: (Array.isArray(data.missingKeywords) ? data.missingKeywords : []).map(toKeywordString).filter(Boolean),
    suggestions: (Array.isArray(data.suggestions) ? data.suggestions : []).map(toSuggestionString).filter(Boolean),
    relatedMatches: data.relatedMatches as AtsAnalysisResult["relatedMatches"],
    parsedResume: data.parsedResume as AtsAnalysisResult["parsedResume"],
    parsedJD: data.parsedJD as AtsAnalysisResult["parsedJD"],
    estimatedAtsPassRate: data.estimatedAtsPassRate as string | undefined,
  };
}
