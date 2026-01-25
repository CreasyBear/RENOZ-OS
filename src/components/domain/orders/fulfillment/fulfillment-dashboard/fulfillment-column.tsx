/**
 * FulfillmentColumn Component
 *
 * SOTA SaaS kanban column with Square UI design patterns.
 * Enhanced following Jobs kanban architecture with virtual scrolling and accessibility.
 *
 * Features:
 * - Square UI visual design (rounded-2xl, subtle borders, color theming)
 * - Virtual scrolling for 50+ orders per column
 * - Comprehensive accessibility with ARIA labels
 * - Mobile-optimized touch targets (44px minimum)
 * - Jobs kanban patterns with enhanced UX
 *
 * @see src/components/domain/jobs/jobs-column.tsx for reference implementation
 * @see _reference/.square-ui-reference/templates/tasks/components/tasks/board/task-column.tsx
 */
import { useRef, memo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Plus,
  CheckSquare,
  MoreHorizontal,
  Package,
  Truck,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FormatAmount } from '@/components/shared/format';
import { FulfillmentCard, type FulfillmentOrder } from './fulfillment-card';
import type { InlineEditFormData } from '../../cards/order-card-inline-edit.schema';

// ============================================================================
// TYPES
// ============================================================================

export interface FulfillmentColumnProps {
  stage: 'to_allocate' | 'to_pick' | 'picking' | 'to_ship' | 'shipped_today';
  stageName: string;
  orders: FulfillmentOrder[];
  totalValue: number;
  onViewOrder: (orderId: string) => void;
  onBulkAction: (stage: string, action: 'allocate' | 'print_pick_lists' | 'ship') => void;
  onAddOrder?: (stage: string) => void;
  onColumnAction?: (stage: string, action: string) => void;
  onEditOrder?: (orderId: string) => void;
  onSaveOrderEdit?: (
    orderId: string,
    data: { priority: string; orderNumber: string; dueDate?: Date }
  ) => Promise<void>;
  onDuplicateOrder?: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => void;
  onChangeOrderPriority?: (orderId: string, priority: string) => void;
  onAssignOrder?: (orderId: string, assigneeId: string) => void;
  onMoveOrderToStage?: (orderId: string, stage: string) => void;
  availableAssignees?: Array<{ id: string; name: string }>;
  editingOrderId?: string | null;
  onStartEdit?: (orderId: string) => void;
  onCancelEdit?: () => void;
  inlineEditForm?: UseFormReturn<InlineEditFormData>;
  inlineEditSubmitting?: boolean;
  isOver?: boolean;
  selectedOrderIds?: Set<string>;
  onOrderSelect?: (orderId: string, selected: boolean) => void;
  onSelectAll?: (stage: string, selected: boolean) => void;
}

// ============================================================================
// COLUMN CONFIG
// ============================================================================

