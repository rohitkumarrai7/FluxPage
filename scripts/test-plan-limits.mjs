#!/usr/bin/env node
/**
 * Sanity-check plan limit constants match pricing copy.
 * Run: node scripts/test-plan-limits.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const planLimitsSrc = readFileSync(resolve(__dirname, "../convex/planLimits.ts"), "utf8");
const pricingSrc = readFileSync(resolve(__dirname, "../web/lib/pricingPlans.ts"), "utf8");

const checks = [
  ["free tailors 5", /free:.*tailorsPerMonth: 5/s.test(planLimitsSrc)],
  ["free resumes 3", /free:.*maxResumes: 3/s.test(planLimitsSrc)],
  ["pro tailors 100", /pro:.*tailorsPerMonth: 100/s.test(planLimitsSrc)],
  ["pricing mentions 5 tailors", /5 tailors\/month/.test(pricingSrc)],
  ["pricing mentions 3 resumes", /3 resumes/.test(pricingSrc)],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(ok ? "PASS" : "FAIL", name);
  if (!ok) failed++;
}

process.exit(failed ? 1 : 0);
