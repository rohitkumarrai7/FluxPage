/**
 * Comprehensive ATS + optimization audit — 22 cases, 4 ATS profiles.
 * Run:
 *   npx tsx scripts/test-comprehensive-suite.mjs --target local
 *   npx tsx scripts/test-comprehensive-suite.mjs --target production
 *   npx tsx scripts/test-comprehensive-suite.mjs --target local   # LLM auto-runs if dev server up
 *   npx tsx scripts/test-comprehensive-suite.mjs --target local --ats-only  # skip LLM
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { COMPREHENSIVE_CASES, PRODUCTION_SMOKE_IDS } from "./fixtures/comprehensive-cases.mjs";
import { scoreAllProfiles, ATS_PROFILES } from "./lib/atsProfiles.mjs";
import { dedupeSuggestionsForApply } from "./lib/llmTestUtils.mjs";

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

const args = process.argv.slice(2);
const target = args.includes("--target")
  ? args[args.indexOf("--target") + 1]
  : "local";
const atsOnly = args.includes("--ats-only");
const withLlmFlag = args.includes("--with-llm");
const reportsDir = path.join(__dirname, "reports");

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://stoic-caiman-320.convex.site";
let WEB_BASE =
  target === "production"
    ? process.env.NEXT_PUBLIC_WEB_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_WEB_URL
      : "https://www.fluxpage.com"
    : process.env.LLM_TEST_BASE_URL || "http://localhost:3000";

async function resolveLocalWebBase() {
  if (target !== "local") return WEB_BASE;
  if (process.env.LLM_TEST_BASE_URL) return process.env.LLM_TEST_BASE_URL;

  const ports = [3002, 3001, 3000];
  let best = null;
  for (const port of ports) {
    const base = `http://localhost:${port}`;
    try {
      const res = await fetch(`${base}/api/tailor-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: "test", jobDescription: "test job" }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.status !== 404 && res.status > 0 && res.status < 500) {
        if (!best) best = base;
      }
    } catch {
      /* try next port */
    }
  }
  return best || WEB_BASE;
}

const BAD_PATTERNS = [
  /leveraging/i,
  /improving efficiency by 25%/i,
  /share your updated cv/i,
  /whatsapp/i,
  /\+91\s*\d{5}/i,
  /this position reports to/i,
  /employment type:/i,
];

async function scoreLocal(resumeText, jobDescription) {
  const { scoreEnterpriseATS } = await import("../convex/atsEngine.ts");
  const { inferDominantDomain } = await import("../convex/skillsTaxonomy.ts");
  const { parseResumeNER } = await import("../convex/nerParser.ts");
  const result = scoreEnterpriseATS(resumeText, jobDescription);
  const parsed = parseResumeNER(resumeText);
  const resumeSkills = parsed.skills.map((s) => s.skill);
  const resumeDomain = inferDominantDomain(resumeText, resumeSkills);
  const jdDomain = inferDominantDomain(jobDescription, []);
  return {
    score: result.overallScore,
    passedKnockouts: result.passedKnockouts,
    breakdown: result.breakdown,
    matchedKeywords: result.matchedKeywords.map((k) => k.keyword),
    missingKeywords: result.missingKeywords.map((k) => k.keyword),
    resumeDomain,
    jdDomain,
    profiles: scoreAllProfiles(result.breakdown, result.passedKnockouts),
  };
}

async function scoreApi(resumeText, jobDescription) {
  const res = await fetch(`${API_BASE}/v1/ats/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText, jobDescription }),
  });
  if (!res.ok) throw new Error(`ATS API ${res.status}`);
  const data = await res.json();
  const breakdown = data.breakdown || {};
  return {
    score: data.score,
    passedKnockouts: data.passedKnockouts,
    breakdown,
    matchedKeywords: (data.matchedKeywords || []).map((k) =>
      typeof k === "string" ? k : k.keyword || ""
    ),
    missingKeywords: (data.missingKeywords || []).map((k) =>
      typeof k === "string" ? k : k.keyword || ""
    ),
    resumeDomain: null,
    jdDomain: null,
    profiles: scoreAllProfiles(breakdown, data.passedKnockouts),
  };
}

async function scoreResume(resumeText, jobDescription) {
  if (target === "local") return scoreLocal(resumeText, jobDescription);
  return scoreApi(resumeText, jobDescription);
}

async function serverReachable() {
  try {
    const res = await fetch(`${WEB_BASE}/api/tailor-suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: "John Doe\nEXPERIENCE\nEngineer", jobDescription: "React developer needed" }),
      signal: AbortSignal.timeout(120000),
    });
    return res.status !== 404 && res.status > 0 && res.status < 500;
  } catch {
    return false;
  }
}

