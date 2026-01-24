# Pre-Mortem Analysis: Drizzle → Zod Schema Alignment

**Date:** 2026-01-22  
**Mode:** Deep  
**Context:** Large-scale schema alignment across 15+ domains

## Two-Pass Risk Analysis

### Pass 1: Potential Risks (Pattern Matching)

Initial findings from codebase scan:

1. **Large scope** - 15+ domains, 100+ schema files
2. **Existing TypeScript errors** - 20+ errors already present
3. **Currency precision inconsistencies** - Mixed usage of `currencySchema` vs `z.number()`
4. **Date handling inconsistencies** - Mix of `z.coerce.date()` and `z.string().datetime()`
5. **Missing fields** - New Drizzle fields not in Zod (e.g., `warrantyExpiryAlertOptOut`)
6. **Enum mismatches** - Risk of enum values not matching between Drizzle and Zod
7. **No systematic testing plan** - Only typecheck mentioned
8. **Breaking API changes** - Schema changes could break existing server functions
9. **Server function dependencies** - Functions may expect old schema shapes
10. **Hook type mismatches** - Hooks may break if return types change

---

### Pass 2: Verified Risks (After Context Check)

## TIGERS [High Severity - Must Address]

### 1. [HIGH] Existing TypeScript Errors Will Compound
**Location:** `renoz-v3/` (20+ existing errors)  
**Category:** Integration  
**Severity:** High  
**Mitigation Checked:** 
- Typecheck already failing with 20+ errors
- No evidence of error resolution plan
- Adding schema changes will add more type errors
- Risk: Changes will be harder to validate

**Suggested Fix:**
- Fix existing TypeScript errors first OR
- Work domain-by-domain and fix errors as we go
- Document which errors are pre-existing vs new

---

### 2. [HIGH] Currency Precision Inconsistencies Across Domains
**Location:** Multiple schema files  
**Category:** Data Integrity  
**Severity:** High  
**Mitigation Checked:**
- Found: `currencySchema` helper exists in `_shared/patterns.ts` with `.multipleOf(0.01)`
- Found: Some schemas use `currencySchema`, others use `z.number()` or `z.coerce.number()`
- Found: Customers schema partially updated (creditLimit uses multipleOf, but other currency fields may not)
- Risk: Database stores numeric(12,2) but validation may allow more precision → data corruption

**Evidence:**
- `customers.ts`: `creditLimit` uses `.multipleOf(0.01)` ✅
- `customers.ts`: `lifetimeValue`, `totalOrderValue`, `averageOrderValue` use `.multipleOf(0.01)` ✅  
- `products.ts`: Uses `currencySchema` helper ✅
- `orders.ts`: Need to verify all currency fields
- `financial/`: Need to verify all currency fields

**Suggested Fix:**
- Audit all currency fields across all domains
- Standardize on `currencySchema` helper OR ensure `.multipleOf(0.01)` everywhere
- Add test cases for precision validation

---

### 3. [HIGH] Date Handling Inconsistencies
**Location:** Multiple schema files  
**Category:** Data Integrity  
**Severity:** High  
**Mitigation Checked:**
- Found: Drizzle uses `date()` for date-only fields → returns Date object
- Found: Drizzle uses `text()` for ISO timestamps → returns string
- Found: Zod mixes `z.coerce.date()` and `z.string().datetime()`
- Risk: Type mismatches between DB returns and Zod validation → runtime errors

**Evidence:**
- `customers.ts`: `firstOrderDate`, `lastOrderDate` use regex for YYYY-MM-DD ✅
- `customers.ts`: `healthScoreUpdatedAt` uses `z.string().datetime()` ✅
- `customers.ts`: `createdAt`, `updatedAt` use `z.coerce.date()` ✅
- Server functions: Some use `z.coerce.date()` for date fields
- Risk: Date-only fields (date type) vs datetime fields (timestamp/text type) confusion

**Suggested Fix:**
- Document pattern: date-only = regex YYYY-MM-DD, datetime = `.datetime()`
- Verify server functions handle both correctly
- Add type tests for date field handling

---

### 4. [HIGH] Missing Fields Could Break Server Functions
**Location:** Server functions expecting fields not in Zod  
**Category:** Integration  
**Severity:** High  
**Mitigation Checked:**
- Found: `warrantyExpiryAlertOptOut` missing from Zod (now added)
- Found: `emailOptIn`, `smsOptIn` missing from contacts schema (now added)
- Risk: Server functions may try to insert/update fields that Zod rejects
- Risk: Server functions may read fields that Zod doesn't validate → type errors

**Suggested Fix:**
- Systematically check each server function for fields it uses
- Ensure all fields in Drizzle schema have corresponding Zod validation
- Add integration tests for create/update operations

---

## ELEPHANTS [Unspoken Concerns]

