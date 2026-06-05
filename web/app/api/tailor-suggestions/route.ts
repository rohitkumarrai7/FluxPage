import { NextRequest, NextResponse } from "next/server";
import { chatForTailor } from "@/lib/llm";
import {
  analyzeJobDescription,
  analyzeJobDescriptionFast,
  mergeJDKeywordsWithATS,
  type JDAnalysis,
} from "@/lib/jdAnalyzer";
import type { StructuredResume, TailorSuggestion } from "@/lib/resumeParser";
import {
  buildResumeStructureContext,
  buildJdAnalysisContext,
  validateTailorSuggestions,
} from "@/lib/tailorContext";

const ATS_ENGINE_RULES = `
ATS SCORING ENGINE (optimize for these signals):
- Keyword match (25%): Use EXACT missing keyword strings verbatim — ATS scanners do literal Ctrl+F matching.
- Taxonomy match (15%): Include skill aliases (e.g. "JavaScript" AND "JS" if both appear in JD).
- Semantic similarity (20%): Mirror JD phrasing in summary and top bullets.
- Section completeness (10%): Ensure Summary, Experience, Skills, Education sections exist.
- Impact density (10%): Start bullets with strong verbs (Led, Built, Engineered, Optimized) + metrics (%, $, users).
- Experience relevance (10%): Tie each bullet to JD domain terms where truthful.

TARGET: After applying ALL suggestions, ATS score MUST reach 80–90 (from typical baseline 20–40).
`;

const INTENSITY_PROMPTS: Record<string, string> = {
  low: `You are an ATS resume optimizer. Generate 6-8 minimal suggestions weaving missing keywords into existing bullets. Preserve tone. Add exact keywords to Skills section.`,
  medium: `You are an expert ATS tailoring AI. Generate 10-15 high-quality suggestions targeting an 80+ ATS score. Rewrite summary + experience bullets + skills to incorporate missing keywords naturally. Prioritize depth and context over generic keyword stuffing.`,
  high: `You are an aggressive ATS tailoring AI. Generate 12-16 suggestions to maximize ATS score (target 85+). Rewrite EVERY experience bullet with JD keywords, strong action verbs, and metrics. Rewrite summary with 6+ keywords. Add ALL missing skills.`,
};

const SYSTEM_PROMPT_SUFFIX = `
${ATS_ENGINE_RULES}

RULES:
1. Only rephrase EXISTING experience — never fabricate employers, dates, metrics, or technologies.
2. NEVER rewrite job titles, company names, degree lines, or date ranges — only achievement bullets.
3. Every suggestion must be a concrete text replacement, not a vague instruction.
4. Use EXACT keyword strings from the missing list (case-insensitive match counts).
5. Summary rewrite MUST exist if summary section is present — weave 4-6 missing keywords.
6. Add at least one experience bullet rewrite per missing required keyword (group related keywords).
7. Skills section: append missing technical keywords as comma-separated additions.
8. Do NOT append generic phrases like "leveraging X" or "improving efficiency by 25%" unless the original bullet already had metrics.
9. Output ONLY a valid JSON array — no markdown fences, no explanation.

Each suggestion object:
{
  "sectionType": "summary" | "experience" | "skills" | "education" | "projects",
  "bulletIndex": number or null,
  "type": "rewrite" | "add" | "summary",
  "originalText": "exact original text or empty for add",
  "suggestedText": "the improved text with EXACT keywords embedded",
  "reason": "which ATS signal this improves",
  "keywords": ["exact keyword from missing list"],
  "priority": 1-3 (1=highest)
}`;

