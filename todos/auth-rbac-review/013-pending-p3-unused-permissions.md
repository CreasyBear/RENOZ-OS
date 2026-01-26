---
status: pending
priority: p3
issue_id: "013"
tags: [code-review, cleanup, permissions, tech-debt]
dependencies: []
---

# ~50 Unused Permissions in Permission Matrix

## Problem Statement

The permission matrix defines 94 permissions, but approximately 50 are never actually checked in server functions. This creates confusion about what's protected and wastes developer cognitive load.

## Findings

**File:** `src/lib/auth/permissions.ts`

**Never Used Permissions:**
- `activity.export`, `activity.read` - defined but not checked
- `order.cancel`, `order.fulfill`, `order.export` - order domain uses read/update only
- `quote.*` - all 6 permissions appear unused (quote domain not implemented)
- `report.viewFinancial`, `report.viewOperations`, `report.viewSales`
- `product.managePricing`, `product.read` - only `product.update` used
- `job.*` - all 5 permissions use fallback pattern with optional chaining
- `inventory.manage`, `inventory.count`, `inventory.forecast` - not in owner role

**Additionally Found:**
- `dashboard.view` used in settings.tsx:39 but doesn't exist - should be `dashboard.read`

## Proposed Solutions

### Solution 1: Remove Unused Permissions
Delete permissions that aren't checked anywhere.

**Pros:** Cleaner, less confusion
**Cons:** May break if features added later

### Solution 2: Use or Document
Either add permission checks where missing, or document as "reserved for future use".

**Effort:** Medium (audit + update)

## Acceptance Criteria

- [ ] Each permission is either used or documented as reserved
- [ ] Fix `dashboard.view` → `dashboard.read` typo
- [ ] Permission matrix matches actual enforcement

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From simplicity-reviewer findings |