### 1. [MEDIUM] No Systematic Testing Strategy
**Risk:** Only `bun run typecheck` mentioned - no integration/E2E tests  
**Severity:** Medium  
**Concern:** Schema changes could break runtime behavior even if types check out  
**Suggested Fix:**
- Add test cases for each domain's create/update operations
- Test edge cases: null values, precision boundaries, enum values
- Consider snapshot tests for schema shapes

---

### 2. [MEDIUM] Large Surface Area - Easy to Miss Edge Cases
**Risk:** 15+ domains, 100+ files - high chance of missing something  
**Severity:** Medium  
**Concern:** One missed field or enum value could cause production issues  
**Suggested Fix:**
- Work domain-by-domain with verification checklist
- Mark each domain as complete only after:
  - Schema aligned ✅
  - Typecheck passes ✅
  - Manual test of create/update ✅

---

### 3. [MEDIUM] Breaking Changes to Existing API Contracts
**Risk:** Changing Zod schemas could break existing client code  
**Severity:** Medium  
**Concern:** Frontend forms/components may expect old schema shapes  
**Suggested Fix:**
- Review which schemas are used in forms/components
- Consider feature flags for breaking changes
- Document migration path for each breaking change

---

## PAPER TIGERS [Looks Scary But OK]

### 1. Enum Values Must Match Exactly
**Initial Concern:** Enums in Zod must match Drizzle exactly  
**Why It's OK:**
- Found: Zod enums are defined as `as const` arrays matching Drizzle
- Found: Enum values are explicitly listed in both places
- Risk Level: Low - easy to verify with grep/comparison
- Mitigation: Enum values are visible and can be compared line-by-line

**Location:** `drizzle/schema/_shared/enums.ts` vs `src/lib/schemas/*/enums.ts`

---

### 2. Server Functions Use Zod Validation
**Initial Concern:** Server functions may not handle new validation rules  
**Why It's OK:**
- Found: Server functions use `.inputValidator(schema)` pattern consistently
- Found: TanStack Start automatically validates before handler runs
- Found: Validation errors are caught and returned gracefully
- Risk Level: Low - framework handles validation automatically

**Evidence:** `createServerFn().inputValidator(schema).handler(...)` pattern used throughout

---

## FALSE ALARMS [Initial Concerns That Aren't Risks]

### 1. Missing `customerMergeAudit` Schema
**Initial Finding:** Table exists in Drizzle but no Zod schema  
**Why It's Not a Risk:**
- Checked: No server functions use this table yet
- Checked: No hooks reference it
- Status: Audit table - likely only used internally
- Action: Can add schema when needed, not blocking

---

## CHECKLIST GAPS

### Technical Risks
- ✅ Scalability: N/A - schema alignment doesn't affect scale
- ⚠️ Dependencies: TypeScript errors already exist - will compound
- ⚠️ Data: Currency/date precision inconsistencies identified
- ✅ Latency: N/A
- ✅ Security: Schema validation improves security
- ⚠️ Error handling: Need to verify server functions handle validation errors

### Integration Risks
- ⚠️ Breaking changes: Need to identify which schemas are public API
- ⚠️ Migration path: No rollback strategy if validation breaks
- ✅ Feature flags: Not needed for schema alignment
- ⚠️ Rollback strategy: No plan if changes break production

### Process Risks
- ✅ Requirements: Clear - align Zod to Drizzle
- ✅ Stakeholder input: N/A
- ⚠️ Tech debt: Existing TypeScript errors are tech debt
- ⚠️ Maintenance: Need to document patterns to prevent drift

### Testing Risks
- ❌ Coverage gaps: No test plan beyond typecheck
- ❌ Integration test plan: Not defined
- ✅ Load testing: N/A
- ❌ Manual testing plan: Not defined

---

## SUMMARY

**Tigers:** 4 (all HIGH severity)  
**Elephants:** 3 (all MEDIUM severity)  
**Paper Tigers:** 2  
**False Alarms:** 1

### Critical Path Forward

1. **Fix existing TypeScript errors first** OR document which are pre-existing
2. **Standardize currency precision** - audit all domains, use `currencySchema` helper
3. **Standardize date handling** - document pattern, verify server functions
4. **Add missing fields systematically** - use checklist, verify server functions
5. **Add testing strategy** - at minimum, manual test each domain after alignment

### Recommended Approach

**Option A: Fix-As-We-Go (Recommended)**
- Work domain-by-domain
- Fix TypeScript errors for that domain as we align
- Test create/update operations manually
- Mark domain complete only when all checks pass

**Option B: Fix-Errors-First**
- Fix all existing TypeScript errors
- Then proceed with schema alignment
- Lower risk but slower start

**Option C: Schema-First, Errors-Later**
- Complete all schema alignment
- Then fix all TypeScript errors
- Higher risk - errors will compound

---

## NEXT STEPS

User decision required on:
1. Which approach (A/B/C)?
2. Should we fix existing TypeScript errors first?
3. Should we add test cases as we go?
4. Which domain to start with? (Recommend: Customers - already partially done)
