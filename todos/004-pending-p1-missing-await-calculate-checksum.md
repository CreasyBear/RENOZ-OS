---
status: pending
priority: p1
issue_id: "004"
tags: [code-review, typescript, bug, sprint-review]
dependencies: []
---

# Missing `await` on calculateChecksum Calls

## Problem Statement

`calculateChecksum` is an async function returning `Promise<string>`, but it's called without `await` in quote and invoice jobs. The `checksum` variable is a Promise, not the actual hash string.

## Findings

**Source:** TypeScript Reviewer Agent

**Broken Code:**
```typescript
// src/trigger/jobs/generate-quote-pdf.tsx (line 387)
const checksum = calculateChecksum(pdfResult.buffer); // Missing await!

// src/trigger/jobs/generate-invoice-pdf.tsx (line 437)
const checksum = calculateChecksum(pdfResult.buffer); // Missing await!
```

**Correct Implementation (for reference):**
```typescript
// src/trigger/jobs/generate-work-order-pdf.tsx (line 251)
const checksum = await calculateChecksum(buffer); // Correct!
```

**Impact:**
- Checksum value is `[object Promise]` instead of actual hash
- Document integrity verification broken
- Metadata stored incorrectly

## Proposed Solutions

### Option A: Add await (Recommended)
**Pros:** One-line fix
**Cons:** None
**Effort:** Tiny (5 minutes)
**Risk:** None

```typescript
const checksum = await calculateChecksum(pdfResult.buffer);
```

## Recommended Action

_To be filled during triage_

## Technical Details

**Function:** `calculateChecksum` from `src/lib/documents/render.tsx`
**Return type:** `Promise<string>`

## Acceptance Criteria

- [ ] `generate-quote-pdf.tsx` uses `await calculateChecksum()`
- [ ] `generate-invoice-pdf.tsx` uses `await calculateChecksum()`
- [ ] TypeScript compiles without errors
- [ ] Checksum values are valid hash strings

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- `src/lib/documents/render.tsx` - calculateChecksum function
