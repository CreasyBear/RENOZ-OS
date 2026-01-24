/**
 * Drill-Down Modal Component
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Displays detailed data when a user clicks on a chart segment. Shows a data
 * table with pagination, supports CSV export, and provides navigation to the
 * full entity list view.
 *
 * Features:
 * - Dialog overlay with header showing title and segment name
 * - Date range display in subheader
 * - Paginated data table with ID, Name, Value, Status, Date columns
 * - Export CSV and View All navigation in footer
 * - Loading skeleton state
 * - Error state with alert
 *
 * @see /src/components/domain/dashboard/widgets/kpi-widget.tsx
 */

import { memo, useCallback } from 'react';
import { X, Download, ExternalLink, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// TYPES
// ============================================================================

export interface DrillDownDataItem {
  id: string;
  name: string;
  value: string | number;
  status?: string;
  date?: Date;
}

export interface DrillDownModalProps {
  /** @source UI state - modal visibility */
  open: boolean;
  /** @source useCallback handler - close modal */
  onClose: () => void;
  /** @source Dashboard segment data - chart title */
  title: string;
  /** @source Dashboard segment data - clicked segment label */
  segmentLabel: string;
  /** @source Dashboard segment data - description text */
  description?: string;
  /** @source Dashboard date filter state */
  dateRange?: { start: Date; end: Date };
  /** @source Dashboard segment data - table rows */
  data: DrillDownDataItem[];
  /** @source Dashboard segment data - total count for pagination */
  totalCount?: number;
  /** @source useCallback handler - navigate to domain list */
  onViewAll?: () => void;
  /** @source useCallback handler - export CSV */
  onExportCsv?: () => void;
  /** @source Entity type for View All link */
  entityType?: string;
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
}

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function DrillDownModalSkeleton() {
  return (
    <div className="space-y-4">
      {/* Subheader skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-48" />
      </div>

      {/* Table skeleton */}
      <div className="border rounded-md">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="p-4 border-b last:border-b-0">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

interface DrillDownModalErrorProps {
  error: Error;
}

function DrillDownModalError({ error }: DrillDownModalErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {error.message || 'Failed to load drill-down data. Please try again.'}
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// DATA TABLE COMPONENT
// ============================================================================

interface DrillDownTableProps {
  data: DrillDownDataItem[];
  totalCount?: number;
}

const DrillDownTable = memo(function DrillDownTable({
  data,
  totalCount,
}: DrillDownTableProps) {
  const displayCount = data.length;
  const total = totalCount ?? displayCount;

  return (
    <div className="space-y-3">
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Value</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No data available for this segment.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">
                    {item.id}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    {typeof item.value === 'number'
                      ? item.value.toLocaleString()
                      : item.value}
                  </TableCell>
                  <TableCell>
                    {item.status ? (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                          item.status.toLowerCase() === 'active' &&
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                          item.status.toLowerCase() === 'pending' &&
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                          item.status.toLowerCase() === 'completed' &&
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                          item.status.toLowerCase() === 'inactive' &&
                            'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        )}
                      >
                        {item.status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.date ? (
                      format(item.date, 'MMM d')
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination info */}
      {displayCount > 0 && (
        <div className="flex justify-end">
          <p className="text-sm text-muted-foreground">
            1-{displayCount} of {total}
          </p>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays a drill-down modal for chart segment details.
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 */
export const DrillDownModal = memo(function DrillDownModal({
  open,
  onClose,
  title,
  segmentLabel,
  description,
  dateRange,
  data,
  totalCount,
  onViewAll,
  onExportCsv,
  entityType,
  isLoading = false,
  error = null,
  className,
}: DrillDownModalProps) {
  // Handle keyboard shortcut for close
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onClose();
      }
    },
    [onClose]
  );

  // Format date range for display
  const formattedDateRange =
    dateRange &&
    `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn('sm:max-w-2xl max-h-[85vh] flex flex-col', className)}
        showCloseButton={false}
      >
        {/* Header: Title + Segment Label + Close Button */}
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span>{title}</span>
              <span className="text-muted-foreground">-</span>
              <span className="text-primary">{segmentLabel}</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Subheader: Description + Date Range */}
        {(description || formattedDateRange) && (
          <div className="flex-shrink-0 space-y-1 border-b pb-4">
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {formattedDateRange && (
              <p className="text-xs text-muted-foreground">
                Date Range: {formattedDateRange}
              </p>
            )}
          </div>
        )}

        {/* Content: Data Table */}
        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <DrillDownModalSkeleton />
          ) : error ? (
            <DrillDownModalError error={error} />
          ) : (
            <DrillDownTable data={data} totalCount={totalCount} />
          )}
        </div>

        {/* Footer: Export CSV, View All, Close */}
        <DialogFooter className="flex-shrink-0 border-t pt-4 sm:justify-between">
          <div className="flex gap-2">
            {onExportCsv && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportCsv}
                disabled={isLoading || !!error || data.length === 0}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onViewAll && entityType && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewAll}
                disabled={isLoading || !!error}
              >
                <ExternalLink className="h-4 w-4" />
                View All in {entityType}
              </Button>
            )}
            <Button variant="default" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
