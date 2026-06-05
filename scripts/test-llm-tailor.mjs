/**
 * Focused LLM tailor test — positive match cases only (fast feedback loop).
 * Requires: cd web && npm run dev
 * Run: npx tsx scripts/test-llm-tailor.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { COMPREHENSIVE_CASES } from "./fixtures/comprehensive-cases.mjs";
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

async function resolveBase() {
  if (process.env.LLM_TEST_BASE_URL) return process.env.LLM_TEST_BASE_URL;
  for (const port of [3002, 3001, 3000]) {
    const base = `http://localhost:${port}`;
    try {
      const res = await fetch(`${base}/api/tailor-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: "ping", jobDescription: "ping" }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.status !== 404 && res.status > 0 && res.status < 500) return base;
    } catch {
      /* next */
    }
  }
  throw new Error("No dev server — run: cd web && npm run dev");
}

async function main() {
  const base = await resolveBase();
  console.log(`LLM tailor test @ ${base}\n`);

  const { parseResumeText, applySuggestionToResume, structuredResumeToText } = await import(
    "../web/lib/resumeParser.ts"
  );
  const { scoreEnterpriseATS } = await import("../convex/atsEngine.ts");

  const cases = COMPREHENSIVE_CASES.filter((c) => c.positive);
  let passed = 0;

  for (const c of cases) {
    process.stdout.write(`  ${c.id}... `);
    const structured = parseResumeText(c.resumeText);
    const before = scoreEnterpriseATS(c.resumeText, c.jobDescription).overallScore;

    const res = await fetch(`${base}/api/tailor-suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(180000),
      body: JSON.stringify({
        resumeText: c.resumeText,
        structuredResume: structured,
        jobDescription: c.jobDescription,
        jobTitle: c.jobTitle,
        intensity: "medium",
      }),
    });

    if (!res.ok) {
      console.log(`FAIL (HTTP ${res.status})`);
      continue;
    }

    const data = await res.json();
    const suggestions = data.suggestions || [];
    const rewrites = suggestions.filter((s) => s.type === "rewrite" || s.type === "summary").length;

    let next = structured;
    for (const s of dedupeSuggestionsForApply(suggestions)) {
      next = applySuggestionToResume(next, { ...s, applied: false });
    }
    const after = scoreEnterpriseATS(structuredResumeToText(next), c.jobDescription).overallScore;
    const delta = after - before;
    const minDelta = before >= 80 ? 0 : before >= 75 ? 1 : before >= 50 ? 2 : 5;

    const issues = [];
    if (suggestions.length < 10) issues.push(`count=${suggestions.length}`);
    if (rewrites / Math.max(suggestions.length, 1) < 0.5) issues.push(`rewriteRatio low`);
    if (delta < minDelta) issues.push(`delta=+${delta} (need +${minDelta})`);

    if (issues.length === 0) {
      passed++;
      console.log(`PASS (${suggestions.length} sugg, +${delta}, model=${data.model})`);
    } else {
      console.log(
        `FAIL (${issues.join(", ")}; raw=${data.meta?.llmSuggestionCount}, pre=${data.meta?.preValidateCount})`
      );
    }

    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log(`\n=== LLM tailor: ${passed}/${cases.length} passed ===`);
  if (passed < cases.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
