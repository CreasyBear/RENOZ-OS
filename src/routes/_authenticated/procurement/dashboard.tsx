/**
 * Procurement Dashboard Route
 *
 * Executive procurement overview and real-time monitoring dashboard.
 * Following the fulfillment dashboard pattern with procurement-focused metrics.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-PROCUREMENT-DASHBOARD)
 */
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { PageLayout } from '@/components/layout';

// Lazy-loaded component for bundle optimization
const ProcurementDashboard = lazy(() =>
  import('@/components/domain/procurement/procurement-dashboard').then((m) => ({
    default: m.ProcurementDashboard,
  }))
);

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/procurement/dashboard')({
  component: ProcurementDashboardPage,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ProcurementDashboardPage() {
  return (
    <PageLayout>
      <PageLayout.Header
        title="Procurement Dashboard"
        description="Executive overview of procurement operations and real-time monitoring"
      />

      <PageLayout.Content>
        <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-lg" />}>
          <ProcurementDashboard />
        </Suspense>
      </PageLayout.Content>
    </PageLayout>
  );
}
