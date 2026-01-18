# Ralph Loop: Orders Domain

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective

Implement the complete Order Management System covering the entire order lifecycle from creation to delivery confirmation. This includes order CRUD operations, shipment tracking with multi-carrier support, delivery proof capture, partial shipments, backorder management, reusable order templates, and amendment workflow with approval tracking.

## Current State

Read `progress.txt` in this directory to determine the current story.
If `progress.txt` doesn't exist, start with ORD-CORE-SCHEMA.

## Required Reading

> **IMPORTANT:** These patterns are MANDATORY for all story implementations in this domain.

| Pattern | File | Applies To | Key Requirements |
|---------|------|------------|------------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories | TDD flow, 80% server coverage, story-level tests |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | Server stories (ORD-CORE-API, ORD-SHIPPING-API, etc.) | Saga pattern for amendments, sync recovery for Xero |
| Performance | `_Initiation/_meta/patterns/performance-benchmarks.md` | API & UI stories | List ops <100ms, detail <2s, use materialized views |
| 3-Click Rule | `_Initiation/_meta/patterns/ux-3-click-rule.md` | UI stories | Swipe-to-pick (1 action), one-click PO creation |
| **Reference Patterns** | `./reference-patterns.md` | All stories | midday invoice patterns, square-ui kanban board |

### Reference Patterns (opc/_reference)

**STUDY BEFORE IMPLEMENTING.** See `./reference-patterns.md` for detailed patterns from:

| Source | Pattern | Use For |
|--------|---------|---------|
| midday/invoice | Form context + Zod schemas | ORD-CREATION-UI |
| midday/invoice | Line items with reorder | ORD-CREATION-UI |
| midday/invoice/utils | `calculateTotal()` utility | ORD-CORE-API |
| midday/tables | Memoized columns, skeleton | ORD-LIST-UI |
| midday/sheets | Sheet CRUD pattern | ORD-DETAIL-UI, ORD-SHIPPING-UI |
| square-ui/task-management | Kanban board/column/card | ORD-FULFILLMENT-DASHBOARD |
| square-ui/lib | Status utilities | All status displays |

## Context

### PRD Files (in execution order)

**Domain PRD**: `opc/_Initiation/_prd/2-domains/orders/orders.prd.json`

### Story Execution Order

Execute stories from orders.prd.json in the following sequence:

#### Phase 1: Core Order Infrastructure
1. **ORD-CORE-SCHEMA** - Order and OrderItems tables with relationships
2. **ORD-CORE-API** - CRUD operations, filtering, pagination
3. **ORD-LIST-UI** - Responsive order list with filtering and bulk actions
4. **ORD-DETAIL-UI** - Complete order view with tabs
5. **ORD-CREATION-UI** - Multi-step order creation wizard

#### Phase 2: Shipping & Fulfillment
6. **ORD-SHIPPING-SCHEMA** - OrderShipments and ShipmentItems tables
7. **ORD-SHIPPING-API** - Shipment creation, tracking, delivery confirmation
8. **ORD-SHIPPING-UI** - Shipment management components
   - Wireframe: `./wireframes/ORD-001c.wireframe.md` (Shipment Tracking)
   - Wireframe: `./wireframes/ORD-002c.wireframe.md` (Delivery Confirmation)
   - Wireframe: `./wireframes/ORD-003c.wireframe.md` (Partial Shipments)

#### Phase 3: Operational Features
9. **ORD-TEMPLATES-SCHEMA** - OrderTemplates and OrderTemplateItems tables
10. **ORD-TEMPLATES-API** - Template CRUD and order creation from templates
11. **ORD-TEMPLATES-UI** - Template library and editor
    - Wireframe: `./wireframes/ORD-005c.wireframe.md` (Order Templates)

#### Phase 4: Amendments & Advanced Features
12. **ORD-AMENDMENTS-SCHEMA** - OrderAmendments table for change tracking
13. **ORD-AMENDMENTS-API** - Amendment request, approval, application
14. **ORD-AMENDMENTS-UI** - Amendment dialogs and history display
    - Wireframe: `./wireframes/ORD-006c.wireframe.md` (Order Amendments)

