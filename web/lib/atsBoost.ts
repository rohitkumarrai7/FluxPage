import type { StructuredResume } from "./resumeParser";
import { structuredResumeToText } from "./resumeParser";

const STRONG_VERBS = [
  "Led", "Engineered", "Built", "Delivered", "Drove", "Achieved",
  "Spearheaded", "Optimized", "Launched", "Scaled", "Managed", "Developed",
];

const DOMAIN_PATTERN = /\b(business\s*development|inside\s*sales|outside\s*sales|sales|marketing|lead\s*generation|prospecting|cold\s*calling|pipeline|crm|salesforce|hubspot|account\s*management|client\s*acquisition|market\s*research|market\s*analysis|asset\s*sourcing|proactive\s*outreach|new\s*product\s*development|launch\s*planning|stakeholder|partnership|negotiation|international|excel|powerpoint|social\s*media|content\s*marketing|digital\s*marketing|go[- ]to[- ]market|product\s*launch|due\s*diligence|financial\s*modeling|relationship\s*building|competitive\s*analysis|revenue|outreach|networking|strategy|consulting|operations|analytics|reporting|customer\s*success|cross[- ]border|presenting|communication|collaboration|leadership)\b/gi;

const PHRASE_PATTERN = /\b(new product development|asset sourcing|proactive outreach|business development|launch planning|market research|lead generation|account management|client acquisition|stakeholder management|strategic partnership|go-to-market|go to market|product launch|pipeline development|relationship building|competitive analysis|financial modeling|due diligence|inside sales|social media marketing|content marketing|digital marketing|email marketing|project management|customer success|revenue growth)\b/gi;

/** Extract ATS-target keywords from JD text (sync, no LLM). */
export function extractJDKeywordsSync(jdText: string, jobTitle?: string): string[] {
  const terms = new Set<string>();
  const sources = [jobTitle || "", jdText].filter(Boolean);

  for (const src of sources) {
    let m;
    const domainRe = new RegExp(DOMAIN_PATTERN.source, "gi");
    while ((m = domainRe.exec(src)) !== null) {
      terms.add(m[0].toLowerCase().replace(/\s+/g, " "));
    }
    const phraseRe = new RegExp(PHRASE_PATTERN.source, "gi");
    while ((m = phraseRe.exec(src)) !== null) {
      terms.add(m[0].toLowerCase().replace(/\s+/g, " "));
    }
  }

  for (const line of jdText.split("\n")) {
    const clean = line.replace(/^[-•*▪▸►◆]\s*/, "").trim();
    if (clean.length >= 12 && clean.length <= 65) {
      terms.add(clean.toLowerCase());
    }
  }

  return [...terms].filter((t) => t.length > 2).slice(0, 30);
}

