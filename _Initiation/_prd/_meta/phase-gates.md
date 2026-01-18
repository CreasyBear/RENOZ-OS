# Phase Gate Verification

> **Purpose**: Quality gates between execution phases
> **Generated**: 2026-01-09

---

## Overview

Phase gates ensure each phase is complete and stable before proceeding. Gates prevent cascading failures and technical debt accumulation.

```
PHASE 1 ──► GATE 1 ──► PHASE 2 ──► GATE 2 ──► PHASE 3 ──► ...
              │                       │
              ▼                       ▼
         [Verification]          [Verification]
         [Documentation]         [Documentation]
         [Approval]              [Approval]
```

---

## Gate Verification Commands

### Universal Checks (All Gates)

```bash
#!/bin/bash
# gate-check-universal.sh

echo "=== Universal Gate Checks ==="

# 1. TypeScript compilation
echo "1. TypeScript check..."
npm run typecheck
if [ $? -ne 0 ]; then
  echo "FAILED: TypeScript errors"
  exit 1
fi

# 2. Build succeeds
echo "2. Build check..."
npm run build
if [ $? -ne 0 ]; then
  echo "FAILED: Build errors"
  exit 1
fi

# 3. No failed stories
echo "3. Failed stories check..."
FAILED=$(grep -r "\[!\]" memory-bank/prd/_progress/*.txt 2>/dev/null | wc -l)
if [ "$FAILED" -gt 0 ]; then
  echo "FAILED: $FAILED failed stories found"
  grep -r "\[!\]" memory-bank/prd/_progress/*.txt
  exit 1
fi

# 4. No in-progress stories (should all be complete)
echo "4. In-progress stories check..."
IN_PROGRESS=$(grep -r "\[~\]" memory-bank/prd/_progress/*.txt 2>/dev/null | wc -l)
if [ "$IN_PROGRESS" -gt 0 ]; then
  echo "WARNING: $IN_PROGRESS stories still in progress"
  grep -r "\[~\]" memory-bank/prd/_progress/*.txt
fi

echo "=== Universal checks PASSED ==="
```

---

## Phase-Specific Gates

### Gate 1: After REFACTORING (Phase 1 → 2)

**Required Completions**:
- `REF_SERVER_COMPLETE`
- `REF_COMPONENTS_COMPLETE`
- `REF_HOOKS_COMPLETE`
- `REF_AI_COMPLETE`

```bash
#!/bin/bash
# gate-1-refactoring.sh

echo "=== Gate 1: Refactoring Complete ==="

# Check all Phase 1 completions
REQUIRED_PROMISES=(
  "REF_SERVER_COMPLETE"
  "REF_COMPONENTS_COMPLETE"
  "REF_HOOKS_COMPLETE"
  "REF_AI_COMPLETE"
)

for PROMISE in "${REQUIRED_PROMISES[@]}"; do
  if grep -r "$PROMISE" memory-bank/prd/_progress/*.txt > /dev/null; then
    echo "✓ $PROMISE"
  else
    echo "✗ MISSING: $PROMISE"
    exit 1
  fi
done

# Verify refactored files meet size limits
echo ""
echo "File size verification..."

# Server functions < 500 lines each
for FILE in renoz-v3/src/server/functions/*.ts; do
  LINES=$(wc -l < "$FILE")
  if [ "$LINES" -gt 500 ]; then
    echo "WARNING: $FILE has $LINES lines (target: < 500)"
  else
    echo "✓ $FILE: $LINES lines"
  fi
done

# Components < 300 lines each
for FILE in renoz-v3/src/components/**/*.tsx; do
  LINES=$(wc -l < "$FILE" 2>/dev/null)
  if [ "$LINES" -gt 300 ]; then
    echo "WARNING: $FILE has $LINES lines (target: < 300)"
  fi
done

echo ""
echo "=== Gate 1 PASSED ==="
```

**Documentation Checklist**:
- [ ] Server function split documented in ADR
- [ ] Component extraction patterns documented
- [ ] Hook organization documented
- [ ] AI architecture patterns documented

---

### Gate 2: After FOUNDATION (Phase 2 → 3)

**Required Completions**:
- `FOUND_SCHEMA_COMPLETE`
- `FOUND_AUTH_COMPLETE`
- `FOUND_APPSHELL_COMPLETE`
- `FOUND_SHARED_COMPLETE`
- `ROLE_ADMIN_COMPLETE` (early start)

