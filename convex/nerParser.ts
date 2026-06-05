// ─── Enterprise NER-Based Resume Parser ────────────────────────────────────────
// Extracts structured employment history, education, skills, and contact info
// using pattern matching and heuristic NER techniques.

export interface ParsedEmployment {
  title: string;
  company: string;
  startDate: string | null;
  endDate: string | null;
  durationMonths: number;
  bullets: string[];
  skills: string[];
}

export interface ParsedEducation {
  degree: string;
  field: string;
  institution: string;
  year: number | null;
  level: "high_school" | "associate" | "bachelor" | "master" | "doctorate" | "certification" | "unknown";
}

export interface ParsedContact {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
  website: string;
}

export interface ParsedSkillEntry {
  skill: string;
  source: "explicit" | "inferred";
  context: string;
}

export interface StructuredResumeNER {
  contact: ParsedContact;
  employment: ParsedEmployment[];
  education: ParsedEducation[];
  skills: ParsedSkillEntry[];
  totalExperienceMonths: number;
  totalExperienceYears: number;
  seniorityLevel: "intern" | "junior" | "mid" | "senior" | "staff" | "principal" | "director" | "vp" | "cxo";
  hasSummary: boolean;
  hasProjects: boolean;
  hasCertifications: boolean;
  rawSections: { heading: string; content: string }[];
}

export interface StructuredJD {
  title: string;
  company: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minYearsExperience: number | null;
  maxYearsExperience: number | null;
  requiredEducation: ParsedEducation["level"] | null;
  location: string;
  employmentType: string;
  isRemote: boolean;
  responsibilities: string[];
  benefits: string[];
  knockouts: { type: string; value: string }[];
}

// ─── Date Parsing ──────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function parseDate(dateStr: string): { month: number; year: number } | null {
  const lower = dateStr.toLowerCase().trim();

  if (/present|current|ongoing|now|today/i.test(lower)) {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  // "Jan 2020", "January 2020"
  const monthYear = lower.match(/(\w+)\s*[,.]?\s*(\d{4})/);
  if (monthYear) {
    const m = MONTH_MAP[monthYear[1]];
    if (m) return { month: m, year: parseInt(monthYear[2]) };
  }

  // "01/2020", "1/2020"
  const slashDate = lower.match(/(\d{1,2})\s*[/\-.]\s*(\d{4})/);
  if (slashDate) return { month: parseInt(slashDate[1]), year: parseInt(slashDate[2]) };

  // "2020" alone
  const yearOnly = lower.match(/^(\d{4})$/);
  if (yearOnly) return { month: 1, year: parseInt(yearOnly[1]) };

  return null;
}

function calculateDurationMonths(start: string | null, end: string | null): number {
  if (!start) return 0;
  const s = parseDate(start);
  const e = end ? parseDate(end) : { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  if (!s || !e) return 0;
  return Math.max(0, (e.year - s.year) * 12 + (e.month - s.month));
}

// ─── Section Detection ─────────────────────────────────────────────────────────

const SECTION_PATTERNS: { type: string; pattern: RegExp }[] = [
  { type: "summary", pattern: /^(summary|professional\s*summary|objective|about\s*me|profile|career\s*summary|overview)\s*:?\s*$/i },
  { type: "experience", pattern: /^(experience|work\s*experience|employment|employment\s*history|professional\s*experience|work\s*history|career\s*history)\s*:?\s*$/i },
  { type: "education", pattern: /^(education|academic|educational\s*background|academic\s*qualifications?)\s*:?\s*$/i },
  { type: "skills", pattern: /^(skills|technical\s*skills|core\s*competencies|competencies|technologies|tech\s*stack|tools?\s*&?\s*technologies)\s*:?\s*$/i },
  { type: "projects", pattern: /^(projects?|personal\s*projects?|key\s*projects?|side\s*projects?)\s*:?\s*$/i },
  { type: "certifications", pattern: /^(certifications?|licenses?\s*&?\s*certifications?|credentials?|professional\s*development)\s*:?\s*$/i },
  { type: "awards", pattern: /^(awards?|honors?|achievements?|accomplishments?)\s*:?\s*$/i },
  { type: "publications", pattern: /^(publications?|research|papers?)\s*:?\s*$/i },
  { type: "volunteer", pattern: /^(volunteer|volunteering|community\s*service)\s*:?\s*$/i },
  { type: "languages", pattern: /^(languages?|language\s*proficiency)\s*:?\s*$/i },
];

function detectSection(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length > 60) return null;
  for (const { type, pattern } of SECTION_PATTERNS) {
    if (pattern.test(trimmed)) return type;
  }
  return null;
}

