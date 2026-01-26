---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, architecture, sprint-review]
dependencies: []
---

# Local Query Keys Instead of Centralized queryKeys

## Problem Statement

Document hooks define query keys inline instead of using centralized `queryKeys` from `@/lib/query-keys.ts`. This violates CLAUDE.md rules and reduces cache invalidation reliability.

## Findings

**Source:** Architecture Strategist Agent, TypeScript Reviewer Agent, Pattern Recognition Agent

**Inline Keys:**
```typescript
// use-document-history.ts (lines 117-125)
queryKey: [
  'documents',
  'history',
  filters.entityType,
  filters.entityId,
  filters.documentType,
],

// use-generate-document.ts (lines 104-106)
queryClient.invalidateQueries({
  queryKey: ['documents', 'history', 'order', result.orderId],
});
```

**CLAUDE.md Rule:**
> "Always use centralized keys from `@/lib/query-keys.ts`. Never define local query keys."

## Proposed Solutions

### Option A: Add to centralized queryKeys (Recommended)
**Pros:** Follows project standards
**Cons:** Minor refactor
**Effort:** Small (1 hour)
**Risk:** Low

```typescript
// In @/lib/query-keys.ts
documents: {
  all: () => ['documents'] as const,
  history: (entityType: string, entityId: string, documentType?: string) =>
    ['documents', 'history', entityType, entityId, documentType] as const,
  status: (orderId: string, documentType: string) =>
    ['documents', 'status', orderId, documentType] as const,
},
```

## Recommended Action

_To be filled during triage_

## Technical Details

**Files to modify:**
- `src/lib/query-keys.ts` - Add document keys
- `src/hooks/documents/use-document-history.ts` - Use queryKeys
- `src/hooks/documents/use-generate-document.ts` - Use queryKeys

## Acceptance Criteria

- [ ] Document query keys added to centralized queryKeys
- [ ] All document hooks use queryKeys.documents.*
- [ ] Cache invalidation works correctly
- [ ] No inline query key arrays

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- `src/lib/query-keys.ts`
- CLAUDE.md query key rules
