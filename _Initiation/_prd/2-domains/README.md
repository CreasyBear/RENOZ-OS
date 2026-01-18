# Domain PRDs

> **Purpose**: Feature implementation across all business domains
> **Phase**: After refactoring and foundation
> **Total Stories**: 214 stories across 16 domains (updated 2026-01-17)

---

## Premortem Analysis (2026-01-17)

A deep premortem identified **33 tigers** and **27 elephants**. Review before starting:

| Document | Purpose |
|----------|---------|
| [PREMORTEM-CHECKLIST.md](./PREMORTEM-CHECKLIST.md) | Pre-implementation gates and sign-off |
| [remediation-schema-migrations.md](../_meta/remediation-schema-migrations.md) | Fix schema circular dependencies |
| [remediation-sla-engine.md](../_meta/remediation-sla-engine.md) | Unified SLA calculation |
| [remediation-dashboard-performance.md](../_meta/remediation-dashboard-performance.md) | Materialized views + caching |
| [remediation-xero-integration.md](../_meta/remediation-xero-integration.md) | Rate limiting + error handling |

**Critical**: Complete Gate 1 (Schema Foundation) before starting products/inventory/suppliers domains.

---

## Execution Order

Domain PRDs run **after refactoring and foundation PRDs**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOMAIN EXECUTION SEQUENCE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ══════════════════ CORE BUSINESS (MVP) ═══════════════════════ │
│                                                                  │
│  1. DOM-CUSTOMERS (8 stories)   Tags, credit, import, 360 view  │
│  2. DOM-PIPELINE (8 stories)    Forecasting, PDF, versioning    │
│  3. DOM-ORDERS (8 stories)      Shipments, backorders, fulfill  │
│  4. DOM-PRODUCTS (8 stories)    Tiers, bundles, images, attrs   │
│  5. DOM-INVENTORY (8 stories)   Reorder, locations, valuation   │
│                                                                  │
│  ══════════════════ V1 ADDITIONS ═══════════════════════════════ │
│                                                                  │
│  6. DOM-JOBS (8 stories)        Tasks, BOM, time, checklists    │
│  7. DOM-FINANCIAL (8 stories)   Credit notes, AR aging, Xero    │
│  8. DOM-COMMS (8 stories)       Tracking, scheduling, campaigns │
│                                                                  │
│  ══════════════════ V2 ADDITIONS ═══════════════════════════════ │
│                                                                  │
│  9.  DOM-SUPPORT (8 stories)    SLA, escalation, RMA, CSAT      │
│  10. DOM-WARRANTY (8 stories)   Policies, auto-reg, certificates│
│  11. DOM-SUPPLIERS (8 stories) Performance, approvals, prices │
│                                                                  │
│  ══════════════════ SYSTEM DOMAINS ═════════════════════════════ │
│                                                                  │
│  12. DOM-DASHBOARD (8 stories)  Customize, targets, AI insights │
│  13. DOM-USERS (8 stories)      Groups, delegation, onboarding  │
│  14. DOM-SETTINGS (8 stories)   Defaults, audit, custom fields  │
│  15. DOM-REPORTS (8 stories)    Sales, inventory, builder       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## PRD Summary

### Core Business Domains (MVP)

| PRD | Stories | Focus |
|-----|---------|-------|
| [customers.prd.json](./customers.prd.json) | 8 | Tags, credit, import, merge, 360 view, health score |
| [pipeline.prd.json](./pipeline.prd.json) | 8 | Forecasting, PDF quotes, versioning, win/loss |
| [orders.prd.json](./orders.prd.json) | 8 | Shipments, partial ship, backorders, fulfillment |
| [products.prd.json](./products.prd.json) | 8 | Price tiers, bundles, images, attributes |
| [inventory.prd.json](./inventory.prd.json) | 8 | Reorder alerts, locations, valuation, forecasting |

### V1 Additions

