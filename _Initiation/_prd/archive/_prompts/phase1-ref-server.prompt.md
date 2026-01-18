# Ralph Loop: Server Functions Refactoring

> **Phase**: 1 - REFACTORING
> **PRD**: memory-bank/prd/refactoring/server-functions.prd.json
> **Track**: A (BLOCKING - must complete before other Phase 1 PRDs)

---

## Objective

YOU MUST complete the stories in `memory-bank/prd/refactoring/server-functions.prd.json` sequentially.

This is a **BLOCKING PRD** - REF-COMPONENTS, REF-HOOKS, and REF-AI cannot start until this completes.

**Completion Promise**: `<promise>REF_SERVER_COMPLETE</promise>`

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. No blocking PRDs (this is first)
# This is the first PRD in the sequence - no dependencies
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: `memory-bank/prd/_progress/ref-server.progress.txt`
2. **PRD File**: `memory-bank/prd/refactoring/server-functions.prd.json`
3. **Conventions**: `memory-bank/_meta/conventions.md`
4. **Glossary**: `memory-bank/_meta/glossary.md`
5. **Assumptions**: `memory-bank/_meta/assumptions.md`

### Reference Patterns

| Pattern | Reference File |
|---------|---------------|
| Server function structure | `renoz-v2/src/server/functions/customers.ts` (good example) |
| Validation pattern | `memory-bank/_meta/conventions.md` (validation section) |
| Error handling | `renoz-v2/src/lib/errors/app-error.ts` |

---

## File Ownership

YOU MAY modify these paths:

```
renoz-v2/src/server/functions/*.ts
renoz-v2/src/server/functions/**/*.ts (new subdirectories)
renoz-v2/src/lib/validation/*.ts
memory-bank/prd/_progress/ref-server.progress.txt
```

YOU MUST NOT modify:
- Schema files (src/db/schema/)
- Component files (src/components/)
- Route files (src/routes/)

---

## Execution Process

### Each Iteration

```
1. READ progress file → Find current story
2. READ PRD → Get story acceptance criteria
3. IMPLEMENT → Refactor code per criteria
4. VERIFY → npm run typecheck
5. UPDATE → Mark progress
6. PROMISE → Output completion if passed
7. LOOP → Continue or complete
```

### Story Completion Checklist

Before outputting `<promise>REF_SERVER_NNN_COMPLETE</promise>`:

- [ ] ALL acceptance criteria met
- [ ] `npm run typecheck` passes
- [ ] No breaking changes to existing API
- [ ] Progress file updated with [x] marker

---

## Story Type Limits

| Type | Max Iterations | Max Files |
|------|----------------|-----------|
| refactoring | 8 | 8 |

---

## Dependencies

### This PRD Depends On

No dependencies - this is the FIRST PRD in the execution sequence.

### PRDs That Depend On This

| PRD | Waiting For |
|-----|-------------|
| REF-COMPONENTS | `REF_SERVER_COMPLETE` |
| REF-HOOKS | `REF_SERVER_COMPLETE` |
| REF-AI | `REF_SERVER_COMPLETE` |
| FOUND-SCHEMA | `REF_SERVER_COMPLETE` |

---

## Signals

### Success Signals

```xml
<!-- Single story complete -->
<promise>REF_SERVER_001_COMPLETE</promise>

<!-- All stories in PRD complete -->
<promise>REF_SERVER_COMPLETE</promise>
```

### Failure Signals

```xml
<promise>STUCK_NEEDS_HELP</promise>
<promise>FAILED_NEEDS_INTERVENTION</promise>
```

---

## Refactoring Guidelines

### DO

- Extract to new files when files exceed 500 lines
- Group related functions together
- Add barrel exports (index.ts) for new directories
- Preserve existing function signatures
- Add JSDoc comments for complex functions
- Follow existing naming conventions

### DON'T

- Change function return types (breaking change)
- Rename exported functions (breaking change)
- Delete functions without deprecation
- Move files without updating imports
- Add new features (refactoring only)

---

## Specific Targets

Based on audit, these files need attention:

| File | Current Lines | Target | Action |
|------|---------------|--------|--------|
| orders.ts | ~2700 | < 500 per file | Split by subdomain |
| dashboard.ts | ~1000 | < 500 per file | Split by widget type |
| products.ts | ~800 | < 500 per file | Extract variants |

### Split Strategy

```
orders.ts → orders/
  ├── index.ts (barrel exports)
  ├── crud.ts (basic CRUD)
  ├── fulfillment.ts (shipping, allocation)
  ├── amendments.ts (order changes)
  └── queries.ts (complex queries)
```

---

## Commands

### Start This Loop

```bash
/ralph-loop "Execute memory-bank/prd/refactoring/server-functions.prd.json" \
  --max-iterations 50 \
  --completion-promise "REF_SERVER_COMPLETE"
```

### Check Progress

```bash
cat memory-bank/prd/_progress/ref-server.progress.txt
```

---

## Phase Gate (After REF-SERVER)

After this PRD completes, Phase 1 can parallelize:

```bash
# Verify REF-SERVER complete
grep "REF_SERVER_COMPLETE" memory-bank/prd/_progress/ref-server.progress.txt

# Then launch parallel:
# - REF-COMPONENTS
# - REF-HOOKS
# - REF-AI
```

---

*Phase 1 Blocking PRD - Server patterns for ALL server code*
