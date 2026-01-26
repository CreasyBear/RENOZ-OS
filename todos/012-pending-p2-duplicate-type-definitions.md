---
status: pending
priority: p2
issue_id: "012"
tags: [code-review, typescript, architecture, sprint-review]
dependencies: []
---

# Duplicate Type Definitions Across Files

## Problem Statement

`DocumentType` is defined 3 separate times with nearly identical values. This creates maintenance burden and risk of drift.

## Findings

**Source:** TypeScript Reviewer Agent, Code Simplicity Reviewer Agent

**Duplicate Definitions:**
```typescript
// use-generate-document.ts (line 35)
export type DocumentType =
  | 'quote' | 'invoice' | 'delivery-note' | 'work-order'
  | 'warranty-certificate' | 'completion-certificate';

// use-document-history.ts (line 30)
export type DocumentType = ... // Same definition

// download-pdf-button.tsx (line 54)
export type DocumentType = ... // Same definition
```

**Additional duplication:**
- `types.ts` and `schemas.ts` define same structures
- Operational templates define types inline instead of shared

## Proposed Solutions

### Option A: Single source of truth in types.ts (Recommended)
**Pros:** DRY, single place to update
**Cons:** Minor import changes
**Effort:** Small (1 hour)
**Risk:** Low

```typescript
// src/lib/documents/types.ts
export type DocumentType =
  | 'quote' | 'invoice' | 'pro-forma'
  | 'delivery-note' | 'packing-slip' | 'work-order'
  | 'warranty-certificate' | 'completion-certificate';

// Other files import from here
import { DocumentType } from '@/lib/documents/types';
```

### Option B: Use Zod schema inference
**Pros:** Single definition, runtime validation
**Cons:** Requires schema-first approach
**Effort:** Medium (2 hours)
**Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Files to consolidate:**
- `src/lib/documents/types.ts` (canonical)
- `src/hooks/documents/use-generate-document.ts`
- `src/hooks/documents/use-document-history.ts`
- `src/components/domain/documents/download-pdf-button.tsx`

## Acceptance Criteria

- [ ] Single `DocumentType` definition
- [ ] All files import from canonical location
- [ ] TypeScript compiles without errors
- [ ] No type drift risk

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- `src/lib/documents/types.ts`
- `src/lib/documents/schemas.ts`
