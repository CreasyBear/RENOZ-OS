/**
 * Inventory Detail View (Presenter)
 *
 * 5-Zone Item Tracking View for serialized inventory items.
 * Focuses on item lifecycle (Received → Allocated → Shipped → Sold)
 * rather than product-level stock metrics.
 *
 * Zone 1: Header (product name, serial, status)
 * Zone 2: Lifecycle Progress (item lifecycle stages)
 * Zone 3: Alerts (item-contextual only)
 * Zone 4: Tabs (Overview, Movements, Cost Layers, Quality, Activity)
 * Zone 5: Main Content + Sidebar
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { format, formatDistanceToNow, isPast, isBefore, addDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package,
  MapPin,
  Layers,
  History,
  Link2,
  PanelRight,
  AlertTriangle,
  Hash,
  Barcode,
  DollarSign,
  Shield,
  ArrowLeftRight,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { MobileSidebarSheet } from '@/components/shared/mobile-sidebar-sheet';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import type { InventoryItemAlert } from '@/lib/schemas/inventory/item-alerts';
import { InventoryItemAlerts } from '../alerts/inventory-item-alerts';
import {
  ItemLifecycleProgress,
  OrderAssociationCard,
  ItemLifecycleTimeline,
  type OrderAssociation,
} from '../components';
import type { ItemDetailData } from '../item-detail';
import type { MovementRecord, CostLayer, QualityRecord } from '../item-tabs';
import { INVENTORY_STATUS_CONFIG, MOVEMENT_TYPE_CONFIG } from '../inventory-status-config';
import { getMovementReferenceLink } from '../movement-reference-links';
import { StatusCell } from '@/components/shared/data-table';

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryDetailViewProps {
  item: ItemDetailData;
  movements?: MovementRecord[];
  costLayers?: CostLayer[];
  qualityRecords?: QualityRecord[];
  /** Zone 3: Alerts (derived from item state, item-contextual only) */
  alerts?: InventoryItemAlert[];
  /** Handler to dismiss an alert */
  onDismissAlert?: (alertId: string) => void;
  /** Order association data (derived from movements) */
  orderAssociation?: OrderAssociation | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  isLoadingMovements?: boolean;
  isLoadingCostLayers?: boolean;
  isLoadingQuality?: boolean;
  /** Tab counts from composite hook */
  counts?: {
    movements: number;
    costLayers: number;
    qualityRecords: number;
    activities: number;
  };
  className?: string;
}

// ============================================================================
// COMPONENTS
// ============================================================================

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

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

/**
 * Derive order association from movements data
 */
function deriveOrderAssociation(movements: MovementRecord[] = []): OrderAssociation | null {
  // Find the allocation or shipment movement with order reference
  const orderMovement = movements.find(
    (m) =>
      (m.movementType === 'allocate' || m.movementType === 'ship') &&
      m.referenceType === 'order' &&
      m.referenceId
  );

  if (!orderMovement || !orderMovement.referenceId) {
    return null;
  }

  return {
    orderId: orderMovement.referenceId,
    orderNumber: orderMovement.referenceNumber || `O-${orderMovement.referenceId.slice(0, 8)}`,
    status: 'shipped', // We can enhance this later by fetching order status
    orderDate: orderMovement.performedAt,
  };
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
}

