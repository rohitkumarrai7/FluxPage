#!/usr/bin/env node
/**
 * Verify Razorpay webhook HMAC matches RAZORPAY_WEBHOOK_SECRET in web/.env.local
 * Run from repo root: node scripts/test-razorpay-webhook.mjs
 */
import crypto from "crypto";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../web/.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const secret = env.RAZORPAY_WEBHOOK_SECRET;
if (!secret) {
  console.error("Missing RAZORPAY_WEBHOOK_SECRET in web/.env.local");
  process.exit(1);
}

const body = JSON.stringify({
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_test_123",
        order_id: "order_test_123",
        amount: 19900,
        currency: "INR",
        notes: { tier: "pro", userId: "test", email: "test@example.com" },
      },
    },
  },
});

const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

console.log("OK — webhook secret loaded (length:", secret.length + ")");
console.log("Sample X-Razorpay-Signature:", signature.slice(0, 16) + "...");
console.log("Set the same secret in Razorpay webhook + Vercel RAZORPAY_WEBHOOK_SECRET");
