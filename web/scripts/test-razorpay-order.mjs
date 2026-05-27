/**
 * Quick Razorpay live key check — creates a test order (no charge).
 * Run: node scripts/test-razorpay-order.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const key_id = env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const key_secret = env.RAZORPAY_KEY_SECRET;
if (!key_id || !key_secret) {
  console.error("Missing Razorpay keys in .env.local");
  process.exit(1);
}

const { default: Razorpay } = await import("razorpay");
const client = new Razorpay({ key_id, key_secret });

const order = await client.orders.create({
  amount: 99900,
  currency: "INR",
  receipt: `fluxpage_test_${Date.now()}`,
  notes: { tier: "pro", test: "true" },
});

console.log("OK — Razorpay order created:", order.id, "amount:", order.amount, order.currency);
