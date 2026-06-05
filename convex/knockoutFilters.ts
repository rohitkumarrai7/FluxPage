// ─── Knockout Filters (Hard Pass/Fail Logic) ───────────────────────────────────
// Enterprise ATS systems apply binary knockouts BEFORE ranking.
// If a candidate fails a knockout, they are auto-rejected regardless of score.

import type { StructuredResumeNER, StructuredJD, ParsedEducation } from "./nerParser";
import { expandSkillAliases, inferDominantDomain, resolveSkill, areSkillsRelated, normalizeSkillList, resumeSkillSatisfies } from "./skillsTaxonomy";

export interface KnockoutResult {
  passed: boolean;
  failedFilters: KnockoutFailure[];
  warnings: KnockoutWarning[];
  passedFilters: string[];
}

export interface KnockoutFailure {
  type: string;
  required: string;
  actual: string;
  severity: "hard" | "soft";
  message: string;
}

export interface KnockoutWarning {
  type: string;
  message: string;
}

// Education level hierarchy for comparison
const EDUCATION_RANK: Record<ParsedEducation["level"], number> = {
  high_school: 1,
  associate: 2,
  bachelor: 3,
  master: 4,
  doctorate: 5,
  certification: 2,
  unknown: 0,
};

// ─── Individual Knockout Checks ────────────────────────────────────────────────

function checkExperienceYears(
  resume: StructuredResumeNER,
  jd: StructuredJD
): KnockoutFailure | null {
  if (jd.minYearsExperience === null) return null;
  if (isInternshipRole(jd) && jd.minYearsExperience <= 1) return null;

  const candidateYears = resume.totalExperienceYears;
  const requiredYears = jd.minYearsExperience;

  // Allow 20% flexibility (industry standard: "5+ years" accepts ~4 years)
  const threshold = requiredYears * 0.8;

  if (candidateYears < threshold) {
    return {
      type: "experience_years",
      required: `${requiredYears}+ years`,
      actual: `${candidateYears} years`,
      severity: candidateYears < requiredYears * 0.5 ? "hard" : "soft",
      message: `JD requires ${requiredYears}+ years experience, candidate has ~${candidateYears} years`,
    };
  }

  return null;
}

function checkEducationLevel(
  resume: StructuredResumeNER,
  jd: StructuredJD
): KnockoutFailure | null {
  if (!jd.requiredEducation) return null;

  const requiredRank = EDUCATION_RANK[jd.requiredEducation];
  if (requiredRank === 0) return null;

  const candidateMaxRank = Math.max(
    0,
    ...resume.education.map((e) => EDUCATION_RANK[e.level])
  );

  if (candidateMaxRank < requiredRank) {
    return {
      type: "education_level",
      required: jd.requiredEducation,
      actual: resume.education[0]?.level || "not found",
      severity: "soft",
      message: `JD requires ${jd.requiredEducation} degree, candidate's highest is ${resume.education[0]?.level || "unknown"}`,
    };
  }

  return null;
}

