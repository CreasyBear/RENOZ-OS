/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Campaigns Index Route
 *
 * Route definition for email campaigns management with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/communications/campaigns/campaigns-page.tsx - Page component
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

const CampaignsPage = lazy(() => import("./campaigns-page"));

/**
 * Search params schema for campaigns route
 * Supports filtering, search, and pagination
 */
export const searchParamsSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed'])
    .optional(),
  templateType: z.string().optional(),
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(), // ISO date string
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(50),
});

export const Route = createFileRoute("/_authenticated/communications/campaigns/")({
  validateSearch: searchParamsSchema,
  component: () => (
    <Suspense fallback={<CommunicationsListSkeleton />}>
      <CampaignsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});
