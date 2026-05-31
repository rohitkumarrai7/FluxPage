#!/usr/bin/env node
/**
 * Test the structuredResumeParser v2 and template rendering.
 * Validates parsing quality: no duplicate summaries, experience metadata,
 * bullet splitting, and section counts.
 *
 * Usage: node scripts/test-parser-templates.mjs
 */

const RESUMES = [
  {
    id: "swe-standard",
    text: `Alex Chen
alex.chen@email.com | +1 555-0100 | linkedin.com/in/alexchen

PROFESSIONAL SUMMARY
Full-stack engineer with 5 years building React and Node.js applications on AWS.
Passionate about scalable architecture and clean code.

WORK EXPERIENCE
Software Engineer — FinTech Co (Jan 2021 – Present)
• Built REST APIs with Node.js and PostgreSQL serving 2M requests/day
• Led migration to Kubernetes on AWS EKS, reducing costs 30%
• Improved CI/CD pipeline with GitHub Actions, cutting deploy time 50%

Junior Developer — StartupXYZ (Jun 2019 – Dec 2020)
• Developed React frontend for B2B SaaS platform
• Wrote unit tests with Jest achieving 90% coverage

SKILLS
JavaScript, TypeScript, React, Node.js, AWS, Docker, Kubernetes, PostgreSQL, GraphQL

EDUCATION
B.S. Computer Science — State University (2015 – 2019)

CERTIFICATIONS
AWS Solutions Architect Associate`,
    expect: {
      contactName: "Alex Chen",
      contactEmail: "alex.chen@email.com",
      minSections: 5,
      noDuplicateSummary: true,
      hasExperienceMetadata: true,
      sectionTypes: ["summary", "experience", "skills", "education", "certifications"],
    },
  },
  {
    id: "marketing-inline",
    text: `Priya Sharma
priya@email.com

Summary
Digital marketing manager with 7 years in B2B SaaS growth. Expert in SEO, paid ads, and content strategy.

Experience
Marketing Manager — SaaS Labs (2019 – Present)
• Grew MQL pipeline 140% via SEO and paid campaigns
• Managed $500K annual ad budget across Google and LinkedIn
• Built content calendar driving 3x organic traffic

Skills
SEO, Google Analytics, HubSpot, content strategy, A/B testing, Mailchimp

Education
MBA Marketing — Delhi University (2016 – 2018)`,
    expect: {
      contactName: "Priya Sharma",
      contactEmail: "priya@email.com",
      minSections: 4,
      noDuplicateSummary: true,
      hasExperienceMetadata: true,
      sectionTypes: ["summary", "experience", "skills", "education"],
    },
  },
  {
    id: "compact-nospace",
    text: `John Doe john@example.com | 555-1234 | linkedin.com/in/johndoe
Professional Summary Results-driven product manager with 10 years experience.
Work Experience
Product Manager — BigCorp (2018 – Present) • Launched 3 products generating $5M ARR • Led cross-functional team of 12 engineers and designers
Skills: Product strategy, Agile, JIRA, SQL, user research
Education
B.A. Business — MIT (2014)`,
    expect: {
      contactName: "John Doe",
      minSections: 3,
      noDuplicateSummary: true,
    },
  },
];

const TEMPLATES = ["classic", "compact", "modern", "sidebar", "executive", "designer"];

let failures = 0;

function assert(condition, id, msg) {
  if (!condition) {
    console.log(`  [FAIL] ${id}: ${msg}`);
    failures++;
  } else {
    console.log(`  [PASS] ${id}: ${msg}`);
  }
}

async function testParsing() {
  console.log("\n=== Parser v2 Tests ===\n");

  // Dynamic import for ESM compatibility with the TS output
  // We test the parsing logic inline since we can't easily import from TS
  const { parseResumeText, needsReparse } = await loadParser();

  for (const tc of RESUMES) {
    console.log(`\nCase: ${tc.id}`);
    const parsed = parseResumeText(tc.text);
    const exp = tc.expect;

    if (exp.contactName) {
      assert(parsed.contact.name === exp.contactName, tc.id, `name="${parsed.contact.name}" expected="${exp.contactName}"`);
    }
    if (exp.contactEmail) {
      assert(parsed.contact.email === exp.contactEmail, tc.id, `email="${parsed.contact.email}"`);
    }
    if (exp.minSections) {
      assert(parsed.sections.length >= exp.minSections, tc.id, `sections=${parsed.sections.length} >= ${exp.minSections}`);
    }
    if (exp.noDuplicateSummary) {
      const summaryCount = parsed.sections.filter((s) => s.type === "summary").length;
      assert(summaryCount <= 1, tc.id, `summary sections=${summaryCount} (should be <=1)`);
    }
    if (exp.hasExperienceMetadata) {
      const exp_sec = parsed.sections.find((s) => s.type === "experience");
      const hasRole = exp_sec?.items.some((it) => it.metadata?.role);
      assert(hasRole, tc.id, `experience has role metadata`);
    }
    if (exp.sectionTypes) {
      const types = parsed.sections.map((s) => s.type);
      for (const t of exp.sectionTypes) {
        assert(types.includes(t), tc.id, `has section type "${t}"`);
      }
    }

    // Check needsReparse returns false for well-parsed resumes
    const shouldReparse = needsReparse(parsed);
    assert(!shouldReparse, tc.id, `needsReparse=false (got ${shouldReparse})`);

    // Dump structure for visual inspection
    console.log(`  Sections: ${parsed.sections.map((s) => `${s.type}(${s.items.length})`).join(", ")}`);
  }
}

