"use client";

import { Suspense } from "react";
import { PostHogProvider } from "./PostHogProvider";
import { PostHogPageView } from "./PostHogPageView";
import { PostHogIdentify } from "./PostHogIdentify";

export function PostHogShell({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogIdentify />
      {children}
    </PostHogProvider>
  );
}
