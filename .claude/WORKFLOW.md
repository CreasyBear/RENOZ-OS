# Claude Development Workflow

> Simplified workflow using everything-claude-code for Renoz v3.

## Core Principles

1. **Pattern First** - Consult @STANDARDS.md before writing code
2. **Type Safety** - Fix types immediately, never use `as any`
3. **Container/Presenter** - Routes fetch, components render
4. **TDD** - Write tests first when adding features
5. **Verify Before Done** - Run `/verify` before claiming complete

---

## Workflow Commands

Use these slash commands from everything-claude-code:

| Command | When to Use |
|---------|-------------|
| `/plan` | Before starting any non-trivial feature. Creates step-by-step plan, waits for CONFIRM |
| `/tdd` | When implementing features. Scaffold interfaces → tests FIRST → implement |
| `/e2e` | Generate and run Playwright end-to-end tests |
| `/code-review` | After implementation, before PR |
| `/verify` | Before claiming work is complete |
| `/security-review` | When touching auth, user input, or sensitive data |

### Instinct System

The instinct system learns patterns from your sessions:

| Command | Purpose |
|---------|---------|
| `/instinct-status` | Show learned instincts with confidence levels |
| `/instinct-export` | Export instincts for sharing |
| `/instinct-import` | Import instincts from others |
| `/evolve` | Cluster related instincts into skills |
| `/skill-create` | Create new skill from git history patterns |

---

## Development Loop

### 1. Plan (for non-trivial work)

```
/plan
```

- Restates requirements
- Assesses risks
- Creates step-by-step implementation plan
- **WAITS for your CONFIRM before touching code**

### 2. Implement with TDD

```
/tdd
```

- Scaffolds interfaces first
- Writes tests BEFORE implementation
- Implements minimal code to pass tests
- Ensures 80%+ coverage

### 3. Verify

```
/verify
```

- Runs typecheck
- Runs tests
- Checks for pattern violations
- Confirms work is actually complete

---

## Pre-Development Checklist

Before starting any story/feature:

- [ ] Read relevant section in STANDARDS.md
- [ ] Check existing hooks in `src/hooks/{domain}/`
- [ ] Check existing components in `src/components/domain/{domain}/`
- [ ] Identify server functions needed (existing vs new)
- [ ] Run `/plan` if non-trivial

---

## Quality Gates

### Gate 1: Type Safety

```bash
bun run typecheck
```

**Must have ZERO errors.**

### Gate 2: Architecture Compliance

```bash
# Check for presenter violations (should be empty)
grep -r "useQuery\|useMutation" src/components/domain --include="*.tsx" -l

# Check for inline query keys (should be empty)
grep -r "queryKey: \[" src/routes --include="*.tsx" | grep -v "queryKeys\."
```

### Gate 3: Tests Pass

```bash
bun test
```

---

## Relevant Skills (Auto-loaded)

These pattern skills are available and auto-loaded when relevant:

| Skill | When Applied |
|-------|--------------|
| `coding-standards` | TypeScript, React, Node.js code |
| `frontend-patterns` | React components, state management |
| `backend-patterns` | API design, server functions |
| `postgres-patterns` | Database queries, schema design |
| `security-review` | Auth, input validation, secrets |
| `tdd-workflow` | Test-driven development |

---

## Definition of Done

A story is complete when:

- [ ] `/verify` passes
- [ ] All acceptance criteria met
- [ ] `bun run typecheck` passes with 0 errors
- [ ] Tests written and passing
- [ ] Architecture compliance verified
- [ ] No `any` types or `as` casts

---

## Quick Reference

| Task | Command |
|------|---------|
| Start feature | `/plan` |
| Implement with tests | `/tdd` |
| Run E2E tests | `/e2e` |
| Review code | `/code-review` |
| Verify complete | `/verify` |
| Security check | `/security-review` |
| See learned patterns | `/instinct-status` |

---

*Last updated: 2026-01-31*
