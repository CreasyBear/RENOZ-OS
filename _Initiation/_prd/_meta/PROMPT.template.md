# Ralph Loop: {{PRD_NAME}}

> **Phase**: {{PHASE_NUMBER}} - {{PHASE_NAME}}
> **PRD**: {{PRD_FILE}}
> **Track**: {{PARALLEL_TRACK}} ({{BLOCKING_STATUS}})

---

## Objective

YOU MUST complete the stories in `{{PRD_FILE}}` sequentially, respecting dependencies.

**Completion Promise**: `<promise>{{DOMAIN_COMPLETION_PROMISE}}</promise>`

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Dependencies are satisfied (check progress files)
cat memory-bank/prd/_progress/*.txt 2>/dev/null | grep -E "^\- \[x\]"

# 3. No blocking PRDs are incomplete
# Blocking PRDs for this work: {{BLOCKING_PRDS}}
```

If pre-flight fails, output `<promise>BLOCKED_WAITING_DEPENDENCY</promise>`

---

## Context Files

### Required Reading (in order)

1. **Progress File**: `memory-bank/prd/_progress/{{PRD_SLUG}}.progress.txt`
2. **PRD File**: `{{PRD_FILE}}`
3. **Conventions**: `memory-bank/_meta/conventions.md`
4. **Glossary**: `memory-bank/_meta/glossary.md`
5. **Assumptions**: `memory-bank/_meta/assumptions.md`

### Reference Patterns

{{#if REFERENCE_PATTERNS}}
| Pattern | Reference File |
|---------|---------------|
{{#each REFERENCE_PATTERNS}}
| {{this.pattern}} | `{{this.file}}` |
{{/each}}
{{else}}
No specific reference patterns for this PRD.
{{/if}}

---

## File Ownership

YOU MAY modify these paths:

```
{{#each OWNED_PATHS}}
{{this}}
{{/each}}
```

YOU MUST NOT modify files outside these paths.

---

## Execution Process

### Each Iteration

```
1. READ progress file → Find current story
2. READ PRD → Get story acceptance criteria
3. IMPLEMENT → Write code for criteria
4. VERIFY → Run typecheck + tests
5. UPDATE → Mark progress
6. PROMISE → Output completion if passed
7. LOOP → Continue or complete
```

### Story Completion Checklist

Before outputting `<promise>{{STORY_ID}}_COMPLETE</promise>`:

- [ ] ALL acceptance criteria met
- [ ] `npm run typecheck` passes
- [ ] Files are in correct locations per conventions.md
- [ ] No console errors when running
- [ ] Progress file updated with [x] marker

### Phase Completion Checklist

Before outputting `<promise>{{DOMAIN_COMPLETION_PROMISE}}</promise>`:

- [ ] ALL stories marked [x] in progress file
- [ ] Full `npm run typecheck` passes
- [ ] `npm run build` succeeds (if end of phase)
- [ ] No [!] failed stories remain

---

## Story Type Limits

| Type | Max Iterations | Max Files | Action if Exceeded |
|------|----------------|-----------|-------------------|
| schema | 5 | 3 | Mark [!], signal STUCK |
| server-function | 5 | 5 | Mark [!], signal STUCK |
| ui-component | 8 | 8 | Mark [!], signal STUCK |
| refactoring | 8 | 8 | Mark [!], signal STUCK |
| foundation | 8 | 8 | Mark [!], signal STUCK |
| integration | 10 | 10 | Mark [!], signal STUCK |

---

## Dependencies

### This PRD Depends On

{{#if DEPENDS_ON}}
| PRD | Completion Promise | Status |
|-----|-------------------|--------|
{{#each DEPENDS_ON}}
| {{this.prd}} | `{{this.promise}}` | Check progress file |
{{/each}}
{{else}}
No dependencies - this PRD can start immediately.
{{/if}}

### PRDs That Depend On This

{{#if DEPENDENTS}}
| PRD | Waiting For |
|-----|-------------|
{{#each DEPENDENTS}}
| {{this.prd}} | `{{this.promise}}` |
{{/each}}
{{else}}
No other PRDs are blocked by this work.
{{/if}}

---

## Signals

### Success Signals

```xml
<!-- Single story complete -->
<promise>{{STORY_ID}}_COMPLETE</promise>

<!-- All stories in PRD complete -->
<promise>{{DOMAIN_COMPLETION_PROMISE}}</promise>

<!-- Phase complete (all PRDs in phase) -->
<promise>PHASE_{{PHASE_NUMBER}}_COMPLETE</promise>
```

### Failure Signals

```xml
<!-- Stuck on a story after max iterations -->
<promise>STUCK_NEEDS_HELP</promise>

<!-- Blocked by incomplete dependency -->
<promise>BLOCKED_WAITING_DEPENDENCY</promise>

<!-- Unrecoverable error -->
<promise>FAILED_NEEDS_INTERVENTION</promise>
```

---

## Error Recovery

### If TypeScript Fails

```
1. Read the error message carefully
2. Check imports match conventions.md
3. Verify types match schema definitions
4. Fix and re-run (max 3 attempts per story)
5. If still failing: Mark [!], document error, signal STUCK
```

### If Tests Fail

```
1. Read test failure output
2. Check expected vs actual
3. Fix implementation or test setup
4. Re-run (max 3 attempts per story)
5. If still failing: Mark [!], document in Notes
```

### If Stuck

```
1. Document what you've tried in Notes section
2. Mark story [!] in progress file
3. Output: <promise>STUCK_NEEDS_HELP</promise>
4. Wait for human intervention
```

---

## Progress File Format

Location: `memory-bank/prd/_progress/{{PRD_SLUG}}.progress.txt`

```
# Progress: {{PRD_NAME}}
# Phase: {{PHASE_NUMBER}} - {{PHASE_NAME}}
# Started: {{ISO_DATE}}
# Updated: {{ISO_DATE}}

## Stories
- [ ] STORY-001: First Story
- [~] STORY-002: Current Story (iteration 2)
- [x] STORY-003: Completed Story (3 iterations)
- [!] STORY-004: Failed Story (needs help)

## Current Story
STORY-002: Current Story

## Iteration Count
Total: 5
Current Story: 2

## Blockers
None

## Notes
- STORY-003: Added extra validation per conventions.md
```

---

## Constraints

### MUST Follow

- [ ] `conventions.md` patterns exactly
- [ ] `glossary.md` terminology
- [ ] `assumptions.md` boundaries
- [ ] File ownership rules above
- [ ] Story type iteration limits
- [ ] Dependency order

### MUST NOT

- [ ] Modify files outside owned paths
- [ ] Skip acceptance criteria
- [ ] Batch multiple story completions
- [ ] Ignore failing typecheck/tests
- [ ] Deviate from established patterns
- [ ] Output promise without verifying ALL criteria

---

## Commands

### Start This Loop

```bash
/ralph-loop "Execute {{PRD_FILE}}" \
  --max-iterations {{MAX_ITERATIONS}} \
  --completion-promise "{{DOMAIN_COMPLETION_PROMISE}}"
```

### Check Progress

```bash
cat memory-bank/prd/_progress/{{PRD_SLUG}}.progress.txt
```

### Verify Phase Status

```bash
# Count completed stories in phase
grep -l "COMPLETE" memory-bank/prd/_progress/*.txt | wc -l
```

---

## Phase Gate (End of Phase {{PHASE_NUMBER}})

Before proceeding to Phase {{NEXT_PHASE_NUMBER}}:

```bash
# 1. All PRDs in phase complete
ls memory-bank/prd/_progress/*.txt | xargs grep "DOMAIN_COMPLETE"

# 2. TypeScript passes
npm run typecheck

# 3. Build succeeds
npm run build

# 4. No failed stories
grep -r "\[!\]" memory-bank/prd/_progress/*.txt && echo "BLOCKED" || echo "CLEAR"
```

---

*Generated from PROMPT.template.md - customize variables before use*
