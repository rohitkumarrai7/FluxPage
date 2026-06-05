/**
 * Pre-rehost smoke test — extension + web + ATS engine on production Convex.
 * Run: node scripts/pre-rehost-smoke.mjs
 */

const API = process.env.NEXT_PUBLIC_API_URL || "https://stoic-caiman-320.convex.site";

const SWE_RESUME = `
Jane Engineer | jane@email.com
Senior Software Engineer

EXPERIENCE
Senior Software Engineer — TechCorp (2020 – Present)
• Led microservices on AWS using Java, Python, Kubernetes, React, Node.js
• Built REST APIs and GraphQL; CI/CD with GitHub Actions

SKILLS
JavaScript, TypeScript, React, Node.js, Java, Python, AWS, Docker, Kubernetes, PostgreSQL, microservices

EDUCATION
B.S. Computer Science — MIT (2018)
`;

const SWE_JD = `
Senior Software Engineer
Requirements:
• 5+ years experience
• Java, Python, Kubernetes, microservices, React
• Bachelor's in Computer Science
`;

const CHEF_RESUME = `
Robert Chef | chef@email.com
Executive Chef
EXPERIENCE
Head Chef — Restaurant (2015 – Present)
• Menu planning, French cuisine, kitchen management, HACCP
SKILLS
Culinary arts, menu development, kitchen management
`;

const results = [];
let failed = 0;

async function fetchJson(path, body, method = "POST") {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 200) }; }
  return { status: res.status, data };
}

function pass(id, msg) {
  results.push({ id, ok: true, msg });
  console.log(`[PASS] ${id}: ${msg}`);
}

function fail(id, msg) {
  failed++;
  results.push({ id, ok: false, msg });
  console.log(`[FAIL] ${id}: ${msg}`);
}

async function testAtsEndpoint(path) {
  const { status, data } = await fetchJson(path, {
    resumeText: SWE_RESUME,
    jobDescription: SWE_JD,
  });
  if (status !== 200) return fail(path, `HTTP ${status}`);
  if (typeof data.score !== "number") return fail(path, "missing score");
  if (!data.breakdown?.keywordMatch) return fail(path, "missing enterprise breakdown");
  if (data.passedKnockouts !== true) return fail(path, `expected knockouts pass, got ${data.passedKnockouts}`);
  if (!data.parsedResume?.totalExperienceYears) return fail(path, "missing parsedResume");
  if (!Array.isArray(data.knockoutDetails?.failedFilters)) return fail(path, "missing knockoutDetails");
  pass(path, `score=${data.score}, kw=${data.breakdown.keywordMatch}, tax=${data.breakdown.taxonomyMatch}`);
  return data;
}

async function main() {
  console.log("\n=== Pre-Rehost Smoke Test ===");
  console.log(`API: ${API}\n`);

  // 1. ATS endpoints
  const analyze = await testAtsEndpoint("/v1/ats/analyze");
  const enterprise = await testAtsEndpoint("/v1/ats/analyze-enterprise");

  if (analyze && enterprise && analyze.score === enterprise.score) {
    pass("endpoint-parity", `both endpoints score=${analyze.score}`);
  } else {
    fail("endpoint-parity", "analyze vs analyze-enterprise mismatch");
  }

  // 2. Domain knockout
  const { status: koStatus, data: koData } = await fetchJson("/v1/ats/analyze", {
    resumeText: CHEF_RESUME,
    jobDescription: SWE_JD,
  });
  if (koStatus === 200 && koData.passedKnockouts === false && koData.score <= 15) {
    const hasDomain = koData.knockoutDetails?.failedFilters?.some((f) => f.type === "domain_mismatch");
    pass("domain-knockout", hasDomain ? `score=${koData.score}, domain hard-fail` : `score=${koData.score}, knockouts fail`);
  } else {
    fail("domain-knockout", `expected fail, score=${koData?.score}, knockouts=${koData?.passedKnockouts}`);
  }

  // 3. Abbreviation handling (structured resume like real uploads)
  const abbrevResume = `
Alex Dev
Software Developer

EXPERIENCE
Developer at SaaS Co (2019 – Present)
• Built SPAs with JS/TS, React, and Node
• Deployed on k8s with Docker; used AWS S3 and RDS
• CI via GH Actions

SKILLS
JS, TS, React, Node, k8s, Docker, AWS, PostgreSQL, REST APIs
`;
  const naukriJd = `
Full Stack Developer
Experience: 3-6 Years
React.js, Node.js, MongoDB, Express.js, REST API development, Git, Agile methodology, AWS
BE/BTech Computer Science required.
`;
  const { data: abbrev } = await fetchJson("/v1/ats/analyze", {
    resumeText: abbrevResume,
    jobDescription: naukriJd,
  });
  if (abbrev?.score >= 60 && abbrev?.passedKnockouts === true) {
    pass("abbrev-engine", `score=${abbrev.score}, kw=${abbrev.breakdown?.keywordMatch}`);
  } else {
    fail("abbrev-engine", `score=${abbrev?.score}, knockouts=${abbrev?.passedKnockouts}`);
  }

  // 4. Public endpoints (no auth)
  const templates = await fetch(`${API}/v1/templates`, { method: "GET" });
  if (templates.status === 200 || templates.status === 401) {
    pass("/v1/templates", `HTTP ${templates.status}`);
  } else {
    fail("/v1/templates", `HTTP ${templates.status}`);
  }

  // 5. Engine module structure
  const fs = await import("fs");
  const path = await import("path");
  const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
  const engineFiles = [
    "convex/atsEngine.ts",
    "convex/atsScoring.ts",
    "convex/nerParser.ts",
    "convex/skillsTaxonomy.ts",
    "convex/semanticEngine.ts",
    "convex/knockoutFilters.ts",
    "convex/http.ts",
  ];
  for (const f of engineFiles) {
    const p = path.join(root, "..", f);
    if (fs.existsSync(p)) pass(`file:${f}`, "exists");
    else fail(`file:${f}`, "missing");
  }

  // 6. Extension + web wiring
  const extConfig = fs.readFileSync(path.join(root, "..", "extension/config.generated.js"), "utf8");
  if (extConfig.includes("stoic-caiman-320.convex.site")) {
    pass("extension-config", "points to production Convex");
  } else {
    fail("extension-config", "wrong API base");
  }

  const webConvex = fs.readFileSync(path.join(root, "..", "web/lib/convexDeployment.ts"), "utf8");
  if (webConvex.includes("stoic-caiman-320")) {
    pass("web-config", "points to production Convex");
  } else {
    fail("web-config", "wrong Convex URL");
  }

  if (fs.readFileSync(path.join(root, "..", "extension/background.js"), "utf8").includes("passedKnockouts")) {
    pass("extension-ats", "maps enterprise knockout fields");
  } else {
    fail("extension-ats", "missing knockout mapping");
  }

  if (fs.readFileSync(path.join(root, "..", "web/lib/api.ts"), "utf8").includes("analyzeEnterprise")) {
    pass("web-ats", "uses analyzeEnterprise endpoint");
  } else {
    fail("web-ats", "missing analyzeEnterprise");
  }

  const atsBoostSrc = fs.readFileSync(path.join(root, "..", "web/lib/atsBoost.ts"), "utf8");
  if (!/leveraging|improving efficiency by 25%/i.test(atsBoostSrc)) {
    pass("ats-boost-safe", "no bullet corruption patterns in source");
  } else {
    fail("ats-boost-safe", "atsBoost still contains corruption patterns");
  }

  console.log(`\n=== Summary: ${results.length - failed} passed, ${failed} failed / ${results.length} ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
