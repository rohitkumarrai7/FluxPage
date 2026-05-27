import { NextResponse } from "next/server";
import {
  getPlanAmount,
  getRazorpayClient,
  isRazorpayConfigured,
  type PaidTier,
} from "@/lib/razorpay";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://canny-woodpecker-211.convex.site";

/** Razorpay receipt max length is 40 characters. */
function buildReceipt(tier: string, userId: string): string {
  const userPart = String(userId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
  const receipt = `fp_${tier}_${userPart}_${Date.now().toString(36)}`;
  return receipt.slice(0, 40);
}

export async function POST(req: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ detail: "Razorpay not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const body = await req.json().catch(() => ({}));
  const tier = body.tier as PaidTier;

  if (tier !== "pro" && tier !== "premium") {
    return NextResponse.json({ detail: "Invalid plan tier" }, { status: 400 });
  }

  const profileRes = await fetch(`${API_URL}/v1/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!profileRes.ok) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  const profile = await profileRes.json();

  const razorpay = getRazorpayClient();
  if (!razorpay) {
    return NextResponse.json({ detail: "Razorpay not configured" }, { status: 503 });
  }

  const amount = getPlanAmount(tier);

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: buildReceipt(tier, profile.id),
      notes: {
        tier,
        userId: String(profile.id),
        email: profile.email || "",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      tier,
      user: { name: profile.name, email: profile.email },
    });
  } catch (e: unknown) {
    const err = e as { error?: { description?: string }; message?: string };
    const detail =
      err?.error?.description || err?.message || "Failed to create Razorpay order";
    console.error("[razorpay/create-order]", detail, e);
    return NextResponse.json({ detail }, { status: 502 });
  }
}
