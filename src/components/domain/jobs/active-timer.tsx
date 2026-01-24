/**
 * Active Timer Component
 *
 * Timer widget with start/stop button and live elapsed time display.
 * Shows running timer status with pulse animation.
 * 48px minimum touch target for mobile accessibility.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-003c
 */

import * as React from 'react';
import { Play, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TimeEntryResponse } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface ActiveTimerProps {
  /** Current running timer entry, if any */
  activeEntry?: TimeEntryResponse | null;
  /** Called when start timer is clicked */
  onStart: () => void;
  /** Called when stop timer is clicked */
  onStop: (entryId: string) => void;
  /** Whether start/stop operation is in progress */
  isLoading?: boolean;
  /** Whether the user has permission to track time */
  canTrackTime?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format duration in HH:MM:SS format.
 */
function formatDuration(startTime: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(startTime).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ActiveTimer({
  activeEntry,
  onStart,
  onStop,
  isLoading = false,
  canTrackTime = true,
}: ActiveTimerProps) {
  const [elapsed, setElapsed] = React.useState('00:00:00');
  const isRunning = !!activeEntry && !activeEntry.endTime;

  // Update elapsed time every second when timer is running
  React.useEffect(() => {
    if (!isRunning || !activeEntry) {
      setElapsed('00:00:00');
      return;
    }

    // Initial update
    setElapsed(formatDuration(activeEntry.startTime));

    // Update every second
    const interval = setInterval(() => {
      setElapsed(formatDuration(activeEntry.startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, activeEntry]);

  const handleClick = () => {
    if (isRunning && activeEntry) {
      onStop(activeEntry.id);
    } else {
      onStart();
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        isRunning
          ? 'border-green-500/50 bg-green-500/5 dark:bg-green-500/10'
          : 'border-border bg-card'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Timer Display */}
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div
            className={cn(
              'h-3 w-3 rounded-full',
              isRunning && 'animate-pulse bg-green-500',
              !isRunning && 'bg-muted'
            )}
            aria-hidden="true"
          />

          {/* Time display */}
          <div>
            <p
              className="font-mono text-2xl font-semibold tabular-nums"
              aria-label="Timer display"
              aria-live="polite"
            >
              {elapsed}
            </p>
            {isRunning && activeEntry && (
              <p className="text-muted-foreground text-xs">
                Started{' '}
                {new Date(activeEntry.startTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>

        {/* Status badge and button */}
        <div className="flex items-center gap-3">
          <Badge
            variant={isRunning ? 'default' : 'secondary'}
            className={cn(isRunning && 'bg-green-500 hover:bg-green-500/80')}
          >
            {isRunning ? 'Running' : 'Stopped'}
          </Badge>

          <Button
            onClick={handleClick}
            disabled={isLoading || !canTrackTime}
            variant={isRunning ? 'destructive' : 'default'}
            size="lg"
            className="min-h-[48px] min-w-[48px]"
            aria-label={isRunning ? 'Stop timer' : 'Start timer'}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRunning ? (
              <>
                <Square className="mr-2 h-5 w-5" />
                Stop
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Start
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Description for running timer */}
      {isRunning && activeEntry?.description && (
        <p className="text-muted-foreground mt-3 border-t pt-3 text-sm">
          {activeEntry.description}
        </p>
      )}
    </div>
  );
}
