import posthog from "posthog-js";

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/ingest";

export function isPostHogEnabled(): boolean {
  return typeof window !== "undefined" && POSTHOG_KEY.length > 0;
}

export function getPostHogClient() {
  return posthog;
}
