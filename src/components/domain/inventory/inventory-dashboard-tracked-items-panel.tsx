import { Link } from '@tanstack/react-router';
import { Edit2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusCell } from '@/components/shared/data-table';
import { STOCK_STATUS_CONFIG } from './inventory-status-config';
import { InventoryDashboardReadWarning } from './inventory-dashboard-read-warning';
import type { TrackedProductWithInventory } from '@/lib/schemas/dashboard/tracked-products';

const TRACKED_ITEM_REORDER_POINT = 10;

interface TrackedItemStatus {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  reorderPoint: number;
  status: 'healthy' | 'low' | 'out';
}

interface InventoryDashboardTrackedItemsPanelProps {
  items: TrackedProductWithInventory[];
  selectedCount: number;
  isLoading: boolean;
  warningMessage?: string | null;
  unavailableMessage?: string | null;
  onEdit: () => void;
}

export function InventoryDashboardTrackedItemsPanel({
  items,
  selectedCount,
  isLoading,
  warningMessage,
  unavailableMessage,
  onEdit,
}: InventoryDashboardTrackedItemsPanelProps) {
  const itemsWithStatus = items.map((item) => ({
    productId: item.id,
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
    reorderPoint: TRACKED_ITEM_REORDER_POINT,
    status: getStockStatus(item.quantity, TRACKED_ITEM_REORDER_POINT),
  }));
  const showUnavailable = !!unavailableMessage && selectedCount > 0;

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Tracked Items</CardTitle>
        <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs h-7">
          <Edit2 className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TrackedItemsSkeleton />
        ) : showUnavailable ? (
          <InventoryDashboardReadWarning
            title="Tracked items are temporarily unavailable."
            message={unavailableMessage}
          />
        ) : (
          <div className="space-y-4">
            {warningMessage ? (
              <InventoryDashboardReadWarning
                title="Tracked items may be stale."
                message={warningMessage}
              />
            ) : null}
            <TrackedItemsList items={itemsWithStatus} onAddItems={onEdit} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrackedItemsList({
  items,
  onAddItems,
}: {
  items: TrackedItemStatus[];
  onAddItems: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No items tracked yet</p>
        <Button variant="link" size="sm" className="mt-1" onClick={onAddItems}>
          Add items to track
        </Button>
      </div>
    );
  }

  const statusKeyMap: Record<string, keyof typeof STOCK_STATUS_CONFIG> = {
    healthy: 'in_stock',
    low: 'low_stock',
    out: 'out_of_stock',
  };

  return (
    <div className="space-y-2">
      {items.slice(0, 5).map((item) => {
        const mappedStatus = statusKeyMap[item.status] ?? 'in_stock';
        return (
          <Link
            key={item.productId}
            to="/products/$productId"
            params={{ productId: item.productId }}
            search={{ tab: 'inventory' }}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{item.sku}</p>
              <p className="text-xs text-muted-foreground truncate">{item.name}</p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs tabular-nums">{item.quantity}</span>
              <StatusCell
                status={mappedStatus}
                statusConfig={STOCK_STATUS_CONFIG}
                showIcon
                className="text-xs"
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function TrackedItemsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between p-2">
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getStockStatus(quantity: number, reorderPoint: number): 'healthy' | 'low' | 'out' {
  if (quantity === 0) return 'out';
  if (quantity <= reorderPoint) return 'low';
  return 'healthy';
}
