/**
 * ProductSearchInterface Component
 *
 * Advanced search interface with autocomplete, filters, and faceted navigation.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "@/hooks";
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
import {
  getSearchSuggestions,
  getSearchFacets,
  recordSearchEvent,
} from "@/server/functions/products/product-search";

interface ProductSearchInterfaceProps {
  onSearch?: (query: string, filters: SearchFilters) => void;
  onProductSelect?: (productId: string) => void;
  initialQuery?: string;
  showFilters?: boolean;
  placeholder?: string;
}

interface SearchFilters {
  categoryId?: string;
  status?: "active" | "inactive" | "discontinued";
  type?: "physical" | "service" | "digital" | "bundle";
  minPrice?: number;
  maxPrice?: number;
  attributes?: Array<{
    attributeId: string;
    value: string | number | boolean;
    operator: "eq" | "contains";
  }>;
}

interface Suggestion {
  type: "recent" | "category" | "product";
  value: string;
  id: string | null;
  sku?: string;
}

interface Facets {
  status: Array<{ value: string; count: number }>;
  type: Array<{ value: string; count: number }>;
  category: Array<{ id: string; name: string; count: number }>;
  priceRange: { min: number; max: number };
  attributes: Array<{ id: string; name: string; type: string }>;
}

export function ProductSearchInterface({
  onSearch,
  onProductSelect,
  initialQuery = "",
  showFilters = true,
  placeholder = "Search products by name, SKU, or description...",
}: ProductSearchInterfaceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load suggestions when query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const loadSuggestions = async () => {
      setIsLoading(true);
      try {
        const result = (await getSearchSuggestions({
          data: { query: debouncedQuery, limit: 10 },
        })) as { suggestions: Suggestion[] };
        setSuggestions(result.suggestions);
      } catch (error) {
        console.error("Failed to load suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSuggestions();
  }, [debouncedQuery]);

  // Load facets on mount
  useEffect(() => {
    const loadFacets = async () => {
      try {
        const result = (await getSearchFacets({
          data: {},
        })) as { facets: Facets };
        setFacets(result.facets);
        if (result.facets.priceRange) {
          setPriceRange([result.facets.priceRange.min, result.facets.priceRange.max]);
        }
      } catch (error) {
        console.error("Failed to load facets:", error);
      }
    };

    loadFacets();
  }, []);

  // Handle search submission
  const handleSearch = useCallback(
    async (searchQuery: string = query) => {
      if (!searchQuery.trim()) return;

      setIsOpen(false);

      // Record search event
      try {
        await recordSearchEvent({
          data: {
            query: searchQuery,
            resultCount: 0, // Will be updated with actual count
            filters: filters as Record<string, unknown>,
          },
        });
      } catch (error) {
        // Silent fail for analytics
      }

      onSearch?.(searchQuery, filters);
    },
    [query, filters, onSearch]
  );

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.type === "product" && suggestion.id) {
      onProductSelect?.(suggestion.id);
    } else if (suggestion.type === "category" && suggestion.id) {
      setFilters((prev) => ({ ...prev, categoryId: suggestion.id! }));
      handleSearch(query);
    } else {
      setQuery(suggestion.value);
      handleSearch(suggestion.value);
    }
    setIsOpen(false);
  };

  // Handle filter changes
  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    if (facets?.priceRange) {
      setPriceRange([facets.priceRange.min, facets.priceRange.max]);
    }
  };

  // Get active filter count
  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2">
        {/* Search input with suggestions */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                className="pl-9 pr-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
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
                          onSelect={() => handleSuggestionClick(suggestion)}
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
                            onSelect={() => handleSuggestionClick(suggestion)}
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
                            onSelect={() => handleSuggestionClick(suggestion)}
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
        <Button onClick={() => handleSearch()}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>

        {/* Filters button */}
        {showFilters && (
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
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
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
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
                            updateFilter(
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
                            updateFilter(
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
                              updateFilter("categoryId", checked ? c.id : undefined)
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
                          setPriceRange(value as [number, number]);
                          updateFilter("minPrice", value[0]);
                          updateFilter("maxPrice", value[1]);
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
                  handleSearch();
                  setFiltersOpen(false);
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
                onClick={() => updateFilter("status", undefined)}
              />
            </Badge>
          )}
          {filters.type && (
            <Badge variant="secondary" className="gap-1">
              Type: {filters.type}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("type", undefined)}
              />
            </Badge>
          )}
          {filters.categoryId && (
            <Badge variant="secondary" className="gap-1">
              Category: {facets?.category.find((c) => c.id === filters.categoryId)?.name}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("categoryId", undefined)}
              />
            </Badge>
          )}
          {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
            <Badge variant="secondary" className="gap-1">
              Price: ${filters.minPrice ?? 0} - ${filters.maxPrice ?? "∞"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  updateFilter("minPrice", undefined);
                  updateFilter("maxPrice", undefined);
                  if (facets?.priceRange) {
                    setPriceRange([facets.priceRange.min, facets.priceRange.max]);
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
