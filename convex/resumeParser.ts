interface ResumeBullet {
  id: string;
  text: string;
  metadata?: {
    role?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    degree?: string;
    institution?: string;
  };
}

interface ResumeSection {
  id: string;
  type: string;
  heading: string;
  items: ResumeBullet[];
  order: number;
}

export interface StructuredResume {
  contact: { name: string; email: string; phone: string; linkedin: string; github?: string };
  sections: ResumeSection[];
}

const SECTION_PATTERNS: { pattern: RegExp; heading: string; type: string }[] = [
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
  { pattern: /^projects?$/i, heading: "Projects", type: "projects" },
  { pattern: /^certifications?$/i, heading: "Certifications", type: "certifications" },
  { pattern: /^awards?$/i, heading: "Awards", type: "achievements" },
  { pattern: /^achievements?$/i, heading: "Achievements", type: "achievements" },
];

function matchSectionHeader(line: string) {
  const cleaned = line.replace(/^#+\s*/, "").replace(/[:#*•\-–—_=]+$/, "").replace(/^\d+\.\s*/, "").trim();
  if (cleaned.length > 60 || cleaned.length < 3) return null;
  for (const entry of SECTION_PATTERNS) {
    if (entry.pattern.test(cleaned)) return entry;
  }
  if (/^[A-Z\s&]+$/.test(cleaned) && cleaned.length < 40) {
    const lower = cleaned.toLowerCase().trim();
    for (const entry of SECTION_PATTERNS) {
      if (entry.pattern.test(lower)) return entry;
    }
  }
  return null;
}

const ALL_HEADER_STRINGS = SECTION_PATTERNS.map((h) => h.heading).sort((a, b) => b.length - a.length);

function normalizeResumeText(text: string) {
  let n = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (const header of ALL_HEADER_STRINGS) {
    const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    n = n.replace(new RegExp(`([^\\n])[ \\t]+(${escaped})[ \\t]*:?[ \\t]*(?=\\S)`, "gi"), "$1\n$2\n");
  }
  n = n.replace(/•/g, "\n•");
  return n;
}

const ROLE_DATE_RE =
  /^(.+?)\s*[—–\-|]+\s*(.+?)\s*[\(]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December|\d{4})[\s\S]{0,30}(?:Present|\d{4}))[\)]?\s*$/i;

function parseContactLine(line: string, contact: StructuredResume["contact"]) {
  for (const part of line.split(/[|·•,]/).map((p) => p.trim()).filter(Boolean)) {
    if (/github\.com/i.test(part) && !contact.github) contact.github = part;
    else if (/linkedin\.com/i.test(part) && !contact.linkedin) contact.linkedin = part;
    else if (/@/.test(part) && !contact.email) contact.email = part;
    else if (/^[\d\s().+-]{7,}$/.test(part.replace(/\s/g, "")) && !contact.phone) contact.phone = part;
  }
}

function mergeDuplicateSections(sections: ResumeSection[]): ResumeSection[] {
  const seen = new Map<string, number>();
  const result: ResumeSection[] = [];
  for (const sec of sections) {
    const key = sec.type;
    const existingIdx = seen.get(key);
    if (existingIdx !== undefined && key !== "custom" && key !== "experience") {
      result[existingIdx].items.push(...sec.items);
    } else {
      seen.set(key, result.length);
      result.push({ ...sec });
    }
  }
  return result;
}

let bc = 0;

