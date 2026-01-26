---
status: complete
priority: p2
issue_id: "010"
tags: [prd-review, agent-native, feature-gap, ai-infrastructure]
dependencies: []
resolution: documented-in-roadmap
---

# Add Missing Agent Domains (Inventory, Jobs, Support)

## Problem Statement

The AI Infrastructure PRD defines only 4 specialist agents covering ~10% of CRM capabilities. Users can perform inventory management, job scheduling, warranty claims, support tickets, and supplier procurement that agents cannot access at all.

## Findings

**Source:** Agent-Native Reviewer Agent

**Severity:** HIGH (significant action parity gap)

**Location:** PRD lines 285-324 (agents section)

**Current coverage:**
| Domain | Routes | Server Functions | Agent Coverage |
|--------|--------|------------------|----------------|
| Customers | 5 | 20+ | customerAgent (partial) |
| Orders | 5 | 15+ | orderAgent (partial) |
| Analytics | Multiple | 20+ | analyticsAgent |
| Quotes/Pipeline | 8 | 15+ | quoteAgent (partial) |
| **Inventory** | 8 | 10+ | **NONE** |
| **Jobs/Scheduling** | 12 | 20+ | **NONE** |
| **Support/Issues** | 8 | 15+ | **NONE** |
| **Products** | 6 | 15+ | **NONE** |
| **Warranties** | 6 | 15+ | **NONE** |

**Action Parity:** ~12 tools / 100+ server functions = ~12% coverage

## Proposed Solutions

### Option A: Add Priority Agents in v1.1 (Recommended)
Phase the addition:
- v1.0: Current 4 agents (ship foundation)
- v1.1: Add Inventory, Jobs, Support agents
- v1.2: Add Products, Warranties, Suppliers agents

**Effort:** Large (multiple PRD stories per agent)
**Risk:** Low (incremental)

### Option B: Add All Agents in v1.0
- **Pros:** Full coverage from start
- **Cons:** Delays v1.0 significantly
- **Effort:** Very Large
- **Risk:** Medium (scope creep)

## Recommended Action

Option A - Document phased agent rollout in PRD roadmap.

## Technical Details

**Priority 1 - Jobs/Scheduling Agent (High User Value):**
```json
{
  "id": "AI-INFRA-030",
  "name": "Jobs Specialist Agent",
  "agent": "jobAgent",
  "tools": [
    "get_jobs",
    "get_job_calendar",
    "update_job_status_draft",
    "get_job_tasks",
    "log_time_draft",
    "get_job_costing"
  ]
}
```

**Priority 2 - Inventory Agent:**
```json
{
  "id": "AI-INFRA-031",
  "name": "Inventory Specialist Agent",
  "tools": [
    "get_inventory_levels",
    "check_stock_availability",
    "get_low_stock_alerts",
    "search_products",
    "get_warehouse_locations"
  ]
}
```

**Priority 3 - Support Agent:**
```json
{
  "id": "AI-INFRA-032",
  "name": "Support Specialist Agent",
  "tools": [
    "get_issues",
    "create_issue_draft",
    "update_issue_status_draft",
    "get_knowledge_base",
    "search_solutions"
  ]
}
```

## Acceptance Criteria

- [ ] Roadmap section added to PRD documenting phased agent rollout
- [ ] Jobs agent defined for v1.1
- [ ] Inventory agent defined for v1.1
- [ ] Support agent defined for v1.1

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from agent-native review | AI assistant covers only 10% of CRM features |

## Resources

- Existing server functions in `src/server/functions/`
- Route definitions in `src/routes/_authenticated/`