// ─── Employment Parsing ────────────────────────────────────────────────────────

const DATE_RANGE_PATTERN = /(?:\()?(\w+\.?\s*\d{4}|\d{1,2}[/\-.]\d{4}|\d{4})\s*[-–—to]+\s*(\w+\.?\s*\d{4}|\d{1,2}[/\-.]\d{4}|\d{4}|present|current|now|ongoing)(?:\))?/i;
const TITLE_COMPANY_PATTERNS = [
  /^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[-–—|,]\s*(.+))?$/i,
  /^(.+?)\s*[-–—|]\s*(.+?)(?:\s*[-–—|,]\s*(.+))?$/i,
];

const SENIORITY_KEYWORDS: Record<string, StructuredResumeNER["seniorityLevel"]> = {
  intern: "intern", internship: "intern", trainee: "intern",
  junior: "junior", "jr.": "junior", "jr": "junior", associate: "junior", entry: "junior",
  mid: "mid", "mid-level": "mid",
  senior: "senior", "sr.": "senior", "sr": "senior", lead: "senior", "tech lead": "senior",
  staff: "staff", "staff engineer": "staff", principal: "principal",
  director: "director", "engineering manager": "director", "head of": "director",
  vp: "vp", "vice president": "vp",
  cto: "cxo", ceo: "cxo", coo: "cxo", cio: "cxo", "c-level": "cxo",
};

function inferSeniority(employment: ParsedEmployment[], totalYears: number): StructuredResumeNER["seniorityLevel"] {
  for (const emp of employment) {
    const titleLower = emp.title.toLowerCase();
    for (const [keyword, level] of Object.entries(SENIORITY_KEYWORDS)) {
      if (titleLower.includes(keyword)) return level;
    }
  }
  if (totalYears >= 15) return "principal";
  if (totalYears >= 10) return "staff";
  if (totalYears >= 6) return "senior";
  if (totalYears >= 3) return "mid";
  if (totalYears >= 1) return "junior";
  return "intern";
}

function parseEmploymentSection(lines: string[]): ParsedEmployment[] {
  const entries: ParsedEmployment[] = [];
  let current: Partial<ParsedEmployment> | null = null;

  for (const line of lines) {
    const dateMatch = line.match(DATE_RANGE_PATTERN);

    if (dateMatch) {
      if (current && current.title) {
        entries.push(finalizeEmployment(current));
      }
      const startDate = dateMatch[1];
      const endDate = dateMatch[2];
      const remainingLine = line.replace(DATE_RANGE_PATTERN, "").trim().replace(/^[-–—|,]\s*/, "").replace(/\s*[-–—|,]\s*$/, "");

      let title = "";
      let company = "";
      for (const pattern of TITLE_COMPANY_PATTERNS) {
        const m = remainingLine.match(pattern);
        if (m) {
          title = m[1].trim();
          company = m[2].trim();
          break;
        }
      }
      if (!title && remainingLine) title = remainingLine;

      current = { title, company, startDate, endDate, bullets: [], skills: [] };
    } else if (current) {
      const bullet = line.replace(/^[-•*▪▸►◆]\s*/, "").trim();
      if (bullet.length > 5) {
        current.bullets = current.bullets || [];
        current.bullets.push(bullet);
      }
    } else {
      // Could be a title line without dates
      let matched = false;
      for (const pattern of TITLE_COMPANY_PATTERNS) {
        const m = line.match(pattern);
        if (m && m[1].length < 60) {
          current = { title: m[1].trim(), company: m[2]?.trim() || "", startDate: null, endDate: null, bullets: [], skills: [] };
          matched = true;
          break;
        }
      }
      if (!matched && line.length < 80 && line.length > 3 && !line.startsWith("-")) {
        current = { title: line.trim(), company: "", startDate: null, endDate: null, bullets: [], skills: [] };
      }
    }
  }

  if (current && current.title) {
    entries.push(finalizeEmployment(current));
  }

  return entries;
}

