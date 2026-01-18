/**
 * FilterEmptyState Component (CC-EMPTY-008)
 *
 * Empty state for filtered results that return nothing.
 * Shows active filters with options to broaden the search.
 *
 * @example
 * ```tsx
 * <FilterEmptyState
 *   entityName="customers"
 *   filters={[
 *     { key: "status", label: "Status", value: "Active", onRemove: () => clearFilter("status") },
 *     { key: "type", label: "Type", value: "Business", onRemove: () => clearFilter("type"), countIfRemoved: 45 },
 *   ]}
 *   onClearAll={() => clearAllFilters()}
 * />
 *
 * // Positive empty state
 * <FilterEmptyState
 *   entityName="customers"
 *   filters={[{ key: "status", label: "Status", value: "Blacklisted", onRemove: () => {} }]}
 *   onClearAll={() => {}}
 *   positiveMessage="That's a good thing! All your customers are in good standing."
 * />
 * ```
 */
import { Filter, X } from "lucide-react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { EmptyStateContainer } from "./empty-state"

// ============================================================================
// TYPES
// ============================================================================

export interface FilterItem {
  /** Unique key for the filter */
  key: string
  /** Display label (e.g., "Status") */
  label: string
  /** Current value (e.g., "Active") */
  value: string
  /** Callback when this filter is removed */
  onRemove: () => void
  /** Number of results if this filter is removed */
  countIfRemoved?: number
}

export interface FilterEmptyStateProps {
  /** Name of the entity being filtered (e.g., "customers", "orders") */
  entityName: string
  /** Active filters */
  filters: FilterItem[]
  /** Callback to clear all filters */
  onClearAll: () => void
  /** Positive message for "good" empty states (e.g., no blacklisted customers) */
  positiveMessage?: string
  /** Additional class names */
  className?: string
}

// ============================================================================
// FILTER CHIP
// ============================================================================

interface FilterChipProps {
  label: string
  value: string
  onRemove: () => void
}

function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm min-h-8">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors min-w-8 min-h-8 flex items-center justify-center"
        aria-label={`Remove ${label}: ${value} filter`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FilterEmptyState({
  entityName,
  filters,
  onClearAll,
  positiveMessage,
  className,
}: FilterEmptyStateProps) {
  // Sort broaden suggestions by impact (highest count first)
  const broadenSuggestions = filters
    .filter((f) => f.countIfRemoved !== undefined && f.countIfRemoved > 0)
    .sort((a, b) => (b.countIfRemoved ?? 0) - (a.countIfRemoved ?? 0))
    .slice(0, 3)

  const hasBroadenSuggestions = broadenSuggestions.length > 0
  const isPositiveEmpty = Boolean(positiveMessage)

  return (
    <EmptyStateContainer variant="inline" className={className}>
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center text-center"
      >
        {/* Icon */}
        <div className="rounded-full bg-muted p-4 mb-4">
          <Filter
            className="h-12 w-12 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold mb-1">
          {isPositiveEmpty
            ? `No ${entityName} found`
            : `No ${entityName} match your filters`}
        </h3>

        {/* Message */}
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {isPositiveEmpty
            ? positiveMessage
            : `Try removing some filters to see more results, or clear all filters to start over.`}
        </p>

        {/* Active filter chips */}
        <div
          aria-label="Active filters"
          className="flex flex-wrap gap-2 justify-center mb-4 max-w-md"
        >
          {filters.map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              value={filter.value}
              onRemove={filter.onRemove}
            />
          ))}
        </div>

        {/* Clear all button */}
        <Button
          variant={isPositiveEmpty ? "outline" : "default"}
          onClick={onClearAll}
          className="min-h-11"
        >
          {isPositiveEmpty ? "View All" : "Clear All Filters"}
        </Button>

        {/* Broaden suggestions */}
        {hasBroadenSuggestions && !isPositiveEmpty && (
          <>
            <div className="w-full max-w-sm border-t my-6" />
            <div className="w-full max-w-sm text-left">
              <p className="text-sm font-medium mb-2">Broaden your search:</p>
              <ul className="space-y-1">
                {broadenSuggestions.map((filter) => (
                  <li key={filter.key}>
                    <button
                      onClick={filter.onRemove}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors",
                        "min-h-12 flex items-center justify-between text-sm"
                      )}
                    >
                      <span>
                        Remove "{filter.value}"
                      </span>
                      <span className="text-muted-foreground">
                        ({filter.countIfRemoved} result{filter.countIfRemoved !== 1 ? "s" : ""})
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </EmptyStateContainer>
  )
}