| PRD | Stories | Focus |
|-----|---------|-------|
| [jobs.prd.json](./jobs.prd.json) | 8 | Tasks, BOM, time tracking, checklists, mobile |
| [financial.prd.json](./financial.prd.json) | 8 | Credit notes, AR aging, Xero sync, reminders |
| [communications.prd.json](./communications.prd.json) | 8 | Email tracking, scheduling, campaigns, preferences |

### V2 Additions

| PRD | Stories | Focus |
|-----|---------|-------|
| [support.prd.json](./support.prd.json) | 8 | SLA tracking, escalation, RMA, CSAT, KB |
| [warranty.prd.json](./warranty.prd.json) | 8 | Policies, auto-registration, certificates, claims |
| [suppliers.prd.json](./suppliers.prd.json) | 8 | Supplier performance, PO approvals, price lists |

### System Domains

| PRD | Stories | Focus |
|-----|---------|-------|
| [dashboard.prd.json](./dashboard.prd.json) | 8 | Widget customization, targets, AI insights |
| [users.prd.json](./users.prd.json) | 8 | Groups, delegation, photos, onboarding |
| [settings.prd.json](./settings.prd.json) | 8 | System defaults, audit log, custom fields |
| [reports.prd.json](./reports.prd.json) | 8 | Sales/inventory/financial reports, builder |

---

## Key References

### Internal Documentation
- `memory-bank/_meta/conventions.md` - Code patterns
- `memory-bank/_meta/glossary.md` - Domain terminology
- `memory-bank/VISION.md` - Product vision and roadmap

### Foundation Dependencies
- Schema patterns from FOUND-SCHEMA
- Permission matrix from FOUND-AUTH
- Page templates from FOUND-APPSHELL
- Component presets from FOUND-SHARED

---

## Parallel Execution

### Within Each Version Phase

Stories within the same domain are generally sequential due to dependencies.

Stories across different domains in the same phase can run in parallel:

```
Parallel within MVP:
  - DOM-CUSTOMERS + DOM-PRODUCTS (independent)
  - DOM-ORDERS + DOM-INVENTORY (some interdependency)

Parallel within V1:
  - DOM-JOBS + DOM-FINANCIAL + DOM-COMMS (mostly independent)

Parallel within V2:
  - DOM-SUPPORT + DOM-WARRANTY (related, sequence recommended)
  - DOM-SUPPLIERS (independent)

System domains:
  - Can run in parallel with any phase
  - DOM-DASHBOARD depends on metrics from other domains
```

---

## Story Completion Tracking

### Core Business (40 stories)

**DOM-CUSTOMERS** (8)
- [ ] DOM-CUST-001: Add Customer Tags/Segmentation
- [ ] DOM-CUST-002: Add Customer Credit Limit
- [ ] DOM-CUST-003: Add Customer Import from CSV
- [ ] DOM-CUST-004: Add Merge Duplicate Customers
- [ ] DOM-CUST-005: Enhance Customer 360 View
- [ ] DOM-CUST-006: Add Customer Health Score
- [ ] DOM-CUST-007: Add Customer Hierarchy
- [ ] DOM-CUST-008: Enhance Activity Timeline

**DOM-PIPELINE** (8)
- [ ] DOM-PIPE-001: Add Pipeline Forecasting Fields
- [ ] DOM-PIPE-002: Add Quote PDF Generation
- [ ] DOM-PIPE-003: Add Quote Versioning
- [ ] DOM-PIPE-004: Add Quote Validity Period
- [ ] DOM-PIPE-005: Add Win/Loss Tracking
- [ ] DOM-PIPE-006: Add Pipeline Forecasting Report
- [ ] DOM-PIPE-007: Enhance Pipeline Board
- [ ] DOM-PIPE-008: Add Quick Quote Creation

**DOM-ORDERS** (8)
- [ ] DOM-ORD-001: Add Shipment Tracking
- [ ] DOM-ORD-002: Add Delivery Confirmation
- [ ] DOM-ORD-003: Add Partial Shipment Handling
- [ ] DOM-ORD-004: Add Backorder Management
- [ ] DOM-ORD-005: Add Order Templates
- [ ] DOM-ORD-006: Add Order Amendments
- [ ] DOM-ORD-007: Create Fulfillment Dashboard
- [ ] DOM-ORD-008: Add Pick List Generation

