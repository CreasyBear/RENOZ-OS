/**
 * Hierarchical Location Selector
 *
 * Popover wrapper around LocationTree for use in forms.
 * Reuses existing LocationTree component (per Simplicity review - no duplication).
 *
 * @see INV-002c Hierarchical Location Selector
 */
import { memo, useState, useMemo, useCallback } from 'react';
import { MapPin, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { LocationTree, type WarehouseLocation } from './location-tree';

// ============================================================================
// TYPES
// ============================================================================

export interface LocationSelectorProps {
  /** Hierarchical locations from useLocations hook. */
  locations: WarehouseLocation[];
  /** Currently selected location ID. */
  selectedId: string | null;
  /** Callback when location is selected. */
  onSelect: (location: WarehouseLocation) => void;
  /** Filter to only show receivable locations. */
  filterReceivable?: boolean;
  /** Filter to only show pickable locations. */
  filterPickable?: boolean;
  /** Disabled state. */
  disabled?: boolean;
  /** Loading state. */
  isLoading?: boolean;
  /** Placeholder text when no selection. */
  placeholder?: string;
  /** Additional className. */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Flatten hierarchy to find selected location by ID */
function findLocation(locations: WarehouseLocation[], id: string): WarehouseLocation | undefined {
  for (const loc of locations) {
    if (loc.id === id) return loc;
    if (loc.children) {
      const found = findLocation(loc.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Filter locations by receivable/pickable criteria */
function filterLocations(
  locations: WarehouseLocation[],
  filterReceivable: boolean,
  filterPickable: boolean
): WarehouseLocation[] {
  const result: WarehouseLocation[] = [];

  for (const loc of locations) {
    const filteredChildren = loc.children
      ? filterLocations(loc.children, filterReceivable, filterPickable)
      : undefined;

    const meetsReceivable = !filterReceivable || loc.isReceivable;
    const meetsPickable = !filterPickable || loc.isPickable;
    const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;

    // Include if meets criteria OR has children that meet criteria
    if ((meetsReceivable && meetsPickable) || hasMatchingChildren) {
      result.push({
        ...loc,
        children: filteredChildren,
      });
    }
  }

  return result;
}

/** Filter locations by search query */
function searchLocations(locations: WarehouseLocation[], query: string): WarehouseLocation[] {
  const lowerQuery = query.toLowerCase();
  const result: WarehouseLocation[] = [];

  for (const loc of locations) {
    const matchesSearch =
      loc.name.toLowerCase().includes(lowerQuery) ||
      loc.locationCode.toLowerCase().includes(lowerQuery);

    const filteredChildren = loc.children ? searchLocations(loc.children, query) : undefined;
    const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;

    if (matchesSearch || hasMatchingChildren) {
      result.push({
        ...loc,
        children: matchesSearch ? loc.children : filteredChildren,
      });
    }
  }

  return result;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const LocationSelector = memo(function LocationSelector({
  locations,
  selectedId,
  onSelect,
  filterReceivable = false,
  filterPickable = false,
  disabled = false,
  isLoading = false,
  placeholder = 'Select location...',
  className,
}: LocationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Find the selected location for display
  const selectedLocation = useMemo(
    () => (selectedId ? findLocation(locations, selectedId) : undefined),
    [locations, selectedId]
  );

  // Apply filters
  const filteredLocations = useMemo(() => {
    let result = locations;

    if (filterReceivable || filterPickable) {
      result = filterLocations(result, filterReceivable, filterPickable);
    }

    if (search.trim()) {
      result = searchLocations(result, search);
    }

    return result;
  }, [locations, filterReceivable, filterPickable, search]);

  // Handle selection
  const handleSelect = useCallback(
    (location: WarehouseLocation) => {
      onSelect(location);
      setOpen(false);
      setSearch('');
    },
    [onSelect]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select warehouse location"
          disabled={disabled || isLoading}
          className={cn('w-full justify-between', className)}
        >
          {selectedLocation ? (
            <span className="flex items-center gap-2 truncate">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedLocation.name}</span>
              <span className="text-muted-foreground shrink-0 text-xs">
                ({selectedLocation.locationCode})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <div className="border-b p-2">
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {filteredLocations.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">No locations found</p>
            ) : (
              <LocationTree
                locations={filteredLocations}
                isLoading={isLoading}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
});

export default LocationSelector;
