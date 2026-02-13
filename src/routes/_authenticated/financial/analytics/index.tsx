/**
 * Financial Analytics Route
 *
 * Dedicated analytics page with financial dashboard widgets:
 * - KPI metrics (revenue, AR, payments, GST)
 * - Revenue trends chart
 * - Top customers table
 * - Outstanding invoices list
 *
 * Separated from landing page to follow DOMAIN-LANDING-STANDARDS.md pattern.
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 * @see src/routes/_authenticated/financial/financial-page.tsx (component)
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { FinancialDashboardSkeleton } from '@/components/skeletons/financial';

const FinancialAnalyticsPage = lazy(() => import('./financial-analytics-page'));

export const Route = createFileRoute('/_authenticated/financial/analytics/')({
  component: () => (
    <Suspense
      fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header
            title="Financial Analytics"
            description="Revenue trends, KPIs, and financial insights"
          />
          <PageLayout.Content>
            <FinancialDashboardSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }
    >
      <FinancialAnalyticsPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Financial Analytics"
        description="Revenue trends, KPIs, and financial insights"
      />
      <PageLayout.Content>
        <FinancialDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
