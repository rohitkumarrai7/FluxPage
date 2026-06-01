"use client";

import { useFeatureFlagEnabled } from "posthog-js/react";

export function useFluxFlag(flag: string): boolean {
  return useFeatureFlagEnabled(flag) ?? false;
}
