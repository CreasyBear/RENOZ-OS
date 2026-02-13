/**
 * ProductSearchInterface Container
 *
 * Handles data fetching for search interface.
 * Implements Container/Presenter pattern per STANDARDS.md.
 *
 * @source suggestions from useSearchSuggestions hook
 * @source facets from useSearchFacets hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState, useEffect, useCallback, startTransition } from "react";
import { useDebounce } from "@/hooks";
import {
  useSearchSuggestions,
  useSearchFacets,
  useRecordSearchEvent,
  type Suggestion,
  type Facets,
} from "@/hooks/products";
import { ProductSearchInterfaceView } from "./search-interface-view";

// ============================================================================
// TYPES
// ============================================================================

export interface SearchFilters extends Record<string, unknown> {
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

export interface ProductSearchInterfaceContainerProps {
  onSearch?: (query: string, filters: SearchFilters) => void;
  onProductSelect?: (productId: string) => void;
  initialQuery?: string;
  showFilters?: boolean;
  placeholder?: string;
}

// ============================================================================
// CONTAINER
// ============================================================================

export function ProductSearchInterfaceContainer({
  onSearch,
  onProductSelect,
  initialQuery = "",
  showFilters = true,
  placeholder = "Search products by name, SKU, or description...",
}: ProductSearchInterfaceContainerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Fetch search data
  const { data: suggestionsData, isLoading } = useSearchSuggestions(debouncedQuery, 10);
  const suggestions = (suggestionsData as { suggestions: Suggestion[] } | undefined)?.suggestions ?? [];

  const { data: facetsData } = useSearchFacets();
  const facets = (facetsData as { facets: Facets } | undefined)?.facets ?? null;

  const recordSearch = useRecordSearchEvent();

  // Update price range when facets load
  useEffect(() => {
    if (facets?.priceRange) {
      startTransition(() => setPriceRange([facets.priceRange.min, facets.priceRange.max]));
    }
  }, [facets]);

  // Handle search submission
  const handleSearch = useCallback(
    async (searchQuery: string = query) => {
      if (!searchQuery.trim()) return;

      setIsOpen(false);

      // Record search event (silent fail for analytics)
      recordSearch.mutate({
        query: searchQuery,
        resultCount: 0, // Will be updated with actual count
        filters,
      });

      onSearch?.(searchQuery, filters);
    },
    [query, filters, onSearch, recordSearch]
  );

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
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
  }, [query, handleSearch, onProductSelect]);

  // Handle filter changes
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
    if (facets?.priceRange) {
      setPriceRange([facets.priceRange.min, facets.priceRange.max]);
    }
  }, [facets]);

  return (
    <ProductSearchInterfaceView
      query={query}
      isOpen={isOpen}
      filters={filters}
      priceRange={priceRange}
      filtersOpen={filtersOpen}
      suggestions={suggestions}
      facets={facets}
      isLoading={isLoading}
      showFilters={showFilters}
      placeholder={placeholder}
      onQueryChange={setQuery}
      onIsOpenChange={setIsOpen}
      onPriceRangeChange={setPriceRange}
      onFiltersOpenChange={setFiltersOpen}
      onSearch={handleSearch}
      onSuggestionClick={handleSuggestionClick}
      onUpdateFilter={updateFilter}
      onClearFilters={clearFilters}
    />
  );
}