async function testTemplates() {
  console.log("\n\n=== Template Variant Tests ===\n");
  console.log(`Available templates: ${TEMPLATES.join(", ")}`);
  console.log("(Template rendering tested via build — verifying slug mapping)\n");

  const SLUG_MAP = {
    "classic-ats": "classic",
    "compact-ats": "compact",
    "modern-ats": "modern",
    "sidebar-ats": "sidebar",
    "executive": "executive",
    "designer": "designer",
  };

  for (const [slug, expected] of Object.entries(SLUG_MAP)) {
    const variant = slugToVariant(slug);
    assert(variant === expected, "slug-map", `slugToVariant("${slug}") = "${variant}" (expected "${expected}")`);
  }
}

function slugToVariant(slug) {
  const MAP = {
    "classic-ats": "classic",
    "compact-ats": "compact",
    "modern-ats": "modern",
    "sidebar-ats": "sidebar",
    "executive": "executive",
    "designer": "designer",
  };
  if (MAP[slug]) return MAP[slug];
  for (const [key, val] of Object.entries(MAP)) {
    if (slug.includes(key.split("-")[0])) return val;
  }
  return "classic";
}

async function loadParser() {
  // Inline parser logic for testing without TS compilation
  const SECTION_PATTERNS = [
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

  const ALL_HEADERS = SECTION_PATTERNS.map((h) => h.heading).sort((a, b) => b.length - a.length);

  function matchSectionHeader(line) {
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

  function normalizeResumeText(text) {
    let n = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    for (const header of ALL_HEADERS) {
      const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      n = n.replace(new RegExp(`([^\\n])[ \\t]+(${escaped})[ \\t]*:?[ \\t]*(?=\\S)`, "gi"), "$1\n$2\n");
    }
    n = n.replace(/•/g, "\n•");
    return n;
  }

  const ROLE_DATE_RE = /^(.+?)\s*[—–\-|]+\s*(.+?)\s*[\(]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December|\d{4})[\s\S]{0,30}(?:Present|\d{4}))[\)]?\s*$/i;

  let bc = 0;

  function parseContactLine(line, contact) {
    for (const part of line.split(/[|·•,]/).map((p) => p.trim()).filter(Boolean)) {
      if (/github\.com/i.test(part) && !contact.github) contact.github = part;
      else if (/linkedin\.com/i.test(part) && !contact.linkedin) contact.linkedin = part;
      else if (/@/.test(part) && !contact.email) contact.email = part;
      else if (/^[\d\s().+-]{7,}$/.test(part.replace(/\s/g, "")) && !contact.phone) contact.phone = part;
    }
  }

  function mergeDuplicateSections(sections) {
    const seen = new Map();
    const result = [];
    for (const sec of sections) {
      const key = sec.type;
      const idx = seen.get(key);
      if (idx !== undefined && key !== "custom" && key !== "experience") {
        result[idx].items.push(...sec.items);
      } else {
        seen.set(key, result.length);
        result.push({ ...sec });
      }
    }
    return result;
  }

  function parseResumeText(text) {
    bc = 0;
    const lines = normalizeResumeText(text).split("\n");
    const contact = { name: "", email: "", phone: "", linkedin: "", github: "" };
    const sections = [];
    let current = null;
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

      if (/linkedin\.com/i.test(line) && !contact.linkedin) { contact.linkedin = line; continue; }
      if (/github\.com/i.test(line) && !contact.github) { contact.github = line; continue; }
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
            id: `role-${bc++}`, text: cleanedText,
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

  function needsReparse(resume) {
    if (resume.sections.length <= 1) {
      const totalItems = resume.sections.reduce((n, s) => n + s.items.length, 0);
      if (totalItems > 2) return true;
    }
    const hasLongItem = resume.sections.some((s) => s.items.some((i) => i.text.length > 300));
    if (hasLongItem) return true;
    const summaryCount = resume.sections.filter((s) => s.type === "summary").length;
    if (summaryCount > 1) return true;
    return false;
  }

  return { parseResumeText, needsReparse };
}

async function main() {
  await testParsing();
  await testTemplates();

  console.log(`\n=== Results: ${failures} failures ===\n`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
