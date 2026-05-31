import type { ResumeBullet, ResumeSection } from "./types";
import {
  matchSectionHeader,
  normalizeResumeText,
  needsReparse,
  parseRoleHeader,
  parseEducationEntry,
  scoreParseQuality,
} from "./sectionHeaders";

export { needsReparse, scoreParseQuality };

export interface StructuredResume {
  contact: {
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    github?: string;
  };
  sections: ResumeSection[];
}

let bulletCounter = 0;
function nextBulletId(prefix = "b") {
  return `${prefix}-${bulletCounter++}`;
}

function parseContactLine(line: string, contact: StructuredResume["contact"]) {
  const parts = line.split(/[|·•,]/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (/github\.com/i.test(part) && !contact.github) {
      contact.github = part;
    } else if (/linkedin\.com/i.test(part) && !contact.linkedin) {
      contact.linkedin = part;
    } else if (/@/.test(part) && !contact.email) {
      contact.email = part.replace(/^mailto:/i, "");
    } else if (/^[\d\s().+\-]{7,}$/.test(part.replace(/\s/g, "")) && !contact.phone) {
      contact.phone = part;
    }
  }
}

function isContactInfoLine(line: string): boolean {
  if (/[\w.+-]+@[\w.-]+\.\w+/.test(line)) return true;
  if (/^[+]?[\d\s\-().]{7,}$/.test(line)) return true;
  if (/linkedin\.com/i.test(line)) return true;
  if (/github\.com/i.test(line)) return true;
  if (/gitlab\.com/i.test(line)) return true;
  return false;
}

function looksLikeContactOrHeader(line: string): boolean {
  if (isContactInfoLine(line)) return true;
  if (/^[\w\s+.-]+@[\w.-]+\.\w+$/.test(line)) return true;
  if (/^[+]?[\d\s\-().]{7,}$/.test(line)) return true;
  if (line.includes("|") && (line.includes("@") || /\d{7,}/.test(line) || /linkedin|github/i.test(line))) return true;
  return false;
}

function mergeDuplicateSections(sections: ResumeSection[]): ResumeSection[] {
  const seen = new Map<string, number>();
  const result: ResumeSection[] = [];
  for (const sec of sections) {
    const key = sec.type;
    const existingIdx = seen.get(key);
    if (existingIdx !== undefined && key !== "custom") {
      result[existingIdx].items.push(...sec.items);
    } else {
      seen.set(key, result.length);
      result.push({ ...sec });
    }
  }
  return result;
}