function buildUserPrompt(params: {
  resumeText: string;
  structureContext: string;
  jobDescription: string;
  jobTitle: string;
  company: string;
  missingKeywords: string[];
  matchedKeywords: string[];
  jdAnalysis: JDAnalysis | null;
  intensity: string;
}): string {
  const topMissing = params.missingKeywords.slice(0, 25);
  const count =
    params.intensity === "high" ? "12-16" : params.intensity === "low" ? "6-8" : "10-15";

  const jdBlock = params.jdAnalysis
    ? `${buildJdAnalysisContext(params.jdAnalysis)}\n\n**Full Job Description:**\n${params.jobDescription.slice(0, 6000)}`
    : `**Job Description:**\n${params.jobDescription.slice(0, 6000)}`;

  const structureBlock = params.structureContext
    ? `\n**Structured Resume (use bulletIndex to target achievement lines only — never [HEADER] lines):**\n${params.structureContext}`
    : "";

  return `**Job Title:** ${params.jobTitle || "Unknown"}
**Company:** ${params.company || "Unknown"}

${jdBlock}

**Current Resume (plain text):**
${params.resumeText.slice(0, 4000)}
${structureBlock}

**ATS Gap Analysis — MUST FIX:**
- Already matched (${params.matchedKeywords.length}): ${params.matchedKeywords.slice(0, 15).join(", ") || "none"}
- MISSING — incorporate these using EXACT spelling (${topMissing.length}):
${topMissing.map((k, i) => `  ${i + 1}. "${k}"`).join("\n")}

Generate ${count} tailored suggestions as a JSON array.
CRITICAL: Every missing keyword above must appear verbatim in at least one suggestedText.
Include: 1 summary rewrite, 5-9 experience rewrites, 1-3 skills additions, 1-2 project rewrites if projects exist.
Use bulletIndex from the structured resume map for experience/project rewrites.`;
}

function stripThinkingTags(text: string): string {
  return text
    .replace(/<think[\s\S]*?<\/think>/gi, "")
    .replace(/<redacted_reasoning[\s\S]*?<\/redacted_reasoning>/gi, "")
    .trim();
}

interface RawSuggestion {
  sectionType?: string;
  bulletIndex?: number | null;
  type?: string;
  originalText?: string;
  suggestedText?: string;
  reason?: string;
  keywords?: string[];
  priority?: number;
}

