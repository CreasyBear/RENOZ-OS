# Workflow Wireframes Index

> Summary and navigation guide for all CRM workflow wireframes

## Overview

This directory contains detailed wireframes for the 8 core business workflows in the Renoz CRM system. Each workflow represents a complete end-to-end business process with multiple stages, user interactions, and system integrations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WORKFLOW ECOSYSTEM MAP                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │    LEAD      │────▶│    ORDER     │────▶│     JOB      │               │
│   │  TO ORDER    │     │ FULFILLMENT  │     │  COMPLETION  │               │
│   └──────────────┘     └──────────────┘     └──────────────┘               │
│          │                    │                    │                        │
│          │                    │                    ▼                        │
│          │                    │             ┌──────────────┐               │
│          │                    │             │  INVOICING   │               │
│          │                    │             └──────────────┘               │
│          │                    │                    │                        │
│          ▼                    ▼                    ▼                        │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │   CUSTOMER   │     │ PROCUREMENT  │     │   WARRANTY   │               │
│   │  ONBOARDING  │     │              │     │    CLAIMS    │               │
│   └──────────────┘     └──────────────┘     └──────────────┘               │
│          │                                         │                        │
│          └────────────────┬────────────────────────┘                        │
│                           ▼                                                 │
│                    ┌──────────────┐                                        │
│                    │   SUPPORT    │                                        │
│                    │  RESOLUTION  │                                        │
│                    └──────────────┘                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Summaries

### 1. Lead to Order Workflow

**File**: [lead-to-order.wireframe.md](./lead-to-order.wireframe.md)
**PRD Reference**: `../workflows/lead-to-order.prd.json`

| Attribute | Value |
|-----------|-------|
| **Primary Users** | Sales Representatives, Sales Managers |
| **Stages** | Lead → Qualified → Proposal → Negotiation → Won/Lost |
| **Key Features** | Sales wizard, quote lifecycle, conversion analytics |
| **Avg Duration** | 7-30 days |

**Stage Flow**:
```
[Lead Capture] → [Qualification] → [Proposal] → [Negotiation] → [Close]
     5%              20%             50%           80%          100%
```

**Key Screens**:
- Lead intake wizard with smart field validation
- Quote builder with product catalog integration
- Proposal generator with template selection
- Negotiation tracker with approval workflows
- Win/Loss analysis dashboard

---

### 2. Order Fulfillment Workflow

**File**: [order-fulfillment.wireframe.md](./order-fulfillment.wireframe.md)
**PRD Reference**: `../workflows/order-fulfillment.prd.json`

| Attribute | Value |
|-----------|-------|
| **Primary Users** | Warehouse Staff, Logistics Coordinators |
| **Stages** | New → Picking → Packing → Shipped → Delivered |
| **Key Features** | Kanban queue, barcode scanning, shipping integration |
| **SLA Target** | Same-day processing |

**Stage Flow**:
```
[Order Received] → [Pick] → [Pack] → [Ship] → [Deliver]
       0%           25%      50%      75%      100%
```

**Key Screens**:
- Order queue kanban board
- Pick list with location guidance
- Pack station with weight verification
- Shipping label generation
- Delivery tracking dashboard

---

### 3. Job Completion Workflow

**File**: [job-completion.wireframe.md](./job-completion.wireframe.md)
**PRD Reference**: `../workflows/job-completion.prd.json`

| Attribute | Value |
|-----------|-------|
| **Primary Users** | Field Technicians, Service Managers |
| **Stages** | Scheduled → In Progress → Completed → Signed Off |
| **Key Features** | Mobile-first, offline capable, digital signatures |
| **Avg Duration** | 2-8 hours |

**Stage Flow**:
```
[Dispatch] → [En Route] → [On Site] → [Work Done] → [Sign Off]
    0%          10%          30%         80%         100%
```

**Key Screens**:
- Daily schedule view with route optimization
- Pre-job checklist and safety forms
- Work completion forms with photo capture
- Customer signature capture
- Time tracking and parts usage

---

### 4. Invoicing Workflow

**File**: [invoicing.wireframe.md](./invoicing.wireframe.md)
**PRD Reference**: `../workflows/invoicing.prd.json`

| Attribute | Value |
|-----------|-------|
| **Primary Users** | Finance Team, Account Managers |
| **Stages** | Draft → Sent → Viewed → Paid → Closed |
| **Key Features** | Auto-generation, payment matching, collection automation |
| **Payment Terms** | Net 30 default |

