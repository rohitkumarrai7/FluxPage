import type { StructuredResume } from "@/lib/resumeParser";

export type TemplateVariant = "classic" | "compact" | "modern" | "sidebar" | "executive" | "designer" | "minimal";

export interface TemplateStyles {
  accent: string;
  nameSize: number;
  sectionSize: number;
  bodySize: number;
  pagePadding: number;
  sectionGap: number;
}

export interface TemplateMeta {
  id: TemplateVariant;
  name: string;
  description: string;
  previewBg: string;
}

export const TEMPLATE_STYLES: Record<TemplateVariant, TemplateStyles> = {
  classic: { accent: "#1E3A5F", nameSize: 18, sectionSize: 11, bodySize: 10, pagePadding: 40, sectionGap: 10 },
  compact: { accent: "#111827", nameSize: 16, sectionSize: 10, bodySize: 9, pagePadding: 32, sectionGap: 6 },
  modern: { accent: "#6366F1", nameSize: 20, sectionSize: 11, bodySize: 10, pagePadding: 36, sectionGap: 8 },
  sidebar: { accent: "#0F766E", nameSize: 16, sectionSize: 10, bodySize: 9, pagePadding: 28, sectionGap: 8 },
  executive: { accent: "#7C2D12", nameSize: 20, sectionSize: 11, bodySize: 10, pagePadding: 44, sectionGap: 12 },
  designer: { accent: "#0891B2", nameSize: 22, sectionSize: 11, bodySize: 10, pagePadding: 36, sectionGap: 10 },
  minimal: { accent: "#000000", nameSize: 18, sectionSize: 10, bodySize: 9.5, pagePadding: 30, sectionGap: 6 },
};

export const RESUME_TEMPLATES: TemplateMeta[] = [
  { id: "classic", name: "Classic ATS", description: "Traditional centered layout, ATS-safe", previewBg: "linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)" },
  { id: "compact", name: "Compact ATS", description: "Dense single-page format", previewBg: "linear-gradient(135deg, #111827 0%, #374151 100%)" },
  { id: "modern", name: "Modern ATS", description: "Accent bar with pill sections", previewBg: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)" },
  { id: "sidebar", name: "Sidebar Pro", description: "Two-column with skills sidebar", previewBg: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)" },
  { id: "executive", name: "Executive", description: "Spacious serif-style layout", previewBg: "linear-gradient(135deg, #7C2D12 0%, #DC2626 100%)" },
  { id: "designer", name: "Designer", description: "Bold accent header band", previewBg: "linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)" },
  { id: "minimal", name: "Minimal", description: "Clean black & white, maximum content density", previewBg: "linear-gradient(135deg, #18181B 0%, #3F3F46 100%)" },
];

const SLUG_TO_LAYOUT: Record<string, TemplateVariant> = {
  "classic-ats": "classic",
  "compact-ats": "compact",
  "modern-ats": "modern",
  "sidebar-ats": "sidebar",
  "executive": "executive",
  "designer": "designer",
  "minimal": "minimal",
  "minimal-ats": "minimal",
};

export function slugToVariant(slug: string): TemplateVariant {
  if (SLUG_TO_LAYOUT[slug]) return SLUG_TO_LAYOUT[slug];
  for (const [key, val] of Object.entries(SLUG_TO_LAYOUT)) {
    if (slug.includes(key.split("-")[0])) return val;
  }
  return "classic";
}

export function variantToSlug(variant: TemplateVariant): string {
  for (const [slug, v] of Object.entries(SLUG_TO_LAYOUT)) {
    if (v === variant) return slug;
  }
  return "classic-ats";
}

export type { StructuredResume };
