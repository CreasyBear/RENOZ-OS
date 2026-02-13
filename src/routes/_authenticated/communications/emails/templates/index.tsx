/**
 * Email Templates Index Route
 *
 * Route definition for email templates management with lazy-loaded component.
 * Includes URL search params validation for filter state sync.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/communications/emails/templates/templates-page.tsx - Page component
 * @see docs/plans/2026-01-24-communications-plumbing-review.md
 * @see FILTER-STANDARDS.md - URL state sync pattern
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";
import { templatesSearchSchema } from "@/lib/schemas/communications/email-templates";

const TemplatesPage = lazy(() => import("./templates-page"));

export type SearchParams = z.infer<typeof templatesSearchSchema>;

export const Route = createFileRoute(
  "/_authenticated/communications/emails/templates/"
)({
  validateSearch: templatesSearchSchema,
  component: function EmailTemplatesRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={<CommunicationsListSkeleton />}>
        <TemplatesPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});
