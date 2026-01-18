# Task: Implement Customer Management Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/customers.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-customers.progress.txt

## PRD ID
DOM-CUSTOMERS

## Phase
domain-core

## Priority
1

## Dependencies
- FOUND-SCHEMA (for schema patterns)

---

## Renoz Business Context

### Customer Types

Renoz serves solar/BESS installation and integration businesses with four primary customer segments:

| Customer Type | Description | Typical Annual Volume |
|--------------|-------------|----------------------|
| **Small Installer** | Residential-focused solar installers | 50-200 systems/year |
| **Medium Installer** | Multi-crew operations with commercial mix | 200-1000 systems/year |
| **Large Integrator** | Enterprise integrators with multiple branches | 1000+ systems/year |
| **Commercial BESS Specialist** | Battery energy storage system specialists | 50-500 projects/year |

### Example Customers

**Sydney Solar Solutions** (Small Installer)
- 120 residential systems annually
- CEC Accredited, Tier 1 Partner tags
- Focus: Sydney metro area
- Health: Excellent (45 systems installed, 12 days since last order)

**GreenPower Installations** (Medium Installer)
- 650 systems annually (residential + small commercial)
- Volume Buyer, CEC Accredited tags
- 4 installation crews
- Health: Good (180 systems installed, 8 days since last order, 2% warranty claim rate)

### Customer Tags

Tags enable segmentation and targeted operations:

| Tag | Purpose | Usage |
|-----|---------|-------|
| **CEC Accredited** | Clean Energy Council certified | Quality signal, eligibility for rebates |
| **Tier 1 Partner** | Premium partner status | Priority support, exclusive pricing |
| **Volume Buyer** | High-volume purchaser | Bulk discounts, dedicated account manager |
| **Commercial Specialist** | Commercial project focus | Different product mix, pricing |
| **BESS Certified** | Battery system certified | Battery product access |
| **New Customer** | First 90 days | Onboarding support, training |
| **At Risk** | Health score declining | Retention focus |

### Health Metrics

Customer health scoring drives proactive engagement:

| Metric | Good | Warning | At Risk |
|--------|------|---------|---------|
| **Systems Installed** (90d) | 40+ | 15-39 | <15 |
| **Days Since Order** | <14 | 14-30 | >30 |
| **Warranty Claim Rate** | <3% | 3-5% | >5% |
| **Payment Health** | Current | 1-30d overdue | >30d overdue |
| **Support Ticket Volume** | <5/month | 5-10/month | >10/month |

Health score is calculated as weighted average:
- 40%: Order activity (recency + volume)
- 30%: Quality (warranty claims, returns)
- 20%: Financial (payment health, credit utilization)
- 10%: Support burden

---

## UI Pattern References

### Customer List View
- **Component**: RE-UI DataGrid with virtualization
- **Reference**: `.square-ui-reference/templates/data-grid/virtualized-list.tsx`
- **Columns**: Company, Type, Tags, Health, Systems (90d), Last Order, Actions
- **Features**:
  - Search by company name, ABN, contact
  - Filter by type, tags, health status
  - Sort by any column
  - Bulk actions (tag, export)
  - Virtual scrolling for 10,000+ customers

### Customer Card (List Item)
- **Component**: Square UI contact card pattern
- **Reference**: `.square-ui-reference/components/cards/contact-card.tsx`
- **Layout**:
  - Avatar with company logo or initials
  - Company name + customer type badge
  - Tags row (max 3, +N more)
  - Health indicator (StatusBadge)
  - Quick stats: Systems (90d), Days since order
  - Action menu (edit, view, contact)

### Customer 360 View (Detail Page)
- **Component**: Midday activity timeline + tabbed detail
- **Reference**: `.square-ui-reference/templates/detail-page/activity-timeline.tsx`
- **Tabs**:
  1. **Overview**: Company info, contacts, addresses, health metrics
  2. **Orders**: Order history with DataGrid
  3. **Systems**: Installed systems with map view
  4. **Activity**: Timeline of interactions, orders, support tickets
  5. **Documents**: Quotes, invoices, certifications
  6. **Settings**: Tags, credit limits, preferences

