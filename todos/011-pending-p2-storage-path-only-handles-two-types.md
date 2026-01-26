---
status: pending
priority: p2
issue_id: "011"
tags: [code-review, bug, sprint-review]
dependencies: []
---

# Storage Path Function Only Handles Quote/Invoice

## Problem Statement

`generateStoragePath` only handles "quote" and "invoice" types, defaulting to "invoices" folder for all other document types. New document types (delivery notes, certificates, etc.) get stored in wrong folder.

## Findings

**Source:** Architecture Strategist Agent

**Current Implementation (render.tsx lines 127-134):**
```typescript
export function generateStoragePath(
  organizationId: string,
  type: string,
  filename: string,
): string {
  const folder = type === "quote" ? "quotes" : "invoices"; // Only 2 types!
  return `documents/${organizationId}/${folder}/${filename}`;
}
```

**Impact:**
- Delivery notes stored in /invoices folder
- Work orders stored in /invoices folder
- Certificates stored in /invoices folder
- Confusing storage organization

## Proposed Solutions

### Option A: Add folder mapping for all types (Recommended)
**Pros:** Clear organization, easy to extend
**Cons:** None
**Effort:** Small (30 minutes)
**Risk:** Low

```typescript
const FOLDER_MAP: Record<string, string> = {
  quote: 'quotes',
  invoice: 'invoices',
  'packing-slip': 'packing-slips',
  'delivery-note': 'delivery-notes',
  'work-order': 'work-orders',
  'warranty-certificate': 'certificates/warranty',
  'completion-certificate': 'certificates/completion',
  'pro-forma': 'pro-formas',
};

export function generateStoragePath(...) {
  const folder = FOLDER_MAP[type] || type;
  return `documents/${organizationId}/${folder}/${filename}`;
}
```

## Recommended Action

_To be filled during triage_

## Technical Details

**File:** `src/lib/documents/render.tsx`
**Function:** `generateStoragePath`

## Acceptance Criteria

- [ ] All document types have correct folder mapping
- [ ] Unknown types use type name as folder (fallback)
- [ ] Existing documents not affected
- [ ] Storage organized by document type

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- `src/lib/documents/render.tsx`
