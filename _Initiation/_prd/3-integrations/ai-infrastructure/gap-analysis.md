# Gap Analysis: User Stories vs PRD

Comparing 55+ user stories across 11 domains against the 19-story PRD.

## Coverage Summary

| Domain | PRD Agent | PRD Tools | Gap Status |
|--------|-----------|-----------|------------|
| Customers | customerAgent | get_customer, search_customers, update_customer_notes | ✅ Covered |
| Orders | orderAgent | get_orders, create_order_draft | ✅ Covered |
| Quotes | quoteAgent | configure_system, calculate_price, create_quote_draft | ✅ Covered |
| Analytics | analyticsAgent | run_report, get_metrics, get_trends | ✅ Covered |
| Invoices | orderAgent | get_invoices | ⚠️ Partial |
| **Jobs** | ❌ None | ❌ None | 🔴 GAP |
| **Communications** | ❌ None | send_email_draft only | 🔴 GAP |
| **Products** | ❌ None | ❌ None | 🔴 GAP |
| **Inventory** | ❌ None | ❌ None | 🔴 GAP |
| **Warranties** | ❌ None | ❌ None | 🔴 GAP |
| **Suppliers** | ❌ None | ❌ None | 🔴 GAP |

## Critical Gaps

### GAP-1: Missing Jobs/Operations Agent

