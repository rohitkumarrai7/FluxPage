#!/usr/bin/env node
/**
 * Smoke-test the /v1/drafts/create endpoint and verify
 * that aiSuggestions are generated for both SWE and marketing JDs.
 *
 * Usage: node scripts/test-draft-suggestions.mjs [convexBaseUrl]
 */

const API_BASE =
  process.argv[2] || "https://stoic-caiman-320.convex.site";

const CASES = [
  {
    id: "swe-resume",
    resumeText: `Alex Chen
alex.chen@email.com | +1 555-0100

PROFESSIONAL SUMMARY
Full-stack engineer with 5 years building React and Node.js applications on AWS.

EXPERIENCE
Software Engineer — FinTech Co (2021 – Present)
• Built REST APIs with Node.js and PostgreSQL serving 2M requests/day
• Led migration to Kubernetes on AWS EKS
• Improved CI/CD with GitHub Actions

SKILLS
JavaScript, TypeScript, React, Node.js, AWS, Docker, Kubernetes, PostgreSQL

EDUCATION
B.S. Computer Science — State University (2020)`,
    jobTitle: "Senior Software Engineer",
    company: "TechCorp",
    jobDescription: `Senior Software Engineer
Requirements: 5+ years experience, React, Node.js, AWS, Kubernetes, PostgreSQL, REST APIs, GraphQL, microservices, CI/CD`,
  },
  {
    id: "marketing-resume",
    resumeText: `Priya Sharma
priya@email.com

SUMMARY
Digital marketing manager with 7 years in B2B SaaS growth.

EXPERIENCE
Marketing Manager — SaaS Labs (2019 – Present)
• Grew MQL pipeline 140% via SEO and paid campaigns
• Managed $500K annual ad budget across Google and LinkedIn

SKILLS
SEO, Google Analytics, HubSpot, content strategy, A/B testing

EDUCATION
MBA Marketing — Delhi University (2018)`,
    jobTitle: "Digital Marketing Intern",
    company: "Internshala",
    jobDescription: `Digital Marketing Intern
Looking for candidates with social media marketing, Google Ads, email marketing, content writing skills. Bonus: Canva, Mailchimp, Instagram marketing.`,
  },
];

async function testDraftCreate(c) {
  const start = Date.now();
  const res = await fetch(`${API_BASE}/v1/drafts/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeText: c.resumeText,
      jobTitle: c.jobTitle,
      company: c.company,
      jobDescription: c.jobDescription,
      jobUrl: "https://example.com/test",
      source: "test-script",
      localScore: 0,
      localMatched: [],
      localMissing: [],
      localSuggestions: [],
    }),
  });
  const ms = Date.now() - start;
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { id: c.id, ok: false, ms, error: `HTTP ${res.status}: ${txt.slice(0, 200)}` };
  }
  const data = await res.json();
  return { id: c.id, ok: true, ms, draftId: data.draftId, editorUrl: data.editorUrl };
}

async function fetchDraft(draftId) {
  const res = await fetch(`${API_BASE}/v1/drafts/${draftId}`);
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  console.log("\n=== Draft Suggestion Test ===\n");
  console.log(`Convex API: ${API_BASE}\n`);

  let failed = 0;

  for (const c of CASES) {
    const result = await testDraftCreate(c);
    if (!result.ok) {
      failed++;
      console.log(`  [FAIL] ${result.id} — create failed: ${result.error}`);
      continue;
    }
    console.log(`  [OK]   ${result.id} — created in ${result.ms}ms — draftId=${result.draftId}`);

    const draft = await fetchDraft(result.draftId);
    if (!draft) {
      failed++;
      console.log(`  [FAIL] ${result.id} — could not fetch draft`);
      continue;
    }

    const suggestions = draft.context?.aiSuggestions || [];
    const gap = draft.context?.analysis?.gapAnalysis || draft.context?.gapAnalysis || {};
    const missing = gap.missingKeywords || [];
    const tag = suggestions.length > 0 ? "PASS" : "FAIL";
    if (tag === "FAIL") failed++;
    console.log(
      `  [${tag}] ${result.id} — ${suggestions.length} suggestions, ${missing.length} missing keywords`
    );
    if (suggestions.length > 0) {
      console.log(`         first: "${suggestions[0].suggestedText?.slice(0, 80)}"`);
    }
  }

  console.log(`\nSummary: ${failed} failed / ${CASES.length} cases\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
