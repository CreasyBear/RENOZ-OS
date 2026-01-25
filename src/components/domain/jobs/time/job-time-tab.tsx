/**
 * Job Time Tab
 *
 * Main container for time tracking on job detail page.
 * Includes timer widget, manual entry dialog, time entries list, and summary.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-003c
 */

import * as React from 'react';
import { Plus, AlertCircle, RefreshCw, Clock, DollarSign, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useConfirmation } from '@/hooks';
import { ActiveTimer } from './active-timer';
import { TimeEntryDialog } from './time-entry-dialog';
import type { TimeEntryResponse } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/pricing-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface JobTimeTabProps {
  /** Default hourly rate for cost calculations */
  hourlyRate?: number;
  /** Source: Jobs time container query. */
  entries: TimeEntryResponse[];
  /** Source: Jobs time container query. */
  totalMinutes: number;
  /** Source: Jobs time container query. */
  billableMinutes: number;
  /** Source: Jobs time container query. */
  isLoading: boolean;
  /** Source: Jobs time container query. */
  isError: boolean;
  /** Source: Jobs time container query. */
  error?: Error | null;
  /** Source: Jobs time container query. */
  onRetry: () => void;
  /** Source: Jobs time container timer mutation. */
  onStartTimer: () => void;
  /** Source: Jobs time container timer mutation. */
  onStopTimer: (entryId: string) => void;
  /** Source: Jobs time container create mutation. */
  onCreateEntry: (values: {
    startTime: Date;
    endTime: Date;
    description?: string;
    isBillable: boolean;
  }) => Promise<void>;
  /** Source: Jobs time container update mutation. */
  onUpdateEntry: (
    entryId: string,
    values: {
      startTime?: Date;
      endTime?: Date;
      description?: string | null;
      isBillable?: boolean;
    }
  ) => Promise<void>;
  /** Source: Jobs time container delete mutation. */
  onDeleteEntry: (entryId: string) => Promise<void>;
  /** Source: Jobs time container update mutation. */
  onToggleBillable: (entryId: string, isBillable: boolean) => void;
  /** Source: Jobs time container mutations. */
  isTimerLoading: boolean;
  /** Source: Jobs time container mutations. */
  isSubmitting: boolean;
  /** Source: Jobs time container mutations. */
  isUpdating: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format minutes as hours and minutes string.
 */
function formatMinutesToHoursMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Format a date for display.
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a time for display.
 */
function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// SKELETON
// ============================================================================

function TimeEntriesSkeleton() {
  return (
    <div className="space-y-4">
      {/* Timer skeleton */}
      <Skeleton className="h-24 w-full rounded-lg" />

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>

      {/* Entries skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ============================================================================
// TIME ENTRY CARD
// ============================================================================

interface TimeEntryCardProps {
  entry: TimeEntryResponse;
  onEdit: () => void;
  onDelete: () => void;
  onToggleBillable: (isBillable: boolean) => void;
  isUpdating?: boolean;
}

function TimeEntryCard({
  entry,
  onEdit,
  onDelete,
  onToggleBillable,
  isUpdating,
}: TimeEntryCardProps) {
  const isRunning = !entry.endTime;

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border p-4',
        isRunning && 'border-green-500/50 bg-green-500/5'
      )}
    >
      {/* Date and time */}
      <div className="min-w-[120px]">
        <p className="font-medium">{formatDate(entry.startTime)}</p>
        <p className="text-muted-foreground text-sm">
          {formatTime(entry.startTime)}
          {entry.endTime && (
            <>
              {' — '}
              {formatTime(entry.endTime)}
            </>
          )}
        </p>
      </div>

      {/* Duration */}
      <div className="min-w-[80px]">
        {isRunning ? (
          <Badge variant="default" className="bg-green-500">
            Running
          </Badge>
        ) : entry.durationMinutes !== null ? (
          <span className="font-mono font-medium">
            {formatMinutesToHoursMinutes(entry.durationMinutes)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>

      {/* User */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.user.fullName || entry.user.email}</p>
        {entry.description && (
          <p className="text-muted-foreground truncate text-sm">{entry.description}</p>
        )}
      </div>

      {/* Billable toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={entry.isBillable}
          onCheckedChange={onToggleBillable}
          disabled={isUpdating}
          aria-label={`Billable toggle for entry ${entry.id}`}
        />
        <span className="text-muted-foreground text-xs">
          {entry.isBillable ? 'Billable' : 'Non-billable'}
        </span>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isRunning}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit} disabled={isRunning}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive" disabled={isRunning}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// SUMMARY CARD
// ============================================================================

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning';
}

function SummaryCard({ label, value, icon, variant = 'default' }: SummaryCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        variant === 'success' && 'border-green-500/50 bg-green-500/5',
        variant === 'warning' && 'border-yellow-500/50 bg-yellow-500/5'
      )}
    >
      <div className="text-muted-foreground flex items-center gap-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function JobTimeTab({
  hourlyRate = 75,
  entries,
  totalMinutes,
  billableMinutes,
  isLoading,
  isError,
  error,
  onRetry,
  onStartTimer,
  onStopTimer,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onToggleBillable,
  isTimerLoading,
  isSubmitting,
  isUpdating,
}: JobTimeTabProps) {
  const confirm = useConfirmation();

  // State for dialogs
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<TimeEntryResponse | undefined>();
  const { formatPrice } = useCurrency();

  // Find active timer for current user
  const activeEntry = entries.find((e) => e.endTime === null);

  // Handlers
  const handleAddEntry = () => {
    setEditingEntry(undefined);
    setFormOpen(true);
  };

  const handleEditEntry = (entry: TimeEntryResponse) => {
    setEditingEntry(entry);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: {
    startTime: Date;
    endTime: Date;
    description?: string;
    isBillable: boolean;
  }) => {
    try {
      if (editingEntry) {
        await onUpdateEntry(editingEntry.id, {
          startTime: values.startTime,
          endTime: values.endTime,
          description: values.description ?? null,
          isBillable: values.isBillable,
        });
        setEditingEntry(undefined);
      } else {
        await onCreateEntry({
          startTime: values.startTime,
          endTime: values.endTime,
          description: values.description,
          isBillable: values.isBillable,
        });
      }
      setFormOpen(false);
    } catch (err) {
      console.error('Failed to save time entry:', err);
    }
  };

  const handleDeleteEntry = React.useCallback(
    async (entryId: string) => {
      const confirmed = await confirm.confirm({
        title: 'Delete Time Entry',
        description:
          'This action cannot be undone. The time entry and all associated data will be permanently deleted.',
        confirmLabel: 'Delete Entry',
        variant: 'destructive',
      });

      if (confirmed.confirmed) {
        await onDeleteEntry(entryId);
      }
    },
    [confirm, onDeleteEntry]
  );

  // Loading state
  if (isLoading) {
    return <TimeEntriesSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading time entries</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          {error instanceof Error ? error.message : 'Failed to load time entries'}
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const completedEntries = entries.filter((e) => e.endTime !== null);

  // Calculate labor cost
  const totalHours = totalMinutes / 60;
  const billableHours = billableMinutes / 60;
  const laborCost = billableHours * hourlyRate;

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        {/* Always show timer even in empty state */}
        <ActiveTimer
          activeEntry={activeEntry}
          onStart={onStartTimer}
          onStop={onStopTimer}
          isLoading={isTimerLoading}
        />

        <Empty>
          <EmptyHeader>
            <EmptyTitle>No time tracked</EmptyTitle>
            <EmptyDescription>
              Start the timer or add a manual entry to track time on this job.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={handleAddEntry}>
              <Plus className="mr-2 h-4 w-4" />
              Add Time Entry
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timer widget */}
      <ActiveTimer
        activeEntry={activeEntry}
        onStart={onStartTimer}
        onStop={onStopTimer}
        isLoading={isTimerLoading}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Hours"
          value={totalHours.toFixed(1)}
          icon={<Clock className="h-4 w-4" />}
        />
        <SummaryCard
          label="Billable Hours"
          value={billableHours.toFixed(1)}
          icon={<Clock className="h-4 w-4" />}
          variant="success"
        />
        <SummaryCard
          label="Labor Cost"
          value={formatPrice(laborCost)}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Time Entries ({completedEntries.length})</h3>
        <Button onClick={handleAddEntry} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Entries list */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <TimeEntryCard
            key={entry.id}
            entry={entry}
            onEdit={() => handleEditEntry(entry)}
            onDelete={() => handleDeleteEntry(entry.id)}
            onToggleBillable={(isBillable) => onToggleBillable(entry.id, isBillable)}
            isUpdating={isUpdating}
          />
        ))}
      </div>

      {/* Add/Edit dialog */}
      <TimeEntryDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingEntry(undefined);
        }}
        entry={editingEntry}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete confirmation */}
    </div>
  );
}
