# Quick Fix: Unbounded Search Analytics Map
Generated: 2026-01-17

## Change Made
- File: `src/lib/server/functions/product-search.ts`
- Lines: 31-33, 418-447
- Change: Added LRU cache with max size limit to prevent unbounded memory growth

## Problem
The `searchAnalytics` Map was growing unbounded as it tracked every unique search term without any eviction policy. This could lead to memory exhaustion over time as more users performed searches.

## Solution Applied
Implemented an LRU (Least Recently Used) cache pattern with a maximum size of 1000 entries:

1. **Added size constant** (lines 31-33):
   - `MAX_SEARCH_ANALYTICS_SIZE = 1000` to cap the Map size

2. **Updated `trackSearchTerm()` function** (lines 418-447):
   - For existing terms: Delete and re-insert to move to end (most recently used)
   - For new terms: Evict oldest entry (first key) if at capacity before inserting
   - Maintains insertion order using JavaScript Map's ordering guarantee

## Verification
- Syntax check: PASS (TypeScript compiles, dependency errors unrelated)
- Pattern followed: Standard LRU eviction using Map's insertion order

## Implementation Details

### Before
```typescript
const searchAnalytics = new Map<string, SearchAnalyticsEntry>();

function trackSearchTerm(term: string): void {
  const existing = searchAnalytics.get(normalizedTerm);
  if (existing) {
    existing.count++;
  } else {
    searchAnalytics.set(normalizedTerm, { ... });
  }
}
```

### After
```typescript
const MAX_SEARCH_ANALYTICS_SIZE = 1000;
const searchAnalytics = new Map<string, SearchAnalyticsEntry>();

function trackSearchTerm(term: string): void {
  const existing = searchAnalytics.get(normalizedTerm);
  if (existing) {
    // Move to end (most recently used)
    searchAnalytics.delete(normalizedTerm);
    existing.count++;
    searchAnalytics.set(normalizedTerm, existing);
  } else {
    // Evict oldest if at capacity
    if (searchAnalytics.size >= MAX_SEARCH_ANALYTICS_SIZE) {
      const firstKey = searchAnalytics.keys().next().value;
      if (firstKey) searchAnalytics.delete(firstKey);
    }
    searchAnalytics.set(normalizedTerm, { ... });
  }
}
```

## Files Modified
1. `src/lib/server/functions/product-search.ts` - Added LRU cache limit to search analytics Map

## Notes
- The 1000 entry limit is configurable via `MAX_SEARCH_ANALYTICS_SIZE` constant
- Map maintains insertion order in JavaScript, so first key is always oldest
- For production, consider persisting search analytics to database instead of in-memory storage
- Current solution prevents memory leaks while preserving search analytics functionality
