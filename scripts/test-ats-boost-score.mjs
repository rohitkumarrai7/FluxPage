const API = process.env.NEXT_PUBLIC_API_URL || "https://stoic-caiman-320.convex.site";

const jd = `International Business Development

Responsibilities:
- Drive business development and proactive outreach to international clients
- Asset sourcing and new product development for market expansion
- Launch planning and market research for new territories
- Build sales pipeline through cold calling and CRM tools
- Stakeholder management and negotiation with partners

Requirements:
- Strong communication and presentation skills
- Excel and PowerPoint proficiency
- Experience in sales and account management
- Business development background preferred`;

const before = `Rohit Kumar Rai | rohit@email.com

PROFESSIONAL SUMMARY
Full stack developer with experience in SaaS and automation.

WORK EXPERIENCE
Full Stack Developer Intern — Optymatch
- Built web applications with Node.js and React
- Implemented Python ETL pipelines

PROJECTS
- Workflow automation with n8n and Docker`;

const after = `Rohit Kumar Rai | rohit@email.com

PROFESSIONAL SUMMARY
Results-driven International Business Development professional with proven expertise in business development, proactive outreach, asset sourcing, new product development, launch planning, market research, pipeline, crm, stakeholder management, negotiation, sales, account management, excel, powerpoint, communication. Drive business development and proactive outreach to international clients. Asset sourcing and new product development for market expansion. Launch planning and market research for new territories.

WORK EXPERIENCE
Full Stack Developer Intern — Optymatch
- Led built web applications with Node.js and React, improving efficiency by 25% — leveraging business development and cold calling.
- Drove implemented Python ETL pipelines — leveraging proactive outreach, market research, and stakeholder management.

SKILLS
business development, proactive outreach, asset sourcing, new product development, launch planning, market research, sales, account management, excel, powerpoint, communication, negotiation, stakeholder management, pipeline, crm, cold calling, presentation, partnership, international, strategy, market expansion

PROJECTS
- Led workflow automation — leveraging asset sourcing and launch planning.`;

async function score(text) {
  const r = await fetch(`${API}/v1/ats/analyze-enterprise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText: text, jobDescription: jd }),
  });
  const d = await r.json();
  return {
    score: d.score,
    matched: (d.matchedKeywords || []).length,
    missing: (d.missingKeywords || []).length,
    breakdown: d.breakdown,
  };
}

const b = await score(before);
const a = await score(after);
console.log("Before:", b);
console.log("After boost:", a);
console.log(a.score >= 80 ? "PASS: 80+ achieved" : "WARN: below 80");
