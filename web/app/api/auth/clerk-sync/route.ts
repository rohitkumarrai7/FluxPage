import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { CONVEX_HTTP_URL } from "@/lib/convexDeployment";

const API_URL = CONVEX_HTTP_URL;

export async function POST() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in" }, { status: 401 });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ detail: "User not found" }, { status: 401 });
  }

  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress || user.emailAddresses[0]?.emailAddress;

  if (!email) {
    return NextResponse.json({ detail: "No email on Clerk account" }, { status: 400 });
  }

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    undefined;

  const syncSecret =
    process.env.CLERK_SYNC_SECRET?.trim() ||
    process.env.RAZORPAY_WEBHOOK_INTERNAL_SECRET?.trim();
  if (!syncSecret) {
    return NextResponse.json(
      {
        detail:
          "CLERK_SYNC_SECRET not configured on Vercel. Add it under Project → Settings → Environment Variables (Production), then redeploy.",
      },
      { status: 500 }
    );
  }

  const res = await fetch(`${API_URL}/v1/auth/clerk-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      syncSecret,
      clerkId: userId,
      email,
      name,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Convex sync failed" }));
    return NextResponse.json(err, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
