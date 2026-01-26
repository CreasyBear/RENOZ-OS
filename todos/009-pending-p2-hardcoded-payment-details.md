---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, data-integrity, sprint-review]
dependencies: []
---

# Hardcoded Payment Details in Invoice Generation

## Problem Statement

Invoice generation has hardcoded bank details instead of fetching from organization settings. This will produce incorrect invoices in production.

## Findings

**Source:** Architecture Strategist Agent, TypeScript Reviewer Agent

**Hardcoded Values (generate-invoice-pdf.tsx lines 345-351):**
```typescript
const paymentDetails: DocumentPaymentDetails = {
  bankName: "Commonwealth Bank",
  accountName: orgData.name,
  bsb: "000-000",
  accountNumber: "12345678",
  paymentInstructions: `Please include invoice number...`,
};
```

**Impact:**
- All invoices show same (wrong) bank details
- Organizations cannot configure their payment info
- Production invoices would be invalid

## Proposed Solutions

### Option A: Add payment settings to organization (Recommended)
**Pros:** Proper per-org configuration
**Cons:** Requires schema change
**Effort:** Medium (3-4 hours)
**Risk:** Low

1. Add `paymentDetails` JSONB column to organizations table
2. Create settings UI for payment configuration
3. Fetch from org settings in invoice job

### Option B: Add to document_templates table
**Pros:** Uses existing customization table
**Cons:** Payment details aren't really "template" data
**Effort:** Medium (2-3 hours)
**Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

**File:** `src/trigger/jobs/generate-invoice-pdf.tsx`
**Lines:** 345-351
**Interface:** `DocumentPaymentDetails`

## Acceptance Criteria

- [ ] Payment details fetched from organization settings
- [ ] Settings UI for payment configuration
- [ ] Invoice shows correct org-specific bank details
- [ ] Fallback/validation for missing payment details

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- Organization schema: `drizzle/schema/settings/organizations.ts`
