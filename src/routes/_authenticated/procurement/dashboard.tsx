/**
 * Procurement Dashboard Route
 *
 * Route glue only. The container lives outside the route file so TanStack Router
 * can code-split this route without retaining extra route-file exports.
 */
import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { FinancialDashboardSkeleton } from '@/components/skeletons/financial';
import { ProcurementDashboardPage } from './-dashboard-page';
import { procurementDashboardSearchSchema } from '@/lib/schemas/procurement/procurement-dashboard-search';

function ProcurementDashboardRouteComponent() {
  return (
    <ProcurementDashboardPage
      search={Route.useSearch()}
      navigate={Route.useNavigate()}
    />
  );
}

export const Route = createFileRoute('/_authenticated/procurement/dashboard')({
  validateSearch: procurementDashboardSearchSchema,
  component: ProcurementDashboardRouteComponent,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/procurement" />
  ),
  pendingComponent: () => <FinancialDashboardSkeleton />,
});
