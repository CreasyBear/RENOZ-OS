/**
 * SearchEmptyState Component (CC-EMPTY-007)
 *
 * Empty state for search queries that return no results.
 * Includes suggestions and clear actions.
 *
 * @example
 * ```tsx
 * <SearchEmptyState
 *   query="xyzabc123"
 *   onClearSearch={() => setQuery("")}
 * />
 *
 * // With filters
 * <SearchEmptyState
 *   query="solar"
 *   hasFilters
 *   onClearSearch={() => setQuery("")}
 *   onClearFilters={() => clearAllFilters()}
 *   suggestions={[
 *     { text: "Solar Panel 300W", resultCount: 3, onClick: () => searchFor("Solar Panel 300W") }
 *   ]}
 * />
 * ```
 */
import { Search } from "lucide-react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { EmptyStateContainer } from "./empty-state"

// ============================================================================
// TYPES
// ============================================================================

export interface SearchSuggestion {
  text: string
  resultCount: number
  onClick: () => void
}

export interface SearchEmptyStateProps {
  /** The search query that returned no results */
  query: string
  /** Whether filters are currently active */
  hasFilters?: boolean
  /** Callback to clear the search */
  onClearSearch: () => void
  /** Callback to clear all filters (required if hasFilters is true) */
  onClearFilters?: () => void
  /** Fuzzy match suggestions */
  suggestions?: SearchSuggestion[]
  /** Additional class names */
  className?: string
}

// ============================================================================
// DEFAULT SUGGESTIONS
// ============================================================================

const DEFAULT_TIPS = [
  "Try fewer keywords",
  "Check spelling",
  "Use more general terms",
]

// ============================================================================
// COMPONENT
// ============================================================================

export function SearchEmptyState({
  query,
  hasFilters = false,
  onClearSearch,
  onClearFilters,
  suggestions,
  className,
}: SearchEmptyStateProps) {
  const hasSuggestions = suggestions && suggestions.length > 0

  return (
    <EmptyStateContainer variant="inline" className={className}>
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center text-center"
      >
        {/* Icon */}
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search
            className="h-12 w-12 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold mb-1">
          No results for "{query}"
        </h3>

        {/* Message */}
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {hasFilters
            ? "Try adjusting your search terms or removing some filters."
            : "Try adjusting your search terms or check for spelling errors."}
        </p>

        {/* Action buttons */}
        <div
          className={cn(
            "flex gap-3",
            hasFilters ? "flex-col sm:flex-row" : "flex-col"
          )}
        >
          <Button
            variant="outline"
            onClick={onClearSearch}
            className="min-h-11"
          >
            Clear Search
          </Button>

          {hasFilters && onClearFilters && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="min-h-11"
            >
              Clear All Filters
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className="w-full max-w-sm border-t my-6" />

        {/* Suggestions */}
        {hasSuggestions ? (
          <div className="w-full max-w-sm text-left">
            <p className="text-sm font-medium mb-2">Did you mean:</p>
            <ul aria-label="Search suggestions" className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <button
                    onClick={suggestion.onClick}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors min-h-12 flex items-center justify-between text-sm"
                  >
                    <span className="text-primary hover:underline">
                      "{suggestion.text}"
                    </span>
                    <span className="text-muted-foreground">
                      ({suggestion.resultCount} result{suggestion.resultCount !== 1 ? "s" : ""})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="w-full max-w-sm text-left">
            <p className="text-sm font-medium mb-2">Suggestions:</p>
            <ul aria-label="Search suggestions" className="space-y-1">
              {DEFAULT_TIPS.map((tip, index) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground pl-4 before:content-['•'] before:absolute before:left-0 relative"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </EmptyStateContainer>
  )
}