export function sanitizeStructuredResume(resume: StructuredResume): StructuredResume {
  const next = JSON.parse(JSON.stringify(resume)) as StructuredResume;

  for (const section of next.sections) {
    section.items = section.items.filter((item) => {
      if (item.metadata?.role || item.metadata?.degree) return true;
      const t = item.text.trim();
      if (!t) return false;
      if (/^[\w.+-]+@[\w.-]+\.\w+$/.test(t)) return false;
      if (/^[+]?[\d\s\-().]{7,}$/.test(t) && t.replace(/\D/g, "").length >= 7) return false;
      if (/^https?:\/\//i.test(t) && t.length < 60) return false;
      if (/^(linkedin\.com|github\.com|gitlab\.com)/i.test(t)) return false;
      if (t === resume.contact.name) return false;
      if (t === resume.contact.email) return false;
      if (t === resume.contact.phone) return false;
      const contactStr = [resume.contact.name, resume.contact.email, resume.contact.phone, resume.contact.linkedin].filter(Boolean).join(" ");
      if (contactStr && t.length < 150 && contactStr.length > 10) {
        const overlap = [resume.contact.name, resume.contact.email, resume.contact.phone].filter((c) => c && t.includes(c)).length;
        if (overlap >= 2) return false;
      }
      return true;
    });
  }

  next.sections = next.sections.filter((s) => s.items.length > 0);

  const summaryCount = next.sections.filter((s) => s.type === "summary").length;
  if (summaryCount > 1) {
    let first = true;
    next.sections = next.sections.filter((s) => {
      if (s.type !== "summary") return true;
      if (first) { first = false; return true; }
      return false;
    });
  }

  const SECTION_ORDER: Record<string, number> = {
    summary: 0, experience: 1, skills: 2, projects: 3,
    education: 4, certifications: 5, achievements: 6, custom: 7,
  };
  next.sections.sort((a, b) => (SECTION_ORDER[a.type] ?? 99) - (SECTION_ORDER[b.type] ?? 99));
  next.sections.forEach((s, i) => { s.order = i; });

  return next;
}

export function parseResumeText(text: string): StructuredResume {
  bulletCounter = 0;
  const normalized = normalizeResumeText(text);
  const rawLines = normalized.split("\n");
  const contact: StructuredResume["contact"] = { name: "", email: "", phone: "", linkedin: "", github: "" };
  const sections: ResumeSection[] = [];
  let current: ResumeSection | null = null;
  let order = 0;
  const orphanLines: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
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

    if (/github\.com/i.test(line) && !contact.github) {
      contact.github = line.trim();
      continue;
    }
    if (/linkedin\.com/i.test(line) && !contact.linkedin) {
      contact.linkedin = line.trim();
      continue;
    }
    if (/^[\w\s+.-]+@[\w.-]+\.\w+$/.test(line) && !contact.email) {
      contact.email = line;
      continue;
    }
    if (/^[+]?[\d\s\-().]{7,}$/.test(line) && !contact.phone) {
      contact.phone = line;
      continue;
    }

    const sectionInfo = matchSectionHeader(line);
    if (sectionInfo) {
      if (orphanLines.length > 0 && sections.length === 0) {
        const nonContact = orphanLines.filter((l) => !looksLikeContactOrHeader(l) && l !== contact.name);
        if (nonContact.length > 0) {
          current = { id: `sec-${order++}`, type: "summary", heading: "Summary", items: [], order };
          for (const ol of nonContact) {
            current.items.push({ id: nextBulletId(), text: ol.replace(/^[-•*]\s*/, "").trim() });
          }
          sections.push(current);
        }
        orphanLines.length = 0;
      }
      current = {
        id: `sec-${order++}`,
        type: sectionInfo.type,
        heading: sectionInfo.heading,
        items: [],
        order,
      };
      sections.push(current);
      continue;
    }

    if (!contact.name && !current && !isContactInfoLine(line) && line.length < 80 && !/^\d/.test(line)) {
      contact.name = line.replace(/\s*[—–\-|].*$/, "").trim();
      const rest = line.replace(contact.name, "");
      if (rest.includes("|") || rest.includes("@") || /\d{5,}/.test(rest)) {
        parseContactLine(rest, contact);
      }
      continue;
    }

    if (!current) {
      if (!looksLikeContactOrHeader(line)) {
        orphanLines.push(line);
      }
      continue;
    }

    if (looksLikeContactOrHeader(line) && !current.items.length) {
      parseContactLine(line, contact);
      continue;
    }

    const cleanedText = line.replace(/^[-•*]\s*/, "").trim();
    if (!cleanedText) continue;

    if (current.type === "experience") {
      const roleInfo = parseRoleHeader(cleanedText);
      if (roleInfo) {
        current.items.push({
          id: nextBulletId("role"),
          text: cleanedText,
          metadata: {
            role: roleInfo.role,
            company: roleInfo.company,
            startDate: roleInfo.dateRange.split(/[–\-—to]+/i)[0]?.trim(),
            endDate: roleInfo.dateRange.split(/[–\-—to]+/i)[1]?.trim() || "Present",
          },
        });
        continue;
      }
    }

    if (current.type === "education") {
      const eduInfo = parseEducationEntry(cleanedText);
      if (eduInfo) {
        current.items.push({
          id: nextBulletId("edu"),
          text: cleanedText,
          metadata: {
            degree: eduInfo.degree,
            institution: eduInfo.institution,
            startDate: eduInfo.dateRange.split(/[–\-—to]+/i)[0]?.trim(),
            endDate: eduInfo.dateRange.split(/[–\-—to]+/i)[1]?.trim(),
          },
        });
        continue;
      }
    }

    current.items.push({ id: nextBulletId(), text: cleanedText });
  }

  if (!contact.name && rawLines[0]) {
    contact.name = rawLines[0].trim().slice(0, 80);
  }

  if (orphanLines.length > 0 && sections.length === 0) {
    const nonContact = orphanLines.filter((l) => !looksLikeContactOrHeader(l) && l !== contact.name);
    if (nonContact.length > 0) {
      const sec: ResumeSection = { id: `sec-${order++}`, type: "summary", heading: "Summary", items: [], order: 0 };
      for (const ol of nonContact) {
        sec.items.push({ id: nextBulletId(), text: ol.replace(/^[-•*]\s*/, "").trim() });
      }
      sections.unshift(sec);
    }
  }

  const merged = mergeDuplicateSections(sections);
  return sanitizeStructuredResume({ contact, sections: merged });
}

