/**
 * Email History Route
 *
 * Organization-wide email delivery history list.
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

const EmailHistoryPage = lazy(() => import("./-email-history-page"));

export const Route = createFileRoute("/_authenticated/communications/emails/history")({
  component: () => (
    <Suspense fallback={<CommunicationsListSkeleton />}>
      <EmailHistoryPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});
