/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Inbox Route
 *
 * Unified inbox route combining email history and scheduled emails.
 * Uses lazy loading and code splitting per STANDARDS.md.
 *
 * @see docs/plans/2026-02-06-unified-inbox-email-history-plan.md
 */

import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { RouteErrorFallback } from "@/components/layout";
import { CommunicationsListSkeleton } from "@/components/skeletons/communications";

const InboxPage = lazy(() => import("./inbox-page"));

/**
 * Search params schema for inbox route
 * Supports filtering, search, tabs, and pagination
 */
export const inboxSearchParamsSchema = z.object({
  search: z.string().optional(),
  tab: z.enum(["all", "unread", "sent", "scheduled", "failed"]).optional().default("all"),
  status: z
    .enum(["sent", "delivered", "opened", "clicked", "pending", "bounced", "failed"])
    .optional(),
  type: z.array(z.enum(["history", "scheduled", "campaign"])).optional(),
  customerId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(), // ISO date string
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(50),
});

export const Route = createFileRoute("/_authenticated/communications/inbox/")({
  validateSearch: inboxSearchParamsSchema,
  component: () => (
    <Suspense fallback={<CommunicationsListSkeleton />}>
      <InboxPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/communications" />
  ),
  pendingComponent: () => <CommunicationsListSkeleton />,
});
