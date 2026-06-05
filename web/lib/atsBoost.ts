import type { StructuredResume } from "./resumeParser";
import { structuredResumeToText } from "./resumeParser";
import { extractRegexKeywords } from "./jdAnalyzer";
import { filterTailorKeywords } from "./tailorKeywords";

const EDITABLE_SECTION_TYPES = new Set(["summary", "skills"]);

/** Extract ATS-target keywords from JD text (sync, all industries). */
export function extractJDKeywordsSync(jdText: string, jobTitle?: string): string[] {
  return extractRegexKeywords(jdText, jobTitle).slice(0, 20);
}

function resumeContainsKeyword(resumeText: string, kw: string): boolean {
  return resumeText.toLowerCase().includes(kw.toLowerCase());
}

/** Snapshot of sections that must never be auto-modified (experience, education, languages, etc.). */
export function getProtectedSectionTexts(resume: StructuredResume): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const section of resume.sections) {
    if (EDITABLE_SECTION_TYPES.has(section.type)) continue;
    out[section.id] = section.items.map((i) => i.text);
  }
  return out;
}

export function protectedSectionsUnchanged(before: StructuredResume, after: StructuredResume): boolean {
  const a = getProtectedSectionTexts(before);
  const b = getProtectedSectionTexts(after);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const left = a[key] || [];
    const right = b[key] || [];
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) return false;
    }
  }
  return true;
}

function ensureSkillsSection(resume: StructuredResume): StructuredResume {
  const next = JSON.parse(JSON.stringify(resume)) as StructuredResume;
  if (!next.sections.find((s) => s.type === "skills")) {
    next.sections.push({
      id: "skills-auto",
      type: "skills",
      heading: "Skills",
      items: [{ id: "sk-0", text: "" }],
      order: next.sections.length,
    });
  }
  return next;
}

function injectKeywordsToSkills(resume: StructuredResume, keywords: string[]): StructuredResume {
  const safe = filterTailorKeywords(keywords).slice(0, 12);
  if (safe.length === 0) return resume;

  const next = ensureSkillsSection(resume);
  const skills = next.sections.find((s) => s.type === "skills")!;
  const existing = skills.items.map((i) => i.text).join(" ").toLowerCase();
  const toAdd = safe.filter((kw) => !existing.includes(kw.toLowerCase()));
  if (toAdd.length === 0) return next;

  if (skills.items.length === 1 && skills.items[0].text.length > 0) {
    skills.items[0].text = `${skills.items[0].text}, ${toAdd.join(", ")}`;
  } else if (skills.items.length === 0 || !skills.items[0].text) {
    skills.items = [{ id: "sk-merged", text: toAdd.join(", ") }];
  } else {
    skills.items.push({ id: `sk-${Date.now()}`, text: toAdd.join(", ") });
  }
  return next;
}

function enrichSummaryKeywords(resume: StructuredResume, keywords: string[]): StructuredResume {
  const safe = filterTailorKeywords(keywords).slice(0, 5);
  if (safe.length === 0) return resume;

  const next = JSON.parse(JSON.stringify(resume)) as StructuredResume;
  const summary = next.sections.find((s) => s.type === "summary");
  if (!summary) return next;

  const existing = summary.items.map((i) => i.text).join(" ").trim();
  if (existing.length < 10) return next;

  const missing = safe.filter((k) => !existing.toLowerCase().includes(k.toLowerCase()));
  if (missing.length === 0) return next;

  const addition = ` Relevant expertise includes ${missing.slice(0, 3).join(", ")}.`;
  if (existing.length + addition.length > 500) return next;

  summary.items[0].text = `${existing.replace(/\s+$/, "")}${addition}`;
  return next;
}

/**
 * Safe deterministic ATS boost for any resume layout.
 * Only summary and skills may change — all other sections are preserved exactly.
 */
export function applyAtsBoost(
  resume: StructuredResume,
  jobDescription: string,
  jobTitle: string,
  atsMissingKeywords: string[] = []
): StructuredResume {
  const jdKeywords = extractJDKeywordsSync(jobDescription, jobTitle);
  const allTarget = filterTailorKeywords([...new Set([...jdKeywords, ...atsMissingKeywords])]);
  const resumeText = structuredResumeToText(resume);
  const stillMissing = allTarget.filter((k) => !resumeContainsKeyword(resumeText, k));

  let boosted = resume;
  boosted = enrichSummaryKeywords(boosted, stillMissing);
  boosted = injectKeywordsToSkills(boosted, stillMissing);

  const afterText = structuredResumeToText(boosted);
  const finalMissing = allTarget.filter((k) => !resumeContainsKeyword(afterText, k));
  if (finalMissing.length > 0) {
    boosted = injectKeywordsToSkills(boosted, finalMissing);
  }

  if (!protectedSectionsUnchanged(resume, boosted)) {
    return resume;
  }

  return boosted;
}

export interface BoostUntilTargetOptions {
  targetScore?: number;
  maxIterations?: number;
}

export async function boostUntilTargetScore(
  resume: StructuredResume,
  jobDescription: string,
  jobTitle: string,
  rescore: (r: StructuredResume) => Promise<{ score: number; matchedKeywords: string[]; missingKeywords: string[] }>,
  options: BoostUntilTargetOptions = {}
): Promise<{
  resume: StructuredResume;
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
}> {
  const target = options.targetScore ?? 82;
  const maxIter = options.maxIterations ?? 2;
  let current = JSON.parse(JSON.stringify(resume)) as StructuredResume;
  let result = await rescore(current);

  for (let i = 0; i < maxIter && result.score < target; i++) {
    const safeMissing = filterTailorKeywords(result.missingKeywords || []);
    current = applyAtsBoost(current, jobDescription, jobTitle, safeMissing);
    result = await rescore(current);
  }

  return {
    resume: current,
    score: result.score,
    matchedKeywords: result.matchedKeywords,
    missingKeywords: filterTailorKeywords(result.missingKeywords || []),
  };
}

export function countKeywordMatches(resumeText: string, jdKeywords: string[]): { matched: string[]; missing: string[] } {
  const safe = filterTailorKeywords(jdKeywords);
  const matched: string[] = [];
  const missing: string[] = [];
  const lower = resumeText.toLowerCase();
  for (const kw of safe) {
    if (lower.includes(kw.toLowerCase())) matched.push(kw);
    else missing.push(kw);
  }
  return { matched, missing };
}
