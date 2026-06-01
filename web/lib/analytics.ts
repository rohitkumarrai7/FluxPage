import { getPostHogClient, isPostHogEnabled } from "./posthog";

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, properties?: AnalyticsProperties) {
  if (!isPostHogEnabled()) return;
  getPostHogClient().capture(event, properties);
}

export function identifyUser(
  distinctId: string,
  properties?: AnalyticsProperties
) {
  if (!isPostHogEnabled()) return;
  getPostHogClient().identify(distinctId, properties);
}

export function resetAnalytics() {
  if (!isPostHogEnabled()) return;
  getPostHogClient().reset();
}

export const analytics = {
  userSignedIn(props?: AnalyticsProperties) {
    track("user_signed_in", { method: "clerk", ...props });
  },
  userSignedUp(props?: AnalyticsProperties) {
    track("user_signed_up", { method: "clerk", ...props });
  },
  resumeUploaded(props: { source: string }) {
    track("resume_uploaded", props);
  },
  atsAnalyzed(props: { score: number; has_jd: boolean }) {
    track("ats_analyzed", props);
  },
  tailorOpened(props: { draft_id?: string; initial_score?: number }) {
    track("tailor_opened", props);
  },
  tailorSuggestionApplied(props: { count?: number; type?: string }) {
    track("tailor_suggestion_applied", props);
  },
  tailorBoostCompleted(props: { score_before: number; score_after: number }) {
    track("tailor_boost_completed", props);
  },
  pdfDownloaded(props: { template?: string; tier?: string }) {
    track("pdf_downloaded", props);
  },
  docxDownloaded(props: { template?: string; tier?: string }) {
    track("docx_downloaded", props);
  },
  templateSelected(props: { template_id: string }) {
    track("template_selected", props);
  },
  billingUpgradeStarted(props: { target_tier: string }) {
    track("billing_upgrade_started", props);
  },
  billingUpgradeCompleted(props: { tier: string; amount_paise?: number }) {
    track("billing_upgrade_completed", props);
  },
  planLimitReached(props: { limit_type: string; tier?: string }) {
    track("plan_limit_reached", props);
  },
};
