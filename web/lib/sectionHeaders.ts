import type { ResumeSection } from "./types";

export const SECTION_HEADERS: { pattern: RegExp; heading: string; type: ResumeSection["type"] }[] = [
  { pattern: /^professional\s+summary$/i, heading: "Professional Summary", type: "summary" },
  { pattern: /^career\s+summary$/i, heading: "Career Summary", type: "summary" },
  { pattern: /^summary$/i, heading: "Summary", type: "summary" },
  { pattern: /^objective$/i, heading: "Objective", type: "summary" },
  { pattern: /^profile$/i, heading: "Profile", type: "summary" },
  { pattern: /^about(\s+me)?$/i, heading: "About", type: "summary" },
  { pattern: /^work\s+experience$/i, heading: "Work Experience", type: "experience" },
  { pattern: /^professional\s+experience$/i, heading: "Professional Experience", type: "experience" },
  { pattern: /^experience$/i, heading: "Experience", type: "experience" },
  { pattern: /^employment(\s+history)?$/i, heading: "Employment", type: "experience" },
  { pattern: /^work\s+history$/i, heading: "Work History", type: "experience" },
  { pattern: /^education$/i, heading: "Education", type: "education" },
  { pattern: /^academic(\s+background)?$/i, heading: "Education", type: "education" },
  { pattern: /^technical\s+skills$/i, heading: "Technical Skills", type: "skills" },
  { pattern: /^core\s+competencies$/i, heading: "Core Competencies", type: "skills" },
  { pattern: /^skills\s*(&|and)\s*tools$/i, heading: "Skills & Tools", type: "skills" },
  { pattern: /^skills$/i, heading: "Skills", type: "skills" },
  { pattern: /^technologies$/i, heading: "Technologies", type: "skills" },
  { pattern: /^competencies$/i, heading: "Competencies", type: "skills" },
  { pattern: /^projects?$/i, heading: "Projects", type: "projects" },
  { pattern: /^personal\s+projects?$/i, heading: "Projects", type: "projects" },
  { pattern: /^key\s+projects?$/i, heading: "Projects", type: "projects" },
  { pattern: /^certifications?$/i, heading: "Certifications", type: "certifications" },
  { pattern: /^awards?$/i, heading: "Awards", type: "achievements" },
  { pattern: /^achievements?$/i, heading: "Achievements", type: "achievements" },
  { pattern: /^honors?$/i, heading: "Honors", type: "achievements" },
  { pattern: /^accomplishments?$/i, heading: "Accomplishments", type: "achievements" },
];

const ALL_HEADER_STRINGS = SECTION_HEADERS.map((h) => h.heading)
  .sort((a, b) => b.length - a.length);

