import { NextResponse } from "next/server";
import {
  getPlanAmount,
  getRazorpayClient,
  syncTierToConvex,
  verifyPaymentSignature,
  type PaidTier,
} from "@/lib/razorpay";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://canny-woodpecker-211.convex.site";

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const body = await req.json().catch(() => ({}));
  const {
    tier,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = body;

  if (!orderId || !paymentId || !signature || (tier !== "pro" && tier !== "premium")) {
    return NextResponse.json({ detail: "Invalid payment payload" }, { status: 400 });
  }

  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ detail: "Invalid payment signature" }, { status: 400 });
  }

  const expectedAmount = getPlanAmount(tier as PaidTier);
  const razorpay = getRazorpayClient();
  if (razorpay) {
    try {
      const order = await razorpay.orders.fetch(orderId);
      if (Number(order.amount) !== expectedAmount) {
        return NextResponse.json({ detail: "Payment amount mismatch" }, { status: 400 });
      }
      const payment = await razorpay.payments.fetch(paymentId);
      if (Number(payment.amount) !== expectedAmount) {
        return NextResponse.json({ detail: "Payment amount mismatch" }, { status: 400 });
      }
      const orderTier = (order.notes as Record<string, string> | undefined)?.tier;
      if (orderTier && orderTier !== tier) {
        return NextResponse.json({ detail: "Plan tier mismatch" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ detail: "Could not verify order" }, { status: 400 });
    }
  }

  const profileRes = await fetch(`${API_URL}/v1/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!profileRes.ok) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  const profile = await profileRes.json();

  const result = await syncTierToConvex({
    userId: profile.id,
    email: profile.email,
    tier: tier as PaidTier,
    razorpayPaymentId: paymentId,
    razorpayOrderId: orderId,
    amount: expectedAmount,
    currency: "INR",
  });

  return NextResponse.json({ ok: true, tier: result.tier || tier });
}