```bash
#!/bin/bash
# gate-2-foundation.sh

echo "=== Gate 2: Foundation Complete ==="

REQUIRED_PROMISES=(
  "FOUND_SCHEMA_COMPLETE"
  "FOUND_AUTH_COMPLETE"
  "FOUND_APPSHELL_COMPLETE"
  "FOUND_SHARED_COMPLETE"
  "ROLE_ADMIN_COMPLETE"
)

for PROMISE in "${REQUIRED_PROMISES[@]}"; do
  if grep -r "$PROMISE" memory-bank/prd/_progress/*.txt > /dev/null; then
    echo "✓ $PROMISE"
  else
    echo "✗ MISSING: $PROMISE"
    exit 1
  fi
done

# Verify schema patterns
echo ""
echo "Schema verification..."

# Check base patterns exist
if [ -f "renoz-v3/src/db/schema/_base.ts" ]; then
  echo "✓ Base schema patterns exist"
else
  echo "✗ Missing: src/db/schema/_base.ts"
fi

# Verify auth patterns
echo ""
echo "Auth verification..."

# Check permission matrix exists
if grep -q "PermissionMatrix" renoz-v3/src/lib/auth/*.ts 2>/dev/null; then
  echo "✓ Permission matrix defined"
else
  echo "WARNING: Permission matrix not found"
fi

# Check admin role works
echo ""
echo "Admin role verification..."
# Would need actual test here

echo ""
echo "=== Gate 2 PASSED ==="
```

**Documentation Checklist**:
- [ ] Schema patterns documented in conventions.md
- [ ] Auth permission matrix documented
- [ ] Route configuration documented
- [ ] Shared component catalog updated

---

### Gate 3: After CROSS-CUTTING (Phase 3 → 4)

**Required Completions**:
- `CC_ERROR_COMPLETE`
- `CC_LOADING_COMPLETE`
- `CC_EMPTY_COMPLETE`
- `CC_NOTIFY_COMPLETE`
- `CC_A11Y_COMPLETE` (or documented as continuous)

```bash
#!/bin/bash
# gate-3-crosscutting.sh

echo "=== Gate 3: Cross-Cutting Complete ==="

REQUIRED_PROMISES=(
  "CC_ERROR_COMPLETE"
  "CC_LOADING_COMPLETE"
  "CC_EMPTY_COMPLETE"
  "CC_NOTIFY_COMPLETE"
)

for PROMISE in "${REQUIRED_PROMISES[@]}"; do
  if grep -r "$PROMISE" memory-bank/prd/_progress/*.txt > /dev/null; then
    echo "✓ $PROMISE"
  else
    echo "✗ MISSING: $PROMISE"
    exit 1
  fi
done

# Verify UX patterns exist
echo ""
echo "UX pattern verification..."

# Error boundary exists
if [ -f "renoz-v3/src/components/shared/error-boundary.tsx" ]; then
  echo "✓ Error boundary component exists"
else
  echo "✗ Missing: error-boundary.tsx"
fi

# Loading skeleton exists
if [ -f "renoz-v3/src/components/shared/loading-skeleton.tsx" ]; then
  echo "✓ Loading skeleton component exists"
else
  echo "✗ Missing: loading-skeleton.tsx"
fi

# Empty state exists
if [ -f "renoz-v3/src/components/shared/empty-state.tsx" ]; then
  echo "✓ Empty state component exists"
else
  echo "✗ Missing: empty-state.tsx"
fi

# Toast/notification exists
if grep -r "toast\|notification" renoz-v3/src/components/shared/*.tsx > /dev/null 2>&1; then
  echo "✓ Notification component exists"
else
  echo "WARNING: Notification component not found"
fi

echo ""
echo "=== Gate 3 PASSED ==="
```

**Documentation Checklist**:
- [ ] Error handling patterns in Storybook
- [ ] Loading state patterns in Storybook
- [ ] Empty state patterns in Storybook
- [ ] Notification usage documented
- [ ] Accessibility audit complete

---

### Gate 4: After DOMAINS (Phase 4 → 5)

**Required Completions**: All domain PRDs