export function parseResumeText(text: string): StructuredResume {
  bc = 0;
  const lines = normalizeResumeText(text).split("\n");
  const contact: StructuredResume["contact"] = { name: "", email: "", phone: "", linkedin: "", github: "" };
  const sections: ResumeSection[] = [];
  let current: ResumeSection | null = null;
  let order = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.includes("|") && (line.includes("@") || /\d{7,}/.test(line) || /linkedin|github/i.test(line))) {
      parseContactLine(line, contact);
      if (!contact.name && !current) {
        const parts = line.split(/[|]/).map((p) => p.trim());
        for (const part of parts) {
          if (/@/.test(part)) {
            const beforeEmail = part.replace(/\s+\S+@\S+/, "").trim();
            if (beforeEmail.length > 2 && /^[a-zA-Z]/.test(beforeEmail)) {
              contact.name = beforeEmail;
              break;
            }
          } else if (part.length > 2 && /^[a-zA-Z]/.test(part) && !/\d{5,}/.test(part) && !/linkedin|github|\.com/i.test(part)) {
            contact.name = part;
            break;
          }
        }
      }
      continue;
    }

    if (/github\.com/i.test(line) && !contact.github) { contact.github = line; continue; }
    if (/linkedin\.com/i.test(line) && !contact.linkedin) { contact.linkedin = line; continue; }
    if (/^[\w\s+.-]+@[\w.-]+\.\w+$/.test(line) && !contact.email) { contact.email = line; continue; }
    if (/^[+]?[\d\s\-().]{7,}$/.test(line) && !contact.phone) { contact.phone = line; continue; }

    const sectionInfo = matchSectionHeader(line);
    if (sectionInfo) {
      current = { id: `sec-${order++}`, type: sectionInfo.type, heading: sectionInfo.heading, items: [], order };
      sections.push(current);
      continue;
    }

    if (!contact.name && !current && line.length < 80 && !line.includes("@") && !/^\d/.test(line)) {
      contact.name = line.replace(/\s*[—–\-|].*$/, "").trim();
      const rest = line.replace(contact.name, "");
      if (rest.includes("|") || rest.includes("@")) parseContactLine(rest, contact);
      continue;
    }

    if (!current) {
      current = { id: `sec-${order++}`, type: "summary", heading: "Summary", items: [], order };
      sections.push(current);
    }

    const cleanedText = line.replace(/^[-•*]\s*/, "").trim();
    if (!cleanedText) continue;

    if (current.type === "experience") {
      const m = cleanedText.match(ROLE_DATE_RE);
      if (m) {
        current.items.push({
          id: `role-${bc++}`,
          text: cleanedText,
          metadata: { role: m[1].trim(), company: m[2].trim(), startDate: m[3].split(/[–\-—to]+/i)[0]?.trim(), endDate: m[3].split(/[–\-—to]+/i)[1]?.trim() || "Present" },
        });
        continue;
      }
    }

    current.items.push({ id: `b-${bc++}`, text: cleanedText });
  }

  if (!contact.name && lines[0]) contact.name = lines[0].trim().slice(0, 80);
  return { contact, sections: mergeDuplicateSections(sections) };
}

export function buildSuggestions(
  resume: StructuredResume,
  missingKeywords: string[],
  rawSuggestions: unknown[]
): Array<{
  id: string;
  sectionId: string;
  bulletId?: string;
  type: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  keywords: string[];
  applied: boolean;
}> {
  const suggestions: Array<{
    id: string; sectionId: string; bulletId?: string; type: string;
    originalText: string; suggestedText: string; reason: string; keywords: string[]; applied: boolean;
  }> = [];

  const skillsSection = resume.sections.find((s) => s.type === "skills");
  missingKeywords.slice(0, 8).forEach((kw, i) => {
    suggestions.push({
      id: `kw-${i}`,
      sectionId: skillsSection?.id || "skills",
      type: "add",
      originalText: skillsSection?.items.map((it) => it.text).join(", ") || "",
      suggestedText: kw,
      reason: `Add missing keyword "${kw}" to skills`,
      keywords: [kw],
      applied: false,
    });
  });

  rawSuggestions.slice(0, 6).forEach((msg, i) => {
    suggestions.push({
      id: `tip-${i}`,
      sectionId: resume.sections[0]?.id || "general",
      type: "rewrite",
      originalText: "",
      suggestedText: typeof msg === "string" ? msg : String(msg),
      reason: "Optimization tip",
      keywords: [],
      applied: false,
    });
  });

  const expSection = resume.sections.find((s) => s.type === "experience");
  if (expSection && missingKeywords.length > 0) {
    const bullets = expSection.items.filter((it) => !it.metadata?.role);
    bullets.slice(0, 3).forEach((bullet, i) => {
      const kw = missingKeywords[i % missingKeywords.length];
      if (!kw) return;
      suggestions.push({
        id: `rewrite-${i}`,
        sectionId: expSection.id,
        bulletId: bullet.id,
        type: "rewrite",
        originalText: bullet.text,
        suggestedText: `${bullet.text} [incorporate "${kw}"]`,
        reason: `Weave "${kw}" into this bullet`,
        keywords: [kw],
        applied: false,
      });
    });
  }

  return suggestions;
}