function finalizeEmployment(partial: Partial<ParsedEmployment>): ParsedEmployment {
  return {
    title: partial.title || "",
    company: partial.company || "",
    startDate: partial.startDate || null,
    endDate: partial.endDate || null,
    durationMonths: calculateDurationMonths(partial.startDate || null, partial.endDate || null),
    bullets: partial.bullets || [],
    skills: partial.skills || [],
  };
}

// ─── Education Parsing ─────────────────────────────────────────────────────────

const DEGREE_PATTERNS: { pattern: RegExp; level: ParsedEducation["level"]; label: string }[] = [
  { pattern: /\b(ph\.?d|doctorate|doctor of philosophy)\b/i, level: "doctorate", label: "PhD" },
  { pattern: /\b(m\.?s\.?|m\.?a\.?|m\.?tech|m\.?eng|master|mba|m\.?sc|m\.?com|m\.?ed)\b/i, level: "master", label: "Master's" },
  { pattern: /\b(b\.?s\.?|b\.?a\.?|b\.?tech|b\.?eng|b\.?e\.?|bachelor|b\.?sc|b\.?com|bca|bba)\b/i, level: "bachelor", label: "Bachelor's" },
  { pattern: /\b(associate|a\.?s\.?|a\.?a\.?|diploma)\b/i, level: "associate", label: "Associate" },
  { pattern: /\b(certificate|certification|certified|professional\s*cert)\b/i, level: "certification", label: "Certification" },
  { pattern: /\b(high\s*school|secondary|12th|hsc|cbse|icse)\b/i, level: "high_school", label: "High School" },
];

const FIELD_PATTERNS = [
  /(?:in|of)\s+(.+?)(?:\s*[-–,]|\s*$)/i,
  /(?:degree|major|specialization)\s*:?\s*(.+?)(?:\s*[-–,]|\s*$)/i,
];

function parseEducationSection(lines: string[]): ParsedEducation[] {
  const entries: ParsedEducation[] = [];
  const combined = lines.join("\n");
  const blocks = combined.split(/\n(?=[A-Z]|\d{4}|(?:bachelor|master|ph\.?d|b\.?tech|m\.?tech))/i);

  for (const block of blocks) {
    if (block.trim().length < 5) continue;
    let level: ParsedEducation["level"] = "unknown";
    let degree = "";
    let field = "";
    let institution = "";
    let year: number | null = null;

    for (const { pattern, level: l, label } of DEGREE_PATTERNS) {
      if (pattern.test(block)) {
        level = l;
        degree = label;
        break;
      }
    }

    const yearMatch = block.match(/\b(19|20)\d{2}\b/g);
    if (yearMatch) {
      year = Math.max(...yearMatch.map(Number));
    }

    for (const fp of FIELD_PATTERNS) {
      const m = block.match(fp);
      if (m) {
        field = m[1].trim().slice(0, 80);
        break;
      }
    }

    const institutionPatterns = [
      /(?:university|college|institute|school|iit|nit|iiit|bits|vit|mit|stanford|harvard|oxford|cambridge)\b[^,\n]*/i,
    ];
    for (const ip of institutionPatterns) {
      const m = block.match(ip);
      if (m) {
        institution = m[0].trim().slice(0, 100);
        break;
      }
    }

    if (!institution) {
      const blockLines = block.split("\n").filter((l) => l.trim());
      if (blockLines.length > 0) {
        const candidate = blockLines.find((l) => !DEGREE_PATTERNS.some(({ pattern }) => pattern.test(l)) && l.length > 5 && l.length < 80);
        if (candidate) institution = candidate.trim();
      }
    }

    if (level !== "unknown" || institution || year) {
      entries.push({ degree, field, institution, year, level });
    }
  }

  return entries;
}

