/**
 * Comparison Toggle Component
 *
 * ARCHITECTURE: Presenter Component - Controls for period-over-period comparison.
 *
 * Features:
 * - Toggle comparison on/off
 * - Period selector (previous period, same period last year, etc.)
 * - Compact and expanded variants
 * - ARIA accessibility with proper labels
 *
 * @see DASH-COMPARISON-UI acceptance criteria
 * @see src/lib/schemas/dashboard/comparison.ts
 */

import { memo, useCallback } from 'react';
import { GitCompare, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ComparisonPeriod } from '@/lib/schemas/dashboard/comparison';

// ============================================================================
// TYPES
// ============================================================================

export interface ComparisonToggleProps {
  /** Whether comparison is enabled */
  enabled: boolean;
  /** @source useState setter in dashboard container */
  onEnabledChange: (enabled: boolean) => void;
  /** Selected comparison period */
  period: ComparisonPeriod;
  /** @source useState setter in dashboard container */
  onPeriodChange: (period: ComparisonPeriod) => void;
  /** Display variant */
  variant?: 'compact' | 'expanded';
  /** Additional class name */
  className?: string;
  /** Disable the control */
  disabled?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PERIOD_OPTIONS: Array<{ value: ComparisonPeriod; label: string; description: string }> = [
  {
    value: 'previous_period',
    label: 'Previous Period',
    description: 'Compare with the same length period immediately before',
  },
  {
    value: 'previous_year',
    label: 'Same Period Last Year',
    description: 'Compare with the same dates from last year',
  },
  {
    value: 'previous_quarter',
    label: 'Previous Quarter',
    description: 'Compare with the previous quarter',
  },
  {
    value: 'previous_month',
    label: 'Previous Month',
    description: 'Compare with the previous month',
  },
];

// ============================================================================
// COMPACT VARIANT
// ============================================================================

const CompactToggle = memo(function CompactToggle({
  enabled,
  onEnabledChange,
  period,
  onPeriodChange,
  disabled,
  className,
}: Omit<ComparisonToggleProps, 'variant'>) {
  const selectedOption = PERIOD_OPTIONS.find((opt) => opt.value === period);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant={enabled ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onEnabledChange(!enabled)}
        disabled={disabled}
        className="gap-1.5"
        aria-pressed={enabled}
        aria-label={enabled ? 'Disable comparison' : 'Enable comparison'}
      >
        <GitCompare className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Compare</span>
      </Button>

      {enabled && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              disabled={disabled}
            >
              {selectedOption?.label ?? 'Select period'}
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PERIOD_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onPeriodChange(option.value)}
                className="gap-2"
              >
                {option.value === period && (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
                <span className={option.value !== period ? 'pl-6' : ''}>
                  {option.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});

// ============================================================================
// EXPANDED VARIANT
// ============================================================================

const ExpandedToggle = memo(function ExpandedToggle({
  enabled,
  onEnabledChange,
  period,
  onPeriodChange,
  disabled,
  className,
}: Omit<ComparisonToggleProps, 'variant'>) {
  const selectedOption = PERIOD_OPTIONS.find((opt) => opt.value === period);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={enabled ? 'secondary' : 'outline'}
          size="sm"
          className={cn('gap-2', className)}
          disabled={disabled}
          aria-label="Comparison settings"
        >
          <GitCompare className="h-4 w-4" aria-hidden="true" />
          <span>Compare</span>
          {enabled && (
            <span className="text-xs opacity-70">
              ({selectedOption?.label})
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="comparison-toggle" className="text-sm font-medium">
                Period Comparison
              </Label>
              <p className="text-xs text-muted-foreground">
                Compare metrics with a previous period
              </p>
            </div>
            <Switch
              id="comparison-toggle"
              checked={enabled}
              onCheckedChange={onEnabledChange}
              disabled={disabled}
              aria-describedby="comparison-description"
            />
          </div>

          {/* Period Selection */}
          {enabled && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-medium text-muted-foreground">
                Compare with
              </Label>
              <div className="grid gap-2">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onPeriodChange(option.value)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-md border p-3 text-left text-sm transition-colors',
                      option.value === period
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:bg-muted'
                    )}
                    disabled={disabled}
                  >
                    <div className="flex items-center gap-2">
                      {option.value === period && (
                        <Check
                          className="h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={cn(
                          'font-medium',
                          option.value !== period && 'pl-6'
                        )}
                      >
                        {option.label}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-xs text-muted-foreground',
                        option.value !== period && 'pl-6'
                      )}
                    >
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Controls for enabling and configuring period-over-period comparison.
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks - only local UI state allowed.
 */
export const ComparisonToggle = memo(function ComparisonToggle({
  enabled,
  onEnabledChange,
  period,
  onPeriodChange,
  variant = 'compact',
  className,
  disabled = false,
}: ComparisonToggleProps) {
  const handlePeriodChange = useCallback(
    (newPeriod: ComparisonPeriod) => {
      onPeriodChange(newPeriod);
      // Auto-enable if a period is selected
      if (!enabled) {
        onEnabledChange(true);
      }
    },
    [enabled, onEnabledChange, onPeriodChange]
  );

  if (variant === 'expanded') {
    return (
      <ExpandedToggle
        enabled={enabled}
        onEnabledChange={onEnabledChange}
        period={period}
        onPeriodChange={handlePeriodChange}
        disabled={disabled}
        className={className}
      />
    );
  }

  return (
    <CompactToggle
      enabled={enabled}
      onEnabledChange={onEnabledChange}
      period={period}
      onPeriodChange={handlePeriodChange}
      disabled={disabled}
      className={className}
    />
  );
});
