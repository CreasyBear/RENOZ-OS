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

import { memo, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link2, PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
import { getQualityHistoryReadErrorMessage } from './quality-read-error-messages';
import { MovementHistoryPreview } from './inventory-movement-history-preview';
import { MovementsTabContent } from './inventory-movements-tab-content';
import { CostLayersTabContent } from './inventory-cost-layers-tab-content';
import { QualityTabContent } from './inventory-quality-tab-content';
import { CostingBreakdown } from './inventory-costing-breakdown';
import { RightMetaPanel } from './inventory-right-meta-panel';
import { ActivityTabContent } from './inventory-activity-tab-content';
import { InventoryHeader } from './inventory-header';

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
  qualityError?: Error | null;
  onRetryQuality?: () => void;
  /** Tab counts from composite hook */
  counts?: {
    movements: number;
    costLayers: number;
    qualityRecords: number;
    activities: number;
  };
  className?: string;
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
  qualityError,
  onRetryQuality,
  counts,
  className,
}: InventoryDetailViewProps) {
  // Use counts from hook or fallback to array lengths
  const movementsCount = counts?.movements ?? movements.length;
  const costLayersCount = counts?.costLayers ?? costLayers.length;
  const qualityCount = counts?.qualityRecords ?? qualityRecords.length;
  const activitiesCount = counts?.activities ?? activities.length;
  const qualityReadErrorMessage = getQualityHistoryReadErrorMessage(qualityError, {
    hasCachedRecords: qualityRecords.length > 0,
  });

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
              >
                Movements{movementsCount > 0 ? ` (${movementsCount})` : ''}
              </TabsTrigger>
              <TabsTrigger
                value="cost-layers"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                Cost Layers{costLayersCount > 0 ? ` (${costLayersCount})` : ''}
              </TabsTrigger>
              <TabsTrigger
                value="quality"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                Quality{qualityCount > 0 ? ` (${qualityCount})` : ''}
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
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
                isError={!!qualityError}
                errorMessage={qualityReadErrorMessage}
                onRetry={onRetryQuality}
              />
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-0 pt-6">
              <ActivityTabContent
                activities={activities}
                activitiesLoading={activitiesLoading}
                activitiesError={activitiesError}
                onLogActivity={onLogActivity}
              />
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
