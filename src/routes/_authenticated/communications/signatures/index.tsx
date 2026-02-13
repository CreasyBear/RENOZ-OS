/**
 * Email Signatures Index Route
 *
 * Route definition for email signatures management with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/communications/signatures/signatures-page.tsx - Page component
 * @see docs/plans/2026-01-24-communications-plumbing-review.md
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

const SignaturesPage = lazy(() => import("./signatures-page"));

export const Route = createFileRoute("/_authenticated/communications/signatures/")({
  component: () => (
    <Suspense fallback={<CommunicationsListSkeleton />}>
      <SignaturesPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});
