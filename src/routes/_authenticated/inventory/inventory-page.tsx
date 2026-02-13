/**
 * Inventory Page Component
 *
 * Comprehensive warehouse management dashboard that provides:
 * - Real-time stock metrics and value
 * - Active inventory alerts
 * - Stock breakdown by category and location
 * - Tracked items watchlist
 * - Recent movements timeline
 * - Top moving products analysis
 *
 * @source wmsData from UnifiedInventoryDashboard (container component handles data fetching)
 *
 * @see src/routes/_authenticated/inventory/index.tsx - Route definition
 * @see docs/design-system/INVENTORY-DASHBOARD-SPEC.md for specification
 */

import { PageLayout } from '@/components/layout';
import { UnifiedInventoryDashboard } from '@/components/domain/inventory/unified-inventory-dashboard';
import { useWMSDashboard } from '@/hooks/inventory';
import { FormatAmount } from '@/components/shared/format';

export default function InventoryPage() {
  // Fetch totals for header display (cached by TanStack Query, so no duplicate network request)
  const { data } = useWMSDashboard();

  const totalValue = data?.totals?.totalValue ?? 0;
  const totalUnits = data?.totals?.totalUnits ?? 0;

  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title="Inventory"
        description="Warehouse management and stock control"
        actions={
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">
              <FormatAmount amount={totalValue} />
            </p>
            <p className="text-sm text-muted-foreground">
              {totalUnits.toLocaleString()} units in stock
            </p>
          </div>
        }
      />

      <PageLayout.Content>
        <UnifiedInventoryDashboard />
      </PageLayout.Content>
    </PageLayout>
  );
}
