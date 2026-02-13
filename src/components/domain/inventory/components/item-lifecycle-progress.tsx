/**
 * Item Lifecycle Progress Component
 *
 * Zone 2 progress bar showing serialized item lifecycle stages:
 * Received → Allocated → Shipped → Sold (or Damaged/Returned)
 *
 * Uses progress styling: ✓ completed, ● current, ○ pending
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Zone 2: Progress)
 */
import { memo } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export type ItemLifecycleStage =
  | 'received'
  | 'allocated'
  | 'shipped'
  | 'sold'
  | 'damaged'
  | 'returned'
  | 'quarantined';

export interface ItemLifecycleProgressProps {
  /** Current item status from inventory record */
  currentStatus: ItemLifecycleStage | string;
  /** Whether the item has been allocated (for proper stage calculation) */
  hasBeenAllocated?: boolean;
  /** Whether the item has been shipped (for proper stage calculation) */
  hasBeenShipped?: boolean;
  className?: string;
}

// ============================================================================
// LIFECYCLE STAGE CONFIG
// ============================================================================

interface LifecycleStageConfig {
  id: string;
  label: string;
  description: string;
}

const LIFECYCLE_STAGES: LifecycleStageConfig[] = [
  { id: 'received', label: 'Received', description: 'Item received into inventory' },
  { id: 'allocated', label: 'Allocated', description: 'Reserved for an order' },
  { id: 'shipped', label: 'Shipped', description: 'Dispatched to customer' },
  { id: 'sold', label: 'Sold', description: 'Sale completed' },
];

// Alternative terminal stages (replace 'sold')
const TERMINAL_STAGES: Record<string, LifecycleStageConfig> = {
  damaged: { id: 'damaged', label: 'Damaged', description: 'Item marked as damaged' },
  returned: { id: 'returned', label: 'Returned', description: 'Returned by customer' },
  quarantined: { id: 'quarantined', label: 'Quarantined', description: 'Under quality hold' },
};

/**
 * Determine which stages are completed based on current status
 */
function getCompletedStages(
  currentStatus: string,
  hasBeenAllocated?: boolean,
  hasBeenShipped?: boolean
): Set<string> {
  const completed = new Set<string>();

  // Always completed if item exists
  completed.add('received');

  // Check if we've progressed through stages
  if (
    hasBeenAllocated ||
    ['allocated', 'shipped', 'sold', 'returned'].includes(currentStatus)
  ) {
    completed.add('allocated');
  }

  if (
    hasBeenShipped ||
    ['shipped', 'sold', 'returned'].includes(currentStatus)
  ) {
    completed.add('shipped');
  }

  // Terminal stages
  if (['sold', 'returned', 'damaged', 'quarantined'].includes(currentStatus)) {
    completed.add(currentStatus);
  }

  return completed;
}

/**
 * Get aria-label text for accessibility
 */
function getAriaLabel(currentStatus: string, completedCount: number, totalStages: number): string {
  const statusLabel = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
  const isFinal = ['sold', 'damaged', 'returned', 'quarantined'].includes(currentStatus);

  if (isFinal) {
    return `Item lifecycle: ${statusLabel} (final state)`;
  }

  return `Item lifecycle: ${statusLabel} (${completedCount} of ${totalStages} stages completed)`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ItemLifecycleProgress = memo(function ItemLifecycleProgress({
  currentStatus,
  hasBeenAllocated,
  hasBeenShipped,
  className,
}: ItemLifecycleProgressProps) {
  const normalizedStatus = currentStatus.toLowerCase();
  const completedStages = getCompletedStages(normalizedStatus, hasBeenAllocated, hasBeenShipped);

  // Determine stages to display
  // If terminal stage is damaged/returned/quarantined, replace 'sold' with that stage
  const isAlternateTerminal = ['damaged', 'returned', 'quarantined'].includes(normalizedStatus);
  const displayStages = isAlternateTerminal
    ? [
        ...LIFECYCLE_STAGES.slice(0, 3),
        TERMINAL_STAGES[normalizedStatus] || LIFECYCLE_STAGES[3],
      ]
    : LIFECYCLE_STAGES;

  const ariaLabel = getAriaLabel(normalizedStatus, completedStages.size, displayStages.length);

  return (
    <div
      className={cn('py-4', className)}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={completedStages.size}
      aria-valuemin={0}
      aria-valuemax={displayStages.length}
    >
      <div className="flex items-center justify-between">
        {displayStages.map((stage, index) => {
          const isCompleted = completedStages.has(stage.id);
          const isCurrent = normalizedStatus === stage.id;
          const isPending = !isCompleted && !isCurrent;

          return (
            <div key={stage.id} className="flex items-center flex-1">
              {/* Stage indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'bg-primary/20 border-primary text-primary',
                    isPending && 'bg-muted border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : isCurrent ? (
                    <Circle className="h-3 w-3 fill-current" aria-hidden="true" />
                  ) : (
                    <Circle className="h-3 w-3" aria-hidden="true" />
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center',
                    isCompleted && 'text-primary',
                    isCurrent && 'text-primary',
                    isPending && 'text-muted-foreground'
                  )}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector line (except after last stage) */}
              {index < displayStages.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    completedStages.has(displayStages[index + 1].id) ||
                      normalizedStatus === displayStages[index + 1].id
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ItemLifecycleProgress;
