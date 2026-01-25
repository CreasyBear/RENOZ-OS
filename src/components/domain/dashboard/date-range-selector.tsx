/**
 * DateRangeSelector Component (Presenter)
 *
 * Dashboard-level date range selection with presets and custom range picker.
 * Features:
 * - Preset buttons for quick selection (Today, This Week, This Month, etc.)
 * - Custom date range picker with dual calendars
 * - Side-by-side layout (presets left, calendars right) on desktop
 * - Compact dropdown on mobile
 * - URL parameter synchronization via DashboardContext
 * - ARIA accessibility with keyboard navigation
 *
 * @see DASH-DATE-RANGE
 * @see wireframes/dashboard-date-range.wireframe.md
 * @see _reference/.reui-reference/registry/default/components/date-picker/presets.tsx
 */

"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  ChevronDown,
  X,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import {
  type DateRange,
  DATE_PRESETS,
  validateDateRange,
  formatDateRange,
  getRangeDays,
} from "@/lib/utils/date-presets";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// TYPES
// ============================================================================

export interface DateRangeSelectorProps {
  /** Current date range value */
  value: DateRange;
  /** Current preset (e.g., "this-month", "custom") */
  preset: string;
  /** Callback when date range changes */
  onChange: (range: DateRange, preset?: string) => void;
  /** Callback when preset is selected */
  onPresetChange?: (presetValue: string) => void;
  /** Whether to show the preset label badge */
  showPresetLabel?: boolean;
  /** Disable the selector */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// PRESET BUTTON COMPONENT
// ============================================================================

interface PresetButtonProps {
  label: string;
  shortLabel?: string;
  value: string;
  isSelected: boolean;
  onClick: (value: string) => void;
  disabled?: boolean;
}

function PresetButton({
  label,
  shortLabel,
  value,
  isSelected,
  onClick,
  disabled,
}: PresetButtonProps) {
  return (
    <Button
      role="radio"
      aria-checked={isSelected}
      variant={isSelected ? "default" : "outline"}
      size="sm"
      onClick={() => onClick(value)}
      disabled={disabled}
      className={cn(
        "justify-start whitespace-nowrap",
        isSelected && "bg-primary text-primary-foreground"
      )}
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel || label}</span>
    </Button>
  );
}

// ============================================================================
// CUSTOM DATE RANGE PICKER CONTENT
// ============================================================================

interface CustomRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onApply: () => void;
  onReset: () => void;
  onClose?: () => void;
}

