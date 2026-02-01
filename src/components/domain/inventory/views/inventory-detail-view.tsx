/**
 * Inventory Detail View (Presenter)
 *
 * Full-width layout following Order Detail gold standard patterns.
 * Maximizes schema field presentation with specialized section components.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see src/components/domain/orders/views/order-detail-view.tsx
 */

import { memo, useMemo, type ReactNode } from 'react';
import { format, formatDistanceToNow, isPast, isBefore, addDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package,
  MapPin,
  Layers,
  History,
  TrendingUp,
  Link2,
  ChevronRight,
  PanelRight,
  AlertTriangle,
  Hash,
  Barcode,
  Building,
  DollarSign,
  Shield,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { StatusCell } from '@/components/shared/data-table';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import {
  FORECAST_ACCURACY_CONFIG,
  getForecastAccuracyLevel,
} from '../inventory-status-config';
import type { ItemDetailData } from '../item-detail';
import type { MovementRecord, CostLayer, ForecastData, QualityRecord } from '../item-tabs';

// ============================================================================
// TYPES
// ============================================================================

/** Location breakdown for stock distribution */
export interface LocationStock {
  id: string;
  locationCode: string;
  locationName: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  totalValue: number;
  utilizationPercent?: number;
}

/** Supplier info for the item */
export interface SupplierInfo {
  id: string;
  name: string;
  code?: string;
  leadTimeDays?: number;
  lastPurchasePrice?: number;
  lastOrderDate?: Date;
}

export interface InventoryDetailViewProps {
  item: ItemDetailData;
  movements?: MovementRecord[];
  costLayers?: CostLayer[];
  forecasts?: ForecastData[];
  qualityRecords?: QualityRecord[];
  locationBreakdown?: LocationStock[];
  suppliers?: SupplierInfo[];
  reorderPoint?: number;
  maxStockLevel?: number;
  safetyStock?: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  isLoadingMovements?: boolean;
  isLoadingCostLayers?: boolean;
  isLoadingForecasts?: boolean;
  isLoadingQuality?: boolean;
  className?: string;
}

// ============================================================================
// LOCAL CONFIGURATIONS
// ============================================================================

const INVENTORY_STATUS_DETAIL_CONFIG: Record<string, { label: string; color: string }> = {
  available: {
    label: 'Available',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  },
  allocated: {
    label: 'Allocated',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  },
  sold: {
    label: 'Sold',
    color: 'bg-secondary text-secondary-foreground',
  },
  damaged: {
    label: 'Damaged',
    color: 'bg-destructive/10 text-destructive',
  },
  returned: {
    label: 'Returned',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  },
  quarantined: {
    label: 'Quarantined',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  },
};

const MOVEMENT_ICON_MAP: Record<string, typeof ArrowUp> = {
  receive: ArrowDown,
  allocate: ArrowLeftRight,
  deallocate: ArrowLeftRight,
  pick: ArrowUp,
  ship: ArrowUp,
  adjust: ArrowLeftRight,
  return: ArrowDown,
  transfer: ArrowLeftRight,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getExpiryStatus(
  expiryDate: Date | undefined
): { isExpired: boolean; isExpiringSoon: boolean; text: string } {
  if (!expiryDate) return { isExpired: false, isExpiringSoon: false, text: '' };
  const expiry = new Date(expiryDate);
  const now = new Date();
  const isExpired = isPast(expiry);
  const isExpiringSoon = !isExpired && isBefore(expiry, addDays(now, 30));
  const text = isExpired
    ? `Expired ${formatDistanceToNow(expiry)} ago`
    : `Expires ${formatDistanceToNow(expiry, { addSuffix: true })}`;
  return { isExpired, isExpiringSoon, text };
}

function calculateStockLevelPercent(
  current: number,
  max: number
): number {
  if (max <= 0) return 0;
  return Math.min(Math.round((current / max) * 100), 100);
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// ============================================================================
// META CHIPS ROW (Project Management pattern)
// ============================================================================

interface MetaChip {
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
}

function MetaChipsRow({ items }: { items: MetaChip[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {items.map((item, idx) => (
        <div key={`${item.label}-${idx}`} className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
            {item.label && <span className="text-muted-foreground">{item.label}:</span>}
            <span className="text-foreground font-medium">{item.value}</span>
          </div>
          {idx < items.length - 1 && <Separator orientation="vertical" className="h-4" />}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// INVENTORY HEADER
// ============================================================================

interface InventoryHeaderProps {
  item: ItemDetailData;
  reorderPoint?: number;
}

function InventoryHeader({ item, reorderPoint }: InventoryHeaderProps) {
  const statusConfig =
    INVENTORY_STATUS_DETAIL_CONFIG[item.status] ?? INVENTORY_STATUS_DETAIL_CONFIG.available;
  const expiryStatus = getExpiryStatus(item.expiryDate);
  const isLowStock = reorderPoint !== undefined && item.quantityAvailable < reorderPoint;

  const metaItems: MetaChip[] = [
    { label: 'SKU', value: item.productSku, icon: <Hash className="h-3.5 w-3.5" /> },
    {
      label: 'Location',
      value: `${item.locationCode} - ${item.locationName}`,
      icon: <MapPin className="h-3.5 w-3.5" />,
    },
    ...(item.lotNumber
      ? [
          {
            label: 'Lot',
            value: item.lotNumber,
            icon: <Package className="h-3.5 w-3.5" />,
          },
        ]
      : []),
    ...(item.serialNumber
      ? [
          {
            label: 'S/N',
            value: item.serialNumber,
            icon: <Barcode className="h-3.5 w-3.5" />,
          },
        ]
      : []),
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground leading-tight">
            {item.productName}
          </h1>
          <div className="flex items-center gap-2">
            <Badge className={cn('gap-1 text-[11px]', statusConfig.color)}>
              <Package className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            {item.qualityStatus && (
              <Badge
                className={cn(
                  'text-[11px]',
                  item.qualityStatus === 'good' &&
                    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
                  item.qualityStatus === 'damaged' && 'bg-destructive/10 text-destructive',
                  item.qualityStatus === 'expired' &&
                    'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
                  item.qualityStatus === 'quarantined' &&
                    'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                )}
              >
                {item.qualityStatus.charAt(0).toUpperCase() + item.qualityStatus.slice(1)}
              </Badge>
            )}
            {isLowStock && (
              <Badge className="text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                Low Stock
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Expiry Alert */}
      {(expiryStatus.isExpired || expiryStatus.isExpiringSoon) && (
        <div
          className={cn(
            'flex items-center gap-2 text-sm',
            expiryStatus.isExpired
              ? 'text-destructive'
              : 'text-amber-600 dark:text-amber-400'
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          {expiryStatus.text}
        </div>
      )}

      <MetaChipsRow items={metaItems} />
    </section>
  );
}

// ============================================================================
// STOCK LEVEL VISUALIZATION
// ============================================================================

interface StockLevelVisualizationProps {
  item: ItemDetailData;
  reorderPoint?: number;
  maxStockLevel?: number;
  safetyStock?: number;
}

function StockLevelVisualization({
  item,
  reorderPoint = 10,
  maxStockLevel = 100,
  safetyStock = 5,
}: StockLevelVisualizationProps) {
  const reorderPercent = calculateStockLevelPercent(reorderPoint, maxStockLevel);
  const safetyPercent = calculateStockLevelPercent(safetyStock, maxStockLevel);
  const availablePercent = calculateStockLevelPercent(item.quantityAvailable, maxStockLevel);

  const isLowStock = item.quantityAvailable <= reorderPoint;
  const isCritical = item.quantityAvailable <= safetyStock;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Stock Levels</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Quantity Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold tabular-nums">{item.quantityOnHand}</div>
            <div className="text-sm text-muted-foreground">On Hand</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold tabular-nums text-blue-600">
              {item.quantityAllocated}
            </div>
            <div className="text-sm text-muted-foreground">Allocated</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div
              className={cn(
                'text-3xl font-bold tabular-nums',
                isCritical
                  ? 'text-destructive'
                  : isLowStock
                    ? 'text-amber-600'
                    : 'text-green-600'
              )}
            >
              {item.quantityAvailable}
            </div>
            <div className="text-sm text-muted-foreground">Available</div>
          </div>
        </div>

        {/* Progress Visualization */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stock Level</span>
              <span className="font-medium tabular-nums">{availablePercent}% of max</span>
            </div>
            <div className="relative">
              <Progress
                value={availablePercent}
                className={cn(
                  'h-3',
                  isCritical && '[&>div]:bg-destructive',
                  isLowStock && !isCritical && '[&>div]:bg-amber-500'
                )}
              />
              {/* Reorder Point Marker */}
              <div
                className="absolute top-0 h-3 w-0.5 bg-amber-500"
                style={{ left: `${reorderPercent}%` }}
                title={`Reorder Point: ${reorderPoint}`}
              />
              {/* Safety Stock Marker */}
              <div
                className="absolute top-0 h-3 w-0.5 bg-destructive"
                style={{ left: `${safetyPercent}%` }}
                title={`Safety Stock: ${safetyStock}`}
              />
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-destructive rounded-full" />
              Safety ({safetyStock})
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              Reorder ({reorderPoint})
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-muted rounded-full" />
              Max ({maxStockLevel})
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// COSTING BREAKDOWN
// ============================================================================

interface CostingBreakdownProps {
  item: ItemDetailData;
  costLayers?: CostLayer[];
}

function CostingBreakdown({ item, costLayers = [] }: CostingBreakdownProps) {
  const totalLayerValue = costLayers.reduce((sum, l) => sum + l.totalCost, 0);
  const weightedAvgCost =
    costLayers.length > 0
      ? totalLayerValue / costLayers.reduce((sum, l) => sum + l.quantityRemaining, 0)
      : item.unitCost;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Costing</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Unit Cost & Total Value */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Unit Cost
            </span>
            <span className="font-medium tabular-nums">
              <FormatAmount amount={item.unitCost} />
            </span>
          </div>
          {costLayers.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4" /> Weighted Avg
              </span>
              <span className="font-medium tabular-nums">
                <FormatAmount amount={weightedAvgCost} />
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total Value</span>
            <span className="tabular-nums">
              <FormatAmount amount={item.totalValue} />
            </span>
          </div>
        </div>

        {/* Cost Layers Summary */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost Layers</span>
            <span className="font-medium">{costLayers.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost Method</span>
            <Badge variant="outline" className="text-xs">
              FIFO
            </Badge>
          </div>
          {costLayers.length > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Oldest Layer</span>
                <span>{format(new Date(costLayers[0].receivedAt), 'PP')}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// LOCATION BREAKDOWN
// ============================================================================

interface LocationBreakdownProps {
  locationBreakdown?: LocationStock[];
}

function LocationBreakdown({ locationBreakdown = [] }: LocationBreakdownProps) {
  if (locationBreakdown.length === 0) return null;

  const totalQuantity = locationBreakdown.reduce((sum, l) => sum + l.quantityOnHand, 0);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Stock by Location</h2>
        <span className="text-sm text-muted-foreground">
          {locationBreakdown.length} locations
        </span>
      </div>
      <div className="space-y-2">
        {locationBreakdown.map((location) => {
          const percent =
            totalQuantity > 0
              ? Math.round((location.quantityOnHand / totalQuantity) * 100)
              : 0;

          return (
            <div
              key={location.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-medium">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{location.locationName}</div>
                  <div className="text-xs text-muted-foreground">{location.locationCode}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium tabular-nums">
                    {location.quantityOnHand}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {location.quantityAvailable} avail
                  </div>
                </div>
                <div className="w-16 text-right">
                  <Badge variant="secondary" className="text-xs tabular-nums">
                    {percent}%
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// MOVEMENT HISTORY PREVIEW
// ============================================================================

interface MovementHistoryPreviewProps {
  movements?: MovementRecord[];
  isLoading?: boolean;
}

function MovementHistoryPreview({ movements = [], isLoading }: MovementHistoryPreviewProps) {
  const displayMovements = movements.slice(0, 5);
  const hasMore = movements.length > 5;

  if (isLoading) {
    return (
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Movements</h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-2">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (movements.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Recent Movements</h2>
        <span className="text-sm text-muted-foreground">{movements.length} total</span>
      </div>
      <div className="space-y-2">
        {displayMovements.map((movement) => {
          const Icon = MOVEMENT_ICON_MAP[movement.movementType] || ArrowLeftRight;
          const isPositive = movement.quantity > 0;

          return (
            <div
              key={movement.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded flex items-center justify-center',
                    isPositive
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium capitalize">
                    {movement.movementType}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(movement.performedAt), 'PP')}
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  'text-sm font-medium tabular-nums',
                  isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {isPositive ? '+' : ''}
                {movement.quantity}
              </div>
            </div>
          );
        })}
        {hasMore && (
          <div className="text-sm text-muted-foreground text-center py-2">
            +{movements.length - 5} more movements
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// SUPPLIER INFO
// ============================================================================

interface SupplierInfoSectionProps {
  suppliers?: SupplierInfo[];
}

function SupplierInfoSection({ suppliers = [] }: SupplierInfoSectionProps) {
  if (suppliers.length === 0) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Suppliers</h2>
      <div className="space-y-2">
        {suppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                <Building className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{supplier.name}</div>
                {supplier.code && (
                  <div className="text-xs text-muted-foreground">{supplier.code}</div>
                )}
              </div>
            </div>
            <div className="text-right text-sm">
              {supplier.lastPurchasePrice && (
                <div className="font-medium tabular-nums">
                  <FormatAmount amount={supplier.lastPurchasePrice} />
                </div>
              )}
              {supplier.leadTimeDays && (
                <div className="text-xs text-muted-foreground">
                  {supplier.leadTimeDays}d lead time
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// RIGHT META PANEL
// ============================================================================

interface RightMetaPanelProps {
  item: ItemDetailData;
}

function RightMetaPanel({ item }: RightMetaPanelProps) {
  return (
    <aside className="flex flex-col gap-8 p-4 pt-8 lg:sticky lg:self-start lg:top-4">
      {/* Product Info */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Product
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{item.productName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {item.productDescription || 'No description'}
            </div>
          </div>
        </div>
      </div>
      <Separator />

      {/* Identification */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Identification
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">SKU</span>
            <span className="font-mono text-xs">{item.productSku}</span>
          </div>
          {item.serialNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serial #</span>
              <span className="font-mono text-xs">{item.serialNumber}</span>
            </div>
          )}
          {item.lotNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lot #</span>
              <span className="font-mono text-xs">{item.lotNumber}</span>
            </div>
          )}
          {item.binLocation && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bin</span>
              <span className="font-mono text-xs">{item.binLocation}</span>
            </div>
          )}
        </div>
      </div>
      <Separator />

      {/* Location */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Location
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Code</span>
            <span>{item.locationCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="truncate max-w-[120px]">{item.locationName}</span>
          </div>
        </div>
      </div>
      <Separator />

      {/* Dates */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Dates
        </h3>
        <div className="space-y-2 text-sm">
          {item.expiryDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expiry</span>
              <span
                className={cn(
                  isPast(new Date(item.expiryDate)) && 'text-destructive font-medium'
                )}
              >
                {format(new Date(item.expiryDate), 'PP')}
              </span>
            </div>
          )}
          {item.receivedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Received</span>
              <span>{format(new Date(item.receivedAt), 'PP')}</span>
            </div>
          )}
          {item.lastMovementAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Move</span>
              <span>{format(new Date(item.lastMovementAt), 'PP')}</span>
            </div>
          )}
        </div>
      </div>
      <Separator />

      {/* Audit Trail */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Audit Trail
        </h3>
        <div className="space-y-2 text-sm">
          {item.createdAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{format(new Date(item.createdAt), 'PP')}</span>
            </div>
          )}
          {item.updatedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span>{format(new Date(item.updatedAt), 'PP')}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// MOVEMENTS TAB CONTENT
// ============================================================================

interface MovementsTabContentProps {
  movements?: MovementRecord[];
  isLoading?: boolean;
}

function MovementsTabContent({ movements = [], isLoading }: MovementsTabContentProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 border rounded">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No movement history</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2">
        {movements.map((movement) => {
          const Icon = MOVEMENT_ICON_MAP[movement.movementType] || ArrowLeftRight;
          const isPositive = movement.quantity > 0;

          return (
            <div
              key={movement.id}
              className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50"
            >
              <div
                className={cn(
                  'p-2 rounded',
                  isPositive
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium capitalize">{movement.movementType}</span>
                  {movement.referenceType && (
                    <Badge variant="outline" className="text-xs">
                      {movement.referenceType.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {movement.performedBy} - {format(new Date(movement.performedAt), 'PPp')}
                </div>
                {movement.reason && (
                  <div className="text-sm text-muted-foreground mt-1">{movement.reason}</div>
                )}
              </div>

              <div className="text-right tabular-nums">
                <div
                  className={cn(
                    'font-semibold',
                    isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {movement.quantity}
                </div>
                <div className="text-xs text-muted-foreground">
                  {movement.previousQuantity} - {movement.newQuantity}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// COST LAYERS TAB CONTENT
// ============================================================================

interface CostLayersTabContentProps {
  costLayers?: CostLayer[];
  isLoading?: boolean;
}

function CostLayersTabContent({ costLayers = [], isLoading }: CostLayersTabContentProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 border rounded">
            <Skeleton className="h-6 w-24" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (costLayers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No cost layers recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {costLayers.map((layer, index) => (
        <div
          key={layer.id}
          className={cn(
            'flex items-center gap-4 p-3 border rounded-lg',
            index === 0 && 'border-primary/50 bg-primary/5'
          )}
        >
          <div className="w-16 text-center">
            <Badge variant={index === 0 ? 'default' : 'secondary'}>L{index + 1}</Badge>
          </div>

          <div className="flex-1">
            <div className="text-sm">
              Received: {format(new Date(layer.receivedAt), 'PP')}
            </div>
            {layer.expiryDate && (
              <div
                className={cn(
                  'text-xs',
                  isPast(new Date(layer.expiryDate))
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                )}
              >
                Expires: {format(new Date(layer.expiryDate), 'PP')}
              </div>
            )}
          </div>

          <div className="text-center tabular-nums">
            <div className="font-medium">{layer.quantityRemaining}</div>
            <div className="text-xs text-muted-foreground">of {layer.quantityReceived}</div>
          </div>

          <div className="text-right tabular-nums w-24">
            <div className="font-medium">
              <FormatAmount amount={layer.unitCost} />
            </div>
            <div className="text-xs text-muted-foreground">per unit</div>
          </div>

          <div className="text-right tabular-nums w-28">
            <div className="font-semibold">
              <FormatAmount amount={layer.totalCost} />
            </div>
            <div className="text-xs text-muted-foreground">total</div>
          </div>
        </div>
      ))}

      {/* Total Row */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg font-semibold">
        <div className="w-16" />
        <div className="flex-1">Total</div>
        <div className="tabular-nums">
          {costLayers.reduce((sum, l) => sum + l.quantityRemaining, 0)}
        </div>
        <div className="w-24" />
        <div className="text-right tabular-nums w-28">
          <FormatAmount amount={costLayers.reduce((sum, l) => sum + l.totalCost, 0)} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FORECASTS TAB CONTENT
// ============================================================================

interface ForecastsTabContentProps {
  forecasts?: ForecastData[];
  isLoading?: boolean;
}

function ForecastsTabContent({ forecasts = [], isLoading }: ForecastsTabContentProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 border rounded">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (forecasts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No forecast data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {forecasts.map((forecast) => (
        <div key={forecast.period} className="flex items-center gap-4 p-3 border rounded-lg">
          <div className="w-24 font-medium">{forecast.period}</div>

          <div className="flex-1 grid grid-cols-3 gap-4 tabular-nums text-center">
            <div>
              <div className="text-sm text-muted-foreground">Forecast</div>
              <div className="font-medium">{forecast.forecastedDemand}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Actual</div>
              <div className="font-medium">{forecast.actualDemand ?? '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Variance</div>
              <div
                className={cn(
                  'font-medium',
                  forecast.variance && forecast.variance > 0 && 'text-red-600',
                  forecast.variance && forecast.variance < 0 && 'text-green-600'
                )}
              >
                {forecast.variance !== undefined
                  ? `${forecast.variance > 0 ? '+' : ''}${forecast.variance}`
                  : '-'}
              </div>
            </div>
          </div>

          {forecast.accuracy !== undefined && (
            <StatusCell
              status={getForecastAccuracyLevel(forecast.accuracy)}
              statusConfig={FORECAST_ACCURACY_CONFIG}
              className="tabular-nums"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// QUALITY TAB CONTENT
// ============================================================================

interface QualityTabContentProps {
  qualityRecords?: QualityRecord[];
  isLoading?: boolean;
}

function QualityTabContent({ qualityRecords = [], isLoading }: QualityTabContentProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 border rounded">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (qualityRecords.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No quality inspections recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {qualityRecords.map((record) => (
        <div key={record.id} className="flex items-start gap-4 p-3 border rounded-lg">
          <div
            className={cn(
              'p-2 rounded',
              record.result === 'pass' && 'bg-green-100 text-green-600',
              record.result === 'fail' && 'bg-red-100 text-red-600',
              record.result === 'conditional' && 'bg-yellow-100 text-yellow-600'
            )}
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
          </div>

          <div className="flex-1">
            <div className="font-medium">{format(new Date(record.inspectionDate), 'PP')}</div>
            <div className="text-sm text-muted-foreground">
              Inspected by {record.inspectorName}
            </div>
            {record.notes && <div className="text-sm mt-1">{record.notes}</div>}
            {record.defects && record.defects.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {record.defects.map((defect, i) => (
                  <Badge key={i} variant="outline" className="text-xs text-red-600">
                    {defect}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Badge
            variant={
              record.result === 'pass'
                ? 'default'
                : record.result === 'fail'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {record.result.charAt(0).toUpperCase() + record.result.slice(1)}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const InventoryDetailView = memo(function InventoryDetailView({
  item,
  movements = [],
  costLayers = [],
  forecasts = [],
  qualityRecords = [],
  locationBreakdown = [],
  suppliers = [],
  reorderPoint = 10,
  maxStockLevel = 100,
  safetyStock = 5,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  isLoadingMovements,
  isLoadingCostLayers,
  isLoadingForecasts,
  isLoadingQuality,
  className,
}: InventoryDetailViewProps) {
  const movementsCount = useMemo(() => movements.length, [movements]);

  return (
    <div
      className={cn(
        'flex flex-1 flex-col min-w-0 m-2 border border-border rounded-lg',
        className
      )}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Inventory</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{item.productSku}</span>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(window.location.href)}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy link</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8', showMetaPanel && 'bg-muted')}
                  onClick={onToggleMetaPanel}
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content - FULL WIDTH (no max-w-7xl) */}
      <div className="flex flex-1 flex-col bg-background px-2 rounded-b-lg min-w-0 border-t">
        <div className="px-4">
          <div
            className={cn(
              'grid grid-cols-1 gap-12',
              showMetaPanel ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,320px)]' : 'lg:grid-cols-1'
            )}
          >
            {/* Primary Content */}
            <div className="space-y-6 pt-4 pb-6">
              <InventoryHeader item={item} reorderPoint={reorderPoint} />

              <Tabs value={activeTab} onValueChange={onTabChange}>
                <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="movements"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Movements ({movementsCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="cost-layers"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Cost Layers
                  </TabsTrigger>
                  <TabsTrigger
                    value="forecasts"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Forecasts
                  </TabsTrigger>
                  <TabsTrigger
                    value="quality"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Quality
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                  >
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab - space-y-10 for generous spacing between sections */}
                <TabsContent value="overview" className="mt-0 pt-6">
                  <div className="space-y-10">
                    <StockLevelVisualization
                      item={item}
                      reorderPoint={reorderPoint}
                      maxStockLevel={maxStockLevel}
                      safetyStock={safetyStock}
                    />
                    <CostingBreakdown item={item} costLayers={costLayers} />
                    <LocationBreakdown locationBreakdown={locationBreakdown} />
                    <MovementHistoryPreview
                      movements={movements}
                      isLoading={isLoadingMovements}
                    />
                    <SupplierInfoSection suppliers={suppliers} />
                  </div>
                </TabsContent>

                {/* Movements Tab */}
                <TabsContent value="movements" className="mt-0 pt-6">
                  <MovementsTabContent movements={movements} isLoading={isLoadingMovements} />
                </TabsContent>

                {/* Cost Layers Tab */}
                <TabsContent value="cost-layers" className="mt-0 pt-6">
                  <CostLayersTabContent
                    costLayers={costLayers}
                    isLoading={isLoadingCostLayers}
                  />
                </TabsContent>

                {/* Forecasts Tab */}
                <TabsContent value="forecasts" className="mt-0 pt-6">
                  <ForecastsTabContent forecasts={forecasts} isLoading={isLoadingForecasts} />
                </TabsContent>

                {/* Quality Tab */}
                <TabsContent value="quality" className="mt-0 pt-6">
                  <QualityTabContent
                    qualityRecords={qualityRecords}
                    isLoading={isLoadingQuality}
                  />
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0 pt-6">
                  <UnifiedActivityTimeline
                    activities={activities}
                    isLoading={activitiesLoading}
                    hasError={!!activitiesError}
                    error={activitiesError || undefined}
                    title="Activity Timeline"
                    description="Complete history of inventory changes, stock movements, and system events"
                    showFilters={true}
                    emptyMessage="No activity recorded yet"
                    emptyDescription="Inventory activities will appear here when changes are made."
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Animated Side Meta Panel */}
            <AnimatePresence initial={false}>
              {showMetaPanel && (
                <motion.div
                  key="meta-panel"
                  initial={{ x: 80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 80, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className="lg:border-l lg:border-border"
                >
                  <RightMetaPanel item={item} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Separator className="mt-auto" />
      </div>
    </div>
  );
});

export default InventoryDetailView;
