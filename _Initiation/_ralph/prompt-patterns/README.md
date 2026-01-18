# PROMPT.md Patterns for Ralph Execution

> **Standardizing Ralph Input: Structure, Content, and Execution Patterns**
> **Based on**: Ralph Wiggum skill requirements and audit findings
> **Purpose**: Ensure consistent, reliable Ralph execution across all tasks

---

## Overview

Ralph execution quality depends entirely on PROMPT.md quality. Our audit revealed that inconsistent prompting leads to unpredictable results. These patterns ensure reliable autonomous execution.

**Key Finding**: PROMPT.md standardization is critical for Ralph success.

---

## Required PROMPT.md Structure

Every Ralph execution must use this exact structure:

```markdown
# Ralph Loop: [Domain] Domain

## Objective
[1-2 sentences: what needs to be built]

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

## Task Granularity Rules

### ✅ Good Granularity (Fits Context Window)

- **Single Schema Story**: "Add credit limit columns to customers table"
- **Single Server Function**: "Create customer tag CRUD operations"
- **Single UI Component**: "Build tag selector component"
- **Single Integration**: "Implement Xero contact sync"

### ❌ Bad Granularity (Exceeds Context Window)

- **Multiple Components**: "Build entire customer management UI"
- **Full Domain**: "Implement all customer features"
- **Cross-Domain**: "Build customer + order + invoice flow"

### Granularity Guidelines

| Story Type | Max Scope | Iterations | Rationale |
|------------|-----------|------------|-----------|
| Schema | 1-2 tables | 2-4 | DB changes are atomic |
| Server Function | 1-3 functions | 3-5 | API operations are focused |
| UI Component | 1-2 components | 4-6 | Component complexity varies |
| Integration | 1 service | 5-8 | External dependencies |

---

## Completion Promise Patterns

### Correct Format

```xml
<promise>STORY_ID_COMPLETE</promise>
```

### Examples

- `<promise>DOM_CUST_001A_COMPLETE</promise>`
- `<promise>CC_ERROR_005_COMPLETE</promise>`
- `<promise>WF_LEAD_ORDER_002_COMPLETE</promise>`

### Domain Completion

```xml
<promise>CUSTOMERS_DOMAIN_COMPLETE</promise>
```

### Stuck Signals

```xml
<promise>STUCK_NEEDS_HELP</promise>
```

---

## Progress Tracking Patterns

### progress.txt Format

```markdown
# RENOZ v2 Development Progress
# Domain: customers
# Started: 2026-01-10T10:00:00Z
# Updated: 2026-01-10T14:30:00Z

## Stories
- [x] DOM-CUST-001: Customer Tags Schema (3 iterations)
- [x] DOM-CUST-002: Customer Tags Server Functions (4 iterations)
- [~] DOM-CUST-003: Customer Tags UI Components (iteration 2)
- [ ] DOM-CUST-004: Credit Limit Schema
- [ ] DOM-CUST-005: Credit Limit Server Functions

## Current Story
DOM-CUST-003: Customer Tags UI Components

## Iteration Count
Total: 9
Current Story: 2

## Blockers
None

## Notes
- DOM-CUST-001: Added version field for OCC
- DOM-CUST-002: Used withRLSContext pattern from conventions
```

---

## Error Recovery Patterns

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

## Context Window Management

### Include These Always

- Current progress.txt content
- Story acceptance criteria
- Relevant conventions.md sections
- Key glossary terms
- Domain-specific assumptions

### Exclude These

- Entire PRD files (too large)
- Full conventions.md (extract relevant sections)
- Complete codebase (reference specific files)
- Historical progress (keep current state only)

### Context Limits

- **Total tokens**: < 100K for reliable execution
- **File references**: Link to files, don't include content unless critical
- **Examples**: Include 1-2 examples, not exhaustive lists

---

## Execution Validation

### Pre-Execution Checks

- [ ] PROMPT.md follows required structure
- [ ] Story scope fits context window limits
- [ ] All required context files exist
- [ ] Progress.txt is properly formatted
- [ ] Completion promise format is correct

### During Execution Monitoring

- [ ] Ralph stays on assigned story
- [ ] Progress updates happen regularly
- [ ] TypeScript compilation succeeds
- [ ] No cross-domain file modifications
- [ ] Acceptance criteria verification occurs

### Post-Execution Validation

- [ ] Story marked complete in progress.txt
- [ ] Completion promise output correctly
- [ ] Files created/modified as expected
- [ ] TypeScript compilation passes
- [ ] No breaking changes to existing code

---

## Domain-Specific Prompt Templates

### Customer Domain

```markdown
# Ralph Loop: Customer Management Domain

## Objective
Complete customer lifecycle management with tags, credit limits, hierarchy, and 360-degree view.

## Current State
Read progress.txt to determine current customer story.

## Context
- PRD: memory-bank/prd/domains/customers.prd.json
- Conventions: memory-bank/_meta/conventions.md
- Glossary: memory-bank/_meta/glossary.md#customer-terms
- Assumptions: memory-bank/_meta/assumptions.md#customer-requirements

## Process
[Standard process steps]

## Constraints
- Stay within customer domain files
- Follow customer data patterns from conventions
- Use customer-specific terminology from glossary
- Respect customer performance assumptions
```

### Workflow Domains

```markdown
# Ralph Loop: Lead-to-Order Workflow

## Objective
Build end-to-end sales process from opportunity to order conversion.

## Current State
Read progress.txt for current workflow story.

## Context
- PRD: memory-bank/prd/_workflows/lead-to-order.prd.json
- Conventions: memory-bank/_meta/conventions.md#workflow-patterns
- Glossary: memory-bank/_meta/glossary.md#sales-terms
- Assumptions: memory-bank/_meta/assumptions.md#workflow-performance

## Process
[Standard process steps]

## Constraints
- Coordinate across customer, pipeline, orders domains
- Maintain data consistency between domains
- Follow workflow state management patterns
- Respect cross-domain performance requirements
```

---

## References

- **Ralph Skill**: `.claude/skills/ralph-wiggum/SKILL.md`
- **Guidelines**: `../../_meta/ralph-guidelines.md`
- **Audit Findings**: `../../_audits/systematic-ralph-audit.json`
- **Templates**: `./template.md`
