# CC-EMPTY-008a: Filter Results Empty State

## Overview
Empty state shown when applied filters return no matching results.

## Layout

### No Filter Results
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Customers                                              │
│                                                         │
│  Filters:  [Status: Active ×] [Type: Business ×]        │
│            [Size: Enterprise ×]                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                  [no-results illustration]              │
│                                                         │
│            No customers match your filters              │
│                                                         │
│         Try removing some filters to see more           │
│         results, or clear all filters to start over.    │
│                                                         │
│                ┌──────────────────┐                     │
│                │ Clear All Filters │                    │
│                └──────────────────┘                     │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Broaden your search:                                   │
│                                                         │
│  ┌─────────────────┐  Remove "Enterprise" (12 results)  │
│  │    Remove       │                                    │
│  └─────────────────┘                                    │
│                                                         │
│  ┌─────────────────┐  Remove "Business" (45 results)    │
│  │    Remove       │                                    │
│  └─────────────────┘                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Single Filter Applied
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Filters:  [Status: Blacklisted ×]                      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                  [no-results illustration]              │
│                                                         │
│         No blacklisted customers found                  │
│                                                         │
│       That's a good thing! All your customers           │
│       are in good standing.                             │
│                                                         │
│                ┌──────────────────┐                     │
│                │   View All       │                     │
│                └──────────────────┘                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Component Props

```typescript
interface FilterEmptyStateProps {
  entityName: string  // "customers", "orders", etc.
  filters: Array<{
    key: string
    label: string
    value: string
    onRemove: () => void
    countIfRemoved?: number
  }>
  onClearAll: () => void
  positiveMessage?: string  // For "good" empty states like no blacklisted
}
```

## Filter Chip Component

```
┌─────────────────────────┐
│ Status: Active      × │
└─────────────────────────┘
   Label    Value   Remove

- Background: muted
- Border-radius: full
- Remove button: X icon, hover:bg-muted-foreground/20
- min-h-8 for touch
```

## Broaden Results Logic

```typescript
// Calculate impact of removing each filter
const filterImpact = useMemo(() => {
  return activeFilters.map(filter => ({
    ...filter,
    countIfRemoved: getCountWithoutFilter(filter.key)
  }))
  .sort((a, b) => b.countIfRemoved - a.countIfRemoved)
  .slice(0, 3)  // Top 3 suggestions
}, [activeFilters, data])
```

## States

### 1. Multiple Filters (Standard)
- Show all active filter chips
- Clear All button
- Broaden suggestions with counts

### 2. Single Filter (May be positive)
- Check if filter result is "good" (no issues, no overdue)
- Show positive message if applicable
- View All button

### 3. Complex Filters (Date ranges, etc.)
- Show filter summary, not chips
- Reset to defaults button

## Animations

```
Filter chip remove: scale-out 150ms + fade
Broaden suggestion: fade-in when results calculated
Clear all: instant reset
```

## Accessibility

```html
<div role="status" aria-live="polite">
  <p>No {entityName} match your filters</p>

  <div aria-label="Active filters">
    <button aria-label="Remove Status: Active filter">
      Status: Active <span aria-hidden="true">×</span>
    </button>
  </div>

  <button>Clear all filters</button>
</div>
```

## Touch Targets
- Filter chips: min-h-8 (32px)
- Remove X button: min-w-8 min-h-8
- Clear All button: min-h-11
- Broaden suggestion row: min-h-12