#### Phase 5: Advanced Operations
15. **ORD-BACKORDER-SCHEMA** - Backorder tracking (if not in inventory)
16. **ORD-BACKORDER-UI** - Backorder report and management
    - Wireframe: `./wireframes/ORD-004c.wireframe.md` (Backorder Management)
17. **ORD-FULFILLMENT-DASHBOARD** - Kanban-style fulfillment operations board
    - Wireframe: `./wireframes/ORD-007.wireframe.md` (Fulfillment Dashboard)

### Reference Files

- **Project Root**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- **Wireframes Index**: `./wireframes/index.md`
- **Stack**: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Tech Stack

- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **File Storage**: Supabase Storage (for delivery proof photos/signatures)
- **AI**: Vercel AI SDK + Anthropic

### Domain Context

- **Industry**: Australian B2B battery/solar manufacturer (Renoz)
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Products**: Tesla Powerwall, Pylontech batteries, Fronius inverters, Solar panels
- **Typical Values**: Residential orders ($5K-$20K), Commercial ($50K-$500K)
- **Carriers**: AusPost, StarTrack, TNT, DHL, FedEx, UPS
- **Shipping**: Multi-carrier support with tracking integration
- **Compliance**: Lithium battery hazmat classification (UN3481), temperature controls

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD story** for acceptance criteria and dependencies
3. **Check wireframes** for UI stories (reference `./wireframes/` files)
4. **Implement acceptance criteria completely**
5. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
6. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>{COMPLETION_PROMISE}</promise>` (from story)
   - Move to next story
7. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order (Summary)

### Phase 1: Core Order Infrastructure (ORD-CORE-*)
- [ ] ORD-CORE-SCHEMA
- [ ] ORD-CORE-API
- [ ] ORD-LIST-UI
- [ ] ORD-DETAIL-UI
- [ ] ORD-CREATION-UI

### Phase 2: Shipping & Fulfillment (ORD-SHIPPING-*)
- [ ] ORD-SHIPPING-SCHEMA
- [ ] ORD-SHIPPING-API
- [ ] ORD-SHIPPING-UI

### Phase 3: Operational Features (ORD-TEMPLATES-*)
- [ ] ORD-TEMPLATES-SCHEMA
- [ ] ORD-TEMPLATES-API
- [ ] ORD-TEMPLATES-UI

### Phase 4: Amendments & Change Management (ORD-AMENDMENTS-*)
- [ ] ORD-AMENDMENTS-SCHEMA
- [ ] ORD-AMENDMENTS-API
- [ ] ORD-AMENDMENTS-UI

### Phase 5: Advanced Operations (ORD-ADVANCED-*)
- [ ] ORD-BACKORDER-SCHEMA (or verify in inventory domain)
- [ ] ORD-BACKORDER-UI
- [ ] ORD-FULFILLMENT-DASHBOARD

## Completion

When ALL order domain stories pass:
```xml
<promise>DOM_ORDERS_COMPLETE</promise>
```

## Constraints

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Create Drizzle migrations for all schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Reference wireframes for UI stories (DOM-ORD-* files)
- Implement all responsive breakpoints (mobile 375px, tablet 768px, desktop 1280px)
- Include accessibility requirements (ARIA, focus order, keyboard navigation)
- Handle loading, error, and success states
- Implement Supabase file upload for delivery proof (photos/signatures)
- Support multi-carrier tracking with URL generation

### DO NOT
- Modify files outside orders domain scope
- Skip acceptance criteria
- Hardcode configuration values (use environment variables)
- Create components that duplicate shadcn/ui primitives
- Skip wireframe requirements for UI stories
- Implement advanced carrier APIs (manual entry only)
- Add features from "out_of_scope" section of PRD

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/orders/
│   │   │   ├── index.tsx              # Order list page
│   │   │   ├── $orderId.tsx           # Order detail page
│   │   │   └── create.tsx             # Create order page
│   │   ├── _authed/fulfillment/
│   │   │   └── index.tsx              # Fulfillment dashboard
│   │   ├── _authed/settings/
│   │   │   └── templates.tsx          # Template library
│   │   └── _authed/reports/
│   │       └── backorders.tsx         # Backorder report
│   │
│   ├── components/domain/orders/
│   │   ├── order-list.tsx             # List component (ORD-LIST-UI)
│   │   ├── order-filters.tsx          # Filter controls
│   │   ├── order-detail.tsx           # Detail view (ORD-DETAIL-UI)
│   │   ├── order-tabs.tsx             # Tab navigation
│   │   ├── order-creation-wizard.tsx  # Creation wizard (ORD-CREATION-UI)
│   │   ├── customer-selector.tsx      # Customer selection step
│   │   ├── product-selector.tsx       # Product selection step
│   │   │
│   │   ├── shipment-list.tsx          # Shipment list (ORD-SHIPPING-UI, DOM-ORD-001c)
│   │   ├── shipment-card.tsx          # Shipment card display
│   │   ├── shipment-row.tsx           # Table row variant
│   │   ├── ship-order-dialog.tsx      # Create shipment
│   │   ├── carrier-config.ts          # Carrier URL patterns
│   │   ├── shipment-status-badge.tsx  # Status indicator
│   │   ├── confirm-delivery-dialog.tsx # Delivery confirmation (DOM-ORD-002c)
│   │   ├── signature-pad.tsx          # Signature capture
│   │   ├── delivery-proof-viewer.tsx  # View proof
│   │   ├── item-ship-selector.tsx     # Partial shipments (DOM-ORD-003c)
│   │   ├── quantity-stepper.tsx       # Qty controls
│   │   ├── item-ship-status.tsx       # Ship status
│   │   │
│   │   ├── template-library.tsx       # Template library (ORD-TEMPLATES-UI, DOM-ORD-005c)
│   │   ├── template-card.tsx          # Template card
│   │   ├── template-editor-dialog.tsx # Template editor
│   │   ├── template-selector.tsx      # Template selector
│   │   │
│   │   ├── backorder-table.tsx        # Backorder view (ORD-BACKORDER-UI, DOM-ORD-004c)
│   │   ├── backorder-item.tsx         # Backorder row
│   │   ├── po-status-badge.tsx        # PO status
│   │   │
│   │   ├── amendment-history.tsx      # Amendment timeline (ORD-AMENDMENTS-UI, DOM-ORD-006c)
│   │   ├── request-amendment-dialog.tsx # Amendment request
│   │   ├── amendment-diff-view.tsx    # Before/after view
│   │   │
│   │   ├── fulfillment-board.tsx      # Kanban board (ORD-FULFILLMENT-DASHBOARD, DOM-ORD-007)
│   │   ├── fulfillment-column.tsx     # Kanban column
│   │   ├── fulfillment-card.tsx       # Order card in board
│   │   ├── fulfillment-metrics.tsx    # Operations metrics
│   │   └── fulfillment-filters.tsx    # Board filters
│   │
│   ├── server/functions/
│   │   ├── orders.ts                  # Order CRUD (ORD-CORE-API)
│   │   ├── order-shipments.ts         # Shipment CRUD (ORD-SHIPPING-API)
│   │   ├── order-templates.ts         # Template CRUD (ORD-TEMPLATES-API)
│   │   └── order-amendments.ts        # Amendment workflow (ORD-AMENDMENTS-API)
│   │
│   └── lib/
│       ├── schemas/
│       │   ├── orders.ts              # Order Zod schemas (ORD-CORE-API)
│       │   ├── order-shipments.ts     # Shipment schemas (ORD-SHIPPING-API)
│       │   ├── order-templates.ts     # Template schemas (ORD-TEMPLATES-API)
│       │   └── order-amendments.ts    # Amendment schemas (ORD-AMENDMENTS-API)
│       │
│       └── supabase/
│           └── types.ts               # Supabase generated types
│
├── drizzle/
│   ├── schema/
│   │   ├── orders.ts                  # Order tables (ORD-CORE-SCHEMA)
│   │   ├── order-shipments.ts         # Shipment tables (ORD-SHIPPING-SCHEMA)
│   │   ├── order-templates.ts         # Template tables (ORD-TEMPLATES-SCHEMA)
│   │   └── order-amendments.ts        # Amendment tables (ORD-AMENDMENTS-SCHEMA)
│   │
│   └── migrations/
│       ├── 0XX_orders_core.ts         # Core order schema
│       ├── 0XX_orders_shipments.ts    # Shipment schema
│       ├── 0XX_orders_templates.ts    # Template schema
│       └── 0XX_orders_amendments.ts   # Amendment schema
│
└── tests/
    └── domain/
        └── orders/
            ├── core.test.ts           # Core API tests
            ├── shipments.test.ts      # Shipment API tests
            ├── templates.test.ts      # Template API tests
            └── amendments.test.ts     # Amendment API tests
```

