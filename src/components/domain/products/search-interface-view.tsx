/**
 * ProductSearchInterface View (Presenter)
 *
 * Pure presentation component for search interface.
 * Receives all data via props per Container/Presenter pattern.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useRef } from "react";
import {
  Search,
  X,
  Filter,
  Package,
  Tag,
  Clock,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Suggestion, Facets } from "@/hooks/products";
import type { SearchFilters } from "./search-interface-container";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductSearchInterfaceViewProps {
  query: string;
  isOpen: boolean;
  filters: SearchFilters;
  priceRange: [number, number];
  filtersOpen: boolean;
  suggestions: Suggestion[];
  facets: Facets | null;
  isLoading: boolean;
  showFilters: boolean;
  placeholder: string;
  onQueryChange: (query: string) => void;
  onIsOpenChange: (open: boolean) => void;
  onPriceRangeChange: (range: [number, number]) => void;
  onFiltersOpenChange: (open: boolean) => void;
  onSearch: (query?: string) => void;
  onSuggestionClick: (suggestion: Suggestion) => void;
  onUpdateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  onClearFilters: () => void;
}

// ============================================================================
// PRESENTER
// ============================================================================

export function ProductSearchInterfaceView({
  query,
  isOpen,
  filters,
  priceRange,
  filtersOpen,
  suggestions,
  facets,
  isLoading,
  showFilters,
  placeholder,
  onQueryChange,
  onIsOpenChange,
  onPriceRangeChange,
  onFiltersOpenChange,
  onSearch,
  onSuggestionClick,
  onUpdateFilter,
  onClearFilters,
}: ProductSearchInterfaceViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Get active filter count
  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    } else if (e.key === "Escape") {
      onIsOpenChange(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2">
        {/* Search input with suggestions */}
        <Popover open={isOpen} onOpenChange={onIsOpenChange}>
          <PopoverTrigger asChild>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => {
                  onQueryChange(e.target.value);
                  onIsOpenChange(true);
                }}
                onFocus={() => onIsOpenChange(true)}
                onKeyDown={handleKeyDown}
                className="pl-9 pr-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    onQueryChange("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {isLoading && (
                <Loader2 className="absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </PopoverTrigger>

          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandList>
                {suggestions.length === 0 && query.length >= 2 && !isLoading && (
                  <CommandEmpty>No suggestions found.</CommandEmpty>
                )}

                {/* Recent/Popular searches */}
                {suggestions.filter((s) => s.type === "recent").length > 0 && (
                  <CommandGroup heading="Recent Searches">
                    {suggestions
                      .filter((s) => s.type === "recent")
                      .map((suggestion, i) => (
                        <CommandItem
                          key={`recent-${i}`}
                          onSelect={() => onSuggestionClick(suggestion)}
                        >
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          {suggestion.value}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}

                {/* Category suggestions */}
                {suggestions.filter((s) => s.type === "category").length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Categories">
                      {suggestions
                        .filter((s) => s.type === "category")
                        .map((suggestion) => (
                          <CommandItem
                            key={`cat-${suggestion.id}`}
                            onSelect={() => onSuggestionClick(suggestion)}
                          >
                            <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                            {suggestion.value}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </>
                )}

                {/* Product suggestions */}
                {suggestions.filter((s) => s.type === "product").length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Products">
                      {suggestions
                        .filter((s) => s.type === "product")
                        .map((suggestion) => (
                          <CommandItem
                            key={`prod-${suggestion.id}`}
                            onSelect={() => onSuggestionClick(suggestion)}
                          >
                            <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{suggestion.value}</span>
                            {suggestion.sku && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {suggestion.sku}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Search button */}
        <Button onClick={() => onSearch()}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>

        {/* Filters button */}
        {showFilters && (
          <Sheet open={filtersOpen} onOpenChange={onFiltersOpenChange}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>

            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  Filters
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={onClearFilters}>
                      Clear all
                    </Button>
                  )}
                </SheetTitle>
                <SheetDescription>
                  Refine your search with advanced filters
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status filter */}
                {facets && facets.status.length > 0 && (
                  <div className="space-y-3">
                    <Label>Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {facets.status.map((s) => (
                        <Badge
                          key={s.value}
                          variant={filters.status === s.value ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() =>
                            onUpdateFilter(
                              "status",
                              filters.status === s.value
                                ? undefined
                                : (s.value as "active" | "inactive" | "discontinued")
                            )
                          }
                        >
                          {s.value} ({s.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Type filter */}
                {facets && facets.type.length > 0 && (
                  <div className="space-y-3">
                    <Label>Product Type</Label>
                    <div className="flex flex-wrap gap-2">
                      {facets.type.map((t) => (
                        <Badge
                          key={t.value}
                          variant={filters.type === t.value ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() =>
                            onUpdateFilter(
                              "type",
                              filters.type === t.value
                                ? undefined
                                : (t.value as "physical" | "service" | "digital" | "bundle")
                            )
                          }
                        >
                          {t.value} ({t.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category filter */}
                {facets && facets.category.length > 0 && (
                  <div className="space-y-3">
                    <Label>Category</Label>
                    <div className="max-h-[200px] overflow-auto space-y-2">
                      {facets.category.map((c) => (
                        <div key={c.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cat-${c.id}`}
                            checked={filters.categoryId === c.id}
                            onCheckedChange={(checked) =>
                              onUpdateFilter("categoryId", checked ? c.id : undefined)
                            }
                          />
                          <label
                            htmlFor={`cat-${c.id}`}
                            className="text-sm flex-1 cursor-pointer"
                          >
                            {c.name}
                          </label>
                          <span className="text-xs text-muted-foreground">
                            ({c.count})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price range filter */}
                {facets && facets.priceRange && (
                  <div className="space-y-3">
                    <Label>Price Range</Label>
                    <div className="px-2">
                      <Slider
                        value={priceRange}
                        min={facets.priceRange.min}
                        max={facets.priceRange.max}
                        step={1}
                        onValueChange={(value) => {
                          onPriceRangeChange(value as [number, number]);
                          onUpdateFilter("minPrice", value[0]);
                          onUpdateFilter("maxPrice", value[1]);
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>${priceRange[0].toFixed(2)}</span>
                      <span>${priceRange[1].toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Apply filters button */}
                <Button className="w-full" onClick={() => {
                  onSearch();
                  onFiltersOpenChange(false);
                }}>
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onUpdateFilter("status", undefined)}
              />
            </Badge>
          )}
          {filters.type && (
            <Badge variant="secondary" className="gap-1">
              Type: {filters.type}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onUpdateFilter("type", undefined)}
              />
            </Badge>
          )}
          {filters.categoryId && (
            <Badge variant="secondary" className="gap-1">
              Category: {facets?.category.find((c) => c.id === filters.categoryId)?.name}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onUpdateFilter("categoryId", undefined)}
              />
            </Badge>
          )}
          {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
            <Badge variant="secondary" className="gap-1">
              Price: ${filters.minPrice ?? 0} - ${filters.maxPrice ?? "∞"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  onUpdateFilter("minPrice", undefined);
                  onUpdateFilter("maxPrice", undefined);
                  if (facets?.priceRange) {
                    onPriceRangeChange([facets.priceRange.min, facets.priceRange.max]);
                  }
                }}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