**Stage Flow**:
```
[Generate] → [Review] → [Send] → [Track] → [Reconcile]
    10%        25%       40%      70%        100%
```

**Key Screens**:
- Invoice generation from completed jobs
- Batch approval interface
- Payment tracking dashboard
- Aging report with collection actions
- Revenue recognition reporting

---

### 5. Support Resolution Workflow

**File**: [support-resolution.wireframe.md](./support-resolution.wireframe.md)
**PRD Reference**: `../workflows/support-resolution.prd.json`

| Attribute | Value |
|-----------|-------|
| **Primary Users** | Support Agents, Support Managers |
| **Stages** | New → Triaged → In Progress → Pending → Resolved |
| **Key Features** | Triage queue, SLA tracking, knowledge base integration |
| **SLA Target** | 4-hour response, 24-hour resolution |

**Stage Flow**:
```
[Intake] → [Triage] → [Assign] → [Work] → [Resolve] → [Close]
   5%        15%        25%       60%       90%        100%
```

**Key Screens**:
- Support inbox with priority sorting
- Ticket detail with customer history
- Assignment rules configuration
- Resolution templates library
- Customer satisfaction survey

---

### 6. Warranty Claims Workflow

**File**: [warranty-claims.wireframe.md](./warranty-claims.wireframe.md)
**PRD Reference**: `../workflows/warranty-claims.prd.json`

| Attribute | Value |
|-----------|-------|
| **Primary Users** | Customer Service, Claims Processors |
| **Stages** | Submitted → Verified → Approved/Denied → Fulfilled |
| **Key Features** | Automated eligibility check, document upload, vendor RMA |
| **Avg Processing** | 3-5 business days |

**Stage Flow**:
```
[Submit] → [Verify] → [Review] → [Decide] → [Fulfill] → [Close]
   10%       25%        45%        65%        85%        100%
```

**Key Screens**:
- Claim intake wizard with product lookup
- Warranty verification checklist
- Document review interface
- Approval/denial workflow
- Replacement/refund processing

---

### 7. Customer Onboarding Workflow

**File**: [customer-onboarding.wireframe.md](./customer-onboarding.wireframe.md)
**PRD Reference**: `../workflows/customer-onboarding.prd.json`

| Attribute | Value |
|-----------|-------|
| **Primary Users** | Account Managers, Customer Success |
| **Stages** | Welcome → Setup → Training → Go-Live → Handoff |
| **Key Features** | Checklist automation, profile completeness, milestone tracking |
| **Target Duration** | 14 days |

**Stage Flow**:
```
[Welcome] → [Profile] → [Setup] → [Training] → [Go Live] → [Handoff]
    10%        25%        45%        70%         90%        100%
```

**Key Screens**:
- Welcome kit and account setup
- Profile completion wizard
- Service configuration
- Training scheduler and tracker
- Account handoff checklist

---

### 8. Procurement Workflow

**File**: [procurement.wireframe.md](./procurement.wireframe.md)
**PRD Reference**: `../workflows/procurement.prd.json`

| Attribute | Value |
|-----------|-------|
| **Primary Users** | Purchasing Agents, Inventory Managers |
| **Stages** | Request → Sourcing → Ordered → Received → Closed |
| **Key Features** | Demand aggregation, supplier comparison, goods receipt |
| **Approval Threshold** | $1,000+ requires manager approval |

**Stage Flow**:
```
[Request] → [Quote] → [Approve] → [Order] → [Receive] → [Close]
    10%       25%        40%        55%       85%        100%
```

**Key Screens**:
- Purchase request queue
- Supplier comparison matrix
- Approval workflow interface
- PO generation and tracking
- Goods receipt verification

---

## Common Design Patterns

### Progress Indicators

All workflows use consistent progress visualization:

```
┌─────────────────────────────────────────────────────────────┐
│  HORIZONTAL STEPPER (Desktop)                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ●──────────●──────────○──────────○──────────○            │
│   Step 1     Step 2     Step 3     Step 4     Step 5       │
│  Complete   Current    Pending    Pending    Pending       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────────┐
│  VERTICAL TIMELINE        │
│  (Mobile/Sidebar)         │
├───────────────────────────┤
│                           │
│   ● Step 1 - Complete     │
│   │                       │
│   ● Step 2 - Current      │
│   │                       │
│   ○ Step 3 - Pending      │
│   │                       │
│   ○ Step 4 - Pending      │
│                           │
└───────────────────────────┘
```