// ─── Skills Extraction ─────────────────────────────────────────────────────────

const SKILL_SEPARATORS = /[,;|•·▪]/;

function parseSkillsSection(lines: string[]): ParsedSkillEntry[] {
  const skills: ParsedSkillEntry[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Handle "Category: skill1, skill2, skill3" format
    const colonSplit = line.split(":");
    const content = colonSplit.length > 1 ? colonSplit.slice(1).join(":") : line;

    const tokens = content.split(SKILL_SEPARATORS).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 50);
    for (const token of tokens) {
      const normalized = token.toLowerCase().replace(/^[-•*\s]+/, "").trim();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        skills.push({ skill: token.trim(), source: "explicit", context: "skills section" });
      }
    }
  }

  return skills;
}

function inferSkillsFromBullets(bullets: string[]): ParsedSkillEntry[] {
  const techPatterns = /\b(python|java|javascript|typescript|react|angular|vue|node\.?js|express|django|flask|spring|ruby|rails|go|golang|rust|swift|kotlin|c\+\+|c#|\.net|php|laravel|scala|haskell|perl|r\b|matlab|sql|mysql|postgresql|mongodb|redis|elasticsearch|kafka|rabbitmq|docker|kubernetes|aws|azure|gcp|terraform|jenkins|github|gitlab|jira|figma|sketch|tableau|power\s*bi|pandas|numpy|tensorflow|pytorch|scikit|keras|spark|hadoop|airflow|dbt|snowflake|databricks|looker|grafana|datadog|splunk|new\s*relic|circleci|travis|argo|helm|istio|nginx|linux|bash|git)\b/gi;

  const skills: ParsedSkillEntry[] = [];
  const seen = new Set<string>();

  for (const bullet of bullets) {
    const matches = bullet.match(techPatterns) || [];
    for (const m of matches) {
      const normalized = m.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        skills.push({ skill: m, source: "inferred", context: bullet.slice(0, 80) });
      }
    }
  }

  return skills;
}

// ─── JD Parsing ────────────────────────────────────────────────────────────────

const JD_NOISE_WORDS = new Set([
  "urgent", "hiring", "immediate", "joiners", "walk-in", "walkin",
  "apply", "send", "resume", "cv", "interview", "shortlisted",
  "opening", "vacancy", "vacancies", "openings", "positions",
  "equal", "opportunity", "employer", "eoe", "diverse",
  "competitive", "salary", "perks", "benefits",
]);

const JD_SOFT_SKILL_WORDS = new Set([
  "communication", "collaboration", "teamwork", "leadership", "mentoring",
  "consulting", "strategy", "research", "analysis", "operations", "analytics",
  "reporting", "networking", "outreach", "onboarding", "training",
  "presenting", "negotiation", "stakeholder management", "partnership",
]);

const JD_METADATA_LINE =
  /^(company|work\s*mode|location|duration|stipend|internship\s*type|employment\s*type|job\s*title|title|experience|salary|compensation|posted|apply|about\s*the\s*company)\s*:/i;