function resumeContainsKeyword(resumeText: string, kw: string): boolean {
  return resumeText.toLowerCase().includes(kw.toLowerCase());
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
  const next = ensureSkillsSection(resume);
  const skills = next.sections.find((s) => s.type === "skills")!;
  const existing = skills.items.map((i) => i.text).join(" ").toLowerCase();
  const toAdd = keywords.filter((kw) => !existing.includes(kw.toLowerCase()));
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

function rewriteSummaryForRole(
  resume: StructuredResume,
  jobTitle: string,
  keywords: string[]
): StructuredResume {
  const next = JSON.parse(JSON.stringify(resume)) as StructuredResume;
  let summary = next.sections.find((s) => s.type === "summary");
  if (!summary) {
    summary = { id: "summary-auto", type: "summary", heading: "Professional Summary", items: [{ id: "sum-0", text: "" }], order: 0 };
    next.sections.unshift(summary);
  }

  const topKw = keywords.slice(0, 8).join(", ");
  const role = jobTitle || "target role";
  const existing = summary.items.map((i) => i.text).join(" ").trim();
  const opener = `Results-driven ${role} professional with proven expertise in ${topKw}.`;

  if (existing.length < 20) {
    summary.items = [{ id: summary.items[0]?.id || "sum-0", text: `${opener} Skilled in driving measurable outcomes through strategic execution and cross-functional collaboration.` }];
  } else if (!keywords.some((k) => existing.toLowerCase().includes(k.toLowerCase()))) {
    summary.items[0].text = `${opener} ${existing}`;
  } else {
    const missing = keywords.filter((k) => !existing.toLowerCase().includes(k.toLowerCase())).slice(0, 4);
    if (missing.length > 0) {
      summary.items[0].text = `${existing} Core competencies include ${missing.join(", ")}.`;
    }
  }
  return next;
}

function strengthenBullets(resume: StructuredResume, keywords: string[]): StructuredResume {
  const next = JSON.parse(JSON.stringify(resume)) as StructuredResume;
  let kwIdx = 0;

  for (const section of next.sections) {
    if (section.type === "summary" || section.type === "skills") continue;
    for (const item of section.items) {
      if (item.metadata?.role || item.metadata?.degree || !item.text) continue;

      let text = item.text.trim();
      const lower = text.toLowerCase();

      if (!STRONG_VERBS.some((v) => lower.startsWith(v.toLowerCase()))) {
        const verb = STRONG_VERBS[kwIdx % STRONG_VERBS.length];
        text = `${verb} ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
      }

      if (!/\d+%|\d+\+|\$\d| \d+ /i.test(text) && kwIdx % 2 === 0) {
        text = text.replace(/\.$/, "") + ", improving efficiency by 25%.";
      }

      const kw = keywords[kwIdx % keywords.length];
      if (kw && !lower.includes(kw.toLowerCase()) && text.length < 220) {
        text = text.replace(/\.$/, "") + ` — leveraging ${kw}.`;
        kwIdx++;
      }

      item.text = text;
    }
  }
  return next;
}

function injectJDSemanticPhrases(
  resume: StructuredResume,
  jobDescription: string
): StructuredResume {
  const next = JSON.parse(JSON.stringify(resume)) as StructuredResume;
  const summary = next.sections.find((s) => s.type === "summary");
  if (!summary?.items.length) return next;

  const jdPhrases = jobDescription
    .split("\n")
    .map((l) => l.replace(/^[-•*▪▸►◆]\s*/, "").trim())
    .filter((l) => l.length >= 20 && l.length <= 120)
    .slice(0, 3);

  if (jdPhrases.length === 0) return next;

  const existing = summary.items[0].text;
  const phraseBlock = jdPhrases.join(" ");
  if (!existing.toLowerCase().includes(jdPhrases[0].slice(0, 20).toLowerCase())) {
    summary.items[0].text = `${existing} ${phraseBlock}`.slice(0, 600);
  }
  return next;
}

/** Single-pass deterministic ATS boost targeting 80+ score. */
export function applyAtsBoost(
  resume: StructuredResume,
  jobDescription: string,
  jobTitle: string,
  atsMissingKeywords: string[] = []
): StructuredResume {
  const jdKeywords = extractJDKeywordsSync(jobDescription, jobTitle);
  const allTarget = [...new Set([...jdKeywords, ...atsMissingKeywords])];
  const resumeText = structuredResumeToText(resume);
  const stillMissing = allTarget.filter((k) => !resumeContainsKeyword(resumeText, k));

  let boosted = resume;
  boosted = rewriteSummaryForRole(boosted, jobTitle, stillMissing.length > 0 ? stillMissing : allTarget);
  boosted = injectJDSemanticPhrases(boosted, jobDescription);
  boosted = injectKeywordsToSkills(boosted, stillMissing);
  boosted = strengthenBullets(boosted, stillMissing.length > 0 ? stillMissing : allTarget.slice(0, 12));

  // Second skills pass for any keywords still missing after bullet rewrites
  const afterText = structuredResumeToText(boosted);
  const finalMissing = allTarget.filter((k) => !resumeContainsKeyword(afterText, k));
  if (finalMissing.length > 0) {
    boosted = injectKeywordsToSkills(boosted, finalMissing);
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
  const maxIter = options.maxIterations ?? 5;
  let current = JSON.parse(JSON.stringify(resume)) as StructuredResume;
  let result = await rescore(current);

  for (let i = 0; i < maxIter && result.score < target; i++) {
    current = applyAtsBoost(current, jobDescription, jobTitle, result.missingKeywords);
    result = await rescore(current);
  }

  return {
    resume: current,
    score: result.score,
    matchedKeywords: result.matchedKeywords,
    missingKeywords: result.missingKeywords,
  };
}

/** Count keyword matches for sidebar gauge. */
export function countKeywordMatches(resumeText: string, jdKeywords: string[]): { matched: string[]; missing: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];
  const lower = resumeText.toLowerCase();
  for (const kw of jdKeywords) {
    if (lower.includes(kw.toLowerCase())) matched.push(kw);
    else missing.push(kw);
  }
  return { matched, missing };
}
