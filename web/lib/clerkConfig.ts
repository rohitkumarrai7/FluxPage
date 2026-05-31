export const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** Server-side: both publishable + secret keys present. */
export const clerkConfigured = Boolean(
  clerkPublishableKey && process.env.CLERK_SECRET_KEY
);

/** Client-safe: publishable key baked into the bundle. */
export const clerkClientConfigured = Boolean(clerkPublishableKey);

/** Dev-only hint for missing Clerk env (never log secret values). */
export function getClerkSetupHint(): string | null {
  if (clerkConfigured) return null;
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    missing.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }
  if (!process.env.CLERK_SECRET_KEY) missing.push("CLERK_SECRET_KEY");
  if (missing.length === 0) return null;
  return `Clerk auth disabled — set ${missing.join(" and ")} on your host (e.g. Vercel).`;
}
