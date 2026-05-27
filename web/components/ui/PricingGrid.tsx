import { Card } from "./Card";
import { Button } from "./Button";
import { cn } from "@/lib/utils";
import { PRICING_PLANS, type PricingPlanId } from "@/lib/pricingPlans";

type PaidTier = Extract<PricingPlanId, "pro" | "premium">;

function isPaidTier(id: PricingPlanId): id is PaidTier {
  return id === "pro" || id === "premium";
}

export { PRICING_PLANS };

interface PricingGridProps {
  isLoggedIn?: boolean;
  className?: string;
  currentTier?: string;
  onUpgrade?: (tier: "pro" | "premium") => void;
  loadingTier?: "pro" | "premium" | null;
}

export function PricingGrid({
  isLoggedIn = false,
  className,
  currentTier = "free",
  onUpgrade,
  loadingTier = null,
}: PricingGridProps) {
  const ctaHref = isLoggedIn ? "/dashboard/billing" : "/register";

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-lg sm:max-w-none mx-auto", className)}>
      {PRICING_PLANS.map((plan) => {
        const isCurrent = currentTier === plan.id;
        const isPaid = plan.id === "pro" || plan.id === "premium";
        const showCheckout = isLoggedIn && isPaid && onUpgrade && !isCurrent;

        return (
          <Card
            key={plan.name}
            className={cn(
              plan.highlight && "ring-2 ring-primary/20 border-primary/30",
              isCurrent && "border-primary/40 bg-primary/5"
            )}
            padding="md"
          >
            {plan.highlight && (
              <div className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Most Popular</div>
            )}
            {isCurrent && (
              <div className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Current Plan</div>
            )}
            <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
            <div className="mt-2 mb-4">
              {plan.originalPrice && (
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {plan.discountLabel && (
                    <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                      {plan.discountLabel}
                    </span>
                  )}
                  {plan.savingsLabel && (
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                      {plan.savingsLabel}
                    </span>
                  )}
                </div>
              )}
              {plan.originalPrice ? (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">Original</span>
                    <span className="text-2xl font-bold text-muted/80 line-through decoration-2">
                      {plan.originalPrice}
                    </span>
                    <span className="text-sm text-muted">{plan.period}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">Sale</span>
                    <span className="text-4xl font-black text-emerald-700">{plan.price}</span>
                    <span className="text-muted text-sm mb-1">{plan.period}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-foreground">{plan.price}</span>
                  <span className="text-muted text-sm mb-1">{plan.period}</span>
                </div>
              )}
              {plan.launchTagline && (
                <p className="text-sm text-foreground/80 mt-2 font-medium">{plan.launchTagline}</p>
              )}
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            {showCheckout ? (
              <Button
                variant={plan.highlight ? "primary" : "secondary"}
                className="w-full"
                disabled={loadingTier === plan.id}
                onClick={() => {
                  if (isPaidTier(plan.id)) onUpgrade(plan.id);
                }}
              >
                {loadingTier === plan.id ? "Opening checkout…" : plan.cta}
              </Button>
            ) : isCurrent ? (
              <Button variant="secondary" className="w-full" disabled>
                Current plan
              </Button>
            ) : (
              <Button
                href={ctaHref}
                variant={plan.highlight ? "primary" : "secondary"}
                className="w-full"
              >
                {isLoggedIn && isPaid ? "Manage in billing" : plan.cta}
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
