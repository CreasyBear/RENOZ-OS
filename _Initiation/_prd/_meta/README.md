# Renoz-v2 PRD Directory

> **Complete Product Requirements Documentation for Ralph Wiggum Execution**
> **Total PRDs**: 40
> **Total Stories**: ~350

---

## PRD Structure

```
memory-bank/prd/
├── README.md                    ← You are here
├── refactoring/                 ← Clean up before building
│   ├── README.md
│   ├── server-functions.prd.json
│   ├── components.prd.json
│   ├── hooks.prd.json
│   └── ai-architecture.prd.json
├── foundation/                  ← Establish patterns
│   ├── README.md
│   ├── schema-foundation.prd.json
│   ├── auth-foundation.prd.json
│   ├── appshell-foundation.prd.json
│   └── shared-components-foundation.prd.json
├── domains/                     ← Feature implementation
│   ├── README.md
│   ├── customers.prd.json
│   ├── pipeline.prd.json
│   ├── orders.prd.json
│   ├── products.prd.json
│   ├── inventory.prd.json
│   ├── jobs.prd.json
│   ├── financial.prd.json
│   ├── communications.prd.json
│   ├── support.prd.json
│   ├── warranty.prd.json
│   ├── suppliers.prd.json
│   ├── dashboard.prd.json
│   ├── users.prd.json
│   ├── settings.prd.json
│   └── reports.prd.json
├── workflows/                   ← Cross-domain processes
│   ├── README.md
│   ├── lead-to-order.prd.json
│   ├── order-fulfillment.prd.json
│   ├── invoicing.prd.json
│   ├── support-resolution.prd.json
│   ├── warranty-claims.prd.json
│   ├── procurement.prd.json
│   ├── job-completion.prd.json
│   └── customer-onboarding.prd.json
├── integrations/                ← Third-party services
│   ├── README.md
│   ├── xero.prd.json
│   ├── resend.prd.json
│   └── claude-ai.prd.json
├── roles/                       ← Role-specific optimizations
│   ├── README.md
│   ├── sales.prd.json
│   ├── operations.prd.json
│   ├── field-tech.prd.json
│   ├── finance.prd.json
│   └── admin.prd.json
└── cross-cutting/               ← UX polish & accessibility
    ├── README.md
    ├── error-handling.prd.json
    ├── loading-states.prd.json
    ├── empty-states.prd.json
    ├── notifications.prd.json
    └── accessibility.prd.json
```

---

## Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                    MASTER EXECUTION SEQUENCE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1: REFACTORING (32 stories)                              │
│  ─────────────────────────────────                              │
│  REF-SERVER → REF-HOOKS → REF-COMPONENTS → REF-AI               │
│                                                                  │
│  Outcome: Clean codebase with consistent patterns               │
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  PHASE 2: FOUNDATION (32 stories)                               │
│  ───────────────────────────────                                │
│  FOUND-SCHEMA → FOUND-AUTH → FOUND-APPSHELL → FOUND-SHARED      │
│                                                                  │
│  Outcome: Patterns and infrastructure for domain PRDs           │
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  PHASE 3: CROSS-CUTTING (36 stories)                            │
│  ──────────────────────────────────                             │
│  CC-ERROR → CC-LOADING → CC-EMPTY → CC-NOTIFY → CC-A11Y         │
│                                                                  │
│  Outcome: Consistent UX patterns for Gasp Test                  │
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  PHASE 4: DOMAIN + INTEGRATION (144 stories)                    │
│  ─────────────────────────────────────────────                  │
│  Core: CUSTOMERS, PIPELINE, ORDERS, PRODUCTS, INVENTORY         │
│  V1: JOBS, FINANCIAL, COMMS                                     │
│  V2: SUPPORT, WARRANTY, SUPPLIERS                               │
│  System: DASHBOARD, USERS, SETTINGS, REPORTS                    │
│  + INT-XERO, INT-RESEND, INT-CLAUDE (parallel)                  │
│                                                                  │
│  Outcome: Complete feature implementation                       │
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  PHASE 5: WORKFLOWS (48 stories)                                │
│  ───────────────────────────────                                │
│  WF-LEAD-ORDER, WF-FULFILLMENT, WF-INVOICING                    │
│  WF-SUPPORT, WF-WARRANTY, WF-PROCUREMENT                        │
│  WF-JOB, WF-ONBOARDING                                          │
│                                                                  │
│  Outcome: Connected end-to-end business processes               │
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  PHASE 6: ROLES (40 stories)                                    │
│  ──────────────────────────                                     │
│  ROLE-SALES, ROLE-OPS, ROLE-FIELD, ROLE-FINANCE, ROLE-ADMIN     │
│                                                                  │
│  Outcome: Persona-optimized experiences                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Story Count Summary

| Category | PRDs | Stories |
|----------|------|---------|
| Refactoring | 4 | 32 |
| Foundation | 4 | 32 |
| Cross-Cutting | 5 | ~36 |
| Domains | 15 | 120 |
| Workflows | 8 | 48 |
| Integrations | 3 | 24 |
| Roles | 5 | ~40 |
| **Total** | **44** | **~350** |

---

## PRD Format

All PRDs follow consistent JSON structure:

```json
{
  "id": "CATEGORY-NAME",
  "name": "Human-readable name",
  "description": "What this PRD accomplishes",
  "created": "2026-01-09",
  "priority": 1,
  "phase": "refactoring|foundation|cross-cutting|domain|workflow|integration|role",
  "references": {
    "internal": ["Related files"],
    "external": ["External docs"]
  },
  "current_state": {
    "implemented": ["What exists"],
    "gaps": ["What's missing"]
  },
  "stories": [
    {
      "id": "CATEGORY-NAME-001",
      "name": "Story title",
      "description": "What needs to be done",
      "priority": 1,
      "status": "pending",
      "acceptance_criteria": ["Testable criteria"],
      "dependencies": ["Other story IDs"],
      "estimated_iterations": 4,
      "completion_promise": "CATEGORY_NAME_001_COMPLETE"
    }
  ],
  "success_criteria": ["PRD-level success measures"],
  "out_of_scope": ["Explicit exclusions"]
}
```

