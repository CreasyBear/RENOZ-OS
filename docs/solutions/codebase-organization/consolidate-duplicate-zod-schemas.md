---
title: "Consolidate Duplicate Zod Schema Files"
date: 2026-01-24
category: codebase-organization
tags:
  - zod
  - schemas
  - organization
  - migration
  - barrel-exports
  - typescript
problem_type: technical-debt
component: src/lib/schemas/
severity: medium
time_to_solve: 30-60 minutes
symptoms:
  - Duplicate schema files at root and subdirectory levels
  - Divergent schema definitions between duplicates
  - Inconsistent import paths (./patterns vs ../_shared/patterns)
  - Index barrel only exporting root files
  - Subdirectory versions containing enhancements missing from root
root_cause: Incremental refactoring left orphaned root-level files when domain subdirectories were introduced
solution_type: file-consolidation
files_affected:
  - src/lib/schemas/activities.ts (deleted)
  - src/lib/schemas/auth.ts (deleted)
  - src/lib/schemas/customers.ts (deleted)
  - src/lib/schemas/files.ts (deleted)
  - src/lib/schemas/inventory.ts (deleted)
  - src/lib/schemas/orders.ts (deleted)
  - src/lib/schemas/pipeline.ts (deleted)
  - src/lib/schemas/products.ts (deleted)
  - src/lib/schemas/patterns.ts (deleted)
  - src/lib/schemas/api-tokens.ts (deleted)
  - src/lib/schemas/order-amendments.ts (deleted)
  - src/lib/schemas/order-templates.ts (deleted)
  - src/lib/schemas/shipments.ts (deleted)
  - src/lib/schemas/index.ts (updated)
related_domains:
  - activities
  - auth
  - customers
  - files
  - inventory
  - jobs
  - orders
  - pipeline
  - products
---

# Consolidate Duplicate Zod Schema Files

## Problem Description

Zod schema files were duplicated across two locations:
1. **Root level**: `src/lib/schemas/{domain}.ts`
2. **Subdirectories**: `src/lib/schemas/{domain}/index.ts`

This created maintenance burden, confusion about source of truth, and risk of schema divergence.

## Symptoms

- 9+ domain schema files duplicated
- Root files importing from `./patterns` while subdirectory versions import from `../_shared/patterns`
- Subdirectory versions had enhancements (additional schemas) that root versions lacked
- Main `index.ts` only exported from root files, making subdirectory versions orphaned

## Root Cause

Over time, developers created new schema files in subdirectories following a more organized pattern, but the legacy root-level files were never removed. The main barrel export (`src/lib/schemas/index.ts`) continued to export from root files, making the subdirectory versions effectively dead code.

## Solution

### Step 1: Identify All Duplicates

Found 13 root-level files with subdirectory equivalents:

| Root File | Subdirectory Equivalent |
|-----------|------------------------|
| `activities.ts` | `activities/activities.ts` |
| `auth.ts` | `auth/auth.ts` |
| `customers.ts` | `customers/customers.ts` |
| `files.ts` | `files/files.ts` |
| `inventory.ts` | `inventory/inventory.ts` |
| `orders.ts` | `orders/orders.ts` |
| `pipeline.ts` | `pipeline/pipeline.ts` |
| `products.ts` | `products/products.ts` |
| `patterns.ts` | `_shared/patterns.ts` |
| `api-tokens.ts` | `auth/api-tokens.ts` |
| `order-amendments.ts` | `orders/order-amendments.ts` |
| `order-templates.ts` | `orders/order-templates.ts` |
| `shipments.ts` | `orders/shipments.ts` |

### Step 2: Delete Root-Level Duplicates

```bash
rm src/lib/schemas/{activities,auth,customers,files,inventory,orders,pipeline,products,patterns,api-tokens,order-amendments,order-templates,shipments}.ts
```

### Step 3: Update Main Barrel Export

Update `src/lib/schemas/index.ts` to export from subdirectories:

```typescript
// Foundation patterns
export * from "./_shared";

// Core entity schemas
export * from "./customers";
export * from "./products";
export * from "./orders";

// Pipeline and inventory
export * from "./pipeline";
export * from "./inventory";

// Auth and multi-tenancy
export * from "./auth";
export * from "./users";

// All other domains...
export * from "./activities";
export * from "./files";
export * from "./jobs";
export * from "./financial";
export * from "./communications";
// etc.
```

### Step 4: Fix Broken Direct Imports

Update any imports that directly referenced deleted files:

| Old Import | New Import |
|------------|-----------|
| `@/lib/schemas/shipments` | `@/lib/schemas/orders` |
| `@/lib/schemas/order-amendments` | `@/lib/schemas/orders` |
| `@/lib/schemas/order-templates` | `@/lib/schemas/orders` |
| `@/lib/schemas/api-tokens` | `@/lib/schemas/auth` |
| `@/lib/schemas/patterns` | `@/lib/schemas` |

## Key Insight

When you have both `src/lib/schemas/activities.ts` and `src/lib/schemas/activities/index.ts`, the import path `@/lib/schemas/activities` resolves to the `.ts` file first. Once you delete the root `.ts` file, the same import path automatically resolves to `activities/index.ts` instead.

This means consumers importing from `@/lib/schemas/activities` continue to work without changes after migration.

## Verification

```bash
# Type check to catch broken imports
npm run typecheck

# Build to ensure no runtime issues
npm run build
```

---

# Prevention Strategies

## 1. Directory Structure Convention

```
src/lib/schemas/
├── _shared/              # Foundation patterns
│   ├── patterns.ts
│   └── index.ts
├── {domain}/             # Domain-specific schemas
│   ├── index.ts          # Barrel export
│   └── {feature}.ts
├── automation-jobs.ts    # Standalone utilities only
└── index.ts              # Main barrel export
```

### Rules:

1. **Domain schemas MUST go in subdirectories**
2. **Root-level files are ONLY for standalone utilities**
3. **Every subdirectory MUST have an index.ts barrel**
4. **Main index.ts re-exports all subdirectories**

## 2. Import Convention

```typescript
// ✅ Best - import from main barrel
import { createCustomerSchema } from "@/lib/schemas";

// ✅ Acceptable - import from domain barrel
import { createCustomerSchema } from "@/lib/schemas/customers";

// ❌ NEVER import from specific files
import { createCustomerSchema } from "@/lib/schemas/customers/customers";
```

## 3. Code Review Checklist

- [ ] New schema file goes in appropriate subdirectory (not root level)?
- [ ] Subdirectory `index.ts` updated to export new schemas?
- [ ] Main `index.ts` updated if new subdirectory created?
- [ ] Imports use barrel pattern (not direct file imports)?

## 4. ESLint Rule Suggestion

```javascript
// Prevent direct imports from schema files
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/lib/schemas/*/*'],
        message: 'Import from barrel file instead of direct file imports.'
      }]
    }]
  }
}
```

## 5. Finding Duplicates

```bash
# Find potential duplicates
grep -r "export const.*Schema = z\." src/lib/schemas/ --include="*.ts" | sort

# Find direct file imports
grep -r "from ['\"]@/lib/schemas/[^'\"]*/" src/ --include="*.ts" | grep -v "/index"
```

---

## Related Issues

- Pre-existing issue: ~40 TypeScript errors for missing types in jobs domain (e.g., `TimeEntryResponse`, `CalendarKanbanTask`) - these types are referenced but never defined in schema files
