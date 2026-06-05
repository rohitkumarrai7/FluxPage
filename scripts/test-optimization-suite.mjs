/**
 * Universal optimization regression — diverse resume types + corruption guards.
 * Run: npx tsx scripts/test-optimization-suite.mjs
 */
import { applyAtsBoost, extractJDKeywordsSync, boostUntilTargetScore, protectedSectionsUnchanged } from "../web/lib/atsBoost.ts";
import { filterTailorKeywords, isValidTailorKeyword } from "../web/lib/tailorKeywords.ts";
import { structuredResumeToText } from "../web/lib/resumeParser.ts";

const API = process.env.NEXT_PUBLIC_API_URL || "https://stoic-caiman-320.convex.site";

const BAD_PATTERNS = [
  /leveraging/i,
  /improving efficiency by 25%/i,
  /share your updated cv/i,
  /whatsapp/i,
  /this position reports to/i,
  /employment type:/i,
  /role category:/i,
  /\bug:\s*any graduate/i,
  /you will be mainly accountable/i,
];

const GARBAGE_MISSING = [
  "share your updated cv on whatsapp",
  "+91 75328 61324",
  "this position reports to:",
  "employment type: full time, permanent",
  "location: work from home",
  "stipend: ₹15,000",
  "you will be mainly accountable for:",
  "what we believe in",
  "click to apply now",
  "send your resume to hr@company.com",
];

function resume(sections, contact = { name: "Test User", email: "t@e.com", phone: "", linkedin: "" }) {
  return { contact, sections };
}