**DOM-PRODUCTS** (8)
- [ ] DOM-PROD-001: Add Price Tiers
- [ ] DOM-PROD-002: Add Product Bundles
- [ ] DOM-PROD-003: Add Product Images
- [ ] DOM-PROD-004: Add Product Attributes
- [ ] DOM-PROD-005: Add Product Import
- [ ] DOM-PROD-006: Add Discontinued Product Handling
- [ ] DOM-PROD-007: Add Related Products
- [ ] DOM-PROD-008: Optimize Product Search

**DOM-INVENTORY** (8)
- [ ] DOM-INV-001: Add Reorder Point Alerts
- [ ] DOM-INV-002: Add Warehouse Locations
- [ ] DOM-INV-003: Add Stock Count Process
- [ ] DOM-INV-004: Add Reserved Stock Handling
- [ ] DOM-INV-005: Add Inventory Valuation
- [ ] DOM-INV-006: Add Inventory Forecasting
- [ ] DOM-INV-007: Add Inventory Aging Report
- [ ] DOM-INV-008: Create Inventory Dashboard

### V1 Additions (24 stories)

**DOM-JOBS** (8)
- [ ] DOM-JOBS-001: Add Job Task Management
- [ ] DOM-JOBS-002: Add Job BOM Tracking
- [ ] DOM-JOBS-003: Add Time Tracking
- [ ] DOM-JOBS-004: Add Punchlist/Checklist
- [ ] DOM-JOBS-005: Add Job Scheduling Calendar
- [ ] DOM-JOBS-006: Create Mobile Job View
- [ ] DOM-JOBS-007: Add Job Templates
- [ ] DOM-JOBS-008: Add Job Costing Report

**DOM-FINANCIAL** (8)
- [ ] DOM-FIN-001: Add Credit Notes
- [ ] DOM-FIN-002: Add Payment Plans
- [ ] DOM-FIN-003: Add Accounts Receivable Aging
- [ ] DOM-FIN-004: Add Customer Statements
- [ ] DOM-FIN-005: Complete Xero Invoice Sync
- [ ] DOM-FIN-006: Add Payment Reminders
- [ ] DOM-FIN-007: Create Financial Dashboard
- [ ] DOM-FIN-008: Add Revenue Recognition

**DOM-COMMS** (8)
- [ ] DOM-COMMS-001: Add Email Open/Click Tracking
- [ ] DOM-COMMS-002: Add Email Scheduling
- [ ] DOM-COMMS-003: Add Bulk Email Campaigns
- [ ] DOM-COMMS-004: Add Call Scheduling
- [ ] DOM-COMMS-005: Add Communication Preferences
- [ ] DOM-COMMS-006: Add Email Signature Management
- [ ] DOM-COMMS-007: Enhance Email Template Editor
- [ ] DOM-COMMS-008: Create Communications Timeline

### V2 Additions (24 stories)

**DOM-SUPPORT** (8)
- [ ] DOM-SUP-001: Add SLA Tracking
- [ ] DOM-SUP-002: Add Issue Escalation Rules
- [ ] DOM-SUP-003: Add Return Authorization (RMA)
- [ ] DOM-SUP-004: Add Issue Templates
- [ ] DOM-SUP-005: Add Customer Satisfaction Tracking
- [ ] DOM-SUP-006: Create Support Dashboard
- [ ] DOM-SUP-007: Add Knowledge Base
- [ ] DOM-SUP-008: Enhance Issue Workflow

**DOM-WARRANTY** (8)
- [ ] DOM-WAR-001: Add Warranty Policies
- [ ] DOM-WAR-002: Add Auto-Registration from Order
- [ ] DOM-WAR-003: Add Warranty Expiry Alerts
- [ ] DOM-WAR-004: Add Warranty Certificate
- [ ] DOM-WAR-005: Enhance Bulk Warranty Registration
- [ ] DOM-WAR-006: Add Warranty Claim Workflow
- [ ] DOM-WAR-007: Add Warranty Extensions
- [ ] DOM-WAR-008: Create Warranty Analytics