const JD_SECTION_HEADERS: { type: "required" | "preferred" | "responsibilities" | "benefits" | "eligibility"; pattern: RegExp }[] = [
  { type: "required", pattern: /^(requirements?|must\s*have|required\s*skills?|mandatory|qualifications?)\s*(?:\(.*\))?\s*:?\s*(.*)$/i },
  { type: "preferred", pattern: /^(preferred\s*skills?|nice\s*to\s*have|good\s*to\s*have|bonus|desired|optional)\s*(?:\(.*\))?\s*:?\s*(.*)$/i },
  { type: "eligibility", pattern: /^(eligibility\s*criteria?|who\s*you\s*are|who\s*we\s*are\s*looking\s*for)\s*:?\s*(.*)$/i },
  { type: "responsibilities", pattern: /^(responsibilities|key\s*responsibilities|duties|what\s*you.?ll\s*do|tasks?)\s*:?\s*(.*)$/i },
  { type: "benefits", pattern: /^(benefits?|perks?|we\s*offer|compensation)\s*:?\s*(.*)$/i },
];

const SKILL_LIST_FILLER =
  /^(basic\s+understanding\s+of|awareness\s+of|familiarity\s+with|knowledge\s+of|experience\s+with|proficiency\s+in|understanding\s+of|comfortable\s+with|interest\s+in|ability\s+to|strong\s+experience\s+in|hands[- ]on\s+experience\s+in|good\s+knowledge\s+of)\s+/i;

function classifyJDSectionLine(line: string): { type: "required" | "preferred" | "responsibilities" | "benefits" | "eligibility"; inlineContent: string } | null {
  for (const { type, pattern } of JD_SECTION_HEADERS) {
    const match = line.match(pattern);
    if (match) {
      return { type, inlineContent: (match[1] || "").trim() };
    }
  }
  return null;
}

function isJDMetadataLine(line: string): boolean {
  return JD_METADATA_LINE.test(line);
}

function parseSkillListLine(line: string, allowSoftSkills = true): string[] {
  const cleaned = line.replace(/^[-•*▪▸►◆]\s*/, "").replace(SKILL_LIST_FILLER, "").trim();
  if (!cleaned) return [];

  const found = new Set<string>();
  const addFrom = (text: string) => {
    for (const skill of extractSkillsFromLine(text, allowSoftSkills)) {
      found.add(skill);
    }
  };

  addFrom(cleaned);
  const parts = cleaned.split(/,|\band\b|\/|;|\|/i).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    addFrom(part.replace(SKILL_LIST_FILLER, "").trim());
  }

  return [...found];
}

