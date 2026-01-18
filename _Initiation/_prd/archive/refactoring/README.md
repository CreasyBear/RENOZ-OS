# Refactoring PRDs

> **Purpose**: Clean up codebase before domain implementation
> **Phase**: Pre-domain refactoring
> **Total Stories**: 32

---

## Execution Order

Refactoring PRDs should be executed **before** domain PRDs to establish a clean foundation.

```
┌─────────────────────────────────────────────────────────────────┐
│                    REFACTORING SEQUENCE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. REF-SERVER (8 stories)     Server function patterns         │
│         ↓                                                       │
│  2. REF-HOOKS (8 stories)      Hook organization                │
│         ↓                                                       │
│  3. REF-COMPONENTS (8 stories) Component extraction             │
│         ↓                                                       │
│  4. REF-AI (8 stories)         AI architecture                  │
│         ↓                                                       │
│  ═══════════════════════════════════════════════════════════   │
│         ↓                                                       │
│     DOMAIN PRDs                 Feature implementation          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PRD Summary

| PRD | Stories | Priority | Focus |
|-----|---------|----------|-------|
| [server-functions.prd.json](./server-functions.prd.json) | 8 | 1 | Split large files, standardize patterns |
| [hooks.prd.json](./hooks.prd.json) | 8 | 2 | Reorganize, barrel exports, remove duplicates |
| [components.prd.json](./components.prd.json) | 8 | 3 | Extract large components, shared layouts |
| [ai-architecture.prd.json](./ai-architecture.prd.json) | 8 | 4 | Multi-turn agents, structured output |

---

## Key References

### Internal Documentation
- `memory-bank/_meta/conventions.md` - Code patterns
- `memory-bank/_meta/assumptions.md` - Technical constraints
- `memory-bank/_meta/glossary.md` - Domain terminology
- `memory-bank/_meta/ralph-guidelines.md` - Execution rules

### External Documentation
- **TanStack Start**: `createServerFn`, `inputValidator`, middleware patterns
- **TanStack Query**: Query options, mutations, caching
- **Vercel AI SDK**: `streamText`, `generateObject`, tools
- **AI SDK Agents**: Multi-step tool patterns
- **Claude Agent SDK**: Multi-turn conversations, sessions, subagents
- **Supabase**: RLS performance, `(select auth.uid())` pattern

---

## Gate Criteria

Before proceeding to domain PRDs, verify:

- [ ] All server function files < 400 lines
- [ ] All hooks < 100 lines with barrel exports
- [ ] No component > 300 lines (documented exceptions only)
- [ ] AI supports multi-step tool chains
- [ ] All READMEs created (server/, hooks/, lib/ai/)
- [ ] ADRs written (return types, component sizes, AI architecture)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] No functionality regressions

---

## Parallel Execution

Some PRDs can run in parallel:

```
Parallel Group 1:
  - REF-SERVER-001 through REF-SERVER-003 (documentation, splitting)
  - REF-HOOKS-001 through REF-HOOKS-003 (reorganization)
  - REF-COMP-001 through REF-COMP-002 (extraction, consolidation)

Sequential after Group 1:
  - REF-SERVER-004+ (depends on README)
  - REF-HOOKS-004+ (depends on splits)
  - REF-COMP-003+ (depends on extractions)
  - REF-AI-* (can start after server patterns stable)
```

---

## Story Completion Tracking

### REF-SERVER (Server Functions)
- [ ] REF-SERVER-001: Create Server Functions README
- [ ] REF-SERVER-002: Split orders.ts into Domain Files
- [ ] REF-SERVER-003: Split dashboard.ts into Domain Files
- [ ] REF-SERVER-004: Fix ai-chat.ts Validation Pattern
- [ ] REF-SERVER-005: Fix pipeline.ts Handler Signature
- [ ] REF-SERVER-006: Standardize Error Handling Utility
- [ ] REF-SERVER-007: Document Return Type Conventions
- [ ] REF-SERVER-008: Create Server Function Tests Template

### REF-HOOKS (Hooks)
- [ ] REF-HOOKS-001: Move use-query-options.ts to lib/queries/
- [ ] REF-HOOKS-002: Split use-communications.ts into Atomic Hooks
- [ ] REF-HOOKS-003: Remove Duplicate Form Draft Hook
- [ ] REF-HOOKS-004: Create Hooks Barrel Export
- [ ] REF-HOOKS-005: Create Standardized Mutation Hook Wrapper
- [ ] REF-HOOKS-006: Fix TanStack Package Type Workarounds
- [ ] REF-HOOKS-007: Split use-url-filters.ts Concerns
- [ ] REF-HOOKS-008: Document Hook Patterns in README

### REF-COMPONENTS (Components)
- [ ] REF-COMP-001: Extract prompt-input.tsx into Focused Components
- [ ] REF-COMP-002: Consolidate log-call-dialog Implementations
- [ ] REF-COMP-003: Create ListPageLayout Shared Component
- [ ] REF-COMP-004: Create DetailPageLayout Shared Component
- [ ] REF-COMP-005: Extract order-creation-dialog Modes
- [ ] REF-COMP-006: Extract order-panel.tsx Concerns
- [ ] REF-COMP-007: Create Form Context for Prop Reduction
- [ ] REF-COMP-008: Create Component Size Lint Rule

### REF-AI (AI Architecture)
- [ ] REF-AI-001: Add Zod Schema Validation for AI Responses
- [ ] REF-AI-002: Create Multi-Step Tool Chain Pattern
- [ ] REF-AI-003: Implement Context-Aware Tool Filtering
- [ ] REF-AI-004: Create Domain-Specific Agents
- [ ] REF-AI-005: Add Multi-Turn Conversation Sessions
- [ ] REF-AI-006: Implement Parallel Tool Execution
- [ ] REF-AI-007: Create AI Architecture ADR
- [ ] REF-AI-008: Add AI Usage Analytics

---

*Refactoring creates a clean foundation. Domain PRDs build features on that foundation.*
