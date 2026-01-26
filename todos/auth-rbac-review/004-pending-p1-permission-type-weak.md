---
status: pending
priority: p1
issue_id: "004"
tags: [code-review, security, typescript, type-safety]
dependencies: []
---

# PermissionAction Type is Too Weak (string instead of union)

## Problem Statement

The `PermissionAction` type is defined as `string`, allowing any arbitrary string to be passed as a permission. This defeats TypeScript's type safety - typos in permission strings will not be caught at compile time, and developers can pass invalid permissions.

## Findings

**File:** `src/lib/auth/permissions.ts` (line 22)

```typescript
export type PermissionAction = string  // TOO WEAK
```

**Impact:**
```typescript
// These compile but are WRONG:
await withAuth({ permission: 'customer.creat' })  // Typo - should be 'create'
await withAuth({ permission: 'custmer.read' })    // Typo in domain
await withAuth({ permission: 'dashboard.view' }) // Wrong - should be 'dashboard.read'
```

**Already Found Bug:**
`src/routes/_authenticated/settings.tsx` line 39 uses `dashboard.view` which doesn't exist - should be `dashboard.read`.

## Proposed Solutions

### Solution 1: Union Type from PERMISSIONS Object (Recommended)
Derive the type from the actual PERMISSIONS constant.

**Pros:**
- Single source of truth
- Compile-time safety
- IDE autocomplete
- Catches typos immediately

**Cons:**
- More complex type definition
- Requires TypeScript expertise

**Effort:** Medium (2-4 hours including fixing found typos)

**Implementation:**
```typescript
// Extract all permission values as a union type
type ExtractPermissionValues<T> = T extends Record<string, Record<string, string>>
  ? T[keyof T][keyof T[keyof T]]
  : never;

export type PermissionAction = ExtractPermissionValues<typeof PERMISSIONS>;
// Results in: 'customer.create' | 'customer.read' | 'customer.update' | ...
```

### Solution 2: Explicit Union Type
Manually list all valid permissions.

**Pros:**
- Simple to understand
- Immediate type safety

**Cons:**
- Duplicate source of truth
- Must update when adding permissions

**Implementation:**
```typescript
export type PermissionAction =
  | 'customer.create' | 'customer.read' | 'customer.update' | 'customer.delete'
  | 'order.create' | 'order.read' | 'order.update' | 'order.delete'
  // ... all 94 permissions
```

## Acceptance Criteria

- [ ] PermissionAction is a strict union type
- [ ] All existing permission usages compile correctly
- [ ] Found typo `dashboard.view` → `dashboard.read` fixed
- [ ] IDE shows autocomplete for permissions
- [ ] Invalid permissions cause compile errors

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From security-sentinel, pattern-recognition, simplicity-reviewer |
