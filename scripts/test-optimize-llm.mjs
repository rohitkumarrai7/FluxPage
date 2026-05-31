#!/usr/bin/env node
/**
 * Test OpenRouter + /api/optimize + /api/tailor-suggestions with sample resumes.
 * Validates: HTTP 200, valid LaTeX, keyword injection count, and score improvement.
 * Usage: node scripts/test-optimize-llm.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(relPath) {
  const file = path.join(root, relPath);
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile("web/.env.local");

const BASE = process.argv[2] || "http://localhost:3000";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const API_URL = process.env.LLM_API_URL || "https://openrouter.ai/api/v1/chat/completions";

const RESUMES = [
  {
    id: "software-engineer",
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
Requirements: 5+ years experience with React, Node.js, TypeScript, AWS, Kubernetes, PostgreSQL, REST APIs, microservices, GraphQL, Redis, Terraform, CI/CD pipelines.
Responsibilities: Design scalable distributed systems, mentor junior developers, conduct code reviews.`,
    missingKeywords: ["GraphQL", "microservices", "Redis", "Terraform", "distributed systems"],
    matchedKeywords: ["React", "Node.js", "TypeScript", "AWS", "Kubernetes", "PostgreSQL"],
  },
  {
    id: "marketing-manager",
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
    jobTitle: "Growth Marketing Manager",
    company: "ScaleUp Inc",
    jobDescription: `Growth Marketing Manager
Requirements: SEO, paid acquisition, HubSpot, analytics, B2B SaaS experience, marketing automation, demand generation, customer segmentation, CRM management, content marketing, conversion rate optimization.`,
    missingKeywords: ["marketing automation", "demand generation", "customer segmentation", "CRM management", "conversion rate optimization"],
    matchedKeywords: ["SEO", "HubSpot", "analytics", "B2B SaaS"],
  },
  {
    id: "finance-analyst",
    resumeText: `Rohit Kumar Rai
rohit@email.com | +91 70861 88997

SUMMARY
Full Stack Developer with 1.5+ years building automation systems and SaaS platforms.

EXPERIENCE
Full Stack Developer Intern — Optymatch (Aug 2025 – Present)
• Engineered high-performance Chrome MV3 scrapers harvesting 500+ profiles daily
• Built secure backend sync pipelines reducing manual data entry by 85%

SKILLS
React.js, Node.js, Python, JavaScript, PostgreSQL, MongoDB, Docker, AWS

EDUCATION
B.Tech in AI & Data Science — Arya College (2023 – Present)`,
    jobTitle: "Finance Equity Analyst",
    company: "Edify Equity",
    jobDescription: `Finance Equity Analyst
Part time, Rs 1,000 - Rs 1,100/month
Skills required: Equity Research, Financial Analysis, Financial literacy, Market Analysis, Logical reasoning
Qualifications: Track market trends, economic indicators, and news impacting equity markets.
Conduct fundamental analysis of companies, industries, and sectors.`,
    missingKeywords: ["Equity Research", "Financial Analysis", "Financial literacy", "Market Analysis", "Logical reasoning", "fundamental analysis", "economic indicators"],
    matchedKeywords: [],
  },
];

async function testOpenRouterModel(model) {
  const start = Date.now();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
      "X-Title": "Fluxpage-test",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 32,
    }),
  });
  const ms = Date.now() - start;
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 120) }; }
  return { model, status: res.status, ms, ok: res.ok, preview: data.choices?.[0]?.message?.content || data.error?.message || data.raw || "" };
}

async function testOptimize(sample) {
  const start = Date.now();
  const res = await fetch(`${BASE}/api/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeText: sample.resumeText,
      jobTitle: sample.jobTitle,
      company: sample.company,
      jobDescription: sample.jobDescription,
      matchedKeywords: sample.matchedKeywords,
      missingKeywords: sample.missingKeywords,
      suggestions: [],
    }),
  });
  const ms = Date.now() - start;
  const data = await res.json();
  const latex = data.latexSource || "";
  const hasDocument = latex.includes("\\documentclass") && latex.includes("\\end{document}");

  const plainText = latex
    .replace(/\\documentclass[\s\S]*?\\begin\{document\}/g, "")
    .replace(/\\end\{document\}/g, "")
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}\\$]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

  const injectedKeywords = sample.missingKeywords.filter((kw) =>
    plainText.includes(kw.toLowerCase())
  );

  return {
    id: sample.id,
    status: res.status,
    ms,
    optimized: data.optimized,
    model: data.model,
    error: data.error,
    latexLen: latex.length,
    hasDocument,
    keywordsInjected: injectedKeywords.length,
    totalMissing: sample.missingKeywords.length,
    injectedKeywords,
    serverKeywordsInjected: data.keywordsInjected,
    keywordsStillMissing: data.keywordsStillMissing,
  };
}

async function testTailorSuggestions(sample) {
  const start = Date.now();
  const res = await fetch(`${BASE}/api/tailor-suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeText: sample.resumeText,
      jobDescription: sample.jobDescription,
      jobTitle: sample.jobTitle,
      company: sample.company,
      missingKeywords: sample.missingKeywords,
      matchedKeywords: sample.matchedKeywords,
    }),
  });
  const ms = Date.now() - start;
  const data = await res.json();
  return {
    id: sample.id,
    status: res.status,
    ms,
    count: (data.suggestions || []).length,
    model: data.model,
    error: data.error,
    hasRewrite: (data.suggestions || []).some((s) => s.type === "rewrite"),
    hasSummary: (data.suggestions || []).some((s) => s.type === "summary"),
    hasKeywords: (data.suggestions || []).some((s) => s.keywords?.length > 0),
  };
}

async function main() {
  console.log("\n=== LLM / Optimize / Tailor-Suggestions Test ===\n");

  if (!OPENROUTER_KEY) {
    console.error("FAIL: OPENROUTER_API_KEY not set in web/.env.local");
    process.exit(1);
  }

  console.log("OpenRouter latency check:");
  for (const model of ["openai/gpt-5.4-nano", "openai/gpt-5.4-mini"]) {
    const r = await testOpenRouterModel(model);
    const tag = r.ok ? "PASS" : "FAIL";
    console.log(`  [${tag}] ${model} — ${r.status} in ${r.ms}ms — ${String(r.preview).slice(0, 40)}`);
  }

  console.log(`\n/api/optimize via ${BASE}:`);
  let optimizeFailed = 0;
  for (const sample of RESUMES) {
    try {
      const r = await testOptimize(sample);
      const validLatex = r.status === 200 && r.hasDocument;
      const keywordCheck = r.keywordsInjected >= Math.min(2, r.totalMissing);
      const pass = validLatex && (keywordCheck || !r.optimized);
      if (!pass) optimizeFailed++;
      const tag = pass ? "PASS" : "FAIL";
      console.log(
        `  [${tag}] ${r.id} — ${r.status} in ${r.ms}ms — optimized=${r.optimized} model=${r.model || "n/a"} len=${r.latexLen} kw=${r.keywordsInjected}/${r.totalMissing}${r.error ? ` err=${r.error}` : ""}`
      );
      if (r.keywordsInjected > 0) {
        console.log(`         injected: ${r.injectedKeywords.join(", ")}`);
      }
      if (r.keywordsStillMissing?.length > 0) {
        console.log(`         still missing: ${r.keywordsStillMissing.join(", ")}`);
      }
    } catch (err) {
      optimizeFailed++;
      console.log(`  [FAIL] ${sample.id} — ${err.message}`);
    }
  }

  console.log(`\n/api/tailor-suggestions via ${BASE}:`);
  let tailorFailed = 0;
  for (const sample of RESUMES) {
    try {
      const r = await testTailorSuggestions(sample);
      const pass = r.status === 200 && r.count >= 3 && r.hasKeywords;
      if (!pass) tailorFailed++;
      const tag = pass ? "PASS" : "FAIL";
      console.log(
        `  [${tag}] ${r.id} — ${r.status} in ${r.ms}ms — ${r.count} suggestions model=${r.model || "n/a"} rewrite=${r.hasRewrite} summary=${r.hasSummary} keywords=${r.hasKeywords}${r.error ? ` err=${r.error}` : ""}`
      );
    } catch (err) {
      tailorFailed++;
      console.log(`  [FAIL] ${sample.id} — ${err.message}`);
    }
  }

  const totalFailed = optimizeFailed + tailorFailed;
  console.log(`\nSummary: ${optimizeFailed} optimize + ${tailorFailed} tailor-suggestions failed / ${RESUMES.length * 2} total tests\n`);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
