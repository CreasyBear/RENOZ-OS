---
status: pending
priority: p1
issue_id: "005"
tags: [code-review, typescript, bug, sprint-review]
dependencies: []
---

# Type Mismatch: `pages` Property Doesn't Exist on RenderPdfResult

## Problem Statement

The trigger jobs destructure a `pages` property from `renderPdfToBuffer` return value, but `RenderPdfResult` interface doesn't define this property.

## Findings

**Source:** TypeScript Reviewer Agent

**Interface Definition:**
```typescript
// src/lib/documents/render.tsx
export interface RenderPdfResult {
  buffer: Buffer;
  size: number;
  // Note: no 'pages' property!
}
```

**Broken Usage:**
```typescript
// src/trigger/jobs/generate-quote-pdf.tsx (line 370)
const { buffer, pages } = await renderPdfToBuffer(...);

// src/trigger/jobs/generate-invoice-pdf.tsx (line 416)
const { buffer, pages } = await renderPdfToBuffer(...);
```

**Impact:**
- `pages` is `undefined` at runtime
- Metadata about page count is lost/incorrect

## Proposed Solutions

### Option A: Add pageCount to RenderPdfResult (Recommended)
**Pros:** Provides useful metadata
**Cons:** Requires implementation in render function
**Effort:** Small (30 minutes)
**Risk:** Low

```typescript
export interface RenderPdfResult {
  buffer: Buffer;
  size: number;
  pageCount: number; // Add this
}

// In renderPdfToBuffer:
const pdf = await renderToBuffer(element);
// Get page count from PDF metadata or count during render
```

### Option B: Remove pages destructuring
**Pros:** Quick fix
**Cons:** Lose page count metadata
**Effort:** Tiny (5 minutes)
**Risk:** None

## Recommended Action

_To be filled during triage_

## Technical Details

**Interface:** `RenderPdfResult` in `src/lib/documents/render.tsx`
**Usage:** All `generate-*.tsx` trigger jobs

## Acceptance Criteria

- [ ] `RenderPdfResult` interface matches actual return value
- [ ] Page count available if needed
- [ ] TypeScript compiles without errors
- [ ] No runtime undefined access

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- `src/lib/documents/render.tsx`