function CustomRangePicker({
  value,
  onChange,
  onApply,
  onReset,
  onClose: _onClose,
}: CustomRangePickerProps) {
  const [tempRange, setTempRange] = React.useState<DayPickerRange | undefined>({
    from: value.from,
    to: value.to,
  });

  // Update temp range when external value changes
  React.useEffect(() => {
    setTempRange({ from: value.from, to: value.to });
  }, [value.from, value.to]);

  const handleSelect = (range: DayPickerRange | undefined) => {
    setTempRange(range);
  };

  const handleApply = () => {
    if (tempRange?.from && tempRange?.to) {
      onChange({ from: tempRange.from, to: tempRange.to });
      onApply();
    }
  };

  const handleReset = () => {
    setTempRange({ from: value.from, to: value.to });
    onReset();
  };

  // Validation
  const validation = tempRange?.from && tempRange?.to
    ? validateDateRange({ from: tempRange.from, to: tempRange.to })
    : { isValid: false, errors: [], warnings: [] };

  const canApply = tempRange?.from && tempRange?.to && validation.isValid;
  const dayCount = tempRange?.from && tempRange?.to
    ? getRangeDays({ from: tempRange.from, to: tempRange.to })
    : 0;

  return (
    <div className="flex flex-col">
      {/* Header with quick presets */}
      <div className="p-3 border-b">
        <h4 className="text-sm font-medium mb-2">Quick Presets</h4>
        <div className="flex flex-wrap gap-1">
          {DATE_PRESETS.slice(5, 9).map((preset) => (
            <Button
              key={preset.value}
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                const range = preset.getRange();
                setTempRange({ from: range.from, to: range.to });
              }}
            >
              {preset.shortLabel}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar(s) */}
      <div className="p-3">
        <Calendar
          mode="range"
          defaultMonth={tempRange?.from}
          selected={tempRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={{ after: new Date() }}
        />
      </div>

      {/* Validation messages */}
      {validation.errors.length > 0 && (
        <div className="px-3 pb-2">
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {validation.errors[0]}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {validation.warnings.length > 0 && validation.errors.length === 0 && (
        <div className="px-3 pb-2">
          <Alert className="py-2 border-amber-500/50 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {validation.warnings[0]}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Footer */}
      <Separator />
      <div className="p-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {tempRange?.from && tempRange?.to ? (
            <>
              {format(tempRange.from, "MMM d")} - {format(tempRange.to, "MMM d, yyyy")}
              <span className="ml-2 text-xs">({dayCount} days)</span>
            </>
          ) : (
            "Select a date range"
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!canApply}
          >
            Apply Range
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE DATE RANGE SELECTOR
// ============================================================================

interface MobileDateRangeSelectorProps {
  value: DateRange;
  preset: string;
  onChange: (range: DateRange, preset?: string) => void;
  onPresetChange?: (presetValue: string) => void;
  disabled?: boolean;
}

function MobileDateRangeSelector({
  value,
  preset,
  onChange,
  onPresetChange,
  disabled,
}: MobileDateRangeSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showCustomPicker, setShowCustomPicker] = React.useState(false);

  const currentPreset = DATE_PRESETS.find((p) => p.value === preset);
  const displayLabel = currentPreset?.label || "Custom Range";

  const handlePresetSelect = (presetValue: string) => {
    if (presetValue === "custom") {
      setShowCustomPicker(true);
      return;
    }

    const presetDef = DATE_PRESETS.find((p) => p.value === presetValue);
    if (presetDef) {
      const range = presetDef.getRange();
      onChange(range, presetValue);
      onPresetChange?.(presetValue);
      setIsOpen(false);
    }
  };

  const handleCustomApply = () => {
    setShowCustomPicker(false);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="w-full justify-between"
          aria-label="Select date range"
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" aria-hidden="true" />
            {displayLabel}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Select Date Range
            {showCustomPicker && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCustomPicker(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        {showCustomPicker ? (
          <div className="mt-4 overflow-auto">
            <CustomRangePicker
              value={value}
              onChange={(range) => onChange(range, "custom")}
              onApply={handleCustomApply}
              onReset={() => setShowCustomPicker(false)}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {DATE_PRESETS.map((presetDef) => (
              <Button
                key={presetDef.value}
                variant={preset === presetDef.value ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => handlePresetSelect(presetDef.value)}
              >
                {preset === presetDef.value && (
                  <span className="mr-2 text-primary" aria-hidden="true">
                    ✓
                  </span>
                )}
                {presetDef.label}
              </Button>
            ))}
            <Separator className="my-2" />
            <Button
              variant={preset === "custom" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => handlePresetSelect("custom")}
            >
              {preset === "custom" && (
                <span className="mr-2 text-primary" aria-hidden="true">
                  ✓
                </span>
              )}
              Custom Range...
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DateRangeSelector({
  value,
  preset,
  onChange,
  onPresetChange,
  showPresetLabel = true,
  disabled = false,
  className,
}: DateRangeSelectorProps) {
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);

  const handlePresetClick = (presetValue: string) => {
    const presetDef = DATE_PRESETS.find((p) => p.value === presetValue);
    if (presetDef) {
      const range = presetDef.getRange();
      onChange(range, presetValue);
      onPresetChange?.(presetValue);
    }
  };

  const handleCustomApply = () => {
    setIsCustomOpen(false);
  };

  const handleCustomReset = () => {
    // Reset to current value
  };

  const currentPresetDef = DATE_PRESETS.find((p) => p.value === preset);
  const displayText = formatDateRange(value);

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      role="group"
      aria-label="Date range selection"
    >
      {/* Desktop: Preset buttons + Custom trigger */}
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        <div
          role="radiogroup"
          aria-label="Preset date ranges"
          className="flex items-center gap-1 flex-wrap"
        >
          {DATE_PRESETS.slice(0, 5).map((presetDef) => (
            <PresetButton
              key={presetDef.value}
              label={presetDef.label}
              shortLabel={presetDef.shortLabel}
              value={presetDef.value}
              isSelected={preset === presetDef.value}
              onClick={handlePresetClick}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Custom date range popover */}
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={preset === "custom" ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              aria-haspopup="dialog"
              aria-expanded={isCustomOpen}
              aria-label="Select custom date range"
              className={cn(
                preset === "custom" && "bg-primary text-primary-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              Custom
              <ChevronDown className="ml-1 h-3 w-3" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
            <CustomRangePicker
              value={value}
              onChange={(range) => onChange(range, "custom")}
              onApply={handleCustomApply}
              onReset={handleCustomReset}
              onClose={() => setIsCustomOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Mobile: Compact dropdown */}
      <div className="md:hidden">
        <MobileDateRangeSelector
          value={value}
          preset={preset}
          onChange={onChange}
          onPresetChange={onPresetChange}
          disabled={disabled}
        />
      </div>

      {/* Date range display badge */}
      {showPresetLabel && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Selected:</span>
          <Badge variant="secondary" className="font-normal tabular-nums">
            {displayText}
          </Badge>
          {currentPresetDef && preset !== "custom" && (
            <span className="text-xs">({currentPresetDef.label})</span>
          )}
          {preset === "custom" && (
            <span className="text-xs">(Custom Range)</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONNECTED COMPONENT
// ============================================================================

/**
 * DateRangeSelector connected to DashboardContext.
 * Use this in the dashboard route for automatic state management.
 */
export function ConnectedDateRangeSelector({
  className,
  showPresetLabel = true,
}: {
  className?: string;
  showPresetLabel?: boolean;
}) {
  // Import here to avoid circular dependencies
  const { useDashboardDateRange } = require("./dashboard-context");
  const { dateRange, preset, setDateRange, setPreset } = useDashboardDateRange();

  return (
    <DateRangeSelector
      value={dateRange}
      preset={preset}
      onChange={setDateRange}
      onPresetChange={setPreset}
      showPresetLabel={showPresetLabel}
      className={className}
    />
  );
}