function resumeHasSkill(
  skill: string,
  resumeSkillsLower: Set<string>,
  expandedResumeText: string,
  resume: StructuredResumeNER
): boolean {
  const skillLower = skill.toLowerCase();
  if (resumeSkillsLower.has(skillLower) || expandedResumeText.includes(skillLower)) {
    return true;
  }

  const resolved = resolveSkill(skill);
  if (!resolved) return false;

  const candidates = [resolved.name.toLowerCase(), ...resolved.aliases.map((a) => a.toLowerCase())];
  for (const term of candidates) {
    if (resumeSkillsLower.has(term)) return true;
    const re = new RegExp(`(?<![a-z0-9#+])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i");
    if (re.test(expandedResumeText)) return true;
  }

  // Parent/child and related skill match (React → JavaScript, Tailwind → CSS)
  for (const rSkill of resume.skills.map((s) => s.skill)) {
    if (resumeSkillSatisfies(skill, rSkill)) return true;
  }
  for (const rSkill of resumeSkillsLower) {
    const { related, similarity } = areSkillsRelated(skill, rSkill);
    if (related && similarity >= 0.3) return true;
  }

  return false;
}

function getResolvableCriticalSkills(jd: StructuredJD): string[] {
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const skill of jd.requiredSkills) {
    if (!resolveSkill(skill)) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push(skill);
    if (skills.length >= 8) break;
  }
  return skills;
}

function isInternshipRole(jd: StructuredJD): boolean {
  return jd.employmentType === "internship" || /\bintern(?:ship)?\b/i.test(jd.title);
}

function checkCriticalSkills(
  resume: StructuredResumeNER,
  jd: StructuredJD
): KnockoutFailure[] {
  const failures: KnockoutFailure[] = [];
  const resumeSkillsLower = new Set(
    resume.skills.map((s) => s.skill.toLowerCase())
  );

  const allResumeText = [
    ...resume.employment.flatMap((e) => [e.title, e.company, ...e.bullets]),
    ...resume.skills.map((s) => s.skill),
  ].join(" ");
  const expandedResumeText = expandSkillAliases(allResumeText).toLowerCase();

  const criticalSkills = getResolvableCriticalSkills(jd);
  if (criticalSkills.length === 0) return [];

  let missingCount = 0;

  for (const skill of criticalSkills) {
    if (!resumeHasSkill(skill, resumeSkillsLower, expandedResumeText, resume)) {
      missingCount++;
      failures.push({
        type: "critical_skill_missing",
        required: skill,
        actual: "not found",
        severity: "soft",
        message: `Required skill "${skill}" not found in resume`,
      });
    }
  }

  const internRole = isInternshipRole(jd);
  const hardThreshold = internRole
    ? Math.max(4, Math.ceil(criticalSkills.length * 0.75))
    : Math.max(3, Math.ceil(criticalSkills.length * 0.6));

  if (missingCount >= hardThreshold) {
    for (const f of failures) {
      if (f.type === "critical_skill_missing") f.severity = "hard";
    }
  }

  return failures;
}

function checkSeniorityMismatch(
  resume: StructuredResumeNER,
  jd: StructuredJD
): KnockoutWarning | null {
  const titleLower = jd.title.toLowerCase();
  let jdSeniority: "intern" | "junior" | "mid" | "senior" | "staff" | "director" | null = null;

  if (/\bintern\b/i.test(titleLower)) jdSeniority = "intern";
  else if (/\bjunior\b|\bentry\b|\bassociate\b/i.test(titleLower)) jdSeniority = "junior";
  else if (/\bsenior\b|\blead\b|\bsr\b/i.test(titleLower)) jdSeniority = "senior";
  else if (/\bstaff\b|\bprincipal\b/i.test(titleLower)) jdSeniority = "staff";
  else if (/\bdirector\b|\bvp\b|\bhead\b/i.test(titleLower)) jdSeniority = "director";

  if (!jdSeniority) return null;

  const SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "staff", "director"];
  const jdIdx = SENIORITY_ORDER.indexOf(jdSeniority);
  const resumeIdx = SENIORITY_ORDER.indexOf(resume.seniorityLevel);

  if (resumeIdx >= 0 && jdIdx >= 0) {
    if (resumeIdx - jdIdx >= 2) {
      return {
        type: "overqualified",
        message: `Candidate appears significantly overqualified (${resume.seniorityLevel} level for ${jdSeniority} role)`,
      };
    }
    if (jdIdx - resumeIdx >= 2) {
      return {
        type: "underqualified",
        message: `Candidate may be underqualified (${resume.seniorityLevel} level for ${jdSeniority} role)`,
      };
    }
  }

  return null;
}

const COMPATIBLE_DOMAINS: Record<string, Set<string>> = {
  engineering: new Set(["engineering", "infrastructure", "data_science", "data", "design", "management"]),
  infrastructure: new Set(["engineering", "infrastructure", "data_science", "data"]),
  data_science: new Set(["engineering", "data_science", "data", "analytics", "infrastructure"]),
  data: new Set(["engineering", "data_science", "data", "infrastructure", "analytics"]),
  analytics: new Set(["data_science", "data", "analytics", "finance", "engineering"]),
  design: new Set(["engineering", "design"]),
  management: new Set(["engineering", "management", "finance"]),
  finance: new Set(["finance", "analytics", "management"]),
  healthcare: new Set(["healthcare"]),
  culinary: new Set(["culinary"]),
};

function domainsAreCompatible(jdDomain: string, resumeDomain: string): boolean {
  if (jdDomain === resumeDomain) return true;
  return COMPATIBLE_DOMAINS[jdDomain]?.has(resumeDomain)
    || COMPATIBLE_DOMAINS[resumeDomain]?.has(jdDomain)
    || false;
}

function checkDomainMismatch(
  resume: StructuredResumeNER,
  jd: StructuredJD
): KnockoutFailure | null {
  const jdText = [jd.title, ...jd.requiredSkills, ...jd.responsibilities].join(" ");
  const resumeText = [
    resume.contact.name,
    ...resume.employment.map((e) => `${e.title} ${e.company} ${e.bullets.join(" ")}`),
    ...resume.skills.map((s) => s.skill),
  ].join(" ");

  const jdDomain = inferDominantDomain(jdText, jd.requiredSkills);
  const resumeDomain = inferDominantDomain(resumeText, resume.skills.map((s) => s.skill));

  if (!jdDomain || !resumeDomain || jdDomain === resumeDomain) return null;
  if (domainsAreCompatible(jdDomain, resumeDomain)) return null;

  // Skip domain knockout when resume already shares taxonomy skills with the JD
  const resumeResolved = normalizeSkillList(resume.skills.map((s) => s.skill)).resolved;
  const jdResolved = normalizeSkillList(jd.requiredSkills).resolved;
  const resumeIds = new Set(resumeResolved.map((s) => s.id));
  const sharedSkills = jdResolved.filter((s) => resumeIds.has(s.id)).length;
  if (sharedSkills >= 1) return null;

  return {
    type: "domain_mismatch",
    required: jdDomain,
    actual: resumeDomain,
    severity: "hard",
    message: `Role domain (${jdDomain}) does not match candidate background (${resumeDomain})`,
  };
}

// ─── Main Knockout Engine ──────────────────────────────────────────────────────

export function applyKnockoutFilters(
  resume: StructuredResumeNER,
  jd: StructuredJD
): KnockoutResult {
  const failedFilters: KnockoutFailure[] = [];
  const warnings: KnockoutWarning[] = [];
  const passedFilters: string[] = [];

  // Check experience years
  const expResult = checkExperienceYears(resume, jd);
  if (expResult) {
    failedFilters.push(expResult);
  } else if (jd.minYearsExperience !== null) {
    passedFilters.push(`Experience: ${resume.totalExperienceYears}y >= ${jd.minYearsExperience}y required`);
  }

  // Check education level
  const eduResult = checkEducationLevel(resume, jd);
  if (eduResult) {
    failedFilters.push(eduResult);
  } else if (jd.requiredEducation) {
    passedFilters.push(`Education: meets ${jd.requiredEducation} requirement`);
  }

  // Check critical skills
  const skillResults = checkCriticalSkills(resume, jd);
  failedFilters.push(...skillResults);
  const criticalPool = getResolvableCriticalSkills(jd);
  const criticalSkillsPassed = criticalPool.length - skillResults.length;
  if (criticalPool.length > 0 && criticalSkillsPassed > 0) {
    passedFilters.push(`Key skills: ${criticalSkillsPassed}/${criticalPool.length} present`);
  }

  // Domain mismatch (chef vs SWE, nurse vs finance, etc.)
  const domainResult = checkDomainMismatch(resume, jd);
  if (domainResult) {
    failedFilters.push(domainResult);
  } else if (jd.requiredSkills.length > 0) {
    passedFilters.push("Domain alignment: resume matches role field");
  }

  // Check seniority mismatch (warning only)
  const seniorityWarn = checkSeniorityMismatch(resume, jd);
  if (seniorityWarn) {
    warnings.push(seniorityWarn);
  }

  // Hard knockout if any hard-severity filter failed
  const hardFails = failedFilters.filter((f) => f.severity === "hard");
  const passed = hardFails.length === 0;

  return { passed, failedFilters, warnings, passedFilters };
}
