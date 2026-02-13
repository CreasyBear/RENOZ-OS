/**
 * Scheduled Calls Index Route
 *
 * Route definition for scheduled calls with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/communications/calls/calls-page.tsx - Page component
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

const CallsPage = lazy(() => import("./calls-page"));

export const Route = createFileRoute("/_authenticated/communications/calls/")({
  component: () => (
    <Suspense fallback={<CommunicationsListSkeleton />}>
      <CallsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});
