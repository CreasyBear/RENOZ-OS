# Ralph Loop Guidelines

> **Purpose**: Execution rules for autonomous Ralph Wiggum development loops
> **Last Updated**: 2026-01-09
> **Status**: Active

---

## Overview

Ralph Wiggum is an iterative AI development methodology. The same prompt is fed repeatedly; Claude sees its own previous work in files and git history, enabling incremental progress toward completion.

```
┌────────────────────────────────────────────────────────────────┐
│                    RALPH LOOP CYCLE                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  PROMPT → WORK → CHECK → PROGRESS → LOOP or COMPLETE          │
│                                                                │
│  1. PROMPT: Claude receives PROMPT.md + context               │
│  2. WORK: Implement current story acceptance criteria          │
│  3. CHECK: Run typecheck, tests, verify criteria               │
│  4. PROGRESS: Update progress.txt with status                  │
│  5. LOOP: Continue to next story OR                           │
│     COMPLETE: Output <promise>DOMAIN_COMPLETE</promise>        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## PRD Story Format

### Required Fields

```json
{
  "id": "CUS-001",
  "name": "Create Customer Schema",
  "description": "Define the customer table schema in Drizzle",
  "priority": 1,
  "status": "pending",
  "acceptance_criteria": [
    "Customer table exists in src/server/db/schema/customers.ts",
    "Fields: id, name, email, phone, type, status, created_at, updated_at, version",
    "Type enum: residential, commercial, trade",
    "Status enum: prospect, active, inactive",
    "Indexes on email, type, status",
    "TypeScript types exported"
  ],
  "dependencies": [],
  "estimated_iterations": 3,
  "completion_promise": "CUS_001_COMPLETE"
}
```

### Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier (DOMAIN-NNN format) |
| `name` | Yes | Short descriptive title |
| `description` | Yes | What needs to be done |
| `priority` | Yes | Execution order (1 = first) |
| `status` | Yes | `pending`, `in_progress`, `passed`, `failed` |
| `acceptance_criteria` | Yes | Testable conditions for completion |
| `dependencies` | Yes | Story IDs that must complete first |
| `estimated_iterations` | Yes | Expected loop iterations |
| `completion_promise` | Yes | Promise tag when story passes |

### Acceptance Criteria Rules

| Rule | Good Example | Bad Example |
|------|--------------|-------------|
| **Specific** | "Button labeled 'Save'" | "Save button exists" |
| **Testable** | "Returns 404 for unknown ID" | "Handles errors properly" |
| **File-referenced** | "Function in src/server/functions/customers.ts" | "Create the function" |
| **Quantified** | "Loads in < 200ms" | "Loads quickly" |

---

## Progress Tracking

### progress.txt Format

```
# RENOZ v2 Development Progress
# Domain: customers
# Started: 2026-01-09T10:00:00Z
# Updated: 2026-01-09T14:30:00Z

## Stories
- [x] CUS-001: Create Customer Schema (3 iterations)
- [x] CUS-002: Customer Server Functions (4 iterations)
- [~] CUS-003: Customer DataTable Component (iteration 2)
- [ ] CUS-004: Customer Form Component
- [ ] CUS-005: Customer Detail Page

## Current Story
CUS-003: Customer DataTable Component

## Iteration Count
Total: 9
Current Story: 2

## Blockers
None