export function nerToStructuredResume(ner: any): StructuredResume {
  bulletCounter = 0;
  const contact: StructuredResume["contact"] = {
    name: ner.contact?.name || "",
    email: ner.contact?.email || "",
    phone: ner.contact?.phone || "",
    linkedin: ner.contact?.linkedin || "",
    github: ner.contact?.website || "",
  };

  const sections: ResumeSection[] = [];
  let order = 0;

  if (ner.hasSummary) {
    const summarySection = ner.rawSections?.find(
      (s: any) => /summary|profile|objective|about/i.test(s.heading)
    );
    if (summarySection) {
      sections.push({
        id: `sec-${order}`,
        type: "summary",
        heading: summarySection.heading || "Summary",
        items: [{ id: `b-sum-0`, text: summarySection.content || "" }],
        order: order++,
      });
    }
  }

  if (ner.employment?.length) {
    const items: ResumeBullet[] = [];
    for (const emp of ner.employment) {
      items.push({
        id: nextBulletId("role"),
        text: [emp.title, emp.company].filter(Boolean).join(" — "),
        metadata: {
          role: emp.title || "",
          company: emp.company || "",
          startDate: emp.startDate || "",
          endDate: emp.endDate || "Present",
        },
      });
      for (const bullet of emp.bullets || []) {
        items.push({ id: nextBulletId(), text: bullet });
      }
    }
    sections.push({
      id: `sec-${order}`,
      type: "experience",
      heading: "Experience",
      items,
      order: order++,
    });
  }

  if (ner.education?.length) {
    const items: ResumeBullet[] = [];
    for (const edu of ner.education) {
      items.push({
        id: nextBulletId("edu"),
        text: [edu.degree, edu.field, edu.institution].filter(Boolean).join(" — "),
        metadata: {
          degree: [edu.degree, edu.field].filter(Boolean).join(" in "),
          institution: edu.institution || "",
          startDate: "",
          endDate: edu.year ? String(edu.year) : "",
        },
      });
    }
    sections.push({
      id: `sec-${order}`,
      type: "education",
      heading: "Education",
      items,
      order: order++,
    });
  }

  if (ner.skills?.length) {
    const skillText = ner.skills
      .filter((s: any) => s.source === "explicit")
      .map((s: any) => s.skill)
      .join(", ");
    const items: ResumeBullet[] = skillText
      ? [{ id: nextBulletId("sk"), text: skillText }]
      : [];
    if (items.length > 0) {
      sections.push({
        id: `sec-${order}`,
        type: "skills",
        heading: "Skills",
        items,
        order: order++,
      });
    }
  }

  if (ner.hasProjects) {
    const projSection = ner.rawSections?.find(
      (s: any) => /project/i.test(s.heading)
    );
    if (projSection) {
      const lines = (projSection.content || "").split("\n").filter((l: string) => l.trim());
      sections.push({
        id: `sec-${order}`,
        type: "projects",
        heading: projSection.heading || "Projects",
        items: lines.map((l: string) => ({
          id: nextBulletId(),
          text: l.replace(/^[-•*]\s*/, "").trim(),
        })),
        order: order++,
      });
    }
  }

  if (ner.hasCertifications) {
    const certSection = ner.rawSections?.find(
      (s: any) => /certif/i.test(s.heading)
    );
    if (certSection) {
      const lines = (certSection.content || "").split("\n").filter((l: string) => l.trim());
      sections.push({
        id: `sec-${order}`,
        type: "certifications",
        heading: certSection.heading || "Certifications",
        items: lines.map((l: string) => ({
          id: nextBulletId(),
          text: l.replace(/^[-•*]\s*/, "").trim(),
        })),
        order: order++,
      });
    }
  }

  for (const raw of ner.rawSections || []) {
    const heading = raw.heading || "";
    const already = sections.some((s) =>
      s.heading.toLowerCase() === heading.toLowerCase()
    );
    if (already) continue;
    if (/summary|experience|education|skills|project|certif/i.test(heading)) continue;

    const lines = (raw.content || "").split("\n").filter((l: string) => l.trim());
    if (lines.length === 0) continue;
    sections.push({
      id: `sec-${order}`,
      type: "custom",
      heading,
      items: lines.map((l: string) => ({
        id: nextBulletId(),
        text: l.replace(/^[-•*]\s*/, "").trim(),
      })),
      order: order++,
    });
  }

  return sanitizeStructuredResume({ contact, sections });
}

