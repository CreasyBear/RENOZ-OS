/**
 * CustomerFilters Component
 *
 * Advanced filtering UI for the customer directory.
 * Includes search, status/type dropdowns, health score range, and tag filtering.
 */
import {
  Search,
  X,
  Filter,
  ChevronDown,
  Tag,
  Heart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  customerStatusValues,
  customerTypeValues,
  customerSizeValues,
} from '@/lib/schemas/customers'

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerFiltersState {
  search: string
  status: string[]
  type: string[]
  size: string[]
  healthScoreMin?: number
  healthScoreMax?: number
  tags: string[]
}

interface CustomerFiltersProps {
  filters: CustomerFiltersState
  onChange: (filters: CustomerFiltersState) => void
  availableTags?: Array<{ id: string; name: string; color: string }>
  resultCount?: number
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const statusLabels: Record<string, string> = {
  prospect: 'Prospect',
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  blacklisted: 'Blacklisted',
}

const typeLabels: Record<string, string> = {
  individual: 'Individual',
  business: 'Business',
  government: 'Government',
  non_profit: 'Non-Profit',
}

const sizeLabels: Record<string, string> = {
  micro: 'Micro',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  enterprise: 'Enterprise',
}

// ============================================================================
// HEALTH SCORE FILTER
// ============================================================================

interface HealthScoreFilterProps {
  min?: number
  max?: number
  onChange: (min?: number, max?: number) => void
}

function HealthScoreFilter({ min, max, onChange }: HealthScoreFilterProps) {
  const presets = [
    { label: 'Excellent (80-100)', min: 80, max: 100 },
    { label: 'Good (60-79)', min: 60, max: 79 },
    { label: 'Fair (40-59)', min: 40, max: 59 },
    { label: 'At Risk (0-39)', min: 0, max: 39 },
  ]

  const hasValue = min !== undefined || max !== undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasValue ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
        >
          <Heart className="h-4 w-4" />
          Health Score
          {hasValue && (
            <Badge variant="secondary" className="ml-1 px-1">
              {min ?? 0}-{max ?? 100}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-3">
          <div className="text-sm font-medium">Health Score Range</div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="Min"
              value={min ?? ''}
              onChange={(e) =>
                onChange(
                  e.target.value ? parseInt(e.target.value) : undefined,
                  max
                )
              }
              className="h-8 w-16 text-center"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="Max"
              value={max ?? ''}
              onChange={(e) =>
                onChange(
                  min,
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="h-8 w-16 text-center"
            />
          </div>
          <div className="border-t pt-2">
            <div className="text-xs text-muted-foreground mb-2">Quick Select</div>
            <div className="space-y-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange(preset.min, preset.max)}
                  className={cn(
                    'w-full text-left px-2 py-1 text-sm rounded hover:bg-muted',
                    min === preset.min && max === preset.max && 'bg-muted'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          {hasValue && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange(undefined, undefined)}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// MULTI-SELECT FILTER
// ============================================================================

interface MultiSelectFilterProps {
  label: string
  icon: React.ReactNode
  options: readonly string[]
  selected: string[]
  onChange: (selected: string[]) => void
  labelMap: Record<string, string>
}

function MultiSelectFilter({
  label,
  icon,
  options,
  selected,
  onChange,
  labelMap,
}: MultiSelectFilterProps) {
  const hasValue = selected.length > 0

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={hasValue ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
        >
          {icon}
          {label}
          {hasValue && (
            <Badge variant="secondary" className="ml-1 px-1">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.includes(option)}
            onCheckedChange={() => toggleOption(option)}
          >
            {labelMap[option] || option}
          </DropdownMenuCheckboxItem>
        ))}
        {hasValue && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={false}
              onCheckedChange={() => onChange([])}
              className="text-muted-foreground"
            >
              Clear selection
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
// TAG FILTER
// ============================================================================

interface TagFilterProps {
  selectedTags: string[]
  availableTags: Array<{ id: string; name: string; color: string }>
  onChange: (tagIds: string[]) => void
}

function TagFilter({ selectedTags, availableTags, onChange }: TagFilterProps) {
  const hasValue = selectedTags.length > 0

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter((t) => t !== tagId))
    } else {
      onChange([...selectedTags, tagId])
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasValue ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
        >
          <Tag className="h-4 w-4" />
          Tags
          {hasValue && (
            <Badge variant="secondary" className="ml-1 px-1">
              {selectedTags.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="text-sm font-medium">Filter by Tags</div>
          {availableTags.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              No tags available
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                    selectedTags.includes(tag.id)
                      ? 'ring-2 ring-offset-1 ring-primary'
                      : 'opacity-70 hover:opacity-100'
                  )}
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
          {hasValue && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange([])}
            >
              Clear Tags
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// ACTIVE FILTER CHIPS
// ============================================================================

interface ActiveFilterChipsProps {
  filters: CustomerFiltersState
  availableTags?: Array<{ id: string; name: string; color: string }>
  onChange: (filters: CustomerFiltersState) => void
  className?: string
}

export function ActiveFilterChips({
  filters,
  availableTags = [],
  onChange,
  className,
}: ActiveFilterChipsProps) {
  const hasActiveFilters =
    filters.search ||
    filters.status.length > 0 ||
    filters.type.length > 0 ||
    filters.size.length > 0 ||
    filters.healthScoreMin !== undefined ||
    filters.healthScoreMax !== undefined ||
    filters.tags.length > 0

  if (!hasActiveFilters) return null

  const removeSearch = () => onChange({ ...filters, search: '' })
  const removeStatus = (status: string) =>
    onChange({ ...filters, status: filters.status.filter((s) => s !== status) })
  const removeType = (type: string) =>
    onChange({ ...filters, type: filters.type.filter((t) => t !== type) })
  const removeSize = (size: string) =>
    onChange({ ...filters, size: filters.size.filter((s) => s !== size) })
  const removeHealthScore = () =>
    onChange({ ...filters, healthScoreMin: undefined, healthScoreMax: undefined })
  const removeTag = (tagId: string) =>
    onChange({ ...filters, tags: filters.tags.filter((t) => t !== tagId) })

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">Active filters:</span>

      {filters.search && (
        <Badge variant="secondary" className="gap-1">
          Search: {filters.search}
          <button
            type="button"
            onClick={removeSearch}
            className="ml-1 hover:text-destructive focus:outline-none"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.status.map((status) => (
        <Badge key={status} variant="secondary" className="gap-1">
          Status: {statusLabels[status] || status}
          <button
            type="button"
            onClick={() => removeStatus(status)}
            className="ml-1 hover:text-destructive focus:outline-none"
            aria-label={`Remove ${status} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {filters.type.map((type) => (
        <Badge key={type} variant="secondary" className="gap-1">
          Type: {typeLabels[type] || type}
          <button
            type="button"
            onClick={() => removeType(type)}
            className="ml-1 hover:text-destructive focus:outline-none"
            aria-label={`Remove ${type} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {filters.size.map((size) => (
        <Badge key={size} variant="secondary" className="gap-1">
          Size: {sizeLabels[size] || size}
          <button
            type="button"
            onClick={() => removeSize(size)}
            className="ml-1 hover:text-destructive focus:outline-none"
            aria-label={`Remove ${size} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {(filters.healthScoreMin !== undefined || filters.healthScoreMax !== undefined) && (
        <Badge variant="secondary" className="gap-1">
          Health: {filters.healthScoreMin ?? 0}-{filters.healthScoreMax ?? 100}
          <button
            type="button"
            onClick={removeHealthScore}
            className="ml-1 hover:text-destructive focus:outline-none"
            aria-label="Clear health score filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.tags.map((tagId) => {
        const tag = availableTags.find((t) => t.id === tagId)
        if (!tag) return null
        return (
          <Badge
            key={tagId}
            variant="secondary"
            className="gap-1"
            style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }}
          >
            Tag: {tag.name}
            <button
              type="button"
              onClick={() => removeTag(tagId)}
              className="ml-1 hover:opacity-70 focus:outline-none"
              aria-label={`Remove ${tag.name} tag filter`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )
      })}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerFilters({
  filters,
  onChange,
  availableTags = [],
  resultCount,
  className,
}: CustomerFiltersProps) {
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    filters.status.length +
    filters.type.length +
    filters.size.length +
    (filters.healthScoreMin !== undefined || filters.healthScoreMax !== undefined ? 1 : 0) +
    filters.tags.length

  const clearAllFilters = () => {
    onChange({
      search: '',
      status: [],
      type: [],
      size: [],
      healthScoreMin: undefined,
      healthScoreMax: undefined,
      tags: [],
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar with Result Count */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers by name, email, phone, code..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-9 pr-9"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {resultCount !== undefined && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {resultCount.toLocaleString()} result{resultCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        <MultiSelectFilter
          label="Status"
          icon={null}
          options={customerStatusValues}
          selected={filters.status}
          onChange={(status) => onChange({ ...filters, status })}
          labelMap={statusLabels}
        />

        <MultiSelectFilter
          label="Type"
          icon={null}
          options={customerTypeValues}
          selected={filters.type}
          onChange={(type) => onChange({ ...filters, type })}
          labelMap={typeLabels}
        />

        <MultiSelectFilter
          label="Size"
          icon={null}
          options={customerSizeValues}
          selected={filters.size}
          onChange={(size) => onChange({ ...filters, size })}
          labelMap={sizeLabels}
        />

        <HealthScoreFilter
          min={filters.healthScoreMin}
          max={filters.healthScoreMax}
          onChange={(min, max) =>
            onChange({ ...filters, healthScoreMin: min, healthScoreMax: max })
          }
        />

        {availableTags.length > 0 && (
          <TagFilter
            selectedTags={filters.tags}
            availableTags={availableTags}
            onChange={(tags) => onChange({ ...filters, tags })}
          />
        )}

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear all ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  )
}