## Notes
- CUS-001: Added version field for OCC
- CUS-002: Used withRLSContext pattern from conventions
```

### Status Markers

| Marker | Meaning |
|--------|---------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Passed |
| `[!]` | Failed (needs intervention) |

### Update Rules

1. **Append-only**: Never delete history, only add
2. **Timestamp updates**: Update "Updated" on every change
3. **Iteration tracking**: Record iterations per story
4. **Notes section**: Document decisions, issues, deviations

---

## Completion Promises

### Format

```xml
<promise>STORY_ID_COMPLETE</promise>
```

### When to Output

| Condition | Action |
|-----------|--------|
| All acceptance criteria met | Output promise |
| Tests pass | Output promise |
| TypeScript compiles | Output promise |
| Any criterion fails | Do NOT output promise |

### Domain Completion

When ALL stories in a domain pass:

```xml
<promise>CUSTOMERS_DOMAIN_COMPLETE</promise>
```

### Stuck Signal

If stuck after 10 iterations on same story:

```xml
<promise>STUCK_NEEDS_HELP</promise>
```

---

## Iteration Limits

### By Complexity

| Story Type | Max Iterations | Action if Exceeded |
|------------|----------------|-------------------|
| Schema/Migration | 5 | Mark failed |
| Server Function | 5 | Mark failed |
| UI Component | 8 | Mark failed |
| Integration | 10 | Mark failed |
| Full Page | 12 | Mark failed |

### Per-Domain Limits

| Phase | Domain Stories | Total Budget |
|-------|----------------|--------------|
| Phase 0 | 8 per domain | 30 iterations |
| Phase 1 | 4-5 per domain | 25 iterations |
| Phase 2 | 3-4 per package | 20 iterations |

---

## Parallel Execution Safety

### File Ownership

Each domain owns specific directories:

```
customers/ owns:
  - src/routes/_authed/customers/**
  - src/components/domain/customers/**
  - src/server/functions/customers.ts
  - src/lib/validation/customer-*.ts

orders/ owns:
  - src/routes/_authed/orders/**
  - src/components/domain/orders/**
  - src/server/functions/orders.ts
  - src/lib/validation/order-*.ts
```

### Isolation Rules

| Rule | Allowed | Not Allowed |
|------|---------|-------------|
| Own files | Create, modify, delete | - |
| Shared components | Import and use | Modify |
| UI primitives | Import and use | Modify |
| Schema files | Own domain only | Other domains |
| Server functions | Own domain only | Other domains |

### Conflict Prevention

1. **No cross-domain file edits**: Each loop touches only its domain
2. **Shared component changes**: Gate review only
3. **Schema migrations**: Phase gates only
4. **Git coordination**: Separate branches if parallel

---

## PROMPT.md Template

```markdown
# Ralph Loop: [Domain] Domain

## Objective
YOU MUST complete the stories in [domain].prd.json sequentially.

## Current State
Read progress.txt to determine the current story.

## Context
- PRD: memory-bank/prd/domains/[domain].prd.json
- Conventions: memory-bank/_meta/conventions.md
- Glossary: memory-bank/_meta/glossary.md
- Assumptions: memory-bank/_meta/assumptions.md

## Process
1. Read progress.txt to find current story
2. Read the PRD for story details
3. Implement the acceptance criteria
4. Run: npm run typecheck
5. Run relevant tests
6. If all criteria pass:
   - Mark story [x] in progress.txt
   - Output <promise>STORY_ID_COMPLETE</promise>
   - Move to next story
7. If criteria fail:
   - Debug and fix
   - Stay on current story

## Completion
When ALL stories pass:
<promise>[DOMAIN]_DOMAIN_COMPLETE</promise>

## Constraints
- Follow conventions.md patterns exactly
- Use glossary.md terminology
- Respect assumptions.md boundaries
- Do NOT modify files outside your domain
- Do NOT skip acceptance criteria

## If Stuck
- After 5 iterations on same story: Add blocker to progress.txt
- After 10 iterations: Output <promise>STUCK_NEEDS_HELP</promise>
```

---

## Testing Requirements

> **See**: [Testing Standards](patterns/testing-standards.md) for complete testing guidelines.

### Core Principles

1. **Test During Implementation**: Write tests alongside code, not after
2. **Testable Criteria**: Every acceptance criterion must be verifiable with an automated test
3. **Test Before Complete**: No story is complete until its tests pass

### Per-Story Testing

| Story Type | Required Tests |
|------------|----------------|
| Schema | Migration up/down, type inference |
| Server Function | Unit + integration tests |
| UI Component | Render + interaction tests |
| Integration | Mocked external service tests |

### Test Commands

```bash
# Unit tests (fast, run frequently)
bun test:unit

# Integration tests (before commit)
bun test:integration

# E2E tests (before merge)
bun test:e2e

# All tests
bun test
```

### Acceptance Criteria Format

When writing acceptance criteria, ensure each is testable:

| Criterion | Testable? | How to Test |
|-----------|-----------|-------------|
| "Button labeled 'Save'" | Yes | `expect(button).toHaveText('Save')` |
| "Returns 404 for unknown ID" | Yes | `expect(response.status).toBe(404)` |
| "Works properly" | No | Too vague - rewrite |
| "Handles errors" | No | Specify which errors |

---

## Quality Gates

### Per-Story Gate

Before outputting completion promise:

- [ ] All acceptance criteria verifiably met
- [ ] `npm run typecheck` passes
- [ ] All relevant tests pass (not "if any" - tests are required)
- [ ] No console errors
- [ ] Follows conventions.md patterns

### Per-Domain Gate

Before outputting domain completion:

- [ ] All stories marked [x]
- [ ] Full `npm run typecheck` passes
- [ ] Full `npm run test` passes
- [ ] Route renders without errors
- [ ] Manual verification possible

### Phase Gate

Before proceeding to next phase:

- [ ] All domain completions received
- [ ] `npm run build` succeeds
- [ ] Integration test suite passes
- [ ] Human review and approval

---

## Error Recovery

### Story Failure

```
1. Mark story [!] in progress.txt
2. Document error in Notes section
3. Output: <promise>STUCK_NEEDS_HELP</promise>
4. Human intervenes:
   - Simplify story
   - Split into smaller stories
   - Provide additional context
5. Resume loop
```

### Test Failure

```
1. Keep story [~] (in progress)
2. Document failing test in Notes
3. Attempt fix (max 3 attempts)
4. If still failing: Mark [!] and signal stuck
```

### TypeScript Error

```
1. Keep story [~] (in progress)
2. Read error message carefully
3. Fix type issue
4. Re-run typecheck
5. If persists after 3 attempts: Mark [!]
```

---

## Command Reference

### Start Loop

```bash
/ralph-loop "Execute memory-bank/prd/domains/customers.prd.json" \
  --max-iterations 30 \
  --completion-promise "CUSTOMERS_DOMAIN_COMPLETE"
```

### Check Progress

```bash
cat progress.txt | grep -E "^\- \[.\]"
```

### Count Status

```bash
# Completed
grep -c "\[x\]" progress.txt

# Remaining
grep -c "\[ \]" progress.txt

# In Progress
grep -c "\[~\]" progress.txt

# Failed
grep -c "\[!\]" progress.txt
```

### Cancel Loop

```bash
/cancel-ralph
```

---

## Best Practices

### DO

- Read progress.txt FIRST every iteration
- Update progress.txt IMMEDIATELY after story completion
- Follow acceptance criteria EXACTLY
- Run typecheck after EVERY code change
- Document decisions in Notes section
- Use exact terminology from glossary.md
- Follow patterns from conventions.md

### DON'T

- Skip stories (even if they seem done)
- Modify files outside your domain
- Guess at requirements (ask if unclear)
- Batch multiple story completions
- Ignore failing tests
- Deviate from established patterns
- Output promise without verifying ALL criteria

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Loop not progressing | Missing progress.txt update | Ensure marking [x] after pass |
| TypeScript errors persist | Wrong import paths | Check conventions.md imports |
| Tests failing | Missing setup | Check test file location |
| Stuck on same story | Criteria too vague | Review and clarify criteria |
| Parallel conflict | Cross-domain edit | Revert, respect file ownership |

---

## Metrics

Track these for process improvement:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Stories/iteration | > 0.3 | Total stories / Total iterations |
| First-pass rate | > 70% | Stories passed in ≤ estimated iterations |
| Stuck rate | < 10% | Stories marked [!] / Total stories |
| Rework rate | < 20% | Stories reopened / Total stories |

---

*These guidelines ensure consistent, predictable autonomous development.*
