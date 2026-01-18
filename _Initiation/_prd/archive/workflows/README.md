# Workflow PRDs

> **Purpose**: Cross-domain business processes and automation
> **Phase**: After domain PRDs (or parallel for independent workflows)
> **Total Stories**: 48 (6 stories × 8 workflows)

---

## What Are Workflow PRDs?

Workflow PRDs define **end-to-end business processes** that span multiple domains. While domain PRDs focus on individual entity management, workflow PRDs orchestrate how entities interact across the business lifecycle.

```
DOMAIN PRDs: "How do I manage orders?"
WORKFLOW PRDs: "How does a lead become a delivered order?"
```

---

## Workflow Summary

| Workflow | Stories | Domains | Focus |
|----------|---------|---------|-------|
| [lead-to-order.prd.json](./lead-to-order.prd.json) | 6 | Pipeline, Customers, Orders | Sales process automation |
| [order-fulfillment.prd.json](./order-fulfillment.prd.json) | 6 | Orders, Inventory | Warehouse operations |
| [invoicing.prd.json](./invoicing.prd.json) | 6 | Orders, Financial | Order-to-cash |
| [support-resolution.prd.json](./support-resolution.prd.json) | 6 | Support, Communications | Issue handling |
| [warranty-claims.prd.json](./warranty-claims.prd.json) | 6 | Warranty, Support | Claim processing |
| [procurement.prd.json](./procurement.prd.json) | 6 | Procurement, Inventory | Supply chain |
| [job-completion.prd.json](./job-completion.prd.json) | 6 | Jobs, Orders, Financial | Installation workflow |
| [customer-onboarding.prd.json](./customer-onboarding.prd.json) | 6 | Customers, Communications | New customer setup |

---

## Execution Order

Workflows can be executed **after their dependent domain PRDs are complete**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW DEPENDENCIES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WF-LEAD-ORDER      ← Requires: DOM-PIPELINE, DOM-ORDERS        │
│  WF-FULFILLMENT     ← Requires: DOM-ORDERS, DOM-INVENTORY       │
│  WF-INVOICING       ← Requires: DOM-ORDERS, DOM-FINANCIAL       │
│  WF-SUPPORT         ← Requires: DOM-SUPPORT, DOM-COMMS          │
│  WF-WARRANTY        ← Requires: DOM-WARRANTY, DOM-SUPPORT       │
│  WF-PROCUREMENT     ← Requires: DOM-PROCUREMENT, DOM-INVENTORY  │
│  WF-JOB             ← Requires: DOM-JOBS, DOM-FINANCIAL         │
│  WF-ONBOARDING      ← Requires: DOM-CUSTOMERS, DOM-COMMS        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Parallel Execution

Independent workflows can run in parallel:

```
Parallel Group 1 (Core Business):
  - WF-LEAD-ORDER
  - WF-FULFILLMENT
  - WF-INVOICING

Parallel Group 2 (Support):
  - WF-SUPPORT
  - WF-WARRANTY

Parallel Group 3 (Operations):
  - WF-PROCUREMENT
  - WF-JOB

Independent:
  - WF-ONBOARDING (can start early, minimal dependencies)
```

---

## Story Completion Tracking

### WF-LEAD-ORDER (Lead-to-Order)
- [ ] WF-LTO-001: Create Guided Sales Workflow
- [ ] WF-LTO-002: Add Quote Approval Tracking
- [ ] WF-LTO-003: Add Automated Follow-Up Sequences
- [ ] WF-LTO-004: Add One-Click Order Conversion
- [ ] WF-LTO-005: Add Sales Conversion Analytics
- [ ] WF-LTO-006: Add Dynamic Win Probability

### WF-FULFILLMENT (Order Fulfillment)
- [ ] WF-FF-001: Create Fulfillment Queue
- [ ] WF-FF-002: Add Automated Stock Allocation
- [ ] WF-FF-003: Add Optimized Pick Lists
- [ ] WF-FF-004: Add Packing Workflow
- [ ] WF-FF-005: Add Shipping Workflow
- [ ] WF-FF-006: Add Fulfillment Metrics Dashboard

