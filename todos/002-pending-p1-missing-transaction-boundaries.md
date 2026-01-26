---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, data-integrity, sprint-review]
dependencies: []
---

# Missing Transaction Boundaries for PDF Generation

## Problem Statement

PDF generation tasks perform multiple operations (storage upload, URL generation, database update) without transaction boundaries. If any step fails after storage upload, orphaned files remain with no database reference.

## Findings

**Source:** Data Integrity Guardian Agent

**Data Corruption Scenario:**
1. PDF uploads successfully to Supabase Storage
2. Signed URL generation succeeds
3. Database update fails (network issue, constraint violation)
4. **Result:** Orphaned PDF file in storage with no database reference

**Affected Files:**
- `src/trigger/jobs/generate-quote-pdf.tsx` (lines 395-440)
- `src/trigger/jobs/generate-invoice-pdf.tsx` (lines 445-490)
- `src/trigger/jobs/generate-warranty-certificate-pdf.tsx` (lines 339-390)

## Proposed Solutions

### Option A: Compensating transaction pattern (Recommended)
**Pros:** Handles distributed transaction across storage + DB
**Cons:** Requires cleanup on failure
**Effort:** Medium (3-4 hours)
**Risk:** Low

```typescript
let storageUploadSucceeded = false;
try {
  // Upload to storage
  await storage.upload(path, buffer);
  storageUploadSucceeded = true;

  // Update database
  await db.update(orders).set({ quotePdfUrl }).where(...);

  // Insert audit record
  await db.insert(generatedDocuments).values({...});
} catch (error) {
  // Cleanup on failure
  if (storageUploadSucceeded) {
    await storage.remove(path);
  }
  throw error;
}
```

### Option B: Two-phase with retry queue
**Pros:** More robust for high volume
**Cons:** Complex, requires additional infrastructure
**Effort:** High (8+ hours)
**Risk:** Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**Pattern:** Compensating transaction (Saga pattern lite)
**Storage:** Supabase Storage
**Database:** PostgreSQL via Drizzle

## Acceptance Criteria

- [ ] Failed DB update triggers storage cleanup
- [ ] No orphaned files in storage after failures
- [ ] Proper error propagation to Trigger.dev for retries
- [ ] All generate-*.tsx jobs implement pattern

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- Trigger.dev retry docs: https://trigger.dev/docs/v3/errors-retrying
