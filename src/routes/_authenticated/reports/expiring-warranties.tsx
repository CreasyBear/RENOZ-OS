/**
 * Expiring Warranties Report Page
 *
 * Dedicated report page for warranties approaching expiration.
 * Features filter bar, data table with color-coded urgency, CSV export.
 *
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-003c.wireframe.md
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003c
 */

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import { ExpiringWarrantiesReportPage } from '@/components/domain/reports/expiring-warranties-page';

// ============================================================================
// ROUTE SEARCH PARAMS
// ============================================================================

const searchSchema = z.object({
  range: z.enum(['7', '30', '60', '90']).default('30').catch('30'),
  customer: z.string().optional(),
  product: z.string().optional(),
  status: z.enum(['active', 'expired', 'all']).default('active').catch('active'),
  sort: z
    .enum(['expiry_asc', 'expiry_desc', 'customer', 'product'])
    .default('expiry_asc')
    .catch('expiry_asc'),
  page: z.coerce.number().min(1).default(1).catch(1),
});

export const Route = createFileRoute('/_authenticated/reports/expiring-warranties')({
  component: ExpiringWarrantiesRoute,
  validateSearch: searchSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Expiring Warranties"
        description="Monitor warranties approaching expiration for renewal opportunities"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function ExpiringWarrantiesRoute() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Expiring Warranties"
        description="Monitor warranties approaching expiration for renewal opportunities"
      />
      <PageLayout.Content>
        <ExpiringWarrantiesReportPage />
      </PageLayout.Content>
    </PageLayout>
  );
}
