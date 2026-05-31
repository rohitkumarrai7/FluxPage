import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type PlanTier = "free" | "pro" | "premium";

export const PLAN_LIMITS: Record<
  PlanTier,
  { tailorsPerMonth: number; maxResumes: number; coverLetters: boolean }
> = {
  free: { tailorsPerMonth: 50, maxResumes: 10, coverLetters: false },
  pro: { tailorsPerMonth: 100, maxResumes: 20, coverLetters: true },
  premium: { tailorsPerMonth: -1, maxResumes: -1, coverLetters: true },
};

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

type Ctx = MutationCtx | QueryCtx;

export function normalizeTier(tier: string | undefined): PlanTier {
  if (tier === "pro" || tier === "premium") return tier;
  return "free";
}

export function getLimits(tier: string | undefined) {
  return PLAN_LIMITS[normalizeTier(tier)];
}

function isUnlimited(n: number) {
  return n < 0;
}

export async function getTailorsUsedThisMonth(ctx: Ctx, userId: Id<"users">): Promise<number> {
  const user = await ctx.db.get(userId);
  if (!user) return 0;
  const now = Date.now();
  const resetAt = user.tailorsResetAt || 0;
  if (now - resetAt > MONTH_MS) return 0;
  return user.tailorsThisMonth || 0;
}

export async function assertCanCreateTailor(ctx: Ctx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");

  const limits = getLimits(user.tier);
  if (isUnlimited(limits.tailorsPerMonth)) return;

  const used = await getTailorsUsedThisMonth(ctx, userId);
  if (used >= limits.tailorsPerMonth) {
    throw new Error(
      `Monthly tailor limit reached (${limits.tailorsPerMonth} on ${normalizeTier(user.tier)} plan). Upgrade to Pro or Premium for more.`
    );
  }
}

export async function incrementTailorUsage(ctx: MutationCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) return;

  const now = Date.now();
  const resetAt = user.tailorsResetAt || 0;
  const monthExpired = now - resetAt > MONTH_MS;
  const current = monthExpired ? 0 : user.tailorsThisMonth || 0;

  await ctx.db.patch(userId, {
    tailorsThisMonth: current + 1,
    tailorsResetAt: monthExpired ? now : resetAt,
    analysesCount: (user.analysesCount || 0) + 1,
  });
}

export async function resetTailorUsage(ctx: MutationCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) return;
  await ctx.db.patch(userId, { tailorsThisMonth: 0, tailorsResetAt: Date.now() });
}

export async function assertCanUploadResume(ctx: Ctx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");

  const limits = getLimits(user.tier);
  if (isUnlimited(limits.maxResumes)) return;

  const resumes = await ctx.db
    .query("resumes")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  if (resumes.length >= limits.maxResumes) {
    throw new Error(
      `Resume limit reached (${limits.maxResumes} on ${normalizeTier(user.tier)} plan). Delete a resume or upgrade your plan.`
    );
  }
}

export function assertCoverLetterAccess(tier: string | undefined) {
  const limits = getLimits(tier);
  if (!limits.coverLetters) {
    throw new Error("Cover letters require a Pro or Premium plan.");
  }
}
