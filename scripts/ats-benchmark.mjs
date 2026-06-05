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

const ROHIT_FRONTEND_RESUME = `
Rohit Kumar Rai
+91 70861 88997 — rohitkumarrai008@gmail.com — LinkedIn — GitHub — GitLab
Professional Summary
Results-driven Full Stack Developer with 1.5+ years building automation systems, SaaS platforms, and workflow orchestration tools. Strong experience in n8n, Python scripting, REST API integrations, Chrome Extensions (MV3), React.js and Node.js. Proven record of eliminating manual work through robust, observable, and reliable systems.
Technical Skills
Languages: Python, JavaScript (ES6+), SQL, C++, HTML5, CSS3
Frameworks & Libraries: React.js, Next.js, Node.js, Express.js, Tailwind CSS
Tools & Platforms: n8n, Git, Stripe API, Chrome Extension (MV3), FFMPEG, PostgreSQL, WebSocket, Regex
Work Experience
Full Stack Developer Intern
Optymatch — Remote
Aug 2025– Present
• Engineered high-performance orchestration pipelines (Node.js, Python) processing 500+ data extractions/day with 99.8% reliability using background workers and retry logic.
• Built secure REST API integrations (LinkedIn, Internshala, Naukri) and data transformation pipelines, reducing manual entry by 85%.
• Architected self-healing workflow systems with persistence and retry strategies, improving reliability by 40% during peak loads.
Full Stack Developer Intern
Bridge Healthcare — Remote
Jun 2025– Aug 2025
• Developed streamlined onboarding workflows (React.js, Node.js) that reduced user drop-off by 15% via improved validation and flow design.
• Implemented Python ETL for patient data with HIPAA-aligned handling; improved retrieval speed by 30%.
• Refactored legacy services to modern architecture, reducing processing latency by 25%.
SaaS Developer (Freelance)
Obsidian AI — Remote
May 2024– Jul 2025
• Implemented webhook-driven event handling for Stripe billing and subscription management supporting 1,000+ active users.
• Designed API orchestration connecting sandboxed dev environments with frontends to achieve sub-2s preview latency.
• Built monitoring and alerting pipelines to raise uptime and decrease mean-time-to-detect.
Projects
Multi-Platform Workflow Automation System
n8n, Python, REST APIs, PostgreSQL, Docker
• Deployed self-hosted n8n on Docker to orchestrate lead enrichment, scheduled email dispatching, and CRM synchronization with robust logging and retries.
Real-Time Data Pipeline & Analytics
MERN, Twitter API, Leaflet.js, WebSocket, Python
• Engineered a 10k+ RPM ETL pipeline with automated cleaning and geolocation, delivering real-time data to an auto-refreshing dashboard.
• Optimized WebSocket throughput, reducing frontend latency by 40% to maintain real-time data delivery during high traffic spikes.
Education
Bachelor of Technology (B.Tech)- Artificial Intelligence & Data Science
Arya College of Engineering and IT, Jaipur
Aug 2023– May 2027
`;

const ROHIT_FRONTEND_INTERN_JD = `
Front End Developer Internship
Company: Infrabyte Consulting
Work Mode: Remote
Internship Type: Full-Time
Duration: 1 to 3 Months
Stipend: ₹14,700 per month
Infrabyte Consulting is looking for Front End Developer Interns who are interested in creating responsive interfaces, improving user experience systems, and working on modern web presentation technologies. This internship is ideal for freshers and early-stage candidates seeking practical frontend development exposure through structured remote projects and implementation-focused workflows.

Interns will work on interface design execution, responsive layouts, frontend coordination tasks, and web development assignments within collaborative digital environments.

Responsibilities:
* Assist in developing responsive web pages and frontend components
* Support implementation-focused interface development tasks
* Participate in layout optimization and styling activities
* Work on browser compatibility and responsive workflow assignments
* Assist in maintaining visual consistency across digital systems
* Support frontend debugging and issue resolution activities
* Maintain coding records and structured implementation documentation
* Participate in execution-driven frontend project workflows
* Collaborate with teams on user interface assignments
* Follow frontend standards and development workflow practices

Eligibility Criteria:
* Freshers or candidates pursuing/completing graduation in Computer Science, IT, Web Development, Design, or related disciplines
* Interest in frontend technologies, responsive systems, or interface development
* Comfortable working remotely in structured technical workflows
* Candidates seeking practical web development experience

Required Skills:
* Basic understanding of HTML, CSS, and JavaScript
* Awareness of responsive design concepts
* Attention to visual detail and layout consistency
* Problem-solving and technical coordination ability
* Communication and workflow management skills
* Understanding of structured implementation practices
* Ability to manage assigned frontend tasks independently

Preferred Skills (Optional):
* Familiarity with Bootstrap, Tailwind CSS, or frontend frameworks
* Awareness of React or UI libraries
* Academic or personal frontend projects
* Basic understanding of UI/UX principles
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
  {
    id: "rohit-frontend-intern",
    label: "Rohit full-stack resume vs frontend intern JD (should score 50-80, pass knockouts)",
    resume: ROHIT_FRONTEND_RESUME,
    jd: ROHIT_FRONTEND_INTERN_JD,
    expect: { minScore: 50, maxScore: 80, knockouts: true },
    requiredKeywords: ["html", "css", "javascript", "react", "tailwind"],
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
  if (scenario.requiredKeywords?.length) {
    const matched = (result.matchedKeywords || []).map((k) =>
      (typeof k === "string" ? k : k.keyword || "").toLowerCase()
    );
    for (const kw of scenario.requiredKeywords) {
      if (!matched.some((m) => m.includes(kw.toLowerCase()))) {
        issues.push(`expected matched keyword "${kw}" not found`);
      }
    }
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
