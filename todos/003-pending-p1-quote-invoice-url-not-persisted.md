---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, data-integrity, sprint-review]
dependencies: ["001"]
---

# Quote/Invoice PDF URL Not Persisted to Orders Table

## Problem Statement

The `generate-quote-pdf.tsx` and `generate-invoice-pdf.tsx` jobs return the generated URL but **do not update** the `orders` table with `quotePdfUrl` or `invoicePdfUrl`. The schema has these columns but they remain null.

## Findings

**Source:** Data Integrity Guardian Agent, Architecture Strategist Agent

**Evidence from `generate-documents.ts` (lines 184-185):**
```typescript
// quotePdfUrl: orders.quotePdfUrl, // TODO: Add after migration
// invoicePdfUrl: orders.invoicePdfUrl, // TODO: Add after migration
```

**Impact:**
- Orders don't have a reference to their generated documents
- UI cannot show "Download PDF" from order detail without additional lookup
- No way to know if PDF was ever generated

## Proposed Solutions

### Option A: Update order after successful upload (Recommended)
**Pros:** Simple, direct
**Cons:** Adds DB write
**Effort:** Small (1 hour)
**Risk:** Low

```typescript
// In generate-quote-pdf.tsx after storage upload:
await db
  .update(orders)
  .set({
    quotePdfUrl: signedUrl,
    updatedAt: new Date(),
  })
  .where(eq(orders.id, orderId));
```

### Option B: Use generated_documents table as source of truth
**Pros:** Single source, supports versioning
**Cons:** Requires join to get URL
**Effort:** Medium (2 hours)
**Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Schema columns:**
- `orders.quotePdfUrl` (TEXT, nullable)
- `orders.invoicePdfUrl` (TEXT, nullable)

**Files to modify:**
- `src/trigger/jobs/generate-quote-pdf.tsx`
- `src/trigger/jobs/generate-invoice-pdf.tsx`

## Acceptance Criteria

- [ ] Quote generation updates `orders.quotePdfUrl`
- [ ] Invoice generation updates `orders.invoicePdfUrl`
- [ ] Order detail page can show download button directly
- [ ] Regeneration updates the URL

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- Schema: `drizzle/schema/orders/orders.ts` (lines 129-131)
