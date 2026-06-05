/**
 * Ensures ATS boost never corrupts resumes with JD metadata, phones, or "leveraging" suffixes.
 * Run: npx tsx scripts/test-ats-boost-safety.mjs
 */
import { applyAtsBoost, extractJDKeywordsSync } from "../web/lib/atsBoost.ts";
import { filterTailorKeywords, isValidTailorKeyword } from "../web/lib/tailorKeywords.ts";
import { structuredResumeToText } from "../web/lib/resumeParser.ts";

const kunalJd = `Paid Summer Internship - 3 months
Location: Work from home
Stipend: ₹15,000 for the complete internship period
Qualification: Minimum 10+2 pass
Share your updated CV on WhatsApp: +91 75328 61324

Responsibilities:
- Social media marketing and digital marketing
- Lead generation and content creation
- MS Excel and MS Word reporting

Requirements:
- Basic computer knowledge
- High-speed internet connection
- Laptop or desktop`;

const sourabhJd = `Automation Test Engineer
Industry Type: Industrial Equipment / Machinery
Department: Engineering - Software & QA
Employment Type: Full time, Permanent
Role Category: Quality Assurance and Testing
UG: Any Graduate  PG: Any Postgraduate

This position reports to: Digital Solution Engineering Manager
The work model for the role is: Hybrid
You will be mainly accountable for:
- UI test automation and reporting
- Selenium, Python, API testing`;

const sampleResume = {
  contact: {
    name: "Kunal Chetia",
    email: "kunal@example.com",
    phone: "+91 75328 61324",
    linkedin: "",
  },
  sections: [
    {
      id: "sum",
      type: "summary",
      heading: "Professional Summary",
      items: [{ id: "s1", text: "BBA graduate with internship experience in marketing and operations." }],
      order: 0,
    },
    {
      id: "exp",
      type: "experience",
      heading: "Internship Experience",
      items: [
        { id: "r1", text: "Assam Gas Company Limited (AGCL)", metadata: { role: "Intern" } },
        { id: "b1", text: "Assisted with outreach campaigns and stakeholder coordination." },
      ],
      order: 1,
    },
    {
      id: "skills",
      type: "skills",
      heading: "Skills",
      items: [{ id: "sk1", text: "MS Excel, MS Word" }],
      order: 2,
    },
    {
      id: "lang",
      type: "languages",
      heading: "Languages",
      items: [
        { id: "l1", text: "English" },
        { id: "l2", text: "Hindi" },
        { id: "l3", text: "Assamese" },
      ],
      order: 3,
    },
  ],
};

const BAD_PATTERNS = [
  /leveraging/i,
  /improving efficiency by 25%/i,
  /share your updated cv/i,
  /whatsapp/i,
  /stipend/i,
  /duration:\s*3 months/i,
  /this position reports to/i,
  /employment type/i,
  /role category/i,
  /\bug:\s*any graduate/i,
];

function assertNoCorruption(label, text) {
  for (const re of BAD_PATTERNS) {
    if (re.test(text)) {
      throw new Error(`${label}: output contains forbidden pattern ${re}`);
    }
  }
  const phoneHits = (text.match(/\+91\s*\d[\d\s]{6,}/g) || []).length;
  const headerPhone = sampleResume.contact.phone;
  const expectedPhones = (text.match(/\+91/g) || []).length;
  if (expectedPhones > 1) {
    throw new Error(`${label}: phone number repeated in body (${expectedPhones} hits)`);
  }
}

let passed = 0;

const rejected = [
  "share your updated cv on whatsapp",
  "+91 75328 61324",
  "location: work from home",
  "stipend: 15,000",
  "this position reports to:",
  "employment type: full time, permanent",
];
for (const kw of rejected) {
  if (isValidTailorKeyword(kw)) throw new Error(`should reject: ${kw}`);
}
passed++;

const kunalKw = extractJDKeywordsSync(kunalJd, "Marketing Intern");
if (kunalKw.some((k) => /whatsapp|75328|stipend|location:/i.test(k))) {
  throw new Error(`Kunal JD keywords leaked metadata: ${kunalKw.join(", ")}`);
}
passed++;

const sourabhKw = extractJDKeywordsSync(sourabhJd, "Automation Test Engineer");
if (sourabhKw.some((k) => /reports to|employment type|ug:/i.test(k))) {
  throw new Error(`Sourabh JD keywords leaked metadata: ${sourabhKw.join(", ")}`);
}
passed++;

const boostedKunal = applyAtsBoost(sampleResume, kunalJd, "Marketing Intern", [
  "share your updated cv on whatsapp",
  "+91 75328 61324",
  "digital marketing",
  "social media marketing",
]);
const kunalText = structuredResumeToText(boostedKunal);
assertNoCorruption("Kunal boost", kunalText);
if (!/digital marketing|social media/i.test(kunalText)) {
  throw new Error("Kunal boost should add valid marketing keywords to skills/summary");
}
passed++;

const boostedSourabh = applyAtsBoost(sampleResume, sourabhJd, "Automation Test Engineer", [
  "this position reports to:",
  "selenium",
  "test automation",
  "reporting",
]);
const sourabhText = structuredResumeToText(boostedSourabh);
assertNoCorruption("Sourabh boost", sourabhText);
passed++;

const filtered = filterTailorKeywords([
  "python",
  "share your updated cv on whatsapp",
  "selenium",
  "+91 75328 61324",
]);
if (filtered.join(",") !== "python,selenium") {
  throw new Error(`filterTailorKeywords wrong: ${filtered.join(", ")}`);
}
passed++;

console.log(`PASS: ats-boost-safety (${passed} checks)`);