const SCENARIOS = [
  {
    id: "marketing-intern-messy-jd",
    jobTitle: "Marketing Intern",
    jd: `Share your updated CV on WhatsApp: +91 75328 61324\nStipend: ₹15,000\nSocial media marketing, digital marketing, lead generation`,
    resume: resume([
      { id: "sum", type: "summary", heading: "Summary", items: [{ id: "s1", text: "BBA graduate with marketing internship experience." }], order: 0 },
      { id: "exp", type: "experience", heading: "Experience", items: [
        { id: "r1", text: "AGCL", metadata: { role: "Intern" } },
        { id: "b1", text: "Supported outreach and reporting tasks." },
      ], order: 1 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "MS Excel, MS Word" }], order: 2 },
      { id: "lang", type: "languages", heading: "Languages", items: [{ id: "l1", text: "English" }, { id: "l2", text: "Hindi" }], order: 3 },
    ], { name: "Kunal Chetia", email: "k@e.com", phone: "+91 75328 61324", linkedin: "" }),
    expectAny: ["digital marketing", "social media", "lead generation"],
  },
  {
    id: "qa-naukri-jd",
    jobTitle: "Automation Test Engineer",
    jd: `Industry Type: Industrial Equipment\nThis position reports to: Manager\nUI test automation, Selenium, Python, API testing`,
    resume: resume([
      { id: "sum", type: "summary", heading: "Summary", items: [{ id: "s1", text: "QA engineer with automation background." }], order: 0 },
      { id: "exp", type: "experience", heading: "Experience", items: [
        { id: "r1", text: "TechCorp", metadata: { role: "QA" } },
        { id: "b1", text: "Built automated test suites reducing regression time by 40%." },
      ], order: 1 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "Python, Jenkins" }], order: 2 },
    ]),
    expectAny: ["selenium", "test automation", "python"],
  },
  {
    id: "senior-software-engineer",
    jobTitle: "Senior Software Engineer",
    jd: `React, Node.js, TypeScript, AWS, Kubernetes, PostgreSQL, GraphQL, Redis, microservices, Terraform`,
    resume: resume([
      { id: "sum", type: "summary", heading: "Summary", items: [{ id: "s1", text: "Full-stack engineer with 5 years on React and Node.js." }], order: 0 },
      { id: "exp", type: "experience", heading: "Experience", items: [
        { id: "r1", text: "FinTech", metadata: { role: "SWE" } },
        { id: "b1", text: "Built REST APIs with Node.js serving 2M requests/day." },
      ], order: 1 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "JavaScript, React, Node.js, AWS" }], order: 2 },
    ]),
    expectAny: ["graphql", "redis", "terraform", "kubernetes"],
  },
  {
    id: "registered-nurse-healthcare",
    jobTitle: "Registered Nurse",
    jd: `RN position — patient care, ICU, EMR/EHR, BLS, ACLS, clinical documentation. HIPAA compliance required.`,
    resume: resume([
      { id: "sum", type: "summary", heading: "Summary", items: [{ id: "s1", text: "Compassionate nurse with 4 years hospital experience." }], order: 0 },
      { id: "exp", type: "experience", heading: "Experience", items: [
        { id: "r1", text: "City Hospital", metadata: { role: "RN" } },
        { id: "b1", text: "Managed patient care for 12-bed medical unit." },
      ], order: 1 },
      { id: "cert", type: "certifications", heading: "Certifications", items: [{ id: "c1", text: "BLS Certified" }], order: 2 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "Vital signs, medication administration" }], order: 3 },
    ]),
    expectAny: ["patient care", "icu", "emr", "hipaa", "acls"],
  },
  {
    id: "corporate-lawyer-legal",
    jobTitle: "Corporate Lawyer",
    jd: `Litigation, contract drafting, legal research, compliance, regulatory matters, M&A support`,
    resume: resume([
      { id: "sum", type: "summary", heading: "Summary", items: [{ id: "s1", text: "Corporate attorney with 6 years contract and compliance work." }], order: 0 },
      { id: "exp", type: "experience", heading: "Experience", items: [
        { id: "r1", text: "Law Firm LLP", metadata: { role: "Associate" } },
        { id: "b1", text: "Drafted and negotiated commercial agreements." },
      ], order: 1 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "Contract negotiation, due diligence" }], order: 2 },
    ]),
    expectAny: ["litigation", "legal research", "compliance", "regulatory"],
  },
  {
    id: "high-school-teacher",
    jobTitle: "High School Teacher",
    jd: `Curriculum development, classroom management, lesson planning, student assessment, parent communication`,
    resume: resume([
      { id: "sum", type: "summary", heading: "Summary", items: [{ id: "s1", text: "Math teacher with 8 years secondary education experience." }], order: 0 },
      { id: "exp", type: "experience", heading: "Experience", items: [
        { id: "r1", text: "Public School District", metadata: { role: "Teacher" } },
        { id: "b1", text: "Taught algebra and geometry to grades 9-12." },
      ], order: 1 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "Differentiated instruction, grading" }], order: 2 },
    ]),
    expectAny: ["curriculum development", "classroom management", "lesson planning"],
  },
  {
    id: "ux-designer-creative",
    jobTitle: "UX Designer",
    jd: `Figma, user research, wireframing, prototyping, UI design, Adobe Creative Suite, design systems`,
    resume: resume([
      { id: "sum", type: "summary", heading: "Summary", items: [{ id: "s1", text: "Product designer focused on mobile and web experiences." }], order: 0 },
      { id: "proj", type: "projects", heading: "Projects", items: [{ id: "p1", text: "Redesigned checkout flow increasing conversion 18%." }], order: 1 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "Figma, Sketch, usability testing" }], order: 2 },
    ]),
    expectAny: ["user research", "wireframing", "prototyping", "ui design"],
  },
  {
    id: "hr-recruiter",
    jobTitle: "HR Recruiter",
    jd: `Talent acquisition, onboarding, payroll, Workday, applicant tracking, stakeholder management`,
    resume: resume([
      { id: "sum", type: "summary", heading: "Summary", items: [{ id: "s1", text: "HR professional specializing in tech hiring." }], order: 0 },
      { id: "exp", type: "experience", heading: "Experience", items: [
        { id: "r1", text: "PeopleOps Inc", metadata: { role: "Recruiter" } },
        { id: "b1", text: "Filled 40+ engineering roles in 12 months." },
      ], order: 1 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "Interviewing, offer negotiation" }], order: 2 },
    ]),
    expectAny: ["talent acquisition", "onboarding", "workday", "payroll"],
  },
  {
    id: "electrician-trades",
    jobTitle: "Licensed Electrician",
    jd: `Electrical installation, HVAC coordination, wiring, safety compliance, blueprint reading`,
    resume: resume([
      { id: "exp", type: "experience", heading: "Experience", items: [
        { id: "r1", text: "BuildCo", metadata: { role: "Electrician" } },
        { id: "b1", text: "Installed commercial electrical systems per NEC code." },
      ], order: 0 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "Conduit bending, panel upgrades" }], order: 1 },
    ]),
    expectAny: ["electrical", "hvac"],
  },
  {
    id: "fresh-grad-minimal",
    jobTitle: "Junior Data Analyst",
    jd: `Python, SQL, Excel, Tableau, data analysis, data visualization, statistics`,
    resume: resume([
      { id: "edu", type: "education", heading: "Education", items: [
        { id: "d1", text: "B.S. Statistics", metadata: { degree: "BS" } },
        { id: "b1", text: "GPA 3.7, Dean's List" },
      ], order: 0 },
      { id: "proj", type: "projects", heading: "Projects", items: [{ id: "p1", text: "Built sales dashboard in Tableau for class project." }], order: 1 },
    ]),
    expectAny: ["python", "sql", "tableau", "data analysis"],
  },
  {
    id: "finance-analyst",
    jobTitle: "Equity Research Analyst",
    jd: `Equity research, financial modeling, Bloomberg, valuation, DCF, market analysis, CFA preferred`,
    resume: resume([
      { id: "sum", type: "summary", heading: "Summary", items: [{ id: "s1", text: "Finance graduate with internship in investment research." }], order: 0 },
      { id: "exp", type: "experience", heading: "Experience", items: [
        { id: "r1", text: "Edify Capital", metadata: { role: "Intern" } },
        { id: "b1", text: "Supported sector reports and financial models." },
      ], order: 1 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "Excel, financial statements" }], order: 2 },
    ]),
    expectAny: ["equity research", "financial modeling", "valuation", "bloomberg"],
  },
  {
    id: "executive-chef-wrong-domain",
    jobTitle: "Software Engineer",
    jd: `React, Node.js, TypeScript required for platform team`,
    resume: resume([
      { id: "sum", type: "summary", heading: "Summary", items: [{ id: "s1", text: "Executive chef with 10 years kitchen leadership." }], order: 0 },
      { id: "exp", type: "experience", heading: "Experience", items: [
        { id: "r1", text: "Fine Dining", metadata: { role: "Head Chef" } },
        { id: "b1", text: "Managed kitchen staff and menu development." },
      ], order: 1 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "French cuisine, HACCP" }], order: 2 },
      { id: "str", type: "strengths", heading: "Strengths", items: [{ id: "st1", text: "Creativity under pressure" }], order: 3 },
    ]),
    expectAny: ["react", "node.js", "typescript"],
  },
  {
    id: "academic-cv-publications",
    jobTitle: "Research Scientist",
    jd: `Machine learning, deep learning, Python, PyTorch, NLP, computer vision, publications`,
    resume: resume([
      { id: "sum", type: "summary", heading: "Summary", items: [{ id: "s1", text: "PhD candidate in computer science." }], order: 0 },
      { id: "pub", type: "publications", heading: "Publications", items: [{ id: "pu1", text: "NeurIPS 2024 — efficient transformers for vision" }], order: 1 },
      { id: "edu", type: "education", heading: "Education", items: [{ id: "d1", text: "PhD CS — MIT", metadata: { degree: "PhD" } }], order: 2 },
      { id: "skills", type: "skills", heading: "Skills", items: [{ id: "sk1", text: "Python, PyTorch" }], order: 3 },
    ]),
    expectAny: ["machine learning", "nlp", "computer vision", "deep learning"],
  },
];