**DOM-SUPPLIERS** (8)
- [ ] DOM-PROC-001: Add Supplier Performance Tracking
- [ ] DOM-PROC-002: Add PO Approval Workflow
- [ ] DOM-PROC-003: Add Auto-PO from Reorder Alerts
- [ ] DOM-PROC-004: Add Partial Receipt Handling
- [ ] DOM-PROC-005: Add Supplier Price Lists
- [ ] DOM-PROC-006: Add PO Amendments
- [ ] DOM-PROC-007: Add Landed Cost Tracking
- [ ] DOM-PROC-008: Create Suppliers Dashboard

### System Domains (32 stories)

**DOM-DASHBOARD** (8)
- [ ] DOM-DASH-001: Add Widget Customization
- [ ] DOM-DASH-002: Add Custom Date Ranges
- [ ] DOM-DASH-003: Add Goal/Target Tracking
- [ ] DOM-DASH-004: Add Widget Drill-Down
- [ ] DOM-DASH-005: Add Comparison Periods
- [ ] DOM-DASH-006: Add Scheduled Reports
- [ ] DOM-DASH-007: Create Mobile Dashboard
- [ ] DOM-DASH-008: Add AI Insights Widget

**DOM-USERS** (8)
- [ ] DOM-USER-001: Add User Activity Log View
- [ ] DOM-USER-002: Add User Groups/Teams
- [ ] DOM-USER-003: Add Delegation (Out of Office)
- [ ] DOM-USER-004: Add User Profile Photos
- [ ] DOM-USER-005: Add Last Login Display
- [ ] DOM-USER-006: Add Bulk User Operations
- [ ] DOM-USER-007: Add User Onboarding Checklist
- [ ] DOM-USER-008: Enhance User Invitation Flow

**DOM-SETTINGS** (8)
- [ ] DOM-SET-001: Add System Defaults Configuration
- [ ] DOM-SET-002: Add Audit Log Viewer
- [ ] DOM-SET-003: Add Data Export/Backup
- [ ] DOM-SET-004: Add Number/Date Format Settings
- [ ] DOM-SET-005: Add Business Hours Configuration
- [ ] DOM-SET-006: Add Custom Fields Framework
- [ ] DOM-SET-007: Add Integration Settings Page
- [ ] DOM-SET-008: Add Settings Search

**DOM-REPORTS** (8)
- [ ] DOM-RPT-001: Add Sales Performance Report
- [ ] DOM-RPT-002: Add Inventory Report
- [ ] DOM-RPT-003: Add Customer Report
- [ ] DOM-RPT-004: Add Financial Summary Report
- [ ] DOM-RPT-005: Add Report Scheduling
- [ ] DOM-RPT-006: Add Report Favorites
- [ ] DOM-RPT-007: Add Simple Report Builder
- [ ] DOM-RPT-008: Create Reports Index Page

---

## Gate Criteria

Before marking a domain PRD complete, verify:

- [ ] All 8 stories completed
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] No functionality regressions
- [ ] New tables have RLS policies
- [ ] New server functions use protected wrapper
- [ ] UI follows established patterns

---

## Cross-Domain Dependencies

Some stories depend on other domains:

| Story | Depends On |
|-------|------------|
| DOM-ORD-004 (Backorder) | DOM-INV-001 (Reorder alerts) |
| DOM-PROC-003 (Auto-PO) | DOM-INV-001 (Reorder alerts) |
| DOM-WAR-002 (Auto-register) | DOM-ORD-002 (Delivery confirm) |
| DOM-FIN-008 (Revenue rec) | DOM-FIN-005 (Xero sync) |
| DOM-DASH-008 (AI insights) | REF-AI-004 (Domain agents) |

---

*Domain PRDs implement features. They rely on patterns from refactoring and foundation PRDs.*
