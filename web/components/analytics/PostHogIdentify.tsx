"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { usePostHog } from "posthog-js/react";
import { api } from "@/lib/api";

export function PostHogIdentify() {
  const { isLoaded, isSignedIn, user } = useUser();
  const posthog = usePostHog();
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog || !isLoaded) return;

    if (!isSignedIn || !user) {
      if (identifiedRef.current) {
        posthog.reset();
        identifiedRef.current = null;
      }
      return;
    }

    const clerkId = user.id;
    if (identifiedRef.current === clerkId) return;

    const stored = api.auth.getUser();
    const distinctId = stored?.id || clerkId;

    posthog.identify(distinctId, {
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName || user.firstName || undefined,
      clerk_id: clerkId,
      tier: stored?.tier || "free",
      onboarding_completed: stored?.onboardingCompleted ?? false,
    });

    identifiedRef.current = clerkId;

    if (api.auth.isLoggedIn()) {
      api.auth.getProfile().then((profile) => {
        posthog.identify(profile.id || distinctId, {
          email: profile.email,
          name: profile.name || undefined,
          tier: profile.tier || "free",
          onboarding_completed: profile.onboardingCompleted ?? false,
        });
      }).catch(() => {});
    }
  }, [isLoaded, isSignedIn, user, posthog]);

  return null;
}
