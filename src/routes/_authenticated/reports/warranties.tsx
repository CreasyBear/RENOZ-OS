/**
 * Warranty Analytics Report Page
 *
 * Comprehensive warranty analytics dashboard with claims breakdown,
 * SLA compliance metrics, trend analysis, and export functionality.
 *
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-008.wireframe.md
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-008
 */

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import { WarrantyAnalyticsPage } from '@/components/domain/reports/warranty-analytics-page';

// ============================================================================
// ROUTE SEARCH PARAMS
// ============================================================================

const searchSchema = z.object({
  range: z.enum(['7', '30', '60', '90', '365', 'all']).default('30').catch('30'),
  warrantyType: z
    .enum(['battery_performance', 'inverter_manufacturer', 'installation_workmanship', 'all'])
    .default('all')
    .catch('all'),
  claimType: z
    .enum([
      'cell_degradation',
      'bms_fault',
      'inverter_failure',
      'installation_defect',
      'other',
      'all',
    ])
    .default('all')
    .catch('all'),
});

export const Route = createFileRoute('/_authenticated/reports/warranties')({
  component: WarrantyAnalyticsRoute,
  validateSearch: searchSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Warranty Analytics"
        description="Monitor warranty performance, claims, and costs"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function WarrantyAnalyticsRoute() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Warranty Analytics"
        description="Monitor warranty performance, claims, and costs"
      />
      <PageLayout.Content>
        <WarrantyAnalyticsPage />
      </PageLayout.Content>
    </PageLayout>
  );
}
