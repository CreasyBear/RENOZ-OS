# CC-EMPTY-007a: Search Results Empty State

## Overview
Empty state shown when search queries return no results.

## Layout

### No Search Results
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Search: "xyzabc123"                    [Clear] [X]     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                  [no-results illustration]              │
│                     (magnifying glass)                  │
│                                                         │
│              No results for "xyzabc123"                 │
│                                                         │
│           Try adjusting your search terms               │
│           or check for spelling errors.                 │
│                                                         │
│                  ┌──────────────┐                       │
│                  │ Clear Search │                       │
│                  └──────────────┘                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Suggestions:                                           │
│  • Try fewer keywords                                   │
│  • Check spelling                                       │
│  • Use more general terms                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### With Active Filters
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Search: "solar"                                        │
│  Filters: Status: Active • Type: Product                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                  [no-results illustration]              │
│                                                         │
│               No results for "solar"                    │
│                   with current filters                  │
│                                                         │
│     ┌──────────────┐   ┌──────────────────┐            │
│     │ Clear Search │   │ Clear All Filters │            │
│     └──────────────┘   └──────────────────┘            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Did you mean:                                          │
│  • "Solar Panel 300W"  (3 results)                      │
│  • "Solar Inverter"    (2 results)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Component Props

```typescript
interface SearchEmptyStateProps {
  query: string
  hasFilters?: boolean
  onClearSearch: () => void
  onClearFilters?: () => void
  suggestions?: Array<{
    text: string
    resultCount: number
    onClick: () => void
  }>
}
```

## States

### 1. No Results (Query Only)
- Show search term in message
- Clear Search button
- General suggestions list

### 2. No Results (Query + Filters)
- Show search term and active filter count
- Two buttons: Clear Search, Clear Filters
- "Did you mean" suggestions (if available)

### 3. No Results (Filters Only)
- See CC-EMPTY-008 (Filter Results Empty State)

## Suggestions Logic

```typescript
// Fuzzy match suggestions
const suggestions = useMemo(() => {
  if (!query) return []
  return searchIndex
    .fuzzySearch(query, { limit: 3 })
    .filter(s => s.count > 0)
}, [query])
```

## Animations

```
Enter: fade-in 200ms
Suggestions: staggered fade-in (50ms delay each)
Clear: instant reset
```

## Accessibility

```html
<div role="status" aria-live="polite">
  <p>No results for "{query}"</p>

  <ul aria-label="Search suggestions">
    <li><button>Try fewer keywords</button></li>
    ...
  </ul>
</div>
```

## Touch Targets
- Clear Search button: min-h-11
- Clear Filters button: min-h-11
- Suggestion items: min-h-12

## Responsive

### Mobile
- Buttons stack vertically
- Full-width suggestions

### Desktop
- Buttons inline
- Constrained suggestion width
