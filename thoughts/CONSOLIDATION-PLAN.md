# Renoz v3 Consolidation & Cleanup Plan
Generated: 2026-01-18

## Executive Summary

| Metric | Current | Target |
|--------|---------|--------|
| PRDs Complete | 6/58 (10%) | Foundation 100% first |
| TypeScript Errors | 220+ | 0 |
| Test Coverage | 0% (broken) | 60%+ |
| Type Suppressions | 77 | < 20 |
| Disabled Files | 3 (743 lines) | 0 |

**Estimated Cleanup Effort:** 2-3 weeks focused work

---

## Phase 1: Critical Fixes (Week 1)

### P0.1 - SSR Data Leakage (SECURITY CRITICAL)

**Issue:** QueryClient created at module level shares state across SSR requests.

**File:** `src/routes/__root.tsx:12-19`

**Fix:**
```typescript
function RootComponent() {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 5, retry: 1 },
    },
  }))
  // ...
}
```

### P0.2 - TypeScript Build Failures

**Root Causes:**
1. Missing test deps: `@testing-library/jest-dom`, `@testing-library/user-event`
2. Wrong import in `vitest.setup.ts`
3. Missing enum value `quarterly` in `drizzle/schema/enums.ts:437-441`
4. Missing module `@tanstack/start/api`

**Fix Commands:**
```bash
bun add -D @testing-library/jest-dom @testing-library/user-event
```

Then fix imports and add enum value.

### P0.3 - Auth Pattern (TanStack Start)

**Issue:** Direct Supabase calls in route loaders bypass framework patterns.

**File:** `src/routes/_authenticated.tsx:21-38`

**Fix:** Migrate to `createServerFn`:
```typescript
import { createServerFn } from '@tanstack/react-start'

const getAuthSession = createServerFn('GET', async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
})
```

### P0.4 - Multi-Tenant Security

**Issue:** Server functions missing `organizationId` filtering = cross-tenant data leakage risk.

**Files to audit:**
- `src/server/customers.ts` (6 functions)
- `src/server/jobs.ts` (5 functions)
- All query functions

**Pattern to enforce:**
```typescript
const customers = await db.query.customers.findMany({
  where: and(
    eq(customers.organizationId, session.organizationId), // REQUIRED
    // ... other filters
  )
})
```

---

## Phase 2: Technical Debt (Week 2)

### P1.1 - Disabled Files Decision

**Files:**
| File | Lines | Decision Needed |
|------|-------|-----------------|
| `src/server/customers.ts.disabled` | ~250 | Archive or re-enable? |
| `src/server/products.ts.disabled` | ~250 | Archive or re-enable? |
| `src/server/orders.ts.disabled` | ~250 | Archive or re-enable? |

**Recommendation:** If replaced by better implementations, delete. If WIP, track in progress.txt.

### P1.2 - Test Infrastructure

**Current State:** Tests exist but fail due to:
- Missing dependencies
- Type errors in test setup
- No actual test execution

**Fix Sequence:**
1. Install missing deps (Phase 1)
2. Fix `vitest.setup.ts` import
3. Run `bun run test:vitest` to verify
4. Add test coverage for critical paths (auth, multi-tenancy)

### P1.3 - Component Size Refactoring

**Oversized Components (>500 lines):**
| File | Lines | Suggested Split |
|------|-------|-----------------|
| `customer-wizard.tsx` | 736 | 5 step components + orchestrator |
| `email-campaign-form.tsx` | 650 | Form sections + preview |
| `pipeline-kanban.tsx` | 580 | Board + Column + Card |

**Pattern:**
```
customer-wizard/
├── index.tsx            # Orchestrator (100 lines)
├── step-basic-info.tsx  # Step 1 (120 lines)
├── step-contacts.tsx    # Step 2 (120 lines)
├── step-addresses.tsx   # Step 3 (120 lines)
├── step-preferences.tsx # Step 4 (120 lines)
└── step-review.tsx      # Step 5 (120 lines)
```

### P1.4 - React Anti-Patterns

**Pattern:** Redundant useCallback+useEffect wrappers

**Detection:** Search for:
```typescript
const fn = useCallback(() => {}, [deps])
useEffect(() => { fn() }, [fn])
```

**Fix:** Inline the effect logic or use event handlers.

---

## Phase 3: Best Practices Alignment (Week 3)

### P2.1 - Cursor Pagination Audit

**Check:** `src/lib/db/pagination.ts`

**Required Pattern:**
```typescript
// BAD
.limit(20).offset(page * 20)

// GOOD
.limit(20).where(cursor ? gt(id, cursor) : undefined)
```

