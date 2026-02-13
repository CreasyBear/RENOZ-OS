/**
 * Project Lifecycle Progress Component
 *
 * Zone 2 progress bar showing project lifecycle stages:
 * Quoting → Approved → In Progress → Inspection → Completed
 *
 * Uses progress styling per DETAIL-VIEW-STANDARDS.md:
 * ✓ completed, ● current, ○ pending
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Zone 2: Progress)
 * @see src/components/domain/inventory/components/item-lifecycle-progress.tsx (Reference pattern)
 */

import { memo } from 'react';
import { Check, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@/lib/schemas/jobs/projects';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectLifecycleProgressProps {
  /** Current project status */
  status: ProjectStatus;
  /** Optional className */
  className?: string;
}

// ============================================================================
// LIFECYCLE STAGE CONFIG
// ============================================================================

interface LifecycleStageConfig {
  id: ProjectStatus;
  label: string;
  description: string;
}

/** Linear progression stages for active projects */
const LIFECYCLE_STAGES: LifecycleStageConfig[] = [
  { id: 'quoting', label: 'Quoting', description: 'Project in quoting phase' },
  { id: 'approved', label: 'Approved', description: 'Quote approved by customer' },
  { id: 'in_progress', label: 'In Progress', description: 'Work underway' },
  { id: 'completed', label: 'Completed', description: 'Project finished' },
];

/** Stage order for determining completion */
const STAGE_ORDER: ProjectStatus[] = ['quoting', 'approved', 'in_progress', 'completed'];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the index of a stage in the lifecycle order
 */
function getStageIndex(status: ProjectStatus): number {
  return STAGE_ORDER.indexOf(status);
}

/**
 * Determine which stages are completed based on current status
 */
function getCompletedStages(currentStatus: ProjectStatus): Set<ProjectStatus> {
  const completed = new Set<ProjectStatus>();
  const currentIndex = getStageIndex(currentStatus);

  // All stages before current are completed
  for (let i = 0; i < currentIndex && i < STAGE_ORDER.length; i++) {
    completed.add(STAGE_ORDER[i]);
  }

  return completed;
}

/**
 * Get the effective status for display (handles terminal states)
 */
function getDisplayStatus(status: ProjectStatus): {
  effectiveStatus: ProjectStatus;
  isTerminal: boolean;
  terminalLabel?: string;
} {
  if (status === 'cancelled') {
    return { effectiveStatus: status, isTerminal: true, terminalLabel: 'Cancelled' };
  }
  if (status === 'on_hold') {
    return { effectiveStatus: status, isTerminal: true, terminalLabel: 'On Hold' };
  }
  return { effectiveStatus: status, isTerminal: false };
}

/**
 * Get aria-label text for accessibility
 */
function getAriaLabel(status: ProjectStatus, completedCount: number, totalStages: number): string {
  const { isTerminal, terminalLabel } = getDisplayStatus(status);

  if (isTerminal) {
    return `Project status: ${terminalLabel} (terminal state)`;
  }

  const stageLabels: Record<ProjectStatus, string> = {
    quoting: 'Quoting',
    approved: 'Approved',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    on_hold: 'On Hold',
  };

  return `Project progress: ${stageLabels[status]} (${completedCount} of ${totalStages} stages completed)`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ProjectLifecycleProgress = memo(function ProjectLifecycleProgress({
  status,
  className,
}: ProjectLifecycleProgressProps) {
  const { effectiveStatus, isTerminal, terminalLabel } = getDisplayStatus(status);
  const completedStages = getCompletedStages(effectiveStatus);
  const currentIndex = getStageIndex(effectiveStatus);

  // For terminal states, we show a modified flow
  const displayStages: LifecycleStageConfig[] = isTerminal
    ? [
        ...LIFECYCLE_STAGES.slice(0, Math.max(1, currentIndex)),
        {
          id: effectiveStatus,
          label: terminalLabel!,
          description: terminalLabel!,
        } satisfies LifecycleStageConfig,
      ]
    : LIFECYCLE_STAGES;

  const ariaLabel = getAriaLabel(status, completedStages.size, STAGE_ORDER.length);

  return (
    <div
      className={cn('py-4', className)}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={completedStages.size}
      aria-valuemin={0}
      aria-valuemax={STAGE_ORDER.length}
    >
      <div className="flex items-center justify-between">
        {displayStages.map((stage, index) => {
          const stageStatus = stage.id;
          const isCompleted = completedStages.has(stageStatus);
          const isCurrent = effectiveStatus === stageStatus;
          const isPending = !isCompleted && !isCurrent;
          const isFailed = stageStatus === 'cancelled';

          return (
            <div key={stage.id} className="flex items-center flex-1">
              {/* Stage indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent &&
                      (isFailed
                        ? 'bg-destructive/20 border-destructive text-destructive'
                        : 'bg-primary/20 border-primary text-primary'),
                    isPending && 'bg-muted border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : isCurrent ? (
                    isFailed ? (
                      <X className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Circle className="h-3 w-3 fill-current" aria-hidden="true" />
                    )
                  ) : (
                    <Circle className="h-3 w-3" aria-hidden="true" />
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center whitespace-nowrap',
                    isCompleted && 'text-primary',
                    isCurrent && (isFailed ? 'text-destructive' : 'text-primary'),
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
                      effectiveStatus === displayStages[index + 1].id
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

export default ProjectLifecycleProgress;
