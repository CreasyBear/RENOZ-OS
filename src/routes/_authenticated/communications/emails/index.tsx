/**
 * Scheduled Emails Route
 *
 * Route definition for scheduled emails page with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/communications/emails/scheduled-emails-page.tsx - Page component
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";
import { scheduledEmailsSearchSchema } from "@/lib/schemas/communications/scheduled-emails";

const ScheduledEmailsPage = lazy(() => import('./scheduled-emails-page'));

export type SearchParams = z.infer<typeof scheduledEmailsSearchSchema>;

export const Route = createFileRoute("/_authenticated/communications/emails/")({
  validateSearch: scheduledEmailsSearchSchema,
  component: function EmailsRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={<CommunicationsListSkeleton />}>
        <ScheduledEmailsPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});
