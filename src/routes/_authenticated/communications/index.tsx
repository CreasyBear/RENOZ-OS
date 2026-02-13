/**
 * Communications Index Route
 *
 * Route definition for communications hub with lazy-loaded layout component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/communications/communications-layout.tsx - Layout component
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { CommunicationsLayoutSkeleton } from "@/components/skeletons/communications";

const CommunicationsLayout = lazy(() => import("./communications-layout"));

export const Route = createFileRoute("/_authenticated/communications/")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Communications"
          description="Manage email campaigns, templates, and scheduled communications"
        />
        <PageLayout.Content>
          <CommunicationsLayoutSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <CommunicationsLayout />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Communications"
        description="Manage email campaigns, templates, and scheduled communications"
      />
      <PageLayout.Content>
        <CommunicationsLayoutSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