## Wireframe References

All wireframes are located in: `./wireframes/`

| Story | Wireframe File | Component Type |
|-------|----------------|-----------------|
| ORD-SHIPPING-UI | DOM-ORD-001c.wireframe.md | DataTable (Shipment Tracking) |
| ORD-SHIPPING-UI | DOM-ORD-002c.wireframe.md | FormDialog (Delivery Confirmation) |
| ORD-SHIPPING-UI | DOM-ORD-003c.wireframe.md | FormDialog (Partial Shipments) |
| ORD-BACKORDER-UI | DOM-ORD-004c.wireframe.md | ExpandableDataTable |
| ORD-TEMPLATES-UI | DOM-ORD-005c.wireframe.md | GridWithPreview |
| ORD-AMENDMENTS-UI | DOM-ORD-006c.wireframe.md | FormDialogWithHistory |
| ORD-FULFILLMENT-DASHBOARD | DOM-ORD-007.wireframe.md | KanbanBoard |

**Wireframe Index**: `orders-index.md` - Comprehensive documentation of all wireframes

## Critical Business Rules

From the PRD:

### Order Status Workflow
- **draft** → Initial state, fully editable
- **confirmed** → Customer confirmed, ready for fulfillment
- **picking** → Items being picked from warehouse
- **picked** → All items picked, ready for packing
- **shipped** → Order shipped, tracking available
- **delivered** → Delivery confirmed by customer
- **cancelled** → Order cancelled