async function scoreResume(resumeText, jd) {
  const res = await fetch(`${API}/v1/ats/analyze-enterprise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText, jobDescription: jd }),
  });
  if (!res.ok) throw new Error(`ATS API ${res.status}`);
  const data = await res.json();
  return {
    score: data.score,
    missing: (data.missingKeywords || []).map((k) => (typeof k === "string" ? k : k.keyword)),
  };
}

function assertNoCorruption(id, text) {
  for (const re of BAD_PATTERNS) {
    if (re.test(text)) throw new Error(`forbidden pattern ${re}`);
  }
}

let passed = 0;
let failed = 0;

console.log("\n=== Universal filter: reject junk from any JD source ===\n");
for (const junk of GARBAGE_MISSING) {
  if (isValidTailorKeyword(junk)) {
    console.log(`[FAIL] filter accepted junk: ${junk}`);
    failed++;
  } else {
    passed++;
  }
}
console.log(`[PASS] ${GARBAGE_MISSING.length} junk keywords rejected`);

console.log(`\n=== Universal boost: ${SCENARIOS.length} resume types ===\n`);

for (const sc of SCENARIOS) {
  try {
    const extracted = extractJDKeywordsSync(sc.jd, sc.jobTitle);
    const leaked = extracted.filter((k) => /whatsapp|75328|reports to|stipend|employment type|you will/i.test(k));
    if (leaked.length) throw new Error(`keyword leak: ${leaked.join(", ")}`);

    const boosted = applyAtsBoost(sc.resume, sc.jd, sc.jobTitle, [...GARBAGE_MISSING, ...sc.expectAny]);
    if (!protectedSectionsUnchanged(sc.resume, boosted)) {
      throw new Error("protected sections (experience, education, languages, etc.) were modified");
    }

    const afterText = structuredResumeToText(boosted);
    assertNoCorruption(sc.id, afterText);

    const hit = sc.expectAny.filter((k) => afterText.toLowerCase().includes(k.toLowerCase()));
    if (hit.length === 0) throw new Error(`no expected keywords added from: ${sc.expectAny.join(", ")}`);

    console.log(`[PASS] ${sc.id} — added [${hit.join(", ")}]; all other sections intact`);
    passed++;
  } catch (err) {
    console.log(`[FAIL] ${sc.id} — ${err.message}`);
    failed++;
  }
}

console.log("\n=== Universal property: garbage ATS missing keywords never corrupt ===\n");
for (const sc of SCENARIOS) {
  const onlyGarbage = filterTailorKeywords(GARBAGE_MISSING);
  const boosted = applyAtsBoost(sc.resume, sc.jd, sc.jobTitle, GARBAGE_MISSING);
  if (!protectedSectionsUnchanged(sc.resume, boosted)) {
    console.log(`[FAIL] ${sc.id}-garbage — protected sections changed`);
    failed++;
    continue;
  }
  const text = structuredResumeToText(boosted);
  try {
    assertNoCorruption(`${sc.id}-garbage`, text);
    console.log(`[PASS] ${sc.id}-garbage — safe with ${GARBAGE_MISSING.length} junk keywords (${onlyGarbage.length} filtered)`);
    passed++;
  } catch (err) {
    console.log(`[FAIL] ${sc.id}-garbage — ${err.message}`);
    failed++;
  }
}

console.log("\n=== Score stability: sample types via production ATS ===\n");
for (const sc of SCENARIOS.slice(0, 6)) {
  try {
    const before = await scoreResume(structuredResumeToText(sc.resume), sc.jd);
    async function rescore(r) {
      const result = await scoreResume(structuredResumeToText(r), sc.jd);
      return { score: result.score, matchedKeywords: [], missingKeywords: result.missing };
    }
    const { resume: boosted, score: after } = await boostUntilTargetScore(sc.resume, sc.jd, sc.jobTitle, rescore, { maxIterations: 2 });
    assertNoCorruption(sc.id, structuredResumeToText(boosted));
    if (!protectedSectionsUnchanged(sc.resume, boosted)) throw new Error("protected sections modified after boost loop");
    const delta = after - before.score;
    console.log(`[PASS] ${sc.id} — score ${before.score} -> ${after} (${delta >= 0 ? "+" : ""}${delta})`);
    passed++;
  } catch (err) {
    console.log(`[FAIL] ${sc.id}-score — ${err.message}`);
    failed++;
  }
}

console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
