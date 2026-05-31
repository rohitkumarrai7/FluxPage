import type { StructuredResume } from "./resumeParser";
import type { TemplateVariant } from "@/components/resume/templates";

/** Minimum scale — ~7.5pt body at 10.5pt base. Never go smaller for readability. */
export const MIN_READABLE_SCALE = 0.72;

/** Rough content units for one-page fit heuristics. */
export function estimateResumeContentUnits(resume: StructuredResume): number {
  let units = 3;
  for (const section of resume.sections) {
    units += 1.4;
    if (section.type === "summary") {
      const text = section.items.map((i) => i.text).join(" ");
      units += Math.max(1.2, text.length / 110);
      continue;
    }
    if (section.type === "skills") {
      units += Math.max(0.8, section.items.length * 0.3);
      continue;
    }
    for (const item of section.items) {
      if (item.metadata?.role || item.metadata?.degree) {
        units += 1.3;
      } else {
        units += Math.max(0.7, item.text.length / 80);
      }
    }
  }
  return units;
}

/** One-page capacity in content units (higher = less shrinking). */
const PAGE_CAPACITY: Record<TemplateVariant, number> = {
  classic: 58,
  compact: 68,
  minimal: 64,
  modern: 52,
  sidebar: 54,
  executive: 50,
  designer: 52,
};

export function computePdfFitScale(
  resume: StructuredResume,
  template: TemplateVariant,
  userFontScale = 1,
  lineSpacing = 1.2
): number {
  const units = estimateResumeContentUnits(resume);
  const capacity = PAGE_CAPACITY[template] ?? 58;

  // Content fits comfortably at user's font size — no shrink
  if (units <= capacity) {
    return Math.min(1, userFontScale);
  }

  const lineFactor = lineSpacing > 1.15 ? 0.94 : lineSpacing < 1.05 ? 1.02 : 1;
  const needed = (capacity / units) * lineFactor * userFontScale;
  // Small safety margin only when we're actually overflowing
  return Math.max(MIN_READABLE_SCALE, Math.min(1, needed * 0.98));
}

export function previewScaleFromContent(
  contentHeight: number,
  containerHeight: number,
  minScale = MIN_READABLE_SCALE
): number {
  if (contentHeight <= 0 || containerHeight <= 0) return 1;
  if (contentHeight <= containerHeight * 1.02) return 1;
  return Math.max(minScale, (containerHeight / contentHeight) * 0.98);
}

/** @deprecated Use computePdfFitScale directly — single pass is enough. */
export function pdfShrinkAttempts(_resume: StructuredResume): number {
  return 1;
}
