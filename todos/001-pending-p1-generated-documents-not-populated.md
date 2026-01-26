---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, data-integrity, sprint-review]
dependencies: []
---

# Generated Documents Table Never Populated

## Problem Statement

The `generated_documents` audit table exists in the schema but is **never populated** by any trigger job. This means:
- No audit trail of generated documents
- Document history UI returns empty results
- Cannot track regeneration history
- Compliance/audit requirements unmet

## Findings

**Source:** Data Integrity Guardian Agent

**Evidence:**
- Grep for `insert.*generatedDocuments` returns 0 matches in `src/`
- All trigger jobs return document metadata but never insert into the table
- `get-generated-documents.ts` queries the table but will always return empty

**Affected Files:**
- `src/trigger/jobs/generate-quote-pdf.tsx`
- `src/trigger/jobs/generate-invoice-pdf.tsx`
- `src/trigger/jobs/generate-delivery-note-pdf.tsx`
- `src/trigger/jobs/generate-work-order-pdf.tsx`
- `src/trigger/jobs/generate-warranty-certificate-pdf.tsx`
- `src/trigger/jobs/generate-completion-certificate-pdf.tsx`
- `src/trigger/jobs/generate-packing-slip-pdf.tsx`

## Proposed Solutions

### Option A: Add insert after storage upload (Recommended)
**Pros:** Simple, clear audit trail
**Cons:** Adds DB write to critical path
**Effort:** Medium (2-3 hours)
**Risk:** Low

```typescript
// After successful storage upload:
await db.insert(generatedDocuments).values({
  organizationId,
  documentType: 'quote',
  entityType: 'order',
  entityId: orderId,
  filename,
  storageUrl: signedUrl,
  fileSize: buffer.length,
  generatedById: null, // or from context
});
```

### Option B: Emit event for separate audit job
**Pros:** Decoupled, non-blocking
**Cons:** More complex, eventual consistency
**Effort:** High (4-5 hours)
**Risk:** Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**Schema:** `drizzle/schema/generated-documents.ts`
**Table:** `generated_documents`
**Required Fields:** organizationId, documentType, entityType, entityId, filename, storageUrl, fileSize

## Acceptance Criteria

- [ ] All 7 generate-*.tsx jobs insert into generated_documents
- [ ] Document history UI shows generated documents
- [ ] TypeScript compiles without errors
- [ ] Audit trail complete for regeneration scenarios

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- Schema: `drizzle/schema/generated-documents.ts`
- Server function: `src/server/functions/documents/get-generated-documents.ts`
