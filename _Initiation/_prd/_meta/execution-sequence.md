# PRD Execution Sequence

> **Generated**: 2026-01-09
> **Total PRDs**: 41 (across 7 categories)
> **Estimated Duration**: 14 weeks with parallelization

---

## Executive Summary

| Phase | Category | PRDs | Parallel Tracks | Blocking Stories |
|-------|----------|------|-----------------|------------------|
| 1 | Refactoring | 4 | 3 | REF-SERVER |
| 2 | Foundation | 4 | 2 | FOUND-SCHEMA, FOUND-AUTH |
| 2.5 | Early Role | 1 | - | ROLE-ADMIN |
| 3 | Cross-Cutting | 5 | 4 | CC-ERROR |
| 4 | Domains | 9 | 4 | - |
| 5 | Integrations + Roles | 7 | 2 | - |
| 6 | Workflows | 8 | 3 | - |

**Core 3 domains already complete**: customers, orders, pipeline (52 stories)

---

## Phase Dependencies

```
REFACTORING ─────► Establishes code patterns
     │
     ▼
FOUNDATION ──────► Schema, Auth, AppShell, Shared patterns
     │
     ├──────────► ROLE-ADMIN (early start for testing)
     │
     ▼
CROSS-CUTTING ───► Error/Loading/Empty/Notify/A11y patterns
     │
     ▼
DOMAINS ─────────► Business entities and features
     │
     ├────────────► INTEGRATIONS (need domain entities)
     │
     └────────────► ROLES (need auth + domains)
                        │
                        ▼
                   WORKFLOWS (orchestrate everything)
```

---

## Phase 1: REFACTORING

**Goal**: Establish clean code patterns before building new features

**Duration**: Weeks 1-2

### Execution Order

```
REF-SERVER (blocking)
     │
     ├──► REF-COMPONENTS (parallel)
     ├──► REF-HOOKS (parallel)
     └──► REF-AI (parallel)
```

### PRD Details

| PRD | Stories | Type | Blocking? | Rationale |
|-----|---------|------|-----------|-----------|
| REF-SERVER | 8 | refactoring | YES | Server patterns for ALL server code |
| REF-COMPONENTS | 8 | refactoring | no | Component extraction patterns |
| REF-HOOKS | 8 | refactoring | no | Hook organization patterns |
| REF-AI | 8 | refactoring | no | AI/Claude integration architecture |

### Critical Path

**REF-SERVER must complete first** because:
- Defines validation injection pattern
- Establishes return type conventions
- Sets error handling patterns
- All subsequent server functions follow these patterns

### Parallel Opportunities

After REF-SERVER completes:
- REF-COMPONENTS: Independent of hooks
- REF-HOOKS: May reference component patterns (minor dependency)
- REF-AI: Completely independent track

---

## Phase 2: FOUNDATION

**Goal**: Infrastructure that everything else depends on

**Duration**: Weeks 2-4

### Execution Order

```
FOUND-SCHEMA (blocking)
     │
     ▼
FOUND-AUTH (blocking)
     │
     ├──► FOUND-APPSHELL (parallel)
     └──► FOUND-SHARED (parallel)
```

### PRD Details

| PRD | Stories | Type | Blocking? | Rationale |
|-----|---------|------|-----------|-----------|
| FOUND-SCHEMA | 8 | foundation | YES | Base schema patterns, reusable columns |
| FOUND-AUTH | 8 | foundation | YES | Permission matrix, session handling |
| FOUND-APPSHELL | 8 | foundation | no | Route config, layout groups |
| FOUND-SHARED | 8 | foundation | no | Component consolidation, factories |

### Critical Path

1. **FOUND-SCHEMA first**: All domain schemas use base patterns
2. **FOUND-AUTH second**: Permission system needs schema patterns

### Parallel Opportunities

After FOUND-AUTH completes:
- FOUND-APPSHELL: Layout and routing patterns
- FOUND-SHARED: Component factories and presets

---

## Phase 2.5: EARLY ROLE

**Goal**: Admin role for testing all subsequent work

**Duration**: Week 4 (overlaps with Phase 2 completion)

### Execution Order

```
FOUND-AUTH ──► ROLE-ADMIN
```

### Rationale

Pull ROLE-ADMIN forward because:
- Needed for testing all domain features
- Depends only on FOUND-AUTH
- Enables QA to start earlier
- Other roles can wait until Phase 5

---

## Phase 3: CROSS-CUTTING

**Goal**: UX patterns used by every feature

**Duration**: Weeks 4-6

### Execution Order

```
CC-ERROR (blocking)
     │
     ├──► CC-LOADING (parallel)
     ├──► CC-EMPTY (parallel)
     └──► CC-NOTIFY (parallel)

CC-A11Y (continuous - runs throughout all phases)
```

