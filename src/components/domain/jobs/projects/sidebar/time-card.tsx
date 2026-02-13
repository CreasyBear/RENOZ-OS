/**
 * Time Card - Project Sidebar
 *
 * Time tracking widget with active timer and manual entry.
 * Displays running timer status and allows start/stop/manual entry.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 4.1 Zone 5B
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md Zone 5B Sidebar
 */

import { useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActiveTimer } from '../../time/active-timer';
import { TimeEntryDialog } from '../../time/time-entry-dialog';
import {
  useJobTimeEntries,
  useStartTimer,
  useStopTimer,
  useCreateManualEntry,
} from '@/hooks/jobs';
import { toastSuccess, toastError } from '@/hooks';

// ============================================================================
// TYPES
// ============================================================================

export interface TimeCardProps {
  /** Project ID (used as jobId for time tracking) */
  projectId: string;
  /** Whether the user can track time */
  canTrackTime?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TimeCard({ projectId, canTrackTime = true, className }: TimeCardProps) {
  const [manualEntryOpen, setManualEntryOpen] = useState(false);

  // Fetch time entries for this project (using projectId as jobId)
  const { data: timeData, isLoading } = useJobTimeEntries({
    jobId: projectId,
  });

  const startTimer = useStartTimer();
  const stopTimer = useStopTimer(projectId);
  const createManualEntry = useCreateManualEntry();

  // Find active timer entry
  const activeEntry = timeData?.entries?.find((entry) => !entry.endTime) ?? null;

  const handleStart = async () => {
    try {
      await startTimer.mutateAsync({
        jobId: projectId,
        description: undefined,
        isBillable: true,
      });
      toastSuccess('Timer started');
    } catch {
      toastError('Failed to start timer');
    }
  };

  const handleStop = async (entryId: string) => {
    try {
      await stopTimer.mutateAsync({
        entryId,
      });
      toastSuccess('Timer stopped');
    } catch {
      toastError('Failed to stop timer');
    }
  };

  const handleManualEntry = async (values: {
    startTime: Date;
    endTime: Date;
    description?: string;
    isBillable: boolean;
  }) => {
    try {
      await createManualEntry.mutateAsync({
        jobId: projectId,
        ...values,
      });
      toastSuccess('Time entry added');
      setManualEntryOpen(false);
    } catch {
      toastError('Failed to add time entry');
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Active Timer */}
          <ActiveTimer
            activeEntry={activeEntry}
            onStart={handleStart}
            onStop={handleStop}
            isLoading={startTimer.isPending || stopTimer.isPending}
            canTrackTime={canTrackTime}
          />

          {/* Manual Entry Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setManualEntryOpen(true)}
            disabled={!canTrackTime}
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            Add Manual Entry
          </Button>

          {/* Summary Stats - Clickable link to activity tab */}
          {timeData && (
            <Link
              to="/projects/$projectId"
              params={{ projectId }}
              search={{ tab: 'activity' }}
              className="block pt-2 border-t text-xs text-muted-foreground space-y-1 hover:text-foreground transition-colors cursor-pointer"
            >
              <div className="flex justify-between">
                <span>Total Hours:</span>
                <span className="font-medium">
                  {((timeData?.totalMinutes ?? 0) / 60).toFixed(1)}h
                </span>
              </div>
              {(timeData?.billableMinutes ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span>Billable:</span>
                  <span className="font-medium">
                    {((timeData?.billableMinutes ?? 0) / 60).toFixed(1)}h
                  </span>
                </div>
              )}
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Dialog */}
      <TimeEntryDialog
        open={manualEntryOpen}
        onOpenChange={setManualEntryOpen}
        onSubmit={handleManualEntry}
        isSubmitting={createManualEntry.isPending}
      />
    </>
  );
}