function parseSuggestionsFromLlm(content: string): RawSuggestion[] | null {
  const cleaned = stripThinkingTags(content);
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function countRewrites(suggestions: RawSuggestion[]): number {
  return suggestions.filter((s) => s.type === "rewrite" || s.type === "summary").length;
}

function uncoveredKeywords(suggestions: RawSuggestion[], missingKeywords: string[]): string[] {
  const covered = new Set<string>();
  for (const s of suggestions) {
    const text = (s.suggestedText || "").toLowerCase();
    for (const kw of missingKeywords) {
      if (text.includes(kw.toLowerCase())) covered.add(kw.toLowerCase());
    }
    for (const kw of s.keywords || []) covered.add(kw.toLowerCase());
  }
  return missingKeywords.filter((kw) => !covered.has(kw.toLowerCase())).slice(0, 8);
}

/** Last resort: ask LLM to weave missing terms into experience bullets (not bare skill adds). */
async function retryMissingViaLlm(
  suggestions: RawSuggestion[],
  missingKeywords: string[],
  resumeText: string,
  structureContext: string
): Promise<RawSuggestion[]> {
  const uncovered = uncoveredKeywords(suggestions, missingKeywords);
  if (uncovered.length === 0) return suggestions;

  const result = await chatForTailor({
    system: `You output ONLY a JSON array of resume rewrite suggestions. Integrate missing keywords into existing experience or summary bullets — never output bare keyword strings.`,
    user: `Missing keywords still not covered: ${uncovered.map((k) => `"${k}"`).join(", ")}

Resume excerpt:
${resumeText.slice(0, 2500)}
${structureContext ? `\nStructure:\n${structureContext.slice(0, 1500)}` : ""}

Return 2-4 additional "rewrite" or "summary" suggestions that naturally weave these terms into achievement bullets.`,
    temperature: 0.2,
    maxTokens: 2048,
  });

  if (!result?.content) return suggestions;
  const extra = parseSuggestionsFromLlm(result.content);
  if (!extra?.length) return suggestions;
  return [...suggestions, ...extra];
}

function toFormattedSuggestions(
  suggestions: RawSuggestion[],
  structuredResume?: StructuredResume
): TailorSuggestion[] {
  return suggestions.slice(0, 15).map((s, i) => {
    const section = structuredResume?.sections.find((sec) => sec.type === s.sectionType);
    let bulletId: string | undefined;
    if (s.bulletIndex != null && section) {
      const bullets = section.items.filter((it) => !it.metadata?.role && !it.metadata?.degree);
      bulletId = bullets[s.bulletIndex]?.id;
    }
    return {
      id: `llm-${i}`,
      sectionId: section?.id || structuredResume?.sections[0]?.id || "general",
      sectionType: s.sectionType || "experience",
      bulletId,
      bulletIndex: s.bulletIndex ?? null,
      type: (s.type || "rewrite") as TailorSuggestion["type"],
      originalText: s.originalText || "",
      suggestedText: s.suggestedText || "",
      reason: s.reason || "",
      keywords: Array.isArray(s.keywords) ? s.keywords : [],
      applied: false,
      priority: s.priority || 2,
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      resumeText,
      structuredResume,
      jobDescription,
      jobTitle,
      company,
      missingKeywords,
      matchedKeywords,
      intensity,
      cachedJdAnalysis,
    } = body;
    const intensityLevel: string = ["low", "medium", "high"].includes(intensity)
      ? intensity
      : "medium";
    const systemPrompt =
      (INTENSITY_PROMPTS[intensityLevel] || INTENSITY_PROMPTS.medium) + SYSTEM_PROMPT_SUFFIX;

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: "resumeText and jobDescription required" },
        { status: 400 }
      );
    }

    let enhancedMissing = missingKeywords || [];
    let enhancedMatched = matchedKeywords || [];
    let jdAnalysis: JDAnalysis | null = null;

    try {
      const hasExtensionKeywords =
        enhancedMissing.length >= 5 || enhancedMatched.length >= 5;
      if (cachedJdAnalysis?.hardSkills) {
        jdAnalysis = cachedJdAnalysis as JDAnalysis;
      } else if (hasExtensionKeywords) {
        jdAnalysis = analyzeJobDescriptionFast(jobDescription, jobTitle);
      } else {
        jdAnalysis = await analyzeJobDescription(jobDescription, jobTitle);
      }
      const merged = mergeJDKeywordsWithATS(jdAnalysis, enhancedMatched, enhancedMissing);
      enhancedMissing = merged.missingKeywords;
      enhancedMatched = merged.matchedKeywords;
    } catch (err) {
      console.error("[tailor-suggestions] JD analysis failed:", err);
    }

    const structureContext = structuredResume
      ? buildResumeStructureContext(structuredResume as StructuredResume)
      : "";

    const userPrompt = buildUserPrompt({
      resumeText,
      structureContext,
      jobDescription,
      jobTitle: jobTitle || "",
      company: company || "",
      missingKeywords: enhancedMissing,
      matchedKeywords: enhancedMatched,
      jdAnalysis,
      intensity: intensityLevel,
    });

    let result = await chatForTailor({
      system: systemPrompt,
      user: userPrompt,
      temperature: intensityLevel === "high" ? 0.45 : 0.25,
      maxTokens: 4096,
    });

    if (!result?.content) {
      return NextResponse.json(
        { error: "LLM returned no content", suggestions: [] },
        { status: 502 }
      );
    }

    let suggestions = parseSuggestionsFromLlm(result.content);
    if (!suggestions) {
      return NextResponse.json(
        {
          error: "Could not parse LLM response as JSON array",
          raw: result.content.slice(0, 500),
          suggestions: [],
        },
        { status: 502 }
      );
    }

    const minCount = intensityLevel === "low" ? 6 : 10;

    function mergeSuggestions(base: RawSuggestion[], extra: RawSuggestion[]): RawSuggestion[] {
      const seen = new Set<string>();
      const out: RawSuggestion[] = [];
      for (const s of [...base, ...extra]) {
        const key = `${s.sectionType}:${s.bulletIndex ?? "x"}:${(s.suggestedText || "").slice(0, 40)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
      }
      return out;
    }

    for (let attempt = 0; attempt < 1 && suggestions.length < minCount; attempt++) {
      const retry = await chatForTailor({
        system: systemPrompt,
        user: `${userPrompt}\n\nYou returned only ${suggestions.length} suggestions. Return a complete JSON array with exactly ${minCount}-15 unique suggestions. Include summary rewrite + experience rewrites.`,
        temperature: 0.35,
        maxTokens: 2048,
      });
      if (!retry?.content) continue;
      const retried = parseSuggestionsFromLlm(retry.content);
      if (retried?.length) {
        suggestions = mergeSuggestions(suggestions, retried);
        if (retried.length >= suggestions.length) result = retry;
      }
    }

    const llmCount = suggestions.length;

    const rewriteCount = countRewrites(suggestions);
    const skipMissingRetry = rewriteCount >= 8;
    if (!skipMissingRetry && rewriteCount === 0 && enhancedMissing.length > 0) {
      suggestions = await retryMissingViaLlm(
        suggestions,
        enhancedMissing,
        resumeText,
        structureContext
      );
    } else if (!skipMissingRetry && uncoveredKeywords(suggestions, enhancedMissing).length > 0) {
      suggestions = await retryMissingViaLlm(
        suggestions,
        enhancedMissing,
        resumeText,
        structureContext
      );
    }

    const enriched = suggestions;

    let formatted = toFormattedSuggestions(
      enriched,
      structuredResume as StructuredResume | undefined
    );

    const preValidateCount = formatted.length;
    if (structuredResume) {
      formatted = validateTailorSuggestions(formatted, structuredResume as StructuredResume);
    }

    if (formatted.length < minCount && formatted.length < 8 && structuredResume) {
      const need = minCount - formatted.length;
      const fill = await chatForTailor({
        system: systemPrompt,
        user: `${userPrompt}\n\nAfter validation only ${formatted.length} suggestions remain. Return a JSON array with exactly ${need} NEW suggestions targeting different bulletIndex values not yet covered. No duplicate bulletIndex.`,
        temperature: 0.3,
        maxTokens: 2048,
      });
      if (fill?.content) {
        const extraRaw = parseSuggestionsFromLlm(fill.content);
        if (extraRaw?.length) {
          const extraFormatted = validateTailorSuggestions(
            toFormattedSuggestions(
              mergeSuggestions([], extraRaw),
              structuredResume as StructuredResume
            ),
            structuredResume as StructuredResume
          );
          const seen = new Set(formatted.map((s) => `${s.sectionType}:${s.bulletIndex ?? "x"}:${s.type}`));
          for (const s of extraFormatted) {
            const key = `${s.sectionType}:${s.bulletIndex ?? "x"}:${s.type}`;
            if (seen.has(key)) continue;
            seen.add(key);
            formatted.push(s);
            if (formatted.length >= minCount) break;
          }
          formatted = formatted.slice(0, 15);
        }
      }
    }

    return NextResponse.json({
      suggestions: formatted,
      model: result.model,
      jdAnalysis,
      jdSource: jdAnalysis?.source || "unknown",
      enhancedKeywords: {
        matched: enhancedMatched.length,
        missing: enhancedMissing.length,
      },
      meta: {
        llmSuggestionCount: llmCount,
        preValidateCount,
        finalCount: formatted.length,
        fallbackAdded: 0,
      },
    });
  } catch (err: unknown) {
    console.error("[tailor-suggestions]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, suggestions: [] }, { status: 500 });
  }
}