### Health Status Badge
- **Component**: StatusBadge with custom color scheme
- **Reference**: `.square-ui-reference/components/badges/status-badge.tsx`
- **Colors**:
  - Excellent (90-100): Green
  - Good (70-89): Blue
  - Fair (50-69): Yellow
  - At Risk (<50): Red

---

## Implementation Notes

### Australian Locale
- **Currency**: AUD formatting (`$45,000.00`)
- **Dates**: DD/MM/YYYY format (e.g., 15/01/2026)
- **Phone**: +61 format with 10-digit display
- **ABN**: 11-digit Australian Business Number validation

### StatusBadge Usage
```typescript
import { StatusBadge } from '@/components/ui/status-badge'

// Customer tier display
<StatusBadge variant={getTierVariant(customer.type)}>
  {customer.type}
</StatusBadge>

// Health score display
<StatusBadge variant={getHealthVariant(customer.health_score)}>
  {customer.health_score}
</StatusBadge>
```

### DataGrid Configuration
```typescript
import { DataGrid } from '@re-ui/datagrid'

<DataGrid
  columns={customerColumns}
  data={customers}
  virtualScroll={true}
  rowHeight={72}
  estimatedRowCount={10000}
  filterConfig={customerFilters}
  sortConfig={customerSorts}
/>
```

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Check for blocking dependencies
# Verify foundation PRDs are complete if needed
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`
4. **Glossary**: `memory-bank/_meta/glossary.md`

### Domain References

| Reference | Purpose |
|-----------|---------|
| `lib/schema/customers.ts` | Customer database schema |
| `lib/schemas/customers.ts` | Customer Zod schemas |
| `src/server/functions/customers.ts` | Customer server functions |
| `src/components/domain/customers/` | Customer UI components |
| `.square-ui-reference/templates/` | UI reference patterns |
| `.square-ui-reference/templates/data-grid/virtualized-list.tsx` | DataGrid example |
| `.square-ui-reference/components/cards/contact-card.tsx` | Card pattern |
| `.square-ui-reference/templates/detail-page/activity-timeline.tsx` | 360 view pattern |
| `.square-ui-reference/components/badges/status-badge.tsx` | Badge component |

---

## Story Types in This PRD

| Type | Description | Max Iterations |
|------|-------------|----------------|
| schema | Database table changes | 3 |
| server-function | Backend logic | 4-5 |
| ui-component | Frontend components | 5-6 |

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Implement according to acceptance_criteria
4. For schema stories: Run `npm run db:generate`
5. Run `npm run typecheck` to verify
6. If tests pass:
   - Set `story.passes = true` in prd.json
   - Append success to progress.txt
   - Commit with message: "Complete [STORY-ID]: Story Title"
7. If tests fail:
   - Append learnings to progress.txt
   - Do NOT modify prd.json
   - Retry with fixes

---

## Domain Guidelines

### Customer Entity Patterns
- Customers have contacts, addresses, activities
- Support tagging for segmentation
- Credit limits and holds
- Customer hierarchy (parent/child)
- Health scoring for engagement
- Australian business context (ABN, CEC accreditation)
- Solar/BESS industry specifics

### DO
- Follow existing customer patterns
- Use withRLSContext for server functions
- Update customer-columns.tsx for list changes
- Add to customer detail tabs as needed
- Use StatusBadge for tier and health display
- Format currency as AUD
- Format dates as DD/MM/YYYY
- Implement health score calculation
- Support customer type filtering and segmentation

### DON'T
- Break existing customer CRUD
- Remove existing functionality
- Change customer ID format
- Use non-Australian date/currency formats
- Hard-code customer types (use enum/config)

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_CUSTOMERS_COMPLETE</promise>
```

---

*Domain PRD - Core CRM entity for all business operations*
