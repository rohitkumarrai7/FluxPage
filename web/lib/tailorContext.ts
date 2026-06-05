import type { StructuredResume, TailorSuggestion } from "./resumeParser";
import type { JDAnalysis } from "./jdAnalyzer";

const DATE_IN_TEXT =
  /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4}\s*[–\-—]\s*(?:\d{4}|Present|Current)/i;

/** Numbered bullet index map so the LLM targets real achievement lines only. */
export function buildResumeStructureContext(resume: StructuredResume): string {
  const lines: string[] = [];

  for (const section of resume.sections) {
    if (section.type === "experience" || section.type === "projects") {
      const bullets = section.items.filter((it) => !it.metadata?.role && !it.metadata?.degree);
      if (bullets.length === 0) continue;

      lines.push(`\n${section.heading.toUpperCase()}:`);
      for (const item of section.items) {
        if (item.metadata?.role) {
          const dates = [item.metadata.startDate, item.metadata.endDate].filter(Boolean).join(" – ");
          lines.push(`  [HEADER — do not rewrite] ${item.metadata.role} @ ${item.metadata.company || ""} ${dates}`.trim());
        } else if (item.metadata?.degree) {
          lines.push(`  [HEADER — do not rewrite] ${item.metadata.degree} @ ${item.metadata.institution || ""}`);
        }
      }
      lines.push(`  Achievement bullets (rewrite by index only):`);
      bullets.forEach((b, i) => lines.push(`    [${i}] ${b.text}`));
    } else if (section.type === "summary") {
      const text = section.items.map((i) => i.text).join(" ").trim();
      if (text) lines.push(`\nSUMMARY:\n  ${text}`);
    } else if (section.type === "skills") {
      const text = section.items.map((i) => i.text).join(", ").trim();
      if (text) lines.push(`\nSKILLS:\n  ${text}`);
    }
  }

  return lines.join("\n");
}

export function buildJdAnalysisContext(analysis: JDAnalysis): string {
  return `JD analysis (source: ${analysis.source} — prefer these LLM-extracted terms over generic guesses):
- Industry: ${analysis.industry || "unknown"}
- Role level: ${analysis.roleLevel || "unknown"}
- Hard skills: ${analysis.hardSkills.join(", ") || "none"}
- Tools: ${analysis.tools.join(", ") || "none"}
- Key phrases: ${analysis.keywords.join(", ") || "none"}
- Soft skills: ${analysis.softSkills.join(", ") || "none"}`;
}

function looksLikeRoleLine(text: string): boolean {
  return DATE_IN_TEXT.test(text) && text.length < 120;
}

/** Drop suggestions that would corrupt job headers; truncate oversized bullets instead of dropping. */
export function validateTailorSuggestions(
  suggestions: TailorSuggestion[],
  _resume: StructuredResume
): TailorSuggestion[] {
  const out: TailorSuggestion[] = [];

  for (const raw of suggestions) {
    let text = (raw.suggestedText || "").trim();
    if (!text) continue;

    const s: TailorSuggestion = { ...raw, suggestedText: text };

    if (s.type === "rewrite" && (s.sectionType === "experience" || s.sectionType === "projects")) {
      if (looksLikeRoleLine(text)) continue;
      if (text.length > 280) s.suggestedText = text.slice(0, 280).trim();
    }

    if ((s.type === "summary" || s.sectionType === "summary") && text.length > 600) {
      s.suggestedText = text.slice(0, 600).trim();
    }

    out.push(s);
  }

  return out.slice(0, 15);
}