### WF-INVOICING (Invoicing)
- [ ] WF-INV-001: Add Auto-Invoice on Shipment
- [ ] WF-INV-002: Add Batch Invoicing
- [ ] WF-INV-003: Add Payment Matching
- [ ] WF-INV-004: Add Collection Workflow
- [ ] WF-INV-005: Add Month-End Close Process
- [ ] WF-INV-006: Add Cash Flow Forecast

### WF-SUPPORT (Support Resolution)
- [ ] WF-SUP-001: Add Triage Workflow
- [ ] WF-SUP-002: Add Smart Assignment
- [ ] WF-SUP-003: Add Resolution Templates
- [ ] WF-SUP-004: Add Customer Communication Flow
- [ ] WF-SUP-005: Add Post-Resolution Feedback
- [ ] WF-SUP-006: Add Support Workflow Metrics

### WF-WARRANTY (Warranty Claims)
- [ ] WF-WAR-001: Add Warranty Claim Intake
- [ ] WF-WAR-002: Add Warranty Verification Step
- [ ] WF-WAR-003: Add Claim Approval Routing
- [ ] WF-WAR-004: Add Resolution Options
- [ ] WF-WAR-005: Add Product Return Handling
- [ ] WF-WAR-006: Add Warranty Claim Analytics

### WF-PROCUREMENT (Procurement)
- [ ] WF-PROC-001: Add Demand Identification
- [ ] WF-PROC-002: Add Supplier Comparison
- [ ] WF-PROC-003: Add PO Creation Wizard
- [ ] WF-PROC-004: Add PO Status Tracking
- [ ] WF-PROC-005: Add Goods Receipt Process
- [ ] WF-PROC-006: Add Procurement Analytics

### WF-JOB (Job Completion)
- [ ] WF-JOB-001: Add Job Creation from Order
- [ ] WF-JOB-002: Add Job Scheduling Workflow
- [ ] WF-JOB-003: Add Pre-Job Preparation
- [ ] WF-JOB-004: Add Job Execution Tracking
- [ ] WF-JOB-005: Add Customer Sign-Off Process
- [ ] WF-JOB-006: Add Post-Job Invoicing

### WF-ONBOARDING (Customer Onboarding)
- [ ] WF-ONB-001: Add Onboarding Checklist
- [ ] WF-ONB-002: Add Profile Completeness Tracking
- [ ] WF-ONB-003: Add Welcome Email Automation
- [ ] WF-ONB-004: Add First Quote Milestone
- [ ] WF-ONB-005: Add Onboarding Dashboard
- [ ] WF-ONB-006: Add Customer Handoff

---

## Key References

### Cross-Workflow Dependencies

| Story | Depends On |
|-------|------------|
| WF-LTO-002 | DOM-PIPE-002 (Quote PDF) |
| WF-FF-002 | DOM-INV-004 (Reserved stock) |
| WF-INV-001 | DOM-FIN-005 (Xero sync) |
| WF-JOB-006 | WF-INV-001 (Auto-invoice) |
| WF-WAR-005 | DOM-SUP-003 (RMA) |

### Workflow + Domain Synergy

Workflows leverage domain stories:

- **WF-LEAD-ORDER** uses: Pipeline forecasting, Quote PDF, One-click conversion
- **WF-FULFILLMENT** uses: Pick lists, Locations, Reserved stock
- **WF-INVOICING** uses: Xero sync, AR aging, Payment reminders
- **WF-JOB** uses: Tasks, Checklists, Time tracking, Mobile view

---

## Workflow Design Principles

1. **Automation over manual** - Reduce clicks, auto-progress where possible
2. **Visibility at each stage** - Clear status, who owns next action
3. **Exception handling** - Graceful degradation when workflow hits blockers
4. **Metrics built-in** - Every workflow should track time, completion, quality
5. **Notifications at key points** - Internal and customer-facing where appropriate

---

## Gate Criteria

Before marking a workflow complete:

- [ ] All 6 stories completed
- [ ] End-to-end workflow tested
- [ ] Edge cases handled (partial data, errors)
- [ ] Notifications configured and sending
- [ ] Metrics dashboard functional
- [ ] `npm run typecheck` passes
- [ ] No regressions in domain functionality

---

*Workflows connect domains into cohesive business processes.*
