/** Client-safe pricing labels (INR). Charge amounts are in paise via RAZORPAY_PLAN_*_AMOUNT. */

const PRO_SALE = process.env.NEXT_PUBLIC_RAZORPAY_PRO_DISPLAY || "₹199";
const PRO_ORIGINAL =
  process.env.NEXT_PUBLIC_RAZORPAY_PRO_ORIGINAL_DISPLAY || "₹499";
const PREMIUM_SALE = process.env.NEXT_PUBLIC_RAZORPAY_PREMIUM_DISPLAY || "₹399";
const PREMIUM_ORIGINAL =
  process.env.NEXT_PUBLIC_RAZORPAY_PREMIUM_ORIGINAL_DISPLAY || "₹999";

function parseInr(s: string): number {
  return parseInt(s.replace(/[^\d]/g, ""), 10) || 0;
}

function discountLabel(original: string, sale: string): string {
  const o = parseInr(original);
  const n = parseInr(sale);
  if (o <= 0 || n >= o) return "Limited offer";
  return `${Math.round(((o - n) / o) * 100)}% OFF`;
}

function savingsLabel(original: string, sale: string): string {
  const diff = parseInr(original) - parseInr(sale);
  if (diff <= 0) return "";
  return `Save ₹${diff.toLocaleString("en-IN")}`;
}

function launchTagline(planId: "pro" | "premium", original: string, sale: string): string {
  const savings = parseInr(original) - parseInr(sale);
  if (planId === "pro") {
    return `Launch offer — save ₹${savings.toLocaleString("en-IN")}/month. Pro features for less than ₹7/day.`;
  }
  return `Early-bird pricing — save ₹${savings.toLocaleString("en-IN")}/month. Unlimited tailoring at our best rate.`;
}

export type PricingPlanId = "free" | "pro" | "premium";

export type PricingPlan = {
  id: PricingPlanId;
  name: string;
  price: string;
  originalPrice?: string;
  discountLabel?: string;
  savingsLabel?: string;
  launchTagline?: string;
  period: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    features: ["5 tailors/month", "3 resumes", "Basic tracker", "PDF export", "ATS scoring"],
    cta: "Get Started",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: PRO_SALE,
    originalPrice: PRO_ORIGINAL,
    discountLabel: discountLabel(PRO_ORIGINAL, PRO_SALE),
    savingsLabel: savingsLabel(PRO_ORIGINAL, PRO_SALE),
    launchTagline: launchTagline("pro", PRO_ORIGINAL, PRO_SALE),
    period: "/month",
    features: [
      "100 tailors/month",
      "20 resumes",
      "Cover letters",
      "PDF + DOCX export",
      "Interview prep",
      "All templates",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: PREMIUM_SALE,
    originalPrice: PREMIUM_ORIGINAL,
    discountLabel: discountLabel(PREMIUM_ORIGINAL, PREMIUM_SALE),
    savingsLabel: savingsLabel(PREMIUM_ORIGINAL, PREMIUM_SALE),
    launchTagline: launchTagline("premium", PREMIUM_ORIGINAL, PREMIUM_SALE),
    period: "/month",
    features: [
      "Unlimited tailoring",
      "Unlimited resumes",
      "Autofill (beta)",
      "Advanced analytics",
      "Priority AI models",
      "API access",
    ],
    cta: "Upgrade to Premium",
    highlight: false,
  },
];