### Shipping Logic
- **Partial shipments**: Items can ship as available
- **Backorder handling**: Track backordered items with expected dates
- **Carrier tracking**: Support major Australian carriers with deep links
- **Delivery proof**: Signature and photo required for delivery confirmation

### Amendment Workflow
- **Request**: Any user can request changes with reason
- **Approval**: Manager approval required for changes affecting totals
- **Tracking**: All changes audited with complete trail
- **Application**: Approved changes applied atomically

### Pricing & Tax
- **Currency**: AUD (Australian Dollars)
- **Tax**: GST 10% on all items and shipping
- **Discounts**: Percentage or fixed amount
- **Rounding**: To 2 decimal places

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues → Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts → Verify policy SQL syntax
  - Wireframe interpretation → Check related wireframes and index
  - File upload issues → Verify Supabase Storage bucket policies
  - Carrier URL generation → Check DOM-ORD-001c wireframe carrier config

## Progress Template

```markdown
# Orders Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Phase 1: Core Infrastructure
- [ ] ORD-CORE-SCHEMA
- [ ] ORD-CORE-API
- [ ] ORD-LIST-UI
- [ ] ORD-DETAIL-UI
- [ ] ORD-CREATION-UI

## Phase 2: Shipping & Fulfillment
- [ ] ORD-SHIPPING-SCHEMA
- [ ] ORD-SHIPPING-API
- [ ] ORD-SHIPPING-UI

## Phase 3: Operational Features
- [ ] ORD-TEMPLATES-SCHEMA
- [ ] ORD-TEMPLATES-API
- [ ] ORD-TEMPLATES-UI

## Phase 4: Amendments
- [ ] ORD-AMENDMENTS-SCHEMA
- [ ] ORD-AMENDMENTS-API
- [ ] ORD-AMENDMENTS-UI

## Phase 5: Advanced Operations
- [ ] ORD-BACKORDER-SCHEMA
- [ ] ORD-BACKORDER-UI
- [ ] ORD-FULFILLMENT-DASHBOARD

## Current Story
[STORY-ID]: [Story Name]

## Iteration Count
Total: 0
Current Story: 0

## Blockers
None

## Notes
- [Story notes and learnings]
```

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Orders Domain
**Completion Promise:** DOM_ORDERS_COMPLETE