### PRD Details

| PRD | Stories | Type | Blocking? | Rationale |
|-----|---------|------|-----------|-----------|
| CC-ERROR | 8 | cross-cutting | YES | Error boundary patterns |
| CC-LOADING | 8 | cross-cutting | no | Skeleton/spinner patterns |
| CC-EMPTY | 8 | cross-cutting | no | Empty state patterns |
| CC-NOTIFY | 8 | cross-cutting | no | Toast/notification patterns |
| CC-A11Y | 8 | cross-cutting | no | Accessibility (continuous) |

### Critical Path

**CC-ERROR first** because:
- Other states reference error patterns
- Loading states show errors on failure
- Empty states may show error variants

### Special: Accessibility

CC-A11Y is **not a phase but continuous work**:
- Can start during Phase 2
- Applies to all new components
- Should be reviewed at each phase gate

---

## Phase 4: DOMAINS

**Goal**: Business value delivery

**Duration**: Weeks 6-10

### Already Complete

| PRD | Stories | Status |
|-----|---------|--------|
| customers | 17 | ✅ DONE |
| orders | 19 | ✅ DONE |
| pipeline | 16 | ✅ DONE |

### Execution Order (4 Parallel Tracks)

```
TRACK A (Product Line):
products ──► inventory ──► suppliers

TRACK B (Service Line):
jobs ──► support ──► warranty

TRACK C (Analytics):
financial ──► dashboard

TRACK D (Independent):
communications
```

### PRD Details

| Track | PRD | Stories | Dependencies |
|-------|-----|---------|--------------|
| A | products | ~15 | Core 3 done |
| A | inventory | ~12 | products |
| A | suppliers | ~10 | inventory |
| B | jobs | ~15 | orders (done) |
| B | support | ~12 | jobs, customers |
| B | warranty | ~10 | support, products |
| C | financial | ~15 | orders, products |
| C | dashboard | ~12 | financial, all domains |
| D | communications | ~12 | customers (done) |

### Parallel Execution

All 4 tracks can execute simultaneously:

| Week | Track A | Track B | Track C | Track D |
|------|---------|---------|---------|---------|
| 6-7 | products | jobs | financial | communications |
| 8-9 | inventory | support | dashboard | - |
| 9-10 | suppliers | warranty | - | - |

### Dependencies to Watch

- **dashboard** waits for financial (needs revenue data)
- **warranty** waits for products (needs product data)
- **financial** waits for products (needs COGS data)

---

## Phase 5: INTEGRATIONS + ROLES

**Goal**: External connectivity and access control

**Duration**: Weeks 10-12

### Execution Order (2 Parallel Tracks)

```
TRACK A (Integrations):        TRACK B (Roles):
INT-XERO                       ROLE-SALES
INT-RESEND                     ROLE-OPS
INT-CLAUDE                     ROLE-WAREHOUSE
                               ROLE-PORTAL
```

### PRD Details

| Track | PRD | Stories | Dependencies |
|-------|-----|---------|--------------|
| Int | INT-XERO | ~12 | financial, orders |
| Int | INT-RESEND | ~10 | communications, customers |
| Int | INT-CLAUDE | ~12 | REF-AI architecture |
| Role | ROLE-SALES | ~8 | ROLE-ADMIN, pipeline |
| Role | ROLE-OPS | ~8 | ROLE-SALES, orders |
| Role | ROLE-WAREHOUSE | ~8 | ROLE-OPS, inventory |
| Role | ROLE-PORTAL | ~10 | all roles, customers |

### Parallel Execution

- **Integrations track**: All 3 can run in parallel (different external systems)
- **Roles track**: Sequential (each role builds on previous)
- **Tracks are independent**: Can run simultaneously

### Dependencies to Watch

- **INT-XERO** needs financial domain complete
- **INT-RESEND** needs communications domain complete
- **ROLE-PORTAL** is last (external-facing, needs all permissions defined)

---

## Phase 6: WORKFLOWS

**Goal**: Business process orchestration

**Duration**: Weeks 12-14

### Execution Order (3 Parallel Pipelines)

```
SALES PIPELINE:
WF-LTO ──► WF-OTQ ──► WF-QTO ──► WF-FULFILL

SERVICE PIPELINE:
WF-ISSUE ──► WF-WARRANTY

SUPPLY PIPELINE:
WF-SUPPLIER ──► WF-FINANCIAL
```

### PRD Details