const COLUMN_CONFIG = {
  to_allocate: {
    icon: Package,
    color: '#f59e0b', // amber (matching Square UI orange)
    emptyMessage: 'No orders to allocate',
    emptyDescription: 'Orders will appear here when confirmed',
    bulkActionLabel: 'Allocate Selected',
    bulkAction: 'allocate' as const,
  },
  to_pick: {
    icon: Clock,
    color: '#3b82f6', // blue
    emptyMessage: 'No orders to pick',
    emptyDescription: 'Allocated orders ready for picking',
    bulkActionLabel: 'Print Pick Lists',
    bulkAction: 'print_pick_lists' as const,
  },
  picking: {
    icon: Truck,
    color: '#eab308', // yellow
    emptyMessage: 'No orders being picked',
    emptyDescription: 'Orders currently being picked by staff',
    bulkActionLabel: null, // No bulk action for picking stage
    bulkAction: null,
  },
  to_ship: {
    icon: CheckSquare,
    color: '#10b981', // green
    emptyMessage: 'No orders ready to ship',
    emptyDescription: 'Picked orders awaiting shipment',
    bulkActionLabel: 'Ship Selected',
    bulkAction: 'ship' as const,
  },
  shipped_today: {
    icon: CheckCircle,
    color: '#8b5cf6', // purple
    emptyMessage: 'No orders shipped today',
    emptyDescription: 'Orders shipped today will appear here',
    bulkActionLabel: null,
    bulkAction: null,
  },
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

export const FulfillmentColumn = memo(function FulfillmentColumn({
  stage,
  stageName,
  orders,
  totalValue,
  onViewOrder,
  onBulkAction,
  onAddOrder,
  onColumnAction,
  onEditOrder,
  onSaveOrderEdit,
  onDuplicateOrder,
  onDeleteOrder,
  onChangeOrderPriority,
  onAssignOrder,
  onMoveOrderToStage,
  availableAssignees = [],
  editingOrderId,
  onStartEdit,
  onCancelEdit,
  inlineEditForm,
  inlineEditSubmitting,
  isOver = false,
  selectedOrderIds = new Set(),
  onOrderSelect,
  onSelectAll,
}: FulfillmentColumnProps) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({
    id: stage,
    data: {
      type: 'column',
      stage,
    },
  });

  const config = COLUMN_CONFIG[stage];
  const IconComponent = config.icon;
  const isCurrentlyOver = isOver || dndIsOver;
  const selectedInColumn = orders.filter((order) => selectedOrderIds.has(order.id));
  const hasSelection = selectedInColumn.length > 0;
  const allSelected = orders.length > 0 && selectedInColumn.length === orders.length;

  const orderIds = orders.map((order) => order.id);

  // Virtual scrolling setup for large lists (50+ orders)
  const useVirtualScrolling = orders.length > 50;
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Estimated card height
    overscan: 5,
  });

  return (
    <div className="flex h-full w-[300px] flex-1 shrink-0 flex-col lg:w-[340px]">
      <div
        className={cn(
          'border-border/50 bg-muted/70 dark:bg-muted/50 flex max-h-full flex-col space-y-2 rounded-2xl border p-2',
          isCurrentlyOver && 'ring-primary ring-2 ring-offset-2'
        )}
      >
        <div ref={setNodeRef}>
          {/* Column Header - Square UI Design */}
          <div className="flex items-center justify-between gap-2">
            <div
              className="bg-muted flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-medium"
              style={{
                backgroundColor: `${config.color}20`,
              }}
            >
              <IconComponent style={{ color: config.color }} className="size-4" />
              <span className="text-xs font-medium" style={{ color: config.color }}>
                {stageName}
              </span>
            </div>
            <Badge
              variant="secondary"
              className="bg-background size-7 rounded-full p-0 text-xs font-medium"
            >
              {orders.length}
            </Badge>
          </div>

          {/* Total Value Display */}
          <div className="text-muted-foreground text-xs">
            <FormatAmount amount={totalValue} className="font-medium tabular-nums" />
          </div>

          {/* Bulk Selection Controls */}
          {orders.length > 0 && onSelectAll && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(stage, checked === true)}
                aria-label={`Select all orders in ${stageName}`}
              />
              <label className="text-muted-foreground text-xs">Select all</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 min-h-[44px] w-6 min-w-[44px] md:h-6 md:min-h-0 md:w-6 md:min-w-0"
                    aria-label={`Column actions for ${stageName}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onColumnAction?.(stage, 'sort')}>
                    Sort by priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onColumnAction?.(stage, 'filter')}>
                    Filter column
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onColumnAction?.(stage, 'export')}>
                    Export orders
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Orders Container */}
          <SortableContext items={orderIds} strategy={verticalListSortingStrategy}>
            <div ref={parentRef} className="flex-1 overflow-y-auto" style={{ height: '100%' }}>
              {orders.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
                  <IconComponent
                    className="mb-2 size-8 opacity-50"
                    style={{ color: config.color }}
                  />
                  <p className="text-sm font-medium">{config.emptyMessage}</p>
                  <p className="text-xs">{config.emptyDescription}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 min-h-[44px] min-w-[44px] gap-2 md:h-8 md:min-h-0 md:w-auto md:min-w-0"
                    onClick={() => onAddOrder?.(stage)}
                  >
                    <Plus className="size-4" />
                    <span>Add order</span>
                  </Button>
                </div>
              ) : useVirtualScrolling ? (
                // Virtual scrolling for large lists
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const order = orders[virtualItem.index];
                    return (
                      <div
                        key={order.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        <FulfillmentCard
                          order={order}
                          onView={onViewOrder}
                          onSelect={onOrderSelect || (() => {})}
                          onEdit={onEditOrder}
                          onSaveEdit={
                            onSaveOrderEdit ? (data) => onSaveOrderEdit(order.id, data) : undefined
                          }
                          onDuplicate={onDuplicateOrder}
                          onDelete={onDeleteOrder}
                          onChangePriority={onChangeOrderPriority}
                          onAssign={onAssignOrder}
                          onMoveToStage={onMoveOrderToStage}
                          availableAssignees={availableAssignees}
                          isSelected={selectedOrderIds.has(order.id)}
                          isEditing={editingOrderId === order.id}
                          onStartEdit={onStartEdit}
                          onCancelEdit={onCancelEdit}
                          inlineEditForm={inlineEditForm}
                          inlineEditSubmitting={inlineEditSubmitting}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Regular rendering for smaller lists
                <div className="space-y-2">
                  {orders.map((order) => (
                    <FulfillmentCard
                      key={order.id}
                      order={order}
                      onView={onViewOrder}
                      onSelect={onOrderSelect || (() => {})}
                      isSelected={selectedOrderIds.has(order.id)}
                    />
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] w-full min-w-[44px] justify-start gap-2 md:h-8 md:min-h-0 md:w-auto md:min-w-0"
                    onClick={() => onAddOrder?.(stage)}
                  >
                    <Plus className="size-4" />
                    <span>Add order</span>
                  </Button>
                </div>
              )}
            </div>
          </SortableContext>

          {/* Bulk Action Button */}
          {hasSelection && config.bulkActionLabel && (
            <div className="border-border border-t border-dashed pt-2">
              <Button
                variant="default"
                size="sm"
                className="min-h-[44px] w-full min-w-[44px] gap-2 md:h-8 md:min-h-0 md:w-auto md:min-w-0"
                onClick={() => onBulkAction(stage, config.bulkAction!)}
              >
                <CheckSquare className="size-4" />
                {config.bulkActionLabel} ({selectedInColumn.length})
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