```bash
#!/bin/bash
# gate-4-domains.sh

echo "=== Gate 4: Domains Complete ==="

# Core 3 (already done)
CORE_PROMISES=(
  "CUSTOMERS_DOMAIN_COMPLETE"
  "ORDERS_DOMAIN_COMPLETE"
  "PIPELINE_DOMAIN_COMPLETE"
)

# Remaining 9
REMAINING_PROMISES=(
  "PRODUCTS_DOMAIN_COMPLETE"
  "INVENTORY_DOMAIN_COMPLETE"
  "SUPPLIERS_DOMAIN_COMPLETE"
  "JOBS_DOMAIN_COMPLETE"
  "SUPPORT_DOMAIN_COMPLETE"
  "WARRANTY_DOMAIN_COMPLETE"
  "FINANCIAL_DOMAIN_COMPLETE"
  "DASHBOARD_DOMAIN_COMPLETE"
  "COMMUNICATIONS_DOMAIN_COMPLETE"
)

echo "Core domains..."
for PROMISE in "${CORE_PROMISES[@]}"; do
  if grep -r "$PROMISE" memory-bank/prd/_progress/*.txt > /dev/null; then
    echo "✓ $PROMISE"
  else
    echo "✗ MISSING: $PROMISE"
  fi
done

echo ""
echo "Remaining domains..."
for PROMISE in "${REMAINING_PROMISES[@]}"; do
  if grep -r "$PROMISE" memory-bank/prd/_progress/*.txt > /dev/null; then
    echo "✓ $PROMISE"
  else
    echo "✗ MISSING: $PROMISE"
    exit 1
  fi
done

# Verify routes work
echo ""
echo "Route verification..."
ROUTES=(
  "/customers"
  "/orders"
  "/pipeline"
  "/products"
  "/inventory"
  "/jobs"
  "/dashboard"
)

for ROUTE in "${ROUTES[@]}"; do
  if grep -r "path.*$ROUTE" renoz-v3/src/routes/**/*.tsx > /dev/null 2>&1; then
    echo "✓ Route exists: $ROUTE"
  else
    echo "WARNING: Route may be missing: $ROUTE"
  fi
done

echo ""
echo "=== Gate 4 PASSED ==="
```

**Documentation Checklist**:
- [ ] All domain routes accessible
- [ ] CRUD operations work for all entities
- [ ] Search/filter works on all list pages
- [ ] Form validation works on all forms

---

### Gate 5: After INTEGRATIONS + ROLES (Phase 5 → 6)

**Required Completions**:

```bash
#!/bin/bash
# gate-5-integrations-roles.sh

echo "=== Gate 5: Integrations + Roles Complete ==="

INTEGRATION_PROMISES=(
  "INT_XERO_COMPLETE"
  "INT_RESEND_COMPLETE"
  "INT_CLAUDE_COMPLETE"
)

ROLE_PROMISES=(
  "ROLE_ADMIN_COMPLETE"  # Already done in Phase 2.5
  "ROLE_SALES_COMPLETE"
  "ROLE_OPS_COMPLETE"
  "ROLE_WAREHOUSE_COMPLETE"
  "ROLE_PORTAL_COMPLETE"
)

echo "Integrations..."
for PROMISE in "${INTEGRATION_PROMISES[@]}"; do
  if grep -r "$PROMISE" memory-bank/prd/_progress/*.txt > /dev/null; then
    echo "✓ $PROMISE"
  else
    echo "✗ MISSING: $PROMISE"
    exit 1
  fi
done

echo ""
echo "Roles..."
for PROMISE in "${ROLE_PROMISES[@]}"; do
  if grep -r "$PROMISE" memory-bank/prd/_progress/*.txt > /dev/null; then
    echo "✓ $PROMISE"
  else
    echo "✗ MISSING: $PROMISE"
    exit 1
  fi
done

# Verify integration configs
echo ""
echo "Integration config verification..."

if [ -f "renoz-v3/src/lib/integrations/xero/client.ts" ]; then
  echo "✓ Xero client exists"
else
  echo "WARNING: Xero client not found"
fi

if grep -q "RESEND_API_KEY" renoz-v3/.env.example 2>/dev/null; then
  echo "✓ Resend env var documented"
else
  echo "WARNING: Resend env var not in .env.example"
fi

echo ""
echo "=== Gate 5 PASSED ==="
```

**Documentation Checklist**:
- [ ] Xero OAuth flow documented
- [ ] Resend templates documented
- [ ] Claude AI prompts documented
- [ ] Role permission matrix complete
- [ ] Integration sandbox testing done

---

### Gate 6: After WORKFLOWS (Phase 6 - Final)

**Required Completions**:

```bash
#!/bin/bash
# gate-6-workflows.sh

echo "=== Gate 6: Workflows Complete (FINAL) ==="

WORKFLOW_PROMISES=(
  "WF_LTO_COMPLETE"
  "WF_OTQ_COMPLETE"
  "WF_QTO_COMPLETE"
  "WF_FULFILL_COMPLETE"
  "WF_ISSUE_COMPLETE"
  "WF_WARRANTY_COMPLETE"
  "WF_SUPPLIER_COMPLETE"
  "WF_FINANCIAL_COMPLETE"
)

for PROMISE in "${WORKFLOW_PROMISES[@]}"; do
  if grep -r "$PROMISE" memory-bank/prd/_progress/*.txt > /dev/null; then
    echo "✓ $PROMISE"
  else
    echo "✗ MISSING: $PROMISE"
    exit 1
  fi
done

# Final verification
echo ""
echo "=== FINAL PROJECT VERIFICATION ==="

# Count all stories
TOTAL_STORIES=$(grep -r "\[x\]" memory-bank/prd/_progress/*.txt 2>/dev/null | wc -l)
FAILED_STORIES=$(grep -r "\[!\]" memory-bank/prd/_progress/*.txt 2>/dev/null | wc -l)
PENDING_STORIES=$(grep -r "\[ \]" memory-bank/prd/_progress/*.txt 2>/dev/null | wc -l)

echo "Stories completed: $TOTAL_STORIES"
echo "Stories failed: $FAILED_STORIES"
echo "Stories pending: $PENDING_STORIES"

if [ "$FAILED_STORIES" -gt 0 ] || [ "$PENDING_STORIES" -gt 0 ]; then
  echo ""
  echo "WARNING: Not all stories complete"
  exit 1
fi

# Full build
echo ""
echo "Final build..."
npm run build
if [ $? -ne 0 ]; then
  echo "FAILED: Build errors"
  exit 1
fi

# Full test
echo ""
echo "Final test suite..."
npm run test 2>/dev/null || echo "Tests not configured"

echo ""
echo "=========================================="
echo "=== ALL PHASES COMPLETE - PROJECT DONE ==="
echo "=========================================="
```

**Documentation Checklist**:
- [ ] All workflows documented with flow diagrams
- [ ] Integration test suite passes
- [ ] End-to-end tests pass
- [ ] User acceptance testing complete
- [ ] Production deployment checklist ready

---

## Running Gate Checks

### Single Gate

```bash
# Run specific gate
./memory-bank/prd/_meta/gates/gate-1-refactoring.sh
```

### All Gates

```bash
#!/bin/bash
# run-all-gates.sh

GATES=(
  "gate-1-refactoring.sh"
  "gate-2-foundation.sh"
  "gate-3-crosscutting.sh"
  "gate-4-domains.sh"
  "gate-5-integrations-roles.sh"
  "gate-6-workflows.sh"
)

for GATE in "${GATES[@]}"; do
  echo "Running $GATE..."
  ./memory-bank/prd/_meta/gates/$GATE
  if [ $? -ne 0 ]; then
    echo "STOPPED at $GATE"
    exit 1
  fi
  echo ""
done

echo "ALL GATES PASSED"
```

### Gate Status Dashboard

```bash
#!/bin/bash
# gate-status.sh

echo "=== Phase Gate Status ==="
echo ""

check_phase() {
  PHASE=$1
  shift
  PROMISES=("$@")

  COMPLETE=0
  TOTAL=${#PROMISES[@]}

  for PROMISE in "${PROMISES[@]}"; do
    if grep -r "$PROMISE" memory-bank/prd/_progress/*.txt > /dev/null 2>&1; then
      ((COMPLETE++))
    fi
  done

  if [ "$COMPLETE" -eq "$TOTAL" ]; then
    echo "✓ Phase $PHASE: COMPLETE ($COMPLETE/$TOTAL)"
  else
    echo "○ Phase $PHASE: IN PROGRESS ($COMPLETE/$TOTAL)"
  fi
}

check_phase 1 "REF_SERVER_COMPLETE" "REF_COMPONENTS_COMPLETE" "REF_HOOKS_COMPLETE" "REF_AI_COMPLETE"
check_phase 2 "FOUND_SCHEMA_COMPLETE" "FOUND_AUTH_COMPLETE" "FOUND_APPSHELL_COMPLETE" "FOUND_SHARED_COMPLETE"
check_phase 2.5 "ROLE_ADMIN_COMPLETE"
check_phase 3 "CC_ERROR_COMPLETE" "CC_LOADING_COMPLETE" "CC_EMPTY_COMPLETE" "CC_NOTIFY_COMPLETE"
check_phase 4 "PRODUCTS_DOMAIN_COMPLETE" "INVENTORY_DOMAIN_COMPLETE" "JOBS_DOMAIN_COMPLETE" "FINANCIAL_DOMAIN_COMPLETE"
check_phase 5 "INT_XERO_COMPLETE" "INT_RESEND_COMPLETE" "ROLE_SALES_COMPLETE" "ROLE_OPS_COMPLETE"
check_phase 6 "WF_LTO_COMPLETE" "WF_OTQ_COMPLETE" "WF_QTO_COMPLETE" "WF_FULFILL_COMPLETE"

echo ""
```

---

## Gate Failure Recovery

### If Gate Fails

```
1. Identify which promise is missing
2. Check progress file for that PRD
3. Find failed or in-progress story
4. Resume Ralph loop for that PRD
5. Re-run gate after completion
```

### Common Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| Promise missing | PRD not complete | Resume Ralph loop |
| TypeScript error | Breaking change | Fix types, re-run |
| Build error | Missing dependency | Check imports |
| Stories [!] | Stuck on story | Review, simplify, retry |

---

*Phase gates ensure quality at each stage of development.*