export function parseJobDescription(jdText: string): StructuredJD {
  const lines = jdText.split("\n").map((l) => l.trim()).filter(Boolean);
  const lower = jdText.toLowerCase();

  let title = "";
  let company = "";
  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];
  let minYears: number | null = null;
  let maxYears: number | null = null;
  let requiredEducation: ParsedEducation["level"] | null = null;
  let location = "";
  let employmentType = "";
  let isRemote = false;
  const responsibilities: string[] = [];
  const benefits: string[] = [];
  const knockouts: { type: string; value: string }[] = [];

  // Title extraction (usually first non-empty line)
  if (lines.length > 0) title = lines[0].slice(0, 120);

  // Years of experience
  const yearsMatch = lower.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)?/i);
  if (yearsMatch) {
    minYears = parseInt(yearsMatch[1]);
    knockouts.push({ type: "min_experience_years", value: String(minYears) });
  }
  const yearsRange = lower.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)/i);
  if (yearsRange) {
    minYears = parseInt(yearsRange[1]);
    maxYears = parseInt(yearsRange[2]);
    knockouts.push({ type: "experience_range", value: `${minYears}-${maxYears}` });
  }

  // Education requirements
  for (const { pattern, level } of DEGREE_PATTERNS) {
    if (pattern.test(jdText)) {
      requiredEducation = level;
      knockouts.push({ type: "education_level", value: level });
      break;
    }
  }

  // Remote detection
  if (/\b(remote|work\s*from\s*home|wfh|hybrid|fully\s*remote)\b/i.test(jdText)) {
    isRemote = true;
  }

  // Employment type
  if (/\bfull[- ]?time\b/i.test(jdText)) employmentType = "full_time";
  else if (/\bpart[- ]?time\b/i.test(jdText)) employmentType = "part_time";
  else if (/\bcontract\b/i.test(jdText)) employmentType = "contract";
  else if (/\binternship\b/i.test(jdText) || /\bintern\s+(?:role|position|developer|engineer)\b/i.test(jdText)) {
    employmentType = "internship";
  }

  // Location
  const locationMatch = jdText.match(/(?:location|based\s*in|office)\s*:?\s*([^\n,]{3,50})/i);
  if (locationMatch) location = locationMatch[1].trim();

  // Skills extraction from JD
  let section: "none" | "required" | "preferred" | "responsibilities" | "benefits" | "eligibility" = "none";

  for (const line of lines) {
    const companyMatch = line.match(/^company\s*:\s*(.+)/i);
    if (companyMatch) {
      company = companyMatch[1].trim();
      continue;
    }

    if (isJDMetadataLine(line)) continue;

    const header = classifyJDSectionLine(line);
    if (header) {
      section = header.type === "eligibility" ? "required" : header.type;
      if (header.inlineContent) {
        const target = section === "preferred" ? preferredSkills : requiredSkills;
        target.push(...parseSkillListLine(header.inlineContent, section !== "preferred"));
      }
      continue;
    }

    const cleanLine = line.replace(/^[-•*▪▸►◆]\s*/, "").trim();
    if (cleanLine.length < 3) continue;

    if (company && cleanLine.toLowerCase().includes(company.toLowerCase()) && section === "none") {
      continue;
    }

    if (section === "required") {
      requiredSkills.push(...parseSkillListLine(cleanLine, true));
    } else if (section === "preferred") {
      preferredSkills.push(...parseSkillListLine(cleanLine, true));
    } else if (section === "responsibilities") {
      responsibilities.push(cleanLine);
    } else if (section === "benefits") {
      benefits.push(cleanLine);
    } else if (section === "none") {
      const techSkills = extractSkillsFromLine(cleanLine, false);
      if (techSkills.length > 0) {
        if (/must\s*have|required|mandatory|should\s*have|looking\s*for|experience\s*in|proficien|strong\s+experience/i.test(cleanLine)) {
          requiredSkills.push(...techSkills);
        } else if (/preferred|nice\s*to\s*have|bonus|good\s*to\s*have/i.test(cleanLine)) {
          preferredSkills.push(...techSkills);
        }
      }
    }
  }

  return {
    title, company, requiredSkills: enrichJDKeywords(jdText, [...new Set(requiredSkills)], title),
    preferredSkills: enrichJDPreferredKeywords([...new Set(preferredSkills)]),
    minYearsExperience: minYears, maxYearsExperience: maxYears,
    requiredEducation, location, employmentType, isRemote,
    responsibilities, benefits, knockouts,
  };
}