export function structuredResumeToText(resume: StructuredResume): string {
  const parts: string[] = [];
  const contactParts = [resume.contact.name, resume.contact.email, resume.contact.phone, resume.contact.linkedin, resume.contact.github].filter(Boolean);
  if (contactParts.length) parts.push(contactParts.join(" | "));
  parts.push("");

  for (const section of resume.sections) {
    parts.push(section.heading.toUpperCase());
    for (const item of section.items) {
      if (item.metadata?.role) {
        parts.push(`${item.metadata.role} — ${item.metadata.company || ""} ${item.metadata.startDate || ""} – ${item.metadata.endDate || ""}`);
      } else {
        parts.push(`- ${item.text}`);
      }
    }
    parts.push("");
  }
  return parts.join("\n").trim();
}

export interface TailorSuggestion {
  id: string;
  sectionId: string;
  sectionType?: string;
  bulletId?: string;
  bulletIndex?: number | null;
  type: "rewrite" | "add" | "remove" | "summary";
  originalText: string;
  suggestedText: string;
  reason: string;
  keywords: string[];
  applied: boolean;
  priority?: number;
}

export function buildSuggestions(
  resume: StructuredResume,
  missingKeywords: string[],
  _rawSuggestions: string[]
): TailorSuggestion[] {
  const suggestions: TailorSuggestion[] = [];

  missingKeywords.slice(0, 8).forEach((kw, i) => {
    const skillsSection = resume.sections.find((s) => s.type === "skills");
    suggestions.push({
      id: `kw-${i}`,
      sectionId: skillsSection?.id || "skills",
      sectionType: "skills",
      type: "add",
      originalText: "",
      suggestedText: kw,
      reason: `Add missing keyword "${kw}" to skills`,
      keywords: [kw],
      applied: false,
      priority: 1,
    });
  });

  return suggestions;
}

export function applySuggestionToResume(
  resume: StructuredResume,
  suggestion: TailorSuggestion
): StructuredResume {
  const next = JSON.parse(JSON.stringify(resume)) as StructuredResume;

  if (suggestion.type === "add" && suggestion.keywords.length > 0) {
    let skills = next.sections.find((s) => s.type === "skills");
    if (!skills) {
      skills = { id: "skills-auto", type: "skills", heading: "Skills", items: [], order: next.sections.length };
      next.sections.push(skills);
    }
    const kw = suggestion.keywords[0];
    const existing = skills.items.map((i) => i.text.toLowerCase()).join(" ");
    if (!existing.includes(kw.toLowerCase())) {
      if (skills.items.length === 1 && skills.items[0].text.includes(",")) {
        skills.items[0].text = `${skills.items[0].text}, ${kw}`;
      } else {
        skills.items.push({ id: `skill-${Date.now()}`, text: kw });
      }
    }
    return next;
  }

  if (suggestion.type === "summary") {
    let summarySection = next.sections.find((s) => s.type === "summary");
    if (!summarySection) {
      summarySection = { id: "summary-auto", type: "summary", heading: "Summary", items: [{ id: "sum-0", text: "" }], order: 0 };
      next.sections.unshift(summarySection);
    }
    if (summarySection.items.length > 0) {
      summarySection.items[0].text = suggestion.suggestedText;
    } else {
      summarySection.items.push({ id: "sum-0", text: suggestion.suggestedText });
    }
    return next;
  }

  if (suggestion.type === "rewrite") {
    if (suggestion.bulletId) {
      for (const section of next.sections) {
        const bullet = section.items.find((b) => b.id === suggestion.bulletId);
        if (bullet) {
          bullet.text = suggestion.suggestedText;
          return next;
        }
      }
    }

    const sType = suggestion.sectionType || suggestion.sectionId;
    const targetSection = next.sections.find(
      (s) => s.id === suggestion.sectionId || s.type === sType
    );
    if (targetSection && suggestion.bulletIndex != null) {
      const contentBullets = targetSection.items.filter(
        (it) => !it.metadata?.role && !it.metadata?.degree
      );
      const target = contentBullets[suggestion.bulletIndex];
      if (target) {
        target.text = suggestion.suggestedText;
        return next;
      }
    }

    if (targetSection && suggestion.originalText) {
      const match = targetSection.items.find(
        (it) => it.text === suggestion.originalText
      );
      if (match) {
        match.text = suggestion.suggestedText;
        return next;
      }
    }
  }

  return next;
}
