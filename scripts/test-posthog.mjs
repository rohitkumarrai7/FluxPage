#!/usr/bin/env node
/**
 * Smoke-test PostHog capture + decide APIs (project 438349).
 * Run: node scripts/test-posthog.mjs
 * Env: NEXT_PUBLIC_POSTHOG_KEY or POSTHOG_KEY
 */
const KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ||
  process.env.POSTHOG_KEY ||
  process.env.EXTENSION_POSTHOG_KEY ||
  "";
const HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

if (!KEY) {
  console.error("FAIL missing PostHog key (set NEXT_PUBLIC_POSTHOG_KEY)");
  process.exit(1);
}

const distinctId = "fluxpage_test_" + Date.now();
const event = "fluxpage_integration_test";

async function capture() {
  const res = await fetch(`${HOST}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: KEY,
      event,
      distinct_id: distinctId,
      properties: {
        source: "test-posthog.mjs",
        project_id: 438349,
        environment: "ci",
      },
    }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

async function decide() {
  const res = await fetch(`${HOST}/decide/?v=3`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: KEY,
      distinct_id: distinctId,
    }),
  });
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const data = await res.json();
  return {
    ok: true,
    status: res.status,
    featureFlags: Object.keys(data.featureFlags || {}).length,
  };
}

const cap = await capture();
console.log(cap.ok ? "PASS" : "FAIL", "capture", event, cap.status, cap.body.slice(0, 80));

const dec = await decide();
console.log(dec.ok ? "PASS" : "FAIL", "decide feature flags", dec.status, dec.featureFlags ?? "");

if (!cap.ok) process.exit(1);
console.log("\nCheck Live Events:", "https://us.posthog.com/project/438349/activity/explore");
console.log("Look for event:", event, "distinct_id:", distinctId);