| Pipeline | PRD | Stories | Dependencies |
|----------|-----|---------|--------------|
| Sales | WF-LTO | ~8 | customers, pipeline |
| Sales | WF-OTQ | ~8 | WF-LTO, pipeline |
| Sales | WF-QTO | ~10 | WF-OTQ, orders |
| Sales | WF-FULFILL | ~10 | WF-QTO, inventory |
| Service | WF-ISSUE | ~8 | support, customers |
| Service | WF-WARRANTY | ~8 | WF-ISSUE, warranty |
| Supply | WF-SUPPLIER | ~8 | suppliers, inventory |
| Supply | WF-FINANCIAL | ~10 | WF-SUPPLIER, financial, INT-XERO |

### Parallel Execution

- **Within pipeline**: Sequential (each step depends on previous)
- **Across pipelines**: Parallel (independent business processes)

### Dependencies to Watch

- **WF-FINANCIAL** needs INT-XERO complete (reconciliation with Xero)
- **WF-FULFILL** needs inventory domain complete
- **WF-WARRANTY** needs warranty domain complete

---

## Timeline Visualization

```
WEEK  1   2   3   4   5   6   7   8   9  10  11  12  13  14
      │   │   │   │   │   │   │   │   │   │   │   │   │   │
P1    ████████                                              REFACTORING
P2        ████████████                                      FOUNDATION
P2.5          ████                                          ROLE-ADMIN
P3                ████████████                              CROSS-CUTTING
P4                        ████████████████████              DOMAINS
P5                                        ████████          INT + ROLES
P6                                                ████████  WORKFLOWS
      │   │   │   │   │   │   │   │   │   │   │   │   │   │
      ▲                   ▲                       ▲
      │                   │                       │
   Patterns            Features              Integration
   Established         Visible              & Automation
```

---

## Blocking Stories Summary

These stories MUST complete before dependents can start:

| Story | Blocks | Phase |
|-------|--------|-------|
| REF-SERVER-001 | All server refactoring | 1 |
| FOUND-SCHEMA-001 | All foundation work | 2 |
| FOUND-AUTH-001 | AppShell, Shared, Roles | 2 |
| CC-ERROR-001 | Loading, Empty, Notify | 3 |
| ROLE-ADMIN-001 | All other roles | 2.5 |

---

## Risk Mitigation

### High-Risk Dependencies

| Risk | Impact | Mitigation |
|------|--------|------------|
| REF-SERVER delays | Blocks all server patterns | Start immediately, dedicate resources |
| FOUND-AUTH complexity | Blocks roles and permissions | Timebox, accept MVP first |
| INT-XERO API changes | Blocks financial reconciliation | Use Midday patterns, abstract provider |
| CC-A11Y technical debt | Accumulates if deferred | Make it continuous, not a phase |

### Phase Gates

Before advancing to next phase, verify:

| Gate | Verification |
|------|--------------|
| Phase 1 → 2 | `npm run typecheck` passes, patterns documented |
| Phase 2 → 3 | Auth working, schema migrations clean |
| Phase 3 → 4 | Error/loading/empty states in storybook |
| Phase 4 → 5 | All domain CRUD operations functional |
| Phase 5 → 6 | Integrations tested with sandbox accounts |

---

## Ralph Loop Configuration

### Parallel Ralph Loops per Phase

| Phase | Max Parallel Loops | Rationale |
|-------|-------------------|-----------|
| 1 | 1 (then 3) | Server blocking, then parallel |
| 2 | 1 (then 2) | Schema/Auth blocking, then parallel |
| 3 | 1 (then 3) | Error blocking, then parallel |
| 4 | 4 | Four independent domain tracks |
| 5 | 2 | Integrations + Roles tracks |
| 6 | 3 | Three independent pipelines |

### Story Execution Within PRD

Each PRD follows: `schema stories → api stories → ui stories`

Within each type, stories can often parallelize if they don't share files.

---

## Success Metrics

After completion of all 41 PRDs:

1. ✅ All completion promises emitted
2. ✅ `npm run typecheck` passes
3. ✅ `npm run build` succeeds
4. ✅ All phase gates verified
5. ✅ No P0 bugs in production

---

## Quick Reference: PRD Count by Phase

| Phase | PRDs | Est. Stories | Weeks |
|-------|------|--------------|-------|
| 1 Refactoring | 4 | ~32 | 2 |
| 2 Foundation | 4 | ~32 | 2 |
| 2.5 Early Role | 1 | ~8 | 0.5 |
| 3 Cross-Cutting | 5 | ~40 | 2 |
| 4 Domains | 9 | ~110 | 4 |
| 5 Int + Roles | 7 | ~68 | 2 |
| 6 Workflows | 8 | ~70 | 2 |
| **TOTAL** | **38** | **~360** | **14** |

*Note: Core 3 domains (customers, orders, pipeline) already complete with 52 stories*

---

*This document should be updated as phases complete and timelines adjust.*
