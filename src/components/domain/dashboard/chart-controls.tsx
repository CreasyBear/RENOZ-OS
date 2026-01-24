/**
 * Chart Controls Component
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Provides header controls for dashboard charts including date range selection,
 * comparison period toggle, export options, and fullscreen mode.
 *
 * Features:
 * - Date range picker with dual calendar popover
 * - Comparison period dropdown (last period / same period last year)
 * - Export dropdown (PNG / CSV)
 * - Fullscreen toggle button
 * - Compact design with small buttons
 * - Full accessibility support
 *
 * @see _reference/.square-ui-reference/templates/calendar/components/ui/calendar.tsx
 */

'use client';

import { memo, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  CalendarIcon,
  ChevronDown,
  Download,
  Maximize2,
  GitCompare,
  ImageIcon,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import type { DateRange } from 'react-day-picker';

// ============================================================================
// TYPES
// ============================================================================

export type ComparisonPeriod = 'last-period' | 'same-period-last-year';
export type ExportFormat = 'png' | 'csv';

export interface ChartControlsProps {
  /** @source Dashboard date filter state - selected date range */
  dateRange?: { start: Date; end: Date };
  /** @source useCallback handler in container - date range change */
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
  /** @source Dashboard comparison state */
  showComparison?: boolean;
  /** @source useCallback handler in container - comparison toggle */
  onComparisonChange?: (enabled: boolean, period?: ComparisonPeriod) => void;
  /** @source useCallback handler in container - export action */
  onExport?: (format: ExportFormat) => void;
  /** @source useCallback handler in container - fullscreen toggle */
  onFullscreen?: () => void;
  /** Optional className for container */
  className?: string;
}

// ============================================================================
// DATE RANGE PICKER COMPONENT
// ============================================================================

interface DateRangePickerProps {
  dateRange?: { start: Date; end: Date };
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
}

const DateRangePicker = memo(function DateRangePicker({
  dateRange,
  onDateRangeChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Convert to react-day-picker DateRange format
  const selectedRange: DateRange | undefined = dateRange
    ? { from: dateRange.start, to: dateRange.end }
    : undefined;

  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      if (range?.from && range?.to && onDateRangeChange) {
        onDateRangeChange({ start: range.from, end: range.to });
        setIsOpen(false);
      }
    },
    [onDateRangeChange]
  );

  // Format display text
  const displayText = dateRange
    ? `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`
    : 'Select dates';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'justify-start text-left font-normal min-w-[180px]',
            !dateRange && 'text-muted-foreground'
          )}
          aria-label="Select date range"
        >
          <CalendarIcon className="h-4 w-4" aria-hidden="true" />
          <span className="truncate">{displayText}</span>
          <ChevronDown className="ml-auto h-3 w-3 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={dateRange?.start}
          selected={selectedRange}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
});

// ============================================================================
// COMPARISON TOGGLE COMPONENT
// ============================================================================

interface ComparisonToggleProps {
  showComparison?: boolean;
  onComparisonChange?: (enabled: boolean, period?: ComparisonPeriod) => void;
}

const ComparisonToggle = memo(function ComparisonToggle({
  showComparison = false,
  onComparisonChange,
}: ComparisonToggleProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ComparisonPeriod>('last-period');

  const handleToggle = useCallback(
    (enabled: boolean) => {
      if (onComparisonChange) {
        onComparisonChange(enabled, enabled ? selectedPeriod : undefined);
      }
    },
    [onComparisonChange, selectedPeriod]
  );

  const handlePeriodChange = useCallback(
    (period: ComparisonPeriod) => {
      setSelectedPeriod(period);
      if (showComparison && onComparisonChange) {
        onComparisonChange(true, period);
      }
    },
    [showComparison, onComparisonChange]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(showComparison && 'bg-accent')}
          aria-label="Comparison settings"
        >
          <GitCompare className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Compare</span>
          <ChevronDown className="ml-1 h-3 w-3 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Comparison</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={showComparison}
          onCheckedChange={handleToggle}
        >
          Enable comparison
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Compare with
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={selectedPeriod === 'last-period'}
          onCheckedChange={() => handlePeriodChange('last-period')}
          disabled={!showComparison}
        >
          Previous period
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={selectedPeriod === 'same-period-last-year'}
          onCheckedChange={() => handlePeriodChange('same-period-last-year')}
          disabled={!showComparison}
        >
          Same period last year
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

// ============================================================================
// EXPORT DROPDOWN COMPONENT
// ============================================================================

interface ExportDropdownProps {
  onExport?: (format: ExportFormat) => void;
}

const ExportDropdown = memo(function ExportDropdown({ onExport }: ExportDropdownProps) {
  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (onExport) {
        onExport(format);
      }
    },
    [onExport]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Export options"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Export</span>
          <ChevronDown className="ml-1 h-3 w-3 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('png')}>
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
          PNG Image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          CSV Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

// ============================================================================
// FULLSCREEN BUTTON COMPONENT
// ============================================================================

interface FullscreenButtonProps {
  onFullscreen?: () => void;
}

const FullscreenButton = memo(function FullscreenButton({
  onFullscreen,
}: FullscreenButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={onFullscreen}
      aria-label="Toggle fullscreen"
    >
      <Maximize2 className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays chart header controls for date range, comparison, export, and fullscreen.
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 */
export const ChartControls = memo(function ChartControls({
  dateRange,
  onDateRangeChange,
  showComparison,
  onComparisonChange,
  onExport,
  onFullscreen,
  className,
}: ChartControlsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        className
      )}
      role="toolbar"
      aria-label="Chart controls"
    >
      {/* Date Range Picker */}
      <DateRangePicker
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />

      {/* Comparison Toggle */}
      <ComparisonToggle
        showComparison={showComparison}
        onComparisonChange={onComparisonChange}
      />

      {/* Export Dropdown */}
      <ExportDropdown onExport={onExport} />

      {/* Fullscreen Button */}
      <FullscreenButton onFullscreen={onFullscreen} />
    </div>
  );
});

// Re-export types for consumers
export type { DateRange };