### P2.2 - Currency Field Alignment

**Check:** CurrencyField component vs Drizzle schema `numericCasted` pattern.

**Ensure:** Form field types match database types (number vs string).

### P2.3 - Icon Button Accessibility

**Issue:** `src/components/ui/button.tsx` doesn't enforce `aria-label` for icon variants.

**Fix:** TypeScript discriminated union:
```typescript
type ButtonProps =
  | { size?: "default" | "sm" | "lg" }
  | { size: "icon" | "icon-sm" | "icon-lg"; "aria-label": string }
```

### P2.4 - Type Safety Cleanup

**Current:** 89 files with `any`, 77 suppressions

**Strategy:**
1. Enable `noImplicitAny` in tsconfig (after fixing build)
2. Add eslint rule `@typescript-eslint/no-explicit-any`
3. Gradually replace with proper types

---

## PRD Status & Roadmap

### Foundation Phase (Must Complete First)

| PRD | Status | Blockers |
|-----|--------|----------|
| schema-foundation | ✅ Complete | - |
| auth-foundation | ✅ Complete | - |
| shared-components | ✅ Complete | - |
| appshell-foundation | ✅ Complete | - |
| **error-handling** | ❌ Not Started | Blocks production |
| **notifications** | ❌ Not Started | No user alerts |
| **realtime-webhooks** | ❌ Not Started | Blocks integrations |
| performance | ❌ Not Started | - |
| offline-pwa | ❌ Not Started | - |

### Domain Phase (6/18 Complete)

| Domain | Status | Notes |
|--------|--------|-------|
| customers | ✅ Complete | 34 components, 8 routes |
| orders | ✅ Complete | Full lifecycle |
| pipeline | ✅ Complete | Forecasting, win/loss |
| products | ✅ Complete | Bundles, images, attrs |
| inventory | ✅ Complete | Warehouse, stock, alerts |
| communications | ✅ Complete | Email tracking, templates |
| **jobs** | ❌ Not Started | CORE BUSINESS - PRIORITY |
| **financial** | ❌ Not Started | Invoicing, AR aging |
| **suppliers** | ❌ Not Started | Procurement |
| **support** | ❌ Not Started | Tickets, SLAs |
| activities | 🟡 Partial | Audit trail exists |

### Integration Phase (0/6 Complete)

| Integration | Status | Dependency |
|-------------|--------|------------|
| xero | ❌ | realtime-webhooks |
| resend | ❌ | realtime-webhooks |
| stripe | ❌ | orders, financial |
| google-maps | ❌ | jobs |
| ai-infrastructure | ❌ | - |
| analytics | ❌ | - |

---

## Recommended Execution Order

### Week 1: Foundation Stabilization
1. [ ] Fix TypeScript build (P0.2) - 2h
2. [ ] Fix SSR data leakage (P0.1) - 1h
3. [ ] Migrate auth to createServerFn (P0.3) - 4h
4. [ ] Audit multi-tenant filtering (P0.4) - 8h
5. [ ] Decision on disabled files (P1.1) - 1h

### Week 2: Technical Debt
1. [ ] Fix test infrastructure (P1.2) - 4h
2. [ ] Add auth/multi-tenant tests - 8h
3. [ ] Split customer-wizard.tsx (P1.3) - 4h
4. [ ] Fix React anti-patterns (P1.4) - 4h

### Week 3: Best Practices + PRDs
1. [ ] Pagination audit (P2.1) - 4h
2. [ ] Accessibility audit (P2.3) - 4h
3. [ ] Start error-handling PRD - 16h
4. [ ] Start notifications PRD - 8h

### Week 4+: Domain Completion
1. [ ] Complete realtime-webhooks PRD
2. [ ] Start jobs domain (CRITICAL for business)
3. [ ] Start financial domain (revenue tracking)

---

## Quick Reference: Commands

```bash
# Check TypeScript
bun run typecheck

# Run tests
bun run test:vitest

# Find disabled files
find . -name "*.disabled" -type f

# Find TODOs
grep -r "TODO" src/ --include="*.ts*" | wc -l

# Check component sizes
wc -l src/components/**/*.tsx | sort -n | tail -20

# Find any types
grep -r ": any" src/ --include="*.ts*" | wc -l
```

---

## Files Generated by Analysis

- PRD Status Report: `.claude/cache/agents/scout/output-20260118-140324.md`
- Refactoring Report: `~/.claude/projects/.../cache/agents/scout/output-20260118-135455.md`
- Best Practices Review: (inline in this document)
- Continuity Ledger: `thoughts/ledgers/CONTINUITY_CLAUDE-renoz-v3.md`
