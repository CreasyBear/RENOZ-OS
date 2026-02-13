/**
 * SerialPicker Component
 *
 * Shared component for selecting serial numbers from a list of options.
 * Used by PickItemsDialog (options from useAvailableSerials) and ShipOrderDialog
 * (options from allocatedSerialNumbers).
 *
 * WMS-optimized: FIFO ordering, location prominence, scan mode, touch targets.
 *
 * @see pick-items-dialog.tsx - Pick flow
 * @see ship-order-dialog.tsx - Ship flow
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Check, X, AlertCircle, Hash, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface SerialOption {
  serialNumber: string;
  locationName?: string;
  /** ISO date for "Pick first" / age display (FIFO) */
  receivedAt?: string;
}

export interface SerialPickerProps {
  options: SerialOption[];
  selectedSerials: string[];
  onChange: (serials: string[]) => void;
  maxSelections: number;
  disabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  onOpenChange?: (open: boolean) => void;
  /** When true: auto-focus search on open; scan-friendly input for barcode scanners */
  scanMode?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SerialPicker = memo(function SerialPicker({
  options,
  selectedSerials,
  onChange,
  maxSelections,
  disabled = false,
  isLoading = false,
  ariaLabel = 'Select serial numbers',
  onOpenChange: onOpenChangeProp,
  scanMode = false,
}: SerialPickerProps) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChangeProp?.(next);
    },
    [onOpenChangeProp]
  );
  const remainingSlots = maxSelections - selectedSerials.length;

  const toggleSerial = useCallback(
    (serialNumber: string) => {
      if (selectedSerials.includes(serialNumber)) {
        onChange(selectedSerials.filter((s) => s !== serialNumber));
      } else if (remainingSlots > 0) {
        onChange([...selectedSerials, serialNumber]);
      }
    },
    [selectedSerials, onChange, remainingSlots]
  );

  const removeSerial = useCallback(
    (serialNumber: string) => {
      onChange(selectedSerials.filter((s) => s !== serialNumber));
    },
    [selectedSerials, onChange]
  );

  // Scan mode: auto-focus input when popover opens (defer to next tick for Radix lazy-rendered content)
  useEffect(() => {
    if (!scanMode || !open) return;
    const id = setTimeout(() => {
      const input = contentRef.current?.querySelector<HTMLInputElement>(
        '[data-slot="command-input"]'
      );
      input?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [scanMode, open]);

  const hasLocation = options.some((o) => o.locationName);
  const hasReceivedAt = options.some((o) => o.receivedAt);

  if (disabled) {
    return (
      <div className="text-sm text-muted-foreground">
        Enter pick quantity first
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Selected Serials Badges */}
      {selectedSerials.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedSerials.map((serial) => (
            <Badge
              key={serial}
              variant="secondary"
              className="flex items-center gap-1 text-xs min-h-[44px]"
            >
              <Hash className="h-3 w-3" />
              {serial}
              <button
                onClick={() => removeSerial(serial)}
                className="ml-1 rounded-full hover:bg-muted p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center"
                type="button"
                aria-label={`Remove ${serial}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Selector Popover */}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between min-h-[44px]"
            disabled={remainingSlots <= 0 || isLoading}
            aria-label={ariaLabel}
            aria-expanded={open}
          >
            <span className="truncate">
              {isLoading
                ? 'Loading serials...'
                : remainingSlots <= 0
                  ? 'All serials selected'
                  : `Select ${remainingSlots} more serial${remainingSlots !== 1 ? 's' : ''}`}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <div ref={contentRef}>
          <Command
            className="[&_[cmdk-input]]:h-11"
            shouldFilter={true}
          >
            <CommandInput
              placeholder="Search or scan serial..."
              inputMode="search"
              autoComplete="off"
            />
            <CommandList
              className="max-h-[280px]"
              aria-label="Available serial numbers"
            >
              {isLoading ? (
                <div className="p-2 space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-sm" />
                  ))}
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    No serials found. Check location filter or stock levels.
                  </CommandEmpty>
                  <CommandGroup
                    heading={hasLocation ? 'Serial Numbers · Location' : 'Serial Numbers'}
                  >
                    {options.map((opt, index) => {
                      const isSelected = selectedSerials.includes(opt.serialNumber);
                      const canSelect = isSelected || remainingSlots > 0;
                      const isPickFirst =
                        hasReceivedAt && index < maxSelections && opt.receivedAt;

                      return (
                        <CommandItem
                          key={opt.serialNumber}
                          onSelect={() => {
                            if (canSelect) {
                              toggleSerial(opt.serialNumber);
                              if (remainingSlots === 1 && !isSelected) {
                                setOpen(false);
                              }
                            }
                          }}
                          disabled={!canSelect}
                          className={cn(
                            'flex items-center justify-between min-h-[44px] gap-2',
                            !canSelect && !isSelected && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                isSelected
                                  ? 'bg-primary border-primary'
                                  : 'border-input'
                              )}
                            >
                              {isSelected && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {opt.serialNumber}
                                </span>
                                {isPickFirst && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 shrink-0"
                                  >
                                    Pick first
                                  </Badge>
                                )}
                              </div>
                              {opt.locationName && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  {opt.locationName}
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
          </div>
        </PopoverContent>
      </Popover>

      {/* Validation Message */}
      {selectedSerials.length < maxSelections && (
        <p className="text-xs text-amber-600">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          Select {maxSelections - selectedSerials.length} more serial
          {maxSelections - selectedSerials.length !== 1 ? 's' : ''}
        </p>
      )}
      {selectedSerials.length === maxSelections && (
        <p className="text-xs text-green-600">
          <Check className="h-3 w-3 inline mr-1" />
          All serials selected
        </p>
      )}
    </div>
  );
});
