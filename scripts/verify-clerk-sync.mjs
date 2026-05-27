#!/usr/bin/env node
/**
 * Verifies Convex clerk-sync accepts the shared secret.
 * Usage: node scripts/verify-clerk-sync.mjs [convexSiteUrl] [secret]
 */
const base =
  process.argv[2] || process.env.NEXT_PUBLIC_API_URL || "https://stoic-caiman-320.convex.site";
const secret = process.argv[3] || process.env.CLERK_SYNC_SECRET || "resumod-clerk-sync-dev";

const url = `${base.replace(/\/$/, "")}/v1/auth/clerk-sync`;
const body = {
  syncSecret: secret,
  clerkId: `verify_${Date.now()}`,
  email: `verify-${Date.now()}@fluxpage.test`,
  name: "Verify",
};

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text };
}

if (res.ok && json.tokens?.access) {
  console.log("OK: clerk-sync succeeded on", base);
  process.exit(0);
}

console.error("FAIL:", res.status, json.detail || json);
process.exit(1);
