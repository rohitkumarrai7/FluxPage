/**
 * Calibration test: Rohit resume vs Infrabyte frontend intern JD.
 * Run locally (engine): npx tsx scripts/ats-calibration-rohit.mjs --local
 * Run against API:       node scripts/ats-calibration-rohit.mjs
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://stoic-caiman-320.convex.site";

const ROHIT_RESUME = `
Rohit Kumar Rai
+91 70861 88997 — rohitkumarrai008@gmail.com — LinkedIn — GitHub — GitLab
Professional Summary
Results-driven Full Stack Developer with 1.5+ years building automation systems, SaaS platforms, and workflow orchestration tools. Strong experience in n8n, Python scripting, REST API integrations, Chrome Extensions (MV3), React.js and Node.js.
Technical Skills
Languages: Python, JavaScript (ES6+), SQL, C++, HTML5, CSS3
Frameworks & Libraries: React.js, Next.js, Node.js, Express.js, Tailwind CSS
Work Experience
Full Stack Developer Intern — Optymatch — Remote — Aug 2025– Present
• Developed streamlined onboarding workflows (React.js, Node.js) that reduced user drop-off by 15%.
Full Stack Developer Intern — Bridge Healthcare — Remote — Jun 2025– Aug 2025
• Refactored legacy services to modern architecture, reducing processing latency by 25%.
Education
Bachelor of Technology (B.Tech) - Artificial Intelligence & Data Science
Arya College of Engineering and IT, Jaipur — Aug 2023– May 2027
`;

const FRONTEND_INTERN_JD = `
Front End Developer Internship
Company: Infrabyte Consulting
Work Mode: Remote
Required Skills:
* Basic understanding of HTML, CSS, and JavaScript
* Awareness of responsive design concepts
Preferred Skills (Optional):
* Familiarity with Bootstrap, Tailwind CSS, or frontend frameworks
* Awareness of React or UI libraries
Responsibilities:
* Assist in developing responsive web pages and frontend components
* Support implementation-focused interface development tasks
`;

async function runViaApi() {
  const res = await fetch(`${API_BASE}/v1/ats/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText: ROHIT_RESUME, jobDescription: FRONTEND_INTERN_JD }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function runLocal() {
  const { scoreEnterpriseATS } = await import("../convex/atsEngine.ts");
  const result = scoreEnterpriseATS(ROHIT_RESUME, FRONTEND_INTERN_JD);
  return {
    score: result.overallScore,
    passedKnockouts: result.passedKnockouts,
    matchedKeywords: result.matchedKeywords,
    missingKeywords: result.missingKeywords,
    knockoutDetails: result.knockoutDetails,
    breakdown: result.breakdown,
  };
}

function evaluate(result) {
  const issues = [];
  if (result.score < 50 || result.score > 80) {
    issues.push(`score ${result.score} outside expected [50, 80]`);
  }
  if (!result.passedKnockouts) {
    issues.push("expected passedKnockouts=true");
  }
  const matched = (result.matchedKeywords || []).map((k) =>
    (typeof k === "string" ? k : k.keyword || "").toLowerCase()
  );
  for (const kw of ["html", "css", "javascript", "react", "tailwind"]) {
    if (!matched.some((m) => m.includes(kw))) {
      issues.push(`missing matched keyword: ${kw}`);
    }
  }
  return issues;
}

async function main() {
  const local = process.argv.includes("--local");
  console.log(`\n=== Rohit Frontend Intern Calibration (${local ? "local engine" : API_BASE}) ===\n`);

  const result = local ? await runLocal() : await runViaApi();
  const issues = evaluate(result);

  console.log(`Score: ${result.score}/100`);
  console.log(`Knockouts passed: ${result.passedKnockouts}`);
  console.log(
    `Matched: ${(result.matchedKeywords || []).slice(0, 12).map((k) => (typeof k === "string" ? k : k.keyword)).join(", ")}`
  );
  if (result.knockoutDetails?.failedFilters?.length) {
    console.log("Failed filters:");
    for (const f of result.knockoutDetails.failedFilters) {
      console.log(`  - [${f.severity}] ${f.message}`);
    }
  }

  if (issues.length) {
    console.log("\nFAIL:", issues.join("; "));
    process.exit(1);
  }
  console.log("\nPASS — calibration within expected range");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
