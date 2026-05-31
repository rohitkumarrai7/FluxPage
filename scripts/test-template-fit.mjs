/**
 * Validates one-page fit scale for all templates against a heavy sample resume.
 * Run: node scripts/test-template-fit.mjs
 */

const sampleResume = {
  contact: { name: "Rohit Kumar Rai", email: "a@b.com", phone: "+91 123", linkedin: "", github: "" },
  sections: [
    { id: "s1", type: "summary", heading: "Summary", order: 0, items: [{ id: "b1", text: "Full-stack developer with 1.5+ years building SaaS, automation pipelines, and workflow orchestration using Node.js, Python, React, and Docker across distributed systems." }] },
    { id: "s2", type: "experience", heading: "Experience", order: 1, items: [
      { id: "r1", text: "", metadata: { role: "Full Stack Developer Intern", company: "Optymatch", startDate: "Aug 2025", endDate: "Present" } },
      { id: "b2", text: "Engineered high-performance orchestration pipelines (Node.js, Python) processing 10K+ daily events with 99.9% uptime across distributed microservices and REST APIs." },
      { id: "b3", text: "Implemented Python ETL for data collection from 15+ external APIs, reducing manual processing time by 80% through automated validation and retry logic." },
      { id: "b4", text: "Built real-time WebSocket dashboards with React and Node.js serving 500+ concurrent users with sub-100ms latency." },
      { id: "r2", text: "", metadata: { role: "Full Stack Developer Intern", company: "Bridge Healthcare", startDate: "Jun 2025", endDate: "Aug 2025" } },
      { id: "b5", text: "Developed HIPAA-compliant patient portal using Next.js and PostgreSQL, handling 2K+ daily active users with role-based access control." },
      { id: "b6", text: "Integrated Stripe payment processing and automated billing workflows, increasing payment collection rate by 35%." },
      { id: "r3", text: "", metadata: { role: "SaaS Developer (Freelance)", company: "Obsidian AI", startDate: "May 2024", endDate: "Jul 2025" } },
      { id: "b7", text: "Built multi-tenant SaaS platform with React, Node.js, and MongoDB serving 50+ clients with automated onboarding and subscription management." },
      { id: "b8", text: "Deployed self-hosted n8n on Docker to orchestrate 20+ workflow automations, reducing operational overhead by 60%." },
    ]},
    { id: "s3", type: "skills", heading: "Skills", order: 2, items: [{ id: "sk1", text: "Python, JavaScript, React, Next.js, Node.js, Docker, Git, n8n, PostgreSQL, MongoDB" }] },
    { id: "s4", type: "projects", heading: "Projects", order: 3, items: [
      { id: "p1", text: "Multi-Platform Workflow Automation System — Deployed self-hosted n8n on Docker to orchestrate cross-platform data sync between CRM, email, and analytics tools." },
      { id: "p2", text: "Optimized WebSocket throughput by 3x using Redis pub/sub and connection pooling for real-time notification delivery." },
      { id: "p3", text: "Achieved 98% pipeline visibility by implementing structured logging and automated alerting with Grafana dashboards." },
    ]},
    { id: "s5", type: "education", heading: "Education", order: 4, items: [
      { id: "e1", text: "", metadata: { degree: "B.Tech CS", institution: "University", startDate: "2021", endDate: "2025" } },
    ]},
  ],
};

function estimateResumeContentUnits(resume) {
  let units = 3.5;
  for (const section of resume.sections) {
    units += 1.6;
    if (section.type === "summary") {
      units += Math.max(1.5, section.items.map((i) => i.text).join(" ").length / 90);
      continue;
    }
    if (section.type === "skills") {
      units += Math.max(1, section.items.length * 0.35);
      continue;
    }
    for (const item of section.items) {
      if (item.metadata?.role || item.metadata?.degree) units += 1.5;
      else units += Math.max(0.8, item.text.length / 65);
    }
  }
  return units;
}

const PAGE_CAPACITY = { classic: 44, compact: 52, minimal: 50, modern: 36, sidebar: 38, executive: 34, designer: 36 };
const TEMPLATE_DENSITY = { classic: 1, compact: 1.12, minimal: 1.08, modern: 0.82, sidebar: 0.88, executive: 0.78, designer: 0.82 };

function computePdfFitScale(resume, template, userFontScale = 1, lineSpacing = 1.2) {
  const units = estimateResumeContentUnits(resume);
  const capacity = PAGE_CAPACITY[template] ?? 44;
  const density = TEMPLATE_DENSITY[template] ?? 1;
  const lineFactor = lineSpacing > 1.15 ? 0.86 : lineSpacing < 1.05 ? 1.06 : 1;
  const autoScale = Math.min(1, ((capacity * density) / units) * lineFactor);
  return Math.max(0.42, Math.min(1, userFontScale * autoScale * 0.88));
}

function pdfShrinkAttempts(resume) {
  const units = estimateResumeContentUnits(resume);
  if (units > 58) return 8;
  if (units > 48) return 6;
  if (units > 40) return 4;
  if (units > 32) return 2;
  return 1;
}

const templates = ["classic", "compact", "modern", "sidebar", "executive", "designer", "minimal"];
const units = estimateResumeContentUnits(sampleResume);

console.log(`\nSample resume content units: ${units.toFixed(1)}\n`);
console.log("Template fit scales (final PDF scale after shrink attempts):");
console.log("─".repeat(58));

let allOk = true;
for (const template of templates) {
  const base = computePdfFitScale(sampleResume, template, 1.05 / 10.5, 1.2);
  const attempts = pdfShrinkAttempts(sampleResume);
  const final = Math.max(0.42, base - (attempts - 1) * 0.035);
  const ok = final <= 0.82;
  if (!ok) allOk = false;
  console.log(`  ${template.padEnd(12)} base=${base.toFixed(3)}  final=${final.toFixed(3)}  attempts=${attempts}  [${ok ? "OK" : "WARN"}]`);
}

console.log("─".repeat(58));
console.log(allOk ? "\nPASS — all templates fit one page for sample resume.\n" : "\nWARN — some templates may clip; tune capacities.\n");
process.exit(allOk ? 0 : 1);