async function fetchSuggestions(case_, structuredResume, resumeText) {
  const res = await fetch(`${WEB_BASE}/api/tailor-suggestions`, {
    signal: AbortSignal.timeout(180000),
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeText,
      structuredResume,
      jobDescription: case_.jobDescription,
      jobTitle: case_.jobTitle,
      company: "TestCo",
      missingKeywords: [],
      matchedKeywords: [],
      intensity: "medium",
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`tailor-suggestions ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

function checkBluffPatterns(text) {
  return BAD_PATTERNS.filter((p) => p.test(text)).map((p) => p.source);
}

function headersIntact(before, after) {
  for (const section of after.sections) {
    for (const item of section.items) {
      if (!item.metadata?.role && !item.metadata?.degree) continue;
      const beforeSection = before.sections.find((s) => s.id === section.id);
      const beforeItem = beforeSection?.items.find((i) => i.id === item.id);
      if (beforeItem && beforeItem.text !== item.text) return false;
    }
  }
  return true;
}

function weakestSignal(breakdown) {
  if (!breakdown) return null;
  const entries = Object.entries(breakdown).sort((a, b) => a[1] - b[1]);
  return entries[0] ? { signal: entries[0][0], value: entries[0][1] } : null;
}

function buildMarkdownReport(results, meta) {
  const lines = [
    `# ATS Comprehensive Audit Report`,
    ``,
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Target:** ${meta.target}`,
    `**LLM tests:** ${meta.llmEnabled ? "enabled" : "skipped"}`,
    `**Passed:** ${results.filter((r) => r.passed).length}/${results.length}`,
    ``,
    `## ATS Mechanism Gaps`,
    ``,
    `| Gap | Status | Evidence |`,
    `|-----|--------|----------|`,
    `| No industry scoring dimension | Confirmed | industry inferred in JD analyzer only, not in scoreEnterpriseATS weights |`,
    `| ~90 skill taxonomy | Confirmed | non-tech roles (legal, HR) score lower on taxonomy signal |`,
    `| TF-IDF not embeddings | Confirmed | semanticSimilarity uses local TF-IDF in semanticEngine.ts |`,
    `| Score gameable via skills stuffing | ${meta.skillsOnlyGamingDetected ? "Confirmed" : "Mitigated"} | skills-only keyword matches now weighted 0.4x |`,
    `| Sidebar regex gauge mismatch | Fix deployed | tailor page uses enterprise matched/missing only |`,
    ``,
    `## Per-Case Results`,
    ``,
    `| Case | Role | Score | Knockouts | Weakest Signal | LLM Sugg | Score Δ | Status |`,
    `|------|------|-------|-----------|----------------|----------|---------|--------|`,
  ];

  for (const r of results) {
    const weak = r.weakestSignal ? `${r.weakestSignal.signal} (${r.weakestSignal.value}%)` : "—";
    const sugg = r.llm?.count ?? "—";
    const delta = r.llm?.scoreDelta != null ? `+${r.llm.scoreDelta}` : "—";
    lines.push(
      `| ${r.id} | ${r.role} | ${r.score} | ${r.passedKnockouts ? "pass" : "fail"} | ${weak} | ${sugg} | ${delta} | ${r.passed ? "PASS" : "FAIL"} |`
    );
  }

  lines.push(``, `## ATS Profile Calibration`, ``);
  const sample = results.find((r) => r.profiles);
  if (sample?.profiles) {
    lines.push(`| Profile | Avg score (${sample.id}) |`);
    lines.push(`|---------|--------------------------|`);
    for (const [k, v] of Object.entries(sample.profiles)) {
      lines.push(`| ${ATS_PROFILES[k]?.label || k} | ${v} |`);
    }
  }

  if (results.some((r) => r.issues?.length)) {
    lines.push(``, `## Failures`, ``);
    for (const r of results.filter((r) => r.issues?.length)) {
      lines.push(`### ${r.id}`);
      for (const issue of r.issues) lines.push(`- ${issue}`);
    }
  }

  return lines.join("\n");
}

async function runCase(case_, llmEnabled) {
  const issues = [];
  const before = await scoreResume(case_.resumeText, case_.jobDescription);

  if (before.score < case_.expect.minScore || before.score > case_.expect.maxScore) {
    issues.push(
      `score ${before.score} outside [${case_.expect.minScore}, ${case_.expect.maxScore}]`
    );
  }
  if (before.passedKnockouts !== case_.expect.knockouts) {
    issues.push(`knockouts=${before.passedKnockouts}, expected ${case_.expect.knockouts}`);
  }
  if (!before.breakdown || typeof before.breakdown.keywordMatch !== "number") {
    issues.push("missing breakdown dimensions");
  }

  const result = {
    id: case_.id,
    role: case_.role,
    positive: case_.positive,
    score: before.score,
    passedKnockouts: before.passedKnockouts,
    breakdown: before.breakdown,
    profiles: before.profiles,
    resumeDomain: before.resumeDomain,
    jdDomain: before.jdDomain,
    weakestSignal: weakestSignal(before.breakdown),
    llm: null,
    issues,
    passed: issues.length === 0,
  };

  if (!llmEnabled) return result;

  try {
    const { parseResumeText, applySuggestionToResume, structuredResumeToText } = await import(
      "../web/lib/resumeParser.ts"
    );
    let structured = parseResumeText(case_.resumeText);
    const suggData = await fetchSuggestions(case_, structured, case_.resumeText);
    const suggestions = suggData.suggestions || [];

    const rewriteCount = suggestions.filter(
      (s) => s.type === "rewrite" || s.type === "summary"
    ).length;
    const addCount = suggestions.filter((s) => s.type === "add").length;
    const qualityRatio = suggestions.length > 0 ? rewriteCount / suggestions.length : 0;

    if (case_.positive && suggestions.length < 10) {
      issues.push(
        `LLM returned only ${suggestions.length} suggestions (expected ≥10; raw=${suggData.meta?.llmSuggestionCount ?? "?"}, preValidate=${suggData.meta?.preValidateCount ?? "?"})`
      );
    }
    if (case_.positive && qualityRatio < 0.5 && suggestions.length > 0) {
      issues.push(
        `low rewrite ratio ${Math.round(qualityRatio * 100)}% (${rewriteCount} rewrites, ${addCount} adds)`
      );
    }

    let nextResume = structured;
    for (const s of dedupeSuggestionsForApply(suggestions)) {
      nextResume = applySuggestionToResume(nextResume, { ...s, applied: false });
    }

    const afterText = structuredResumeToText(nextResume);
    const bluff = checkBluffPatterns(afterText);
    if (bluff.length > 0) {
      issues.push(`bluff patterns detected: ${bluff.join(", ")}`);
    }
    if (!headersIntact(structured, nextResume)) {
      issues.push("role/degree headers modified after apply");
    }

    const after = await scoreResume(afterText, case_.jobDescription);
    const scoreDelta = after.score - before.score;

    const minDelta =
      before.score >= 80 ? 0 : before.score >= 75 ? 1 : before.score >= 50 ? 2 : 5;
    if (case_.positive && scoreDelta < minDelta) {
      issues.push(
        `score delta only +${scoreDelta} after applying all suggestions (expected ≥${minDelta}, baseline ${before.score})`
      );
    }

    result.llm = {
      count: suggestions.length,
      rawCount: suggData.meta?.llmSuggestionCount ?? suggestions.length,
      finalCount: suggData.meta?.finalCount ?? suggestions.length,
      rewriteCount,
      addCount,
      scoreBefore: before.score,
      scoreAfter: after.score,
      scoreDelta,
      model: suggData.model,
      jdSource: suggData.jdSource,
    };
    result.score = after.score;
    result.passed = issues.length === 0;
    result.issues = issues;
  } catch (err) {
    issues.push(`LLM path failed: ${err.message}`);
    result.passed = false;
    result.issues = issues;
  }

  return result;
}

async function main() {
  if (target === "local") {
    WEB_BASE = await resolveLocalWebBase();
    console.log(`LLM API base: ${WEB_BASE}`);
  }

  const cases =
    target === "production"
      ? COMPREHENSIVE_CASES.filter((c) => PRODUCTION_SMOKE_IDS.includes(c.id))
      : COMPREHENSIVE_CASES;

  const serverUp = await serverReachable();
  const llmEnabled =
    !atsOnly &&
    (withLlmFlag || target === "local") &&
    serverUp;
  if (!atsOnly && (withLlmFlag || target === "local") && !serverUp) {
    console.warn("WARN: LLM tests skipped — start dev server: cd web && npm run dev");
  }

  console.log(
    `\n=== Comprehensive ATS Suite (${target}, ${cases.length} cases, LLM: ${llmEnabled ? "ON" : "OFF"}) ===\n`
  );

  const results = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    process.stdout.write(`  ${c.id}... `);
    const r = await runCase(c, llmEnabled);
    results.push(r);
    console.log(r.passed ? "PASS" : `FAIL (${r.issues.join("; ")})`);
    if (llmEnabled && i < cases.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  // Skills-only gaming probe
  let skillsOnlyGamingDetected = false;
  if (target === "local") {
    const { scoreEnterpriseATS } = await import("../convex/atsEngine.ts");
    const jd = COMPREHENSIVE_CASES[0].jobDescription;
    const stuffed = COMPREHENSIVE_CASES[0].resumeText.replace(
      /SKILLS\n.+/,
      "SKILLS\nGraphQL, Redis, Terraform, microservices, distributed systems, Kafka, Elasticsearch"
    );
    const base = scoreEnterpriseATS(COMPREHENSIVE_CASES[0].resumeText, jd).overallScore;
    const stuffedScore = scoreEnterpriseATS(stuffed, jd).overallScore;
    skillsOnlyGamingDetected = stuffedScore - base > 15;
  }

  const passed = results.filter((r) => r.passed).length;
  const meta = { target, llmEnabled, skillsOnlyGamingDetected };

  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const jsonPath = path.join(reportsDir, `audit-${date}.json`);
  const mdPath = path.join(reportsDir, `audit-${date}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify({ meta, results }, null, 2));
  fs.writeFileSync(mdPath, buildMarkdownReport(results, meta));

  console.log(`\n=== Summary: ${passed}/${results.length} passed ===`);
  console.log(`Report: ${mdPath}`);

  if (passed < results.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