**User Stories Affected:** JOB-001 to JOB-006
- Job status queries
- Schedule viewing (today's jobs, weekly calendar)
- Crew assignments
- Schedule job (requires approval)
- Reassign job (requires approval)
- Mark job complete (requires approval)

**Required Addition to PRD:**

```json
{
  "agents": {
    "jobs": {
      "model": "claude-sonnet-4-20250514",
      "temperature": 0.3,
      "maxTurns": 10,
      "purpose": "Job scheduling, crew assignments, status tracking",
      "tools": ["get_jobs", "get_schedule", "get_crew_assignments", "schedule_job_draft", "reassign_job_draft", "complete_job_draft"]
    }
  }
}
```

**Tools Needed:**
- `get_jobs` - Query jobs by status, date, customer
- `get_schedule` - Get calendar view for date range
- `get_crew_assignments` - Get crew member schedules
- `schedule_job_draft` - Create scheduling draft (approval required)
- `reassign_job_draft` - Create reassignment draft (approval required)
- `complete_job_draft` - Mark complete draft (approval required)

---

### GAP-2: Missing Communications Agent

**User Stories Affected:** COM-001 to COM-004
- Communication history lookup
- Log a call (no approval)
- Schedule follow-up (no approval)
- Draft email (approval required for send)

**Required Addition to PRD:**

```json
{
  "agents": {
    "communications": {
      "model": "claude-sonnet-4-20250514",
      "temperature": 0.5,
      "maxTurns": 10,
      "purpose": "Communication logging, follow-ups, email drafting",
      "tools": ["get_communications", "log_communication", "create_reminder", "draft_email"]
    }
  }
}
```

**Tools Needed:**
- `get_communications` - Query communication history
- `log_communication` - Log call/meeting (NO approval - low risk)
- `create_reminder` - Create follow-up task (NO approval - low risk)
- `draft_email` - Draft email for approval (approval required)

---

### GAP-3: Missing Products/Inventory Agent

**User Stories Affected:** PRD-001 to PRD-004, INV-001 to INV-006
- Product lookups
- Stock level queries
- Inventory adjustments
- Transfers
- Receiving

**Required Addition to PRD:**

```json
{
  "agents": {
    "inventory": {
      "model": "claude-sonnet-4-20250514",
      "temperature": 0.3,
      "maxTurns": 10,
      "purpose": "Product catalog, stock levels, inventory management",
      "tools": ["search_products", "get_product", "get_stock_levels", "adjust_inventory_draft", "transfer_inventory_draft", "receive_inventory"]
    }
  }
}
```

**Tools Needed:**
- `search_products` - Search product catalog
- `get_product` - Get product details, pricing
- `get_stock_levels` - Query inventory by product/location
- `adjust_inventory_draft` - Adjustment draft (approval required)
- `transfer_inventory_draft` - Transfer draft (approval required)
- `receive_inventory` - Record receipt (NO approval - standard process)

---

### GAP-4: Missing Warranties Agent

**User Stories Affected:** WAR-001 to WAR-005
- Warranty lookups
- Status checks
- Registration (no approval)
- Claims (approval required)

**Required Addition to PRD:**

```json
{
  "agents": {
    "warranty": {
      "model": "claude-sonnet-4-20250514",
      "temperature": 0.3,
      "maxTurns": 10,
      "purpose": "Warranty management, claims processing",
      "tools": ["get_warranties", "check_warranty_status", "register_warranty", "file_warranty_claim_draft"]
    }
  }
}
```

**Tools Needed:**
- `get_warranties` - Query warranties by customer/product
- `check_warranty_status` - Check coverage status
- `register_warranty` - Register new warranty (NO approval - standard process)
- `file_warranty_claim_draft` - Create claim draft (approval required)

---

### GAP-5: Missing Purchasing Agent

**User Stories Affected:** SUP-001 to SUP-004
- Supplier lookups
- Purchase history
- Create POs (approval required)
- Reorder suggestions

**Required Addition to PRD:**

```json
{
  "agents": {
    "purchasing": {
      "model": "claude-sonnet-4-20250514",
      "temperature": 0.3,
      "maxTurns": 10,
      "purpose": "Supplier management, purchase orders",
      "tools": ["get_suppliers", "search_suppliers", "get_purchase_orders", "create_po_draft", "get_reorder_suggestions"]
    }
  }
}
```

**Tools Needed:**
- `get_suppliers` - Get supplier details
- `search_suppliers` - Search by product/name
- `get_purchase_orders` - Query PO history
- `create_po_draft` - Create PO draft (approval required)
- `get_reorder_suggestions` - Check inventory vs reorder points

---

### GAP-6: Approval Pattern Distinction

**Current PRD State:**
```json
"draft_approve_pattern": {
  "required_for": ["create_order", "send_email", "sync_to_xero", "delete_*", "bulk_*"],
  "auto_approve": ["read_*", "get_*", "search_*", "update_notes"]
}
```

**Required Update:**
```json
"draft_approve_pattern": {
  "required_for": [
    "create_order", "create_quote", "cancel_order",
    "send_email", "draft_email",
    "schedule_job", "reassign_job", "complete_job",
    "adjust_inventory", "transfer_inventory", "update_pricing",
    "file_warranty_claim", "create_purchase_order",
    "sync_to_xero", "delete_*", "bulk_*"
  ],
  "auto_execute": [
    "read_*", "get_*", "search_*",
    "update_notes", "log_communication", "create_reminder",
    "receive_inventory", "register_warranty"
  ]
}
```

---

### GAP-7: Triage Router Update

**Current PRD State:**
Only routes to 4 agents: customer, order, analytics, quote

**Required Update:**
Route to 9 agents: customer, order, analytics, quote, **jobs, communications, inventory, warranty, purchasing**

---

## Invoice Tools Enhancement

**Current:** orderAgent has `get_invoices`

**Missing from User Stories:**
- `send_payment_reminder_draft` - INV-003 (approval required)
- `record_payment_draft` - INV-004 (approval required)
- `create_invoice_from_job_draft` - INV-005 (approval required)

**Recommendation:** Add invoice tools to orderAgent or create separate invoiceAgent

---

## Workflow Stories Coverage

| Story | PRD Support | Gap |
|-------|-------------|-----|
| WF-001: Follow up on stale quotes | ❌ | Need batch operation support |
| WF-002: Payment collection campaign | ❌ | Need batch email drafting |
| WF-003: Customer 360 | ✅ | Multiple tool calls aggregation |
| WF-004: Project status | ✅ | Cross-domain query chaining |

**Batch Operations Gap:**
PRD references `bulk_*` in approval pattern but no specific batch tools defined.

**Required Addition:**
- `batch_email_draft` - Draft multiple emails for batch send
- `batch_reminder_draft` - Create multiple reminders

---

## Summary of Required PRD Changes

### New Agents (5 additional)
1. `jobs` - Scheduling, crew assignments
2. `communications` - Call logging, follow-ups, emails
3. `inventory` - Stock, products, adjustments
4. `warranty` - Registration, claims
5. `purchasing` - Suppliers, POs

### New Tools (~25 additional)
- Jobs: 6 tools
- Communications: 4 tools
- Inventory: 6 tools
- Warranty: 4 tools
- Purchasing: 5 tools

### Updates to Existing
- Triage router: Add 5 new agent handoffs
- Approval pattern: Distinguish approval vs auto-execute
- orderAgent: Add invoice-specific tools

### New PRD Stories Needed
| ID | Name | Type |
|----|------|------|
| AI-INFRA-020 | Jobs Agent Configuration | server |
| AI-INFRA-021 | Communications Agent Configuration | server |
| AI-INFRA-022 | Inventory Agent Configuration | server |
| AI-INFRA-023 | Warranty Agent Configuration | server |
| AI-INFRA-024 | Purchasing Agent Configuration | server |
| AI-INFRA-025 | Jobs Tools Implementation | server |
| AI-INFRA-026 | Communications Tools Implementation | server |
| AI-INFRA-027 | Inventory Tools Implementation | server |
| AI-INFRA-028 | Warranty Tools Implementation | server |
| AI-INFRA-029 | Purchasing Tools Implementation | server |
| AI-INFRA-030 | Batch Operations Tools | server |
| AI-INFRA-031 | Invoice Tools Enhancement | server |

**Total: 12 new stories to add to the PRD**

---

## Phasing Recommendation

### Phase 1 (Current PRD - v1.0)
- Core infrastructure (schemas, memory, streaming)
- 4 agents: customer, order, analytics, quote
- Basic tools for each agent
- Approval workflow

### Phase 2 (v1.1)
- Jobs agent + tools
- Communications agent + tools
- Invoice tools enhancement

### Phase 3 (v1.2)
- Inventory agent + tools
- Products integration with inventory

### Phase 4 (v1.3)
- Warranty agent + tools
- Purchasing agent + tools
- Batch operations

---

# Implementation Review Findings (2026-01-26)

## Helicopter Review Summary

| Severity | Count | Category |
|----------|-------|----------|
| P1 Critical | 8 | Blocks implementation quality |
| P2 Important | 12 | Should fix before production |
| P3 Nice-to-have | 7 | Cleanup and optimization |

**Overall Architecture Compliance: ~70%**

---

## P1 - Critical Issues

### SEC-001: Sensitive PII Exposed in Tool Results
**Location:** `src/lib/ai/tools/customer-tools.ts:141-159`
**Fix:** Add `email` and `phone` to `filterSensitiveFields()`

### ARCH-001: Missing AppContext Implementation
**Location:** Should be at `src/lib/ai/context/types.ts`
**Fix:** Create full AppContext interface with timezone, locale, baseCurrency, forcedToolCall

### ARCH-002: No Parameter Resolution System
**Location:** Should be at `src/lib/ai/utils/resolve-params.ts`
**Fix:** Implement three-tier priority (forcedToolCall > AI params > dashboard > defaults)

### ARCH-003: Tools Not Using Streaming Generators
**Location:** All files in `src/lib/ai/tools/`
**Fix:** Convert to `async function*` with `yield` statements

### DATA-001: Version Column Not Used for Optimistic Locking
**Location:** `src/lib/ai/approvals/executor.ts`
**Fix:** Increment version on status changes, check expected version

### DATA-002: Expiration Cron Race Condition
**Location:** `src/trigger/jobs/expire-ai-approvals.ts:52-92`
**Fix:** Use atomic `UPDATE...WHERE...RETURNING`

### PERF-001: Blocking Operations Before Stream Start
**Location:** `src/routes/api/ai/chat.ts:83-173`
**Fix:** Parallelize auth, rate limit, budget check

### SEC-002: Budget Check Fails Open on Error
**Location:** `src/lib/ai/utils/budget.ts:225-233`
**Fix:** Return `allowed: false` on error in production

---

## P2 - Important Issues

1. **ARCH-004:** Context via schema instead of executionOptions
2. **ARCH-005:** No memory integration in agents
3. **ARCH-006:** Missing context caching
4. **ARCH-007:** Missing getToolsForAgent registry
5. **ARCH-008:** No markdown table formatting in tools
6. **SEC-003:** customerActivities query missing org scoping
7. **SEC-004:** getConversation missing organization validation
8. **SEC-005:** Missing per-tool rate limits
9. **DATA-003:** Tool approval creation not transactional
10. **DATA-004:** No back-reference from entities to approvals
11. **DATA-005:** No retry count tracking
12. **PERF-002:** Duplicate queries for period comparison

---

## Pattern Compliance Matrix

| Pattern | Compliance | Notes |
|---------|------------|-------|
| Agent Architecture | 85% | Correct models/temps, missing memory config |
| AppContext | 30% | Basic UserContext only |
| Parameter Resolution | 0% | Not implemented |
| Tool Patterns | 60% | Org scoping good, no streaming/tables |
| Artifact Streaming | 80% | Definitions exist, no showCanvas integration |
| Memory Templates | 70% | Redis provider good, no template rendering |
| Shared Prompts | 75% | Security instructions good, verbose formatting |

---

## Files Requiring Changes

### High Priority
- `src/lib/ai/context/types.ts` - CREATE: Full AppContext interface
- `src/lib/ai/context/builder.ts` - CREATE: buildAppContext() function
- `src/lib/ai/utils/resolve-params.ts` - CREATE: Parameter resolution
- `src/lib/ai/tools/*.ts` - REFACTOR: Add streaming generators
- `src/lib/ai/approvals/executor.ts` - FIX: Use version column
- `src/routes/api/ai/chat.ts` - FIX: Parallelize pre-stream ops

### Medium Priority
- `src/lib/ai/tools/types.ts` - ADD: Shared context schema
- `src/lib/ai/tools/index.ts` - ADD: getToolsForAgent() registry
- `src/lib/ai/tools/customer-tools.ts` - FIX: Filter email/phone
- `src/lib/ai/utils/budget.ts` - FIX: Fail closed on error
- `src/lib/ai/ratelimit.ts` - ADD: Per-tool rate limits
- `src/trigger/jobs/expire-ai-approvals.ts` - FIX: Atomic update
