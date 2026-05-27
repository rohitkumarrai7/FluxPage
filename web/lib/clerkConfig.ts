export const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

export const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

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