function InventoryHeader({ item }: InventoryHeaderProps) {
  const expiryStatus = getExpiryStatus(item.expiryDate);

  // Build meta items: Serial number first (item identifier), then SKU, location, lot
  const metaItems: MetaChip[] = [
    ...(item.serialNumber
      ? [
          {
            label: 'Serial',
            value: item.serialNumber,
            icon: <Barcode className="h-3.5 w-3.5" />,
          },
        ]
      : []),
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
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground leading-tight">
            {item.productName}
          </h1>
          <div className="flex items-center gap-2">
            <StatusCell
              status={item.status}
              statusConfig={INVENTORY_STATUS_CONFIG}
              showIcon
              className="text-[11px]"
            />
            {item.qualityStatus && item.qualityStatus !== 'good' && (
              <Badge
                className={cn(
                  'text-[11px]',
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
          </div>
        </div>
      </div>

      {/* Expiry Alert (inline, for items with expiry dates) */}
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
// COSTING BREAKDOWN
// ============================================================================

interface CostingBreakdownProps {
  item: ItemDetailData;
  costLayers?: CostLayer[];
}

function CostingBreakdown({ item, costLayers = [] }: CostingBreakdownProps) {
  const totalLayerValue = costLayers.reduce((sum, l) => sum + l.totalCost, 0);
  const totalRemaining = costLayers.reduce((sum, l) => sum + l.quantityRemaining, 0);
  const weightedAvgCost =
    costLayers.length > 0 && totalRemaining > 0
      ? totalLayerValue / totalRemaining
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
          const movementConfig = MOVEMENT_TYPE_CONFIG[movement.movementType];
          const Icon = movementConfig?.icon || ArrowLeftRight;
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
// RIGHT META PANEL
// ============================================================================

interface RightMetaPanelProps {
  item: ItemDetailData;
}

function RightMetaPanel({ item }: RightMetaPanelProps) {
  return (
    <aside className="flex flex-col gap-8 p-4 pt-8 lg:sticky lg:self-start lg:top-4">
      {/* Product Info with link to Product Inventory View */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Product
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{item.productName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {item.productDescription || 'No description'}
            </div>
          </div>
        </div>
        {/* View Product Inventory Link */}
        <Link
          to="/products/$productId"
          params={{ productId: item.productId }}
          search={{ tab: 'inventory' }}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          View Product Inventory
          <ExternalLink className="h-3 w-3" />
        </Link>
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
          const movementConfig = MOVEMENT_TYPE_CONFIG[movement.movementType];
          const Icon = movementConfig?.icon || ArrowLeftRight;
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
                    (() => {
                      const referenceLink = getMovementReferenceLink(
                        movement.referenceType,
                        movement.referenceId
                      );
                      const displayLabel = movement.referenceNumber
                        ? movement.referenceNumber
                        : movement.referenceType.replace(/_/g, ' ');
                      return referenceLink ? (
                        <Link
                          {...referenceLink}
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge variant="outline" className="text-xs hover:bg-accent transition-colors cursor-pointer">
                            {displayLabel}
                            <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {displayLabel}
                        </Badge>
                      );
                    })()
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {movement.performedBy} • {format(new Date(movement.performedAt), 'PPp')}
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
  qualityRecords = [],
  alerts = [],
  onDismissAlert,
  orderAssociation,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  onLogActivity,
  isLoadingMovements,
  isLoadingCostLayers,
  isLoadingQuality,
  counts,
  className,
}: InventoryDetailViewProps) {
  // Use counts from hook or fallback to array lengths
  const movementsCount = counts?.movements ?? movements.length;
  const costLayersCount = counts?.costLayers ?? costLayers.length;
  const qualityCount = counts?.qualityRecords ?? qualityRecords.length;
  const activitiesCount = counts?.activities ?? activities.length;

  // Derive order association from movements if not provided
  const derivedOrderAssociation = useMemo(() => {
    if (orderAssociation !== undefined) return orderAssociation;
    return deriveOrderAssociation(movements);
  }, [orderAssociation, movements]);

  // Determine lifecycle flags from movements
  const hasBeenAllocated = useMemo(
    () => movements.some((m) => m.movementType === 'allocate'),
    [movements]
  );
  const hasBeenShipped = useMemo(
    () => movements.some((m) => m.movementType === 'ship'),
    [movements]
  );

  // Tab prefetch on hover/focus for lazy loading optimization
  const prefetchTab = useCallback((tabId: string) => {
    // Future: Implement actual lazy loading with React.lazy() imports
    // For now, this is a no-op placeholder for the pattern
    void tabId;
  }, []);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Zone 1: Entity Header with panel toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <InventoryHeader item={item} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                  onClick={() => copyToClipboard(window.location.href)}
                  aria-label="Copy link"
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
                  className={cn('h-8 w-8 hidden lg:flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0', showMetaPanel && 'bg-muted')}
                  onClick={onToggleMetaPanel}
                  aria-label={showMetaPanel ? 'Hide details panel' : 'Show details panel'}
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Zone 2: Lifecycle Progress */}
      <ItemLifecycleProgress
        currentStatus={item.status}
        hasBeenAllocated={hasBeenAllocated}
        hasBeenShipped={hasBeenShipped}
      />

      {/* Zone 3: Alerts (item-contextual only) */}
      {alerts.length > 0 && (
        <InventoryItemAlerts
          alerts={alerts}
          onDismiss={onDismissAlert}
          maxVisible={3}
        />
      )}

      {/* Zone 4-5: Main Content Grid */}
      <div
        className={cn(
          'grid grid-cols-1 gap-8',
          showMetaPanel ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'lg:grid-cols-1'
        )}
      >
        {/* Zone 4: Primary Content with Tabs */}
        <div className="space-y-6 min-w-0">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0 flex-wrap">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="movements"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                onMouseEnter={() => prefetchTab('movements')}
                onFocus={() => prefetchTab('movements')}
              >
                Movements{movementsCount > 0 ? ` (${movementsCount})` : ''}
              </TabsTrigger>
              <TabsTrigger
                value="cost-layers"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                onMouseEnter={() => prefetchTab('cost-layers')}
                onFocus={() => prefetchTab('cost-layers')}
              >
                Cost Layers{costLayersCount > 0 ? ` (${costLayersCount})` : ''}
              </TabsTrigger>
              <TabsTrigger
                value="quality"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                onMouseEnter={() => prefetchTab('quality')}
                onFocus={() => prefetchTab('quality')}
              >
                Quality{qualityCount > 0 ? ` (${qualityCount})` : ''}
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                onMouseEnter={() => prefetchTab('activity')}
                onFocus={() => prefetchTab('activity')}
              >
                Activity{activitiesCount > 0 ? ` (${activitiesCount})` : ''}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab - Item lifecycle and order association */}
            <TabsContent value="overview" className="mt-0 pt-6">
              <div className="space-y-6">
                {/* Order Association Card (if linked to order) */}
                <OrderAssociationCard order={derivedOrderAssociation} />

                {/* Item Lifecycle Timeline */}
                <ItemLifecycleTimeline
                  currentStatus={item.status}
                  movements={movements}
                  receivedAt={item.receivedAt}
                  locationName={item.locationName}
                />

                {/* Costing Breakdown (item-level) */}
                <CostingBreakdown item={item} costLayers={costLayers} />

                {/* Recent Movements Preview */}
                <MovementHistoryPreview
                  movements={movements}
                  isLoading={isLoadingMovements}
                />
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

            {/* Quality Tab */}
            <TabsContent value="quality" className="mt-0 pt-6">
              <QualityTabContent
                qualityRecords={qualityRecords}
                isLoading={isLoadingQuality}
              />
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-0 pt-6">
              <div className="space-y-4">
                {onLogActivity && (
                  <div className="flex items-center justify-end">
                    <Button size="sm" onClick={onLogActivity}>
                      <Plus className="h-4 w-4 mr-2" />
                      Log Activity
                    </Button>
                  </div>
                )}
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
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Zone 5: Animated Side Meta Panel (Desktop) */}
        <AnimatePresence initial={false}>
          {showMetaPanel && (
            <motion.div
              key="meta-panel"
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="hidden lg:block border-l border-border pl-6 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto"
            >
              <RightMetaPanel item={item} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Zone 5: Mobile FAB + Sheet */}
      <MobileSidebarSheet title="Item Details" ariaLabel="Show item details">
        <RightMetaPanel item={item} />
      </MobileSidebarSheet>
    </div>
  );
});

export default InventoryDetailView;
