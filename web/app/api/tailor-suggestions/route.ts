import { NextRequest, NextResponse } from "next/server";
import { chatWithFallback } from "@/lib/llm";
import { analyzeJobDescription, mergeJDKeywordsWithATS } from "@/lib/jdAnalyzer";

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
  medium: `You are an expert ATS tailoring AI. Generate 10-14 suggestions targeting an 80+ ATS score. Rewrite summary + experience bullets + skills to incorporate ALL missing keywords naturally.`,
  high: `You are an aggressive ATS tailoring AI. Generate 12-16 suggestions to maximize ATS score (target 85+). Rewrite EVERY experience bullet with JD keywords, strong action verbs, and metrics. Rewrite summary with 6+ keywords. Add ALL missing skills.`,
};

const SYSTEM_PROMPT_SUFFIX = `
${ATS_ENGINE_RULES}

RULES:
1. Only rephrase EXISTING experience — never fabricate employers, dates, metrics, or technologies.
2. Every suggestion must be a concrete text replacement, not a vague instruction.
3. Use EXACT keyword strings from the missing list (case-insensitive match counts).
4. Summary rewrite MUST exist if summary section is present — weave 4-6 missing keywords.
5. Add at least one experience bullet rewrite per missing required keyword (group related keywords).
6. Skills section: append missing technical keywords as comma-separated additions.
7. Output ONLY a valid JSON array — no markdown fences, no explanation.

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
  jobDescription: string;
  jobTitle: string;
  company: string;
  missingKeywords: string[];
  matchedKeywords: string[];
  intensity: string;
}): string {
  const topMissing = params.missingKeywords.slice(0, 20);
  const count = params.intensity === "high" ? "12-16" : params.intensity === "low" ? "6-8" : "10-14";

  return `**Job Title:** ${params.jobTitle || "Unknown"}
**Company:** ${params.company || "Unknown"}

**Job Description:**
${params.jobDescription.slice(0, 5000)}

**Current Resume:**
${params.resumeText}

**ATS Gap Analysis — MUST FIX:**
- Already matched (${params.matchedKeywords.length}): ${params.matchedKeywords.slice(0, 15).join(", ") || "none"}
- MISSING — incorporate ALL of these using EXACT spelling (${topMissing.length}):
${topMissing.map((k, i) => `  ${i + 1}. "${k}"`).join("\n")}

Generate ${count} tailored suggestions as a JSON array.
CRITICAL: Every missing keyword above must appear verbatim in at least one suggestedText.
Include: 1 summary rewrite, 4-8 experience rewrites, 1-3 skills additions, 1-2 project rewrites if projects exist.`;
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

function enrichWithMissingKeywords(
  suggestions: RawSuggestion[],
  missingKeywords: string[],
  resumeText: string
): RawSuggestion[] {
  const resumeLower = resumeText.toLowerCase();
  const covered = new Set<string>();

  for (const s of suggestions) {
    const text = (s.suggestedText || "").toLowerCase();
    for (const kw of missingKeywords) {
      if (text.includes(kw.toLowerCase())) covered.add(kw.toLowerCase());
    }
    for (const kw of s.keywords || []) {
      covered.add(kw.toLowerCase());
    }
  }

  const extras: RawSuggestion[] = [];
  let idx = 0;
  for (const kw of missingKeywords.slice(0, 15)) {
    if (covered.has(kw.toLowerCase())) continue;
    if (resumeLower.includes(kw.toLowerCase())) continue;

    extras.push({
      sectionType: "skills",
      bulletIndex: null,
      type: "add",
      originalText: "",
      suggestedText: kw,
      reason: `ATS keyword match: add "${kw}" to skills section`,
      keywords: [kw],
      priority: 1,
    });
    covered.add(kw.toLowerCase());
    idx++;
    if (idx >= 8) break;
  }

  return [...suggestions, ...extras];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeText, jobDescription, jobTitle, company, missingKeywords, matchedKeywords, intensity } = body;
    const intensityLevel: string = (["low", "medium", "high"].includes(intensity) ? intensity : "medium");
    const systemPrompt = (INTENSITY_PROMPTS[intensityLevel] || INTENSITY_PROMPTS.medium) + SYSTEM_PROMPT_SUFFIX;

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: "resumeText and jobDescription required" }, { status: 400 });
    }

    let enhancedMissing = missingKeywords || [];
    let enhancedMatched = matchedKeywords || [];

    try {
      const jdAnalysis = await analyzeJobDescription(jobDescription, jobTitle);
      const merged = mergeJDKeywordsWithATS(jdAnalysis, enhancedMatched, enhancedMissing);
      enhancedMissing = merged.missingKeywords;
      enhancedMatched = merged.matchedKeywords;
    } catch (err) {
      console.error("[tailor-suggestions] JD analysis failed:", err);
    }

    const userPrompt = buildUserPrompt({
      resumeText,
      jobDescription,
      jobTitle: jobTitle || "",
      company: company || "",
      missingKeywords: enhancedMissing,
      matchedKeywords: enhancedMatched,
      intensity: intensityLevel,
    });

    const result = await chatWithFallback({
      system: systemPrompt,
      user: userPrompt,
      temperature: intensityLevel === "high" ? 0.45 : 0.25,
      maxTokens: 6144,
    });

    if (!result?.content) {
      return NextResponse.json({ error: "LLM returned no content", suggestions: [] }, { status: 502 });
    }

    let cleaned = stripThinkingTags(result.content);
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse LLM response as JSON array", raw: cleaned.slice(0, 500), suggestions: [] }, { status: 502 });
    }

    let suggestions: RawSuggestion[];
    try {
      suggestions = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from LLM", raw: jsonMatch[0].slice(0, 500), suggestions: [] }, { status: 502 });
    }

    if (!Array.isArray(suggestions)) {
      return NextResponse.json({ error: "LLM did not return array", suggestions: [] }, { status: 502 });
    }

    const enriched = enrichWithMissingKeywords(suggestions, enhancedMissing, resumeText);

    const formatted = enriched.slice(0, 16).map((s: RawSuggestion, i: number) => ({
      id: `llm-${i}`,
      sectionType: s.sectionType || "experience",
      bulletIndex: s.bulletIndex ?? null,
      type: s.type || "rewrite",
      originalText: s.originalText || "",
      suggestedText: s.suggestedText || "",
      reason: s.reason || "",
      keywords: Array.isArray(s.keywords) ? s.keywords : [],
      priority: s.priority || 2,
    }));

    return NextResponse.json({
      suggestions: formatted,
      model: result.model,
      enhancedKeywords: {
        matched: enhancedMatched.length,
        missing: enhancedMissing.length,
      },
    });
  } catch (err: unknown) {
    console.error("[tailor-suggestions]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, suggestions: [] }, { status: 500 });
  }
}
