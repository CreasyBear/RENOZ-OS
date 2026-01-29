/**
 * Customer Reports Route
 *
 * Executive analytics and reporting for customer insights:
 * - Analytics Dashboard: KPIs, trends, segment performance
 * - Lifecycle Analytics: Cohorts, retention, churn
 * - Value Analysis: LTV, profitability, customer tiers
 *
 * ARCHITECTURE: Route fetches data via hooks, passes to presentational components.
 */
import { createFileRoute } from '@tanstack/react-router'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { ReportDashboardSkeleton } from '@/components/skeletons/reports'
import { CustomerReportsPage } from '@/components/domain/reports/customer-reports-page'

export const Route = createFileRoute('/_authenticated/reports/customers/')({
  component: CustomerReportsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Customer Reports"
        description="Comprehensive analytics and insights for customer management"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
})