function extractSkillsFromLine(line: string, allowSoftSkills = true): string[] {
  const techPattern =
    /\b(python|java|javascript|typescript|react|angular|vue|node\.?js|next\.?js|express|django|flask|spring\s*boot|spring|ruby|rails|golang|rust|swift|kotlin|c\+\+|c#|\.net|php|laravel|scala|sql|mysql|postgresql|postgres|mongodb|redis|elasticsearch|kafka|docker|kubernetes|k8s|aws|azure|gcp|terraform|ansible|jenkins|git|github|gitlab|jira|confluence|figma|tableau|power\s*bi|pandas|numpy|tensorflow|pytorch|scikit-learn|keras|spark|hadoop|airflow|snowflake|databricks|graphql|rest\s*api|restful|microservices|ci\/cd|devops|linux|bash|html5?|css3?|sass|tailwind|bootstrap|webpack|vite|jest|cypress|selenium|agile|scrum|kanban|machine\s*learning|deep\s*learning|nlp|computer\s*vision|data\s*science|data\s*engineering|responsive\s*design|ui\/ux|frontend|front[- ]end)\b/gi;

  const businessPattern =
    /\b(business\s*development|inside\s*sales|outside\s*sales|sales|marketing|lead\s*generation|prospecting|cold\s*calling|pipeline\s*development|crm|salesforce|hubspot|zoho|account\s*management|client\s*acquisition|client\s*relations|customer\s*success|market\s*research|market\s*analysis|competitive\s*analysis|revenue\s*growth|quota|closing|negotiation|stakeholder\s*management|partnership|strategic\s*partnership|asset\s*sourcing|due\s*diligence|financial\s*modeling|financial\s*analysis|equity\s*research|valuation|bloomberg|pitch\s*deck|proposal|rfp|international|cross[- ]border|export|import|market\s*entry|go[- ]to[- ]market|product\s*launch|launch\s*planning|new\s*product\s*development|proactive\s*outreach|relationship\s*building|presenting|communication|excel|powerpoint|linkedin|social\s*media|content\s*marketing|content\s*creation|seo|sem|brand\s*management|digital\s*marketing|email\s*marketing|campaign\s*management|analytics|reporting|operations|project\s*management|consulting|strategy|strategic\s*planning|research|analysis|outreach|networking|onboarding|training|mentoring|leadership|teamwork|collaboration|patient\s*care|icu|hipaa|emr|ehr|bls|acls|litigation|legal\s*research|contract\s*drafting|compliance|regulatory|talent\s*acquisition|workday|payroll|test\s*automation|api\s*testing|selenium|wireframing|prototyping|user\s*research)\b/gi;

  const techMatches = (line.match(techPattern) || []).map((m) => normalizeTechToken(m));
  const bizMatches = allowSoftSkills
    ? (line.match(businessPattern) || []).map((m) => m.toLowerCase().trim().replace(/\s+/g, " "))
    : [];

  return [...techMatches, ...bizMatches].filter((s) => !JD_NOISE_WORDS.has(s) && (!allowSoftSkills ? !JD_SOFT_SKILL_WORDS.has(s) : true));
}

function normalizeTechToken(token: string): string {
  const lower = token.toLowerCase().trim().replace(/\s+/g, " ");
  if (lower === "html5" || lower === "html") return "html";
  if (lower === "css3" || lower === "css") return "css";
  if (lower === "front-end" || lower === "front end" || lower === "frontend") return "frontend";
  if (lower === "rest api" || lower === "restful") return "rest";
  return lower;
}

const JD_PHRASE_PATTERN = /\b(new product development|asset sourcing|proactive outreach|business development|launch planning|market research|market analysis|lead generation|cold calling|account management|client acquisition|stakeholder management|strategic partnership|go-to-market|go to market|product launch|pipeline development|relationship building|competitive analysis|financial modeling|due diligence|cross-border|cross border|inside sales|outside sales|social media marketing|content marketing|digital marketing|email marketing|project management|customer success|revenue growth)\b/gi;

function extractKeyPhrases(line: string): string[] {
  const phrases: string[] = [];
  const clean = line.replace(/^[-•*▪▸►◆]\s*/, "").trim();
  let match;
  const re = new RegExp(JD_PHRASE_PATTERN.source, "gi");
  while ((match = re.exec(clean)) !== null) {
    phrases.push(match[0].toLowerCase().replace(/\s+/g, " "));
  }
  return phrases;
}

function enrichJDKeywords(jdText: string, required: string[], title: string): string[] {
  const terms = new Set(required);

  if (title && title.length > 3 && title.length < 120) {
    for (const s of extractSkillsFromLine(title, false)) terms.add(s);
    for (const p of extractKeyPhrases(title)) terms.add(p);
  }

  if (terms.size < 4) {
    for (const line of jdText.split("\n")) {
      if (isJDMetadataLine(line.trim())) continue;
      for (const s of extractSkillsFromLine(line, false)) terms.add(s);
    }
  }

  return [...terms].filter((t) => t.length > 2 && !JD_NOISE_WORDS.has(t)).slice(0, 25);
}

function enrichJDPreferredKeywords(preferred: string[]): string[] {
  return preferred.filter((t) => t.length > 2 && !JD_NOISE_WORDS.has(t)).slice(0, 15);
}

// ─── Main Resume Parser ────────────────────────────────────────────────────────

export function parseResumeNER(resumeText: string): StructuredResumeNER {
  const lines = resumeText.split("\n").map((l) => l.trim());
  const contact: ParsedContact = { name: "", email: "", phone: "", linkedin: "", location: "", website: "" };
  const rawSections: { heading: string; content: string; type: string; lines: string[] }[] = [];

  let currentSection: { heading: string; type: string; lines: string[] } | null = null;
  let headerLines: string[] = [];
  let passedHeader = false;

  for (const line of lines) {
    if (!line) continue;

    // Detect section headers
    const sectionType = detectSection(line);
    if (sectionType) {
      passedHeader = true;
      if (currentSection) {
        rawSections.push({ ...currentSection, content: currentSection.lines.join("\n") });
      }
      currentSection = { heading: line, type: sectionType, lines: [] };
      continue;
    }

    if (!passedHeader) {
      headerLines.push(line);
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      headerLines.push(line);
    }
  }

  if (currentSection) {
    rawSections.push({ ...currentSection, content: currentSection.lines.join("\n") });
  }

  // Parse contact from header
  for (const hl of headerLines) {
    if (!contact.email) {
      const emailMatch = hl.match(/[\w.+-]+@[\w.-]+\.\w+/);
      if (emailMatch) { contact.email = emailMatch[0]; continue; }
    }
    if (!contact.phone) {
      const phoneMatch = hl.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch) { contact.phone = phoneMatch[0]; continue; }
    }
    if (!contact.linkedin && /linkedin/i.test(hl)) {
      contact.linkedin = hl.replace(/.*?(https?:\/\/)?/i, "https://").trim();
      continue;
    }
    if (!contact.website && /https?:\/\//i.test(hl) && !/linkedin/i.test(hl)) {
      contact.website = hl.match(/https?:\/\/[^\s]+/)?.[0] || "";
      continue;
    }
    if (!contact.name && hl.length > 2 && hl.length < 60 && !/[@|+\d{5}]/.test(hl)) {
      contact.name = hl;
    }
    // Location heuristic
    if (!contact.location && /\b(city|state|country|\w+,\s*\w{2,})\b/i.test(hl)) {
      contact.location = hl;
    }
  }

  // Parse each section type
  let employment: ParsedEmployment[] = [];
  let education: ParsedEducation[] = [];
  let skills: ParsedSkillEntry[] = [];

  for (const sec of rawSections) {
    if (sec.type === "experience") {
      employment = parseEmploymentSection(sec.lines);
    } else if (sec.type === "education") {
      education = parseEducationSection(sec.lines);
    } else if (sec.type === "skills") {
      skills = parseSkillsSection(sec.lines);
    }
  }

  // Infer skills from experience bullets
  const allBullets = employment.flatMap((e) => e.bullets);
  const inferredSkills = inferSkillsFromBullets(allBullets);
  const allSkills = [...skills, ...inferredSkills];

  // Calculate total experience
  let totalMonths = 0;
  for (const emp of employment) {
    totalMonths += emp.durationMonths;
  }
  // Fallback: estimate when roles exist but dates weren't parsed
  if (totalMonths === 0 && employment.length > 0) {
    totalMonths = employment.length * 24;
  }
  const totalYears = Math.round(totalMonths / 12 * 10) / 10;

  const seniorityLevel = inferSeniority(employment, totalYears);

  return {
    contact,
    employment,
    education,
    skills: allSkills,
    totalExperienceMonths: totalMonths,
    totalExperienceYears: totalYears,
    seniorityLevel,
    hasSummary: rawSections.some((s) => s.type === "summary"),
    hasProjects: rawSections.some((s) => s.type === "projects"),
    hasCertifications: rawSections.some((s) => s.type === "certifications"),
    rawSections: rawSections.map(({ heading, content }) => ({ heading, content })),
  };
}