---

## Performance Requirements

All PRDs include performance targets from `_meta/assumptions.md` in their success criteria:

| Metric | Target | Where Applied |
|--------|--------|---------------|
| **Page load** | < 2s initial, < 500ms subsequent | Dashboards, 360 views, detail pages |
| **API response** | < 200ms reads, < 500ms writes | Server functions |
| **Table render** | < 100ms for 100 rows | All data tables (customers, orders, inventory) |
| **Search** | < 300ms debounced results | Global search, entity searches |

These are enforced as acceptance criteria, not suggestions.

---

## Ralph Wiggum Integration

PRDs are designed for Ralph Wiggum autonomous execution:

### Story Structure for Ralph

- **ID**: Unique identifier for tracking
- **Acceptance Criteria**: Specific, testable requirements
- **Dependencies**: Prerequisites that must complete first
- **Completion Promise**: Tag Ralph outputs to signal completion

### Progress Tracking

Ralph tracks progress in `progress.txt`:

```markdown
## Progress Log

### 2026-01-10

#### Completed
- [x] REF-SERVER-001: Create Server Functions README
  - Created lib/server/README.md
  - Documented patterns and conventions
  - <promise>REF_SERVER_001_COMPLETE</promise>

#### In Progress
- [ ] REF-SERVER-002: Split orders.ts into Domain Files
  - Identified 7 domain areas
  - Created 3 of 7 files

#### Blocked
- None
```

---

## Quick Reference

### Refactoring PRDs
| PRD | Focus |
|-----|-------|
| REF-SERVER | Server function patterns, file splitting |
| REF-HOOKS | Hook organization, barrel exports |
| REF-COMPONENTS | Component extraction, shared layouts |
| REF-AI | Multi-turn agents, structured output |

### Foundation PRDs
| PRD | Focus |
|-----|-------|
| FOUND-SCHEMA | Schema gaps, documentation |
| FOUND-AUTH | Permission matrix, API tokens |
| FOUND-APPSHELL | Route config, layout groups |
| FOUND-SHARED | Component consolidation, presets |

### Cross-Cutting PRDs
| PRD | Focus |
|-----|-------|
| CC-ERROR | Consistent error handling, AppError classes |
| CC-LOADING | Skeleton screens, progressive loading |
| CC-EMPTY | First-run experience, helpful empty states |
| CC-NOTIFY | Toast notifications, alerts, in-app messages |
| CC-A11Y | Keyboard navigation, WCAG compliance |

### Domain PRDs
| PRD | Version | Focus |
|-----|---------|-------|
| DOM-CUSTOMERS | MVP | Tags, credit, import, 360 view |
| DOM-PIPELINE | MVP | Forecasting, PDF, versioning |
| DOM-ORDERS | MVP | Shipments, backorders, fulfillment |
| DOM-PRODUCTS | MVP | Tiers, bundles, images, attributes |
| DOM-INVENTORY | MVP | Reorder, locations, valuation |
| DOM-JOBS | v1 | Tasks, BOM, time, checklists |
| DOM-FINANCIAL | v1 | Credit notes, AR aging, Xero |
| DOM-COMMS | v1 | Tracking, scheduling, campaigns |
| DOM-SUPPORT | v2 | SLA, escalation, RMA, CSAT |
| DOM-WARRANTY | v2 | Policies, auto-reg, certificates |
| DOM-SUPPLIERS | v2 | Performance, approvals, prices |
| DOM-DASHBOARD | System | Customize, targets, AI insights |
| DOM-USERS | System | Groups, delegation, onboarding |
| DOM-SETTINGS | System | Defaults, audit, custom fields |
| DOM-REPORTS | System | Sales, inventory, builder |

### Workflow PRDs
| PRD | Focus |
|-----|-------|
| WF-LEAD-ORDER | Sales process automation |
| WF-FULFILLMENT | Warehouse operations |
| WF-INVOICING | Order-to-cash |
| WF-SUPPORT | Issue handling |
| WF-WARRANTY | Claim processing |
| WF-PROCUREMENT | Supply chain |
| WF-JOB | Installation workflow |
| WF-ONBOARDING | New customer setup |

### Integration PRDs
| PRD | Focus |
|-----|-------|
| INT-XERO | Accounting sync |
| INT-RESEND | Email delivery |
| INT-CLAUDE | AI assistant |

### Role PRDs
| PRD | Persona | Focus |
|-----|---------|-------|
| ROLE-SALES | Sales/Account Manager | Quote creation < 5min, pipeline |
| ROLE-OPS | Operations/Warehouse | Real-time stock, picking |
| ROLE-FIELD | Field Technician | Mobile-first, PWA, offline |
| ROLE-FINANCE | Finance/Admin | Xero sync, reconciliation |
| ROLE-ADMIN | Owner/Manager | Business health dashboard |

---

## Key References

- `memory-bank/VISION.md` - Product vision and roadmap
- `memory-bank/_meta/conventions.md` - Code patterns
- `memory-bank/_meta/glossary.md` - Domain terminology
- `memory-bank/_meta/assumptions.md` - Constraints
- `memory-bank/_meta/ralph-guidelines.md` - Execution rules

---

*This PRD directory contains everything needed for Ralph Wiggum to autonomously implement the complete renoz-v2 application.*