export function matchSectionHeader(line: string): { heading: string; type: ResumeSection["type"] } | null {
  const cleaned = line
    .replace(/^#+\s*/, "")
    .replace(/[:#*•\-–—_=]+$/, "")
    .replace(/^\d+\.\s*/, "")
    .trim();
  if (cleaned.length > 60 || cleaned.length < 3) return null;
  for (const entry of SECTION_HEADERS) {
    if (entry.pattern.test(cleaned)) {
      return { heading: entry.heading, type: entry.type };
    }
  }
  if (/^[A-Z\s&]+$/.test(cleaned) && cleaned.length < 40) {
    const lower = cleaned.toLowerCase().trim();
    for (const entry of SECTION_HEADERS) {
      if (entry.pattern.test(lower)) {
        return { heading: entry.heading, type: entry.type };
      }
    }
  }
  return null;
}

export function normalizeResumeText(text: string): string {
  let n = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (const header of ALL_HEADER_STRINGS) {
    const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    n = n.replace(
      new RegExp(`([^\\n])[ \\t]+(${escaped})[ \\t]*:?[ \\t]*(?=\\S)`, "gi"),
      "$1\n$2\n"
    );
  }
  n = n.replace(/•/g, "\n•");
  return n;
}

const MONTHS = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const DATE_TOKEN = `(?:${MONTHS}[\\s.]*\\d{4}|\\d{4}|Present|Current|Ongoing|Now)`;
const DATE_RANGE = `(${DATE_TOKEN}\\s*[–\\-—to]+\\s*${DATE_TOKEN})`;

const ROLE_PATTERNS = [
  // Role — Company DateRange
  new RegExp(`^(.+?)\\s*[—–\\-|]+\\s*(.+?)\\s*[\\(]?\\s*${DATE_RANGE}[\\)]?\\s*$`, "i"),
  // Role DateRange Company — Location  (Rohit's format: "Full Stack Developer Intern Aug 2025 – Present Optymatch — Remote")
  new RegExp(`^(.+?)\\s+(${DATE_TOKEN}\\s*[–\\-—]+\\s*${DATE_TOKEN})\\s+(.+?)(?:\\s*[—–\\-|]+\\s*(.+))?$`, "i"),
  // Role, Company (DateRange)
  new RegExp(`^(.+?),\\s+(.+?)\\s*\\(\\s*${DATE_RANGE}\\s*\\)\\s*$`, "i"),
];

const DEGREE_RE =
  /^(B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|Ph\.?D\.?|MBA|Bachelor|Master|Doctor|Associate|Diploma|B\.?Tech|M\.?Tech)/i;

export function parseRoleHeader(line: string): { role: string; company: string; dateRange: string } | null {
  // Pattern 1: Role — Company DateRange
  const m1 = line.match(ROLE_PATTERNS[0]);
  if (m1) return { role: m1[1].trim(), company: m1[2].trim(), dateRange: m1[3].trim() };

  // Pattern 2: Role DateRange Company — Location
  const m2 = line.match(ROLE_PATTERNS[1]);
  if (m2) {
    const role = m2[1].trim();
    const dateRange = m2[2].trim();
    const companyPart = m2[3].trim();
    if (role.length > 3 && companyPart.length > 1) {
      return { role, company: companyPart, dateRange };
    }
  }

  // Pattern 3: Role, Company (DateRange)
  const m3 = line.match(ROLE_PATTERNS[2]);
  if (m3) return { role: m3[1].trim(), company: m3[2].trim(), dateRange: m3[3].trim() };

  return null;
}

export function parseEducationEntry(line: string): { degree: string; institution: string; dateRange: string } | null {
  if (!DEGREE_RE.test(line)) return null;
  const m = line.match(ROLE_PATTERNS[0]);
  if (m) return { degree: m[1].trim(), institution: m[2].trim(), dateRange: m[3].trim() };
  const parts = line.split(/[—–\-|,]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { degree: parts[0], institution: parts[1], dateRange: parts[2] || "" };
  return null;
}

export function needsReparse(resume: { sections: { type?: string; items: { text: string }[] }[] }): boolean {
  if (resume.sections.length <= 1) {
    const totalItems = resume.sections.reduce((n, s) => n + s.items.length, 0);
    if (totalItems > 2) return true;
  }
  const hasLongItem = resume.sections.some((s) =>
    s.items.some((i) => i.text.length > 300)
  );
  if (hasLongItem) return true;
  const summaryCount = resume.sections.filter((s) => s.type === "summary").length;
  if (summaryCount > 1) return true;

  // Contact info leaked into summary
  const summarySection = resume.sections.find((s) => s.type === "summary");
  if (summarySection) {
    const hasContactInSummary = summarySection.items.some((i) =>
      /[\w.+-]+@[\w.-]+\.\w+/.test(i.text) ||
      /linkedin\.com/i.test(i.text) ||
      /github\.com/i.test(i.text) ||
      (/^[+]?[\d\s\-().]{7,}$/.test(i.text.trim()) && i.text.replace(/\D/g, "").length >= 7)
    );
    if (hasContactInSummary) return true;
  }

  // Duplicate experience sections
  const expCount = resume.sections.filter((s) => s.type === "experience").length;
  if (expCount > 1) return true;

  // Any section type duplicated
  const typeCounts = new Map<string, number>();
  for (const s of resume.sections) {
    const t = s.type || "custom";
    typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
  }
  for (const [t, c] of typeCounts) {
    if (c > 1 && t !== "custom") return true;
  }

  // Experience section with items that look like skills lists (no role metadata, short comma-heavy text)
  const expSection = resume.sections.find((s) => s.type === "experience");
  if (expSection) {
    const nonRoleBullets = expSection.items.filter((i) => !("metadata" in i && (i as any).metadata?.role));
    const skillsLikeBullets = nonRoleBullets.filter(
      (i) => i.text.includes(",") && i.text.split(",").length > 3 && i.text.length < 200
    );
    if (skillsLikeBullets.length > 0 && nonRoleBullets.length > 0 && skillsLikeBullets.length / nonRoleBullets.length > 0.3) {
      return true;
    }
  }

  return false;
}

export function scoreParseQuality(resume: { contact: { name: string; email: string; phone: string }; sections: { type?: string; items: { text: string; metadata?: any }[] }[] }): number {
  let score = 0;

  // Penalize contact info in summary
  const summary = resume.sections.find((s) => s.type === "summary");
  if (summary) {
    const hasContactLeak = summary.items.some((i) =>
      /[\w.+-]+@[\w.-]+\.\w+/.test(i.text) || /linkedin\.com/i.test(i.text)
    );
    if (!hasContactLeak) score += 20;
  }

  // Reward single experience section
  const expCount = resume.sections.filter((s) => s.type === "experience").length;
  if (expCount === 1) score += 20;
  if (expCount > 1) score -= 10;

  // Reward role headers with metadata
  const expSection = resume.sections.find((s) => s.type === "experience");
  if (expSection) {
    const roleItems = expSection.items.filter((i) => i.metadata?.role);
    score += Math.min(roleItems.length * 10, 30);
  }

  // Reward no duplicate section types
  const typeCounts = new Map<string, number>();
  for (const s of resume.sections) {
    const t = s.type || "custom";
    typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
  }
  let hasDupes = false;
  for (const [t, c] of typeCounts) {
    if (c > 1 && t !== "custom") hasDupes = true;
  }
  if (!hasDupes) score += 15;

  // Reward having standard sections
  const types = new Set(resume.sections.map((s) => s.type));
  if (types.has("summary")) score += 5;
  if (types.has("experience")) score += 5;
  if (types.has("skills")) score += 5;

  return score;
}