### Stage Transition States

```
┌─────────────────────────────────────────────────────────────┐
│  TRANSITION CONFIRMATION                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────────────────────────────────────────┐        │
│   │  ⚠ Move to Next Stage?                        │        │
│   │                                                │        │
│   │  Current: Proposal                             │        │
│   │  Next:    Negotiation                          │        │
│   │                                                │        │
│   │  This action cannot be undone.                 │        │
│   │                                                │        │
│   │  ┌────────────┐  ┌────────────┐               │        │
│   │  │   Cancel   │  │  Confirm   │               │        │
│   │  └────────────┘  └────────────┘               │        │
│   └───────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Error States

```
┌─────────────────────────────────────────────────────────────┐
│  VALIDATION ERROR                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────────────────────────────────────────┐        │
│   │  ✕ Cannot Complete Stage                       │        │
│   │                                                │        │
│   │  Required fields missing:                      │        │
│   │  • Customer signature                          │        │
│   │  • Work completion photos (min 2)              │        │
│   │  • Time log entries                            │        │
│   │                                                │        │
│   │  ┌────────────┐                               │        │
│   │  │  Go Back   │                               │        │
│   │  └────────────┘                               │        │
│   └───────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Success States

```
┌─────────────────────────────────────────────────────────────┐
│  SUCCESS NOTIFICATION                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────────────────────────────────────────┐        │
│   │  ✓ Stage Complete                              │        │
│   │                                                │        │
│   │  Order #12345 moved to Shipped                 │        │
│   │                                                │        │
│   │  Tracking: UPS 1Z999AA10123456784              │        │
│   │  Customer notified via email                   │        │
│   │                                                │        │
│   │  ┌────────────┐  ┌────────────┐               │        │
│   │  │ View Order │  │  Dismiss   │               │        │
│   │  └────────────┘  └────────────┘               │        │
│   └───────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Responsive Breakpoints

All workflows are designed for three primary breakpoints:

| Breakpoint | Width | Layout |
|------------|-------|--------|
| **Mobile** | < 640px | Single column, vertical stepper, bottom nav |
| **Tablet** | 640-1024px | Two column, collapsible sidebar |
| **Desktop** | > 1024px | Multi-column, horizontal stepper, full sidebar |

---

## Accessibility Requirements

All workflows implement:

- **WCAG 2.1 AA** compliance
- **Keyboard Navigation**: Full tab order, Enter/Space activation
- **Screen Reader Support**: ARIA labels, live regions, role announcements
- **Focus Management**: Visible focus indicators, logical focus flow
- **Color Independence**: Status conveyed by text/icons, not color alone
- **Touch Targets**: Minimum 44x44px on mobile

---

## Integration Points

### Cross-Workflow Connections

| From Workflow | To Workflow | Trigger |
|---------------|-------------|---------|
| Lead to Order | Order Fulfillment | Order won |
| Lead to Order | Customer Onboarding | New customer |
| Order Fulfillment | Job Completion | Service order dispatch |
| Job Completion | Invoicing | Job signed off |
| Invoicing | Support Resolution | Payment dispute |
| Support Resolution | Warranty Claims | Warranty issue identified |
| Procurement | Order Fulfillment | Stock replenished |

### External System Integrations

| Workflow | External Systems |
|----------|------------------|
| Lead to Order | Email, Calendar, Document Generation |
| Order Fulfillment | Shipping Carriers, Barcode Scanners |
| Job Completion | GPS/Mapping, Mobile Device Camera |
| Invoicing | Payment Gateways, Accounting Software |
| Support Resolution | Email, Phone System, Knowledge Base |
| Warranty Claims | Vendor Portals, Document Storage |
| Customer Onboarding | Email Marketing, Training LMS |
| Procurement | Supplier Portals, Inventory System |

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Page Load | < 2 seconds |
| Stage Transition | < 500ms |
| Search/Filter | < 300ms |
| Form Validation | < 100ms |
| Offline Sync | Background, < 30 seconds when online |

---

## Related Documentation

- **Domain Wireframes**: [../domains/](../domains/)
- **Role Dashboards**: [../roles/](../roles/)
- **Design System**: [../design-system.md](../design-system.md)
- **PRD Source**: [../../workflows/](../../workflows/)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-01 | 1.0 | Initial wireframe creation for all 8 workflows |
