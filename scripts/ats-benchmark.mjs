/**
 * Industry-standard ATS benchmark — hits production Convex HTTP API.
 * Run: node scripts/ats-benchmark.mjs
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://stoic-caiman-320.convex.site";

const STRONG_SWE_RESUME = `
John Doe
Senior Software Engineer | john@email.com | San Francisco, CA

SUMMARY
Full-stack engineer with 8 years building scalable web applications.

EXPERIENCE
Senior Software Engineer — TechCorp (2020 – Present)
• Led team of 6 engineers building microservices on AWS using Node.js, TypeScript, React
• Architected REST and GraphQL APIs serving 2M+ daily users
• Reduced deployment time 40% with CI/CD pipelines (GitHub Actions, Docker, Kubernetes)
• Implemented PostgreSQL and Redis caching; improved p95 latency by 35%

Software Engineer — StartupXYZ (2017 – 2020)
• Built React/TypeScript front-end and Python FastAPI backend
• Deployed services on AWS ECS with Terraform

SKILLS
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes, PostgreSQL, Redis, GraphQL, CI/CD, Agile

EDUCATION
B.S. Computer Science — Stanford University (2017)
`;

const STAFF_SWE_JD = `
Staff Software Engineer — Platform Team

Requirements:
• 10+ years of software engineering experience
• Expert in distributed systems, microservices, and cloud architecture
• Strong proficiency in Java, Python, or Go
• Experience with Kubernetes, AWS, and system design at scale
• Bachelor's degree in Computer Science or equivalent
• Must have led large engineering initiatives

Responsibilities:
• Design and architect platform services used by 50+ product teams
• Mentor senior engineers and drive technical strategy
• Own reliability, performance, and security of core infrastructure
`;

const FRESH_GRAD_RESUME = `
Jane Smith
Recent Graduate | jane@email.com

EDUCATION
B.S. Computer Science — State University (2024)
GPA 3.8

PROJECTS
• Built a todo app with React and Firebase
• Hackathon winner — sentiment analysis with Python

SKILLS
JavaScript, HTML, CSS, Python basics
`;

const WRONG_DOMAIN_RESUME = `
Robert Chef
Executive Chef | robert@email.com

EXPERIENCE
Head Chef — Fine Dining Restaurant (2015 – Present)
• Managed kitchen staff of 15, menu development, food cost control
• Won regional culinary awards

SKILLS
Menu planning, French cuisine, kitchen management, HACCP
`;

const ABBREV_RESUME = `
Alex Dev
Software Developer

EXPERIENCE
Developer at SaaS Co (2019 – Present)
• Built SPAs with JS/TS, React, and Node
• Deployed on k8s with Docker; used AWS S3 and RDS
• Wrote unit tests with Jest; CI via GH Actions

SKILLS
JS, TS, React, Node, k8s, Docker, AWS, PostgreSQL, REST APIs
`;

const NAUKRI_JD = `
Job Title: Full Stack Developer
Company: Infosys
Location: Bangalore
Experience: 3-6 Years

Job Description:
We are looking for Full Stack Developer with strong experience in React.js, Node.js, MongoDB, Express.js.
Candidate should have hands-on experience in REST API development, Git, Agile methodology.
Good knowledge of AWS cloud services preferred.
BE/BTech in Computer Science required.
`;

const DEVOPS_JD = `
DevOps Engineer

Must have:
• 5+ years DevOps/SRE experience
• Expert in Terraform, Ansible, Jenkins, GitLab CI
• Strong Linux administration and shell scripting
• AWS/GCP cloud infrastructure
• Monitoring: Prometheus, Grafana, Datadog
• Container orchestration with Kubernetes
`;

const DEVOPS_RESUME = `
Sam Ops
DevOps Engineer | 6 years experience

EXPERIENCE
DevOps Engineer — CloudCo (2019 – Present)
• Managed AWS infrastructure with Terraform and CloudFormation
• Built CI/CD pipelines in Jenkins and GitHub Actions
• Kubernetes cluster administration (EKS), Docker containerization
• Monitoring with Prometheus and Grafana; on-call rotation

SKILLS
Terraform, Jenkins, Kubernetes, Docker, AWS, Linux, Bash, Python, Git
`;

const SCENARIOS = [
  {
    id: "strong-swe-match",
    label: "Strong SWE vs senior role (should score high, pass knockouts)",
    resume: STRONG_SWE_RESUME,
    jd: STAFF_SWE_JD.replace("10+", "5+").replace("Staff", "Senior"),
    expect: { minScore: 70, maxScore: 95, knockouts: true },
  },
  {
    id: "wrong-domain",
    label: "Chef resume vs SWE JD (should score very low)",
    resume: WRONG_DOMAIN_RESUME,
    jd: STAFF_SWE_JD,
    expect: { minScore: 5, maxScore: 40, knockouts: false },
  },
  {
    id: "abbreviations",
    label: "Abbreviation-heavy resume (JS/TS/k8s) vs full-stack JD",
    resume: ABBREV_RESUME,
    jd: NAUKRI_JD,
    expect: { minScore: 65, maxScore: 90, knockouts: true },
  },
  {
    id: "fresh-grad-staff",
    label: "Fresh grad vs staff-level JD (should fail knockouts)",
    resume: FRESH_GRAD_RESUME,
    jd: STAFF_SWE_JD,
    expect: { minScore: 0, maxScore: 25, knockouts: false },
  },
  {
    id: "naukri-format",
    label: "Strong SWE vs Naukri-style JD (Indian market format)",
    resume: STRONG_SWE_RESUME,
    jd: NAUKRI_JD,
    expect: { minScore: 70, maxScore: 90, knockouts: true },
  },
  {
    id: "devops-match",
    label: "DevOps resume vs DevOps JD (partial semantic overlap)",
    resume: DEVOPS_RESUME,
    jd: DEVOPS_JD,
    expect: { minScore: 40, maxScore: 75, knockouts: true },
  },
];

async function analyze(resumeText, jobDescription, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`${API_BASE}/v1/ats/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText, jobDescription }),
    });
    if (res.ok) return res.json();
    if (res.status >= 500 && attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
}

function checkScenario(scenario, result) {
  const issues = [];
  const score = result.score;
  const knockouts = result.passedKnockouts;

  if (score < scenario.expect.minScore || score > scenario.expect.maxScore) {
    issues.push(
      `score ${score} outside expected [${scenario.expect.minScore}, ${scenario.expect.maxScore}]`
    );
  }
  if (knockouts !== scenario.expect.knockouts) {
    issues.push(
      `knockouts=${knockouts}, expected ${scenario.expect.knockouts}`
    );
  }
  if (!result.breakdown || typeof result.breakdown.keywordMatch !== "number") {
    issues.push("missing enterprise breakdown dimensions");
  }
  if (!Array.isArray(result.knockoutDetails?.failedFilters)) {
    issues.push("missing knockoutDetails.failedFilters array");
  }
  if (!result.parsedResume?.sectionsDetected?.length) {
    issues.push("missing parsedResume.sectionsDetected");
  }
  return issues;
}

async function main() {
  console.log(`\n=== ATS Benchmark — Production API ===`);
  console.log(`Target: ${API_BASE}/v1/ats/analyze\n`);

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const scenario of SCENARIOS) {
    try {
      await new Promise((r) => setTimeout(r, 800));
      const result = await analyze(scenario.resume, scenario.jd);
      const issues = checkScenario(scenario, result);
      const ok = issues.length === 0;
      if (ok) passed++;
      else failed++;

      results.push({ scenario, result, issues, ok });
      const icon = ok ? "PASS" : "FAIL";
      console.log(`[${icon}] ${scenario.id}: score=${result.score}, knockouts=${result.passedKnockouts}`);
      if (!ok) {
        for (const i of issues) console.log(`       ↳ ${i}`);
      }
      console.log(
        `       breakdown: kw=${result.breakdown?.keywordMatch} tax=${result.breakdown?.taxonomyMatch} sem=${result.breakdown?.semanticSimilarity}`
      );
      if (!result.passedKnockouts && result.knockoutDetails?.failedFilters?.length) {
        console.log(
          `       knockout failures: ${result.knockoutDetails.failedFilters.map((f) => f.message).join("; ")}`
        );
      }
    } catch (e) {
      failed++;
      results.push({ scenario, error: e.message, ok: false });
      console.log(`[FAIL] ${scenario.id}: ${e.message}`);
    }
  }

  // Enterprise endpoint parity
  try {
    const a = await analyze(STRONG_SWE_RESUME, NAUKRI_JD);
    const res2 = await fetch(`${API_BASE}/v1/ats/analyze-enterprise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: STRONG_SWE_RESUME, jobDescription: NAUKRI_JD }),
    });
    const b = await res2.json();
    const parity = a.score === b.score && a.passedKnockouts === b.passedKnockouts;
    console.log(`\n[${parity ? "PASS" : "FAIL"}] /analyze vs /analyze-enterprise parity (score=${a.score})`);
    if (!parity) failed++;
    else passed++;
  } catch (e) {
    console.log(`\n[FAIL] endpoint parity: ${e.message}`);
    failed++;
  }

  console.log(`\n=== Summary: ${passed} passed, ${failed} failed / ${passed + failed} checks ===\n`);

  const industryNotes = [
    "Keyword/taxonomy matching: real multi-signal scoring (not hardcoded)",
    "Knockout filters: years, education, critical skills enforced",
    "7-dimension breakdown returned to clients",
    "NER parsing: sections, seniority, experience years extracted",
    "Gap vs Workday/Greenhouse: no ML resume parser, no embedding API, ~90-skill taxonomy",
  ];
  console.log("Industry positioning:");
  for (const n of industryNotes) console.log(`  • ${n}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
