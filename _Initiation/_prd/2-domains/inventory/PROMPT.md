# Ralph Loop: Inventory Domain

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## UI Implementation Constraints

> **IMPORTANT:** All UI stories MUST follow these constraints from the project's /ui skill.

### Critical Requirements (Block Deployment)

| Component | Requirement |
|-----------|-------------|
| All inputs | `aria-label` on icon-only buttons, associated labels |
| Navigation | Use `<a>`/`<Link>` not `div onClick` |
| Focus | Visible `:focus-visible` rings on all interactive elements |
| Keyboard | Full keyboard support per WAI-ARIA APG patterns |

### Inventory-Specific UI Rules

#### INV-DASHBOARD-UI
- [ ] Skeleton loaders MUST mirror final widget layout (prevent CLS)
- [ ] Each widget MUST have an empty state with clear next action
- [ ] Charts MUST use color-blind-friendly palette (not color-only info)
- [ ] Real-time metrics MUST use `aria-live="polite"` for updates

#### INV-BROWSER-UI
- [ ] MUST virtualize list if >50 items (`@tanstack/react-virtual`)
- [ ] URL MUST reflect filters, view mode, and pagination state
- [ ] Multiple views (list/grid/map) MUST share keyboard navigation
- [ ] Bulk select checkbox hit area = full row width

#### INV-ITEM-DETAIL-UI
- [ ] Tabs MUST support keyboard arrows and proper focus management
- [ ] Movement history MUST use `tabular-nums` for quantity alignment
- [ ] Cost layers MUST use `Intl.NumberFormat` for locale-aware currency

#### INV-STOCK-COUNTING
- [ ] Barcode input MUST NOT block paste
- [ ] Variance highlighting MUST use color + icon (not color-only)
- [ ] Counting workflow URL MUST track current bin/progress state

#### INV-RECEIVING-INTERFACE
- [ ] Quality inspection MUST use `AlertDialog` for reject confirmation
- [ ] Putaway suggestions MUST be keyboard navigable
- [ ] PO search MUST debounce and show loading state

#### INV-FORECASTING-SYSTEM
- [ ] Charts MUST honor `prefers-reduced-motion`
- [ ] Date range picker MUST have full keyboard support
- [ ] Safety stock calculations MUST use `tabular-nums`

#### INV-ALERTS-MANAGEMENT
- [ ] Alert list MUST virtualize if >50 items
- [ ] Severity indicators MUST use icon + color (not color-only)
- [ ] Threshold inputs MUST validate after blur, not block typing

#### INV-MOBILE-INTERFACE
- [ ] Touch targets MUST be ≥44px
- [ ] Input font-size MUST be ≥16px (prevent iOS zoom)
- [ ] MUST use `touch-action: manipulation`
- [ ] Barcode scanner MUST have camera permission error state
- [ ] MUST show offline status with sync action

### Animation Rules
- NEVER add animation unless explicitly requested in wireframe
- MUST honor `prefers-reduced-motion`
- MUST animate only `transform`/`opacity` (compositor props)
- NEVER use `transition: all` - list properties explicitly
- NEVER exceed 200ms for interaction feedback

### Component Primitives
Use existing shadcn/ui components:
- Dialogs: `Dialog` (Radix-based)
- Tabs: `Tabs` from shadcn
- Data Tables: `DataTable` + TanStack Table
- Forms: `react-hook-form` + `zod`
- Virtualization: `@tanstack/react-virtual`

## Objective

Build a complete warehouse management system with real-time inventory visibility, automated replenishment, multi-location tracking, cycle counting, cost accounting, and operational intelligence across the entire supply chain.

## Current State

Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with INV-CORE-SCHEMA.

## Context

### PRD File
- `opc/_Initiation/_prd/2-domains/inventory/inventory.prd.json` - Complete inventory domain specification

### Wireframes (Matching DOM-INV-*)
- `DOM-INV-001c.wireframe.md` - Reorder Point Alerts: UI
- `DOM-INV-002c.wireframe.md` - Low Stock Management
- `DOM-INV-003c.wireframe.md` - Inventory Browser
- `DOM-INV-004c.wireframe.md` - Item Detail Interface
- `DOM-INV-005c.wireframe.md` - Location Management
- `DOM-INV-006.wireframe.md` - Stock Counting System
- `DOM-INV-007.wireframe.md` - Goods Receiving Interface
- `DOM-INV-008.wireframe.md` - Demand Forecasting System

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth with RLS
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **Charts**: Recharts for analytics

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Review wireframes** for story (if applicable)
4. **Implement the acceptance criteria** completely
5. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
6. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
7. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

### Phase 1: Core Infrastructure (INV-CORE)
Execute stories in priority order from inventory.prd.json:
- INV-CORE-SCHEMA: Warehouse Core Schema (Database tables and relationships)
- INV-CORE-API: Warehouse Core API (Server functions and endpoints)

### Phase 2: Dashboard & Browse (INV-DASHBOARD)
- INV-DASHBOARD-UI: Warehouse Operations Dashboard with real-time metrics
- INV-BROWSER-UI: Inventory Browser Interface with advanced filtering
- INV-ITEM-DETAIL-UI: Inventory Item Detail Interface with tabs

### Phase 3: Location & Counting (INV-OPERATIONS)
- INV-LOCATION-MANAGEMENT: Location Management System with hierarchy
- INV-STOCK-COUNTING: Stock Counting System with variance analysis
- INV-RECEIVING-INTERFACE: Goods Receiving Interface with quality inspection

### Phase 4: Advanced Features (INV-ADVANCED)
- INV-FORECASTING-SYSTEM: Demand Forecasting System with safety stock
- INV-ALERTS-MANAGEMENT: Inventory Alerts Management with escalation
- INV-ANALYTICS-REPORTING: Warehouse Analytics and Reporting

### Phase 5: Integration & Mobile (INV-INTEGRATION)
- INV-INTEGRATION-API: Warehouse System Integration Layer
- INV-MOBILE-INTERFACE: Mobile Warehouse Interface with barcode scanning

## Completion

When ALL inventory stories pass:
```xml
<promise>DOM_INVENTORY_COMPLETE</promise>
```

## Constraints

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Create Drizzle migrations for schema changes
- Use Zod for all validation schemas
- Implement Row-Level Security (RLS) for organization data isolation
- Include comprehensive error handling
- Write TypeScript with strict types
- Run `bun run typecheck` after each story
- Reference wireframes for UI implementation
- Consider Renoz battery business context in product examples

### DO NOT
- Modify files outside inventory scope
- Skip acceptance criteria
- Hardcode configuration values
- Create components that duplicate shadcn/ui primitives
- Forget RLS policies for sensitive operations
- Skip database indexing for performance-critical queries

## Key Business Rules

### Inventory Accuracy
- Regular cycle counts with variance analysis and corrective actions
- 100% accuracy target for goods receipt with quality inspection
- Every inventory movement recorded with complete audit trail
- Stock adjustments require approval and justification
- Serialized items tracked individually throughout lifecycle

### Location Management
- Logical warehouse layout with zone/aisle/rack/shelf/bin hierarchy
- Location capacity limits enforced with utilization monitoring
- ABC classification for product placement optimization
- Hazardous material segregation and access controls

### Valuation Methodology
- First-in, first-out (FIFO) cost layer tracking for accurate valuation
- Unit costs updated on every receipt with landed cost calculation
- Consistent valuation method across all reporting periods
- Proper allocation of freight, duty, and other costs

### Demand Forecasting
- Multi-year historical data analysis for trend identification
- Seasonal demand patterns incorporated into forecasts
- Forecast accuracy tracked and improved over time
- Service level-based safety stock calculations

### Alert Management
- Configurable alert thresholds based on business rules
- Multi-level escalation for critical inventory alerts
- Priority-based alert routing and response requirements
- Alert optimization to reduce unnecessary notifications

## Database Schema Overview

Core tables in inventory.prd.json:
- **inventoryItems**: Core inventory tracking with serial/batch numbers
- **inventoryMovements**: Complete audit trail of all transactions
- **warehouseLocations**: Hierarchical location management
- **stockCounts**: Cycle counting and reconciliation
- **inventoryCostLayers**: FIFO cost layer tracking
- **inventoryForecasts**: Demand forecasting and safety stock
- **inventoryAlerts**: Automated inventory alert configuration

All tables include proper:
- Foreign key relationships
- Indexes for performance
- RLS policies for security
- NOT NULL constraints where applicable
- Check constraints for data integrity

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/
│   │   │   ├── inventory/
│   │   │   │   ├── index.tsx                    # Inventory browser
│   │   │   │   ├── dashboard.tsx                # Dashboard view
│   │   │   │   ├── $itemId.tsx                  # Item detail
│   │   │   │   ├── counts/
│   │   │   │   ├── receiving/
│   │   │   │   └── forecasting.tsx
│   │   │   └── settings/
│   │   │       ├── locations.tsx                # Location management
│   │   │       └── inventory-alerts.tsx         # Alert configuration
│   │   └── reports/
│   │       └── inventory/
│   ├── components/
│   │   └── domain/
│   │       ├── inventory/                       # Inventory components
│   │       ├── locations/                       # Location components
│   │       ├── counting/                        # Counting components
│   │       ├── receiving/                       # Receiving components
│   │       ├── forecasting/                     # Forecasting components
│   │       ├── alerts/                          # Alert components
│   │       └── reports/                         # Report components
│   ├── server/
│   │   └── functions/
│   │       ├── inventory.ts                     # Inventory CRUD
│   │       ├── locations.ts                     # Location management
│   │       ├── stock-counts.ts                  # Stock counting
│   │       ├── valuation.ts                     # Valuation & costing
│   │       ├── forecasting.ts                   # Demand forecasting
│   │       └── alerts.ts                        # Alert management
│   └── lib/
│       ├── schema/
│       │   ├── inventory-items.ts
│       │   ├── inventory-movements.ts
│       │   ├── warehouse-locations.ts
│       │   ├── stock-counts.ts
│       │   ├── inventory-cost-layers.ts
│       │   ├── inventory-forecasts.ts
│       │   ├── inventory-alerts.ts
│       │   └── index.ts
│       └── schemas/
│           └── inventory.ts                     # Zod validation schemas
├── drizzle/
│   └── migrations/
│       └── 011_inventory.ts                     # Inventory schema migration
└── tests/
    └── integration/
        └── inventory/
```

## Performance Requirements

- Inventory lookup: < 100 milliseconds
- Stock adjustment: < 500 milliseconds
- Location transfer: < 1 second
- Stock count update: < 2 seconds
- Analytics queries: < 3 seconds
- Support 1M+ inventory items with sub-second queries
- Handle 1000+ movements per minute
- Support 100+ concurrent warehouse operators

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues → Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts → Verify policy SQL syntax
  - Performance issues → Check indexes and query optimization
  - Import errors → Check TanStack Start path aliases

## Progress Template

```markdown
# Inventory Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] INV-CORE-SCHEMA: Warehouse Core Schema
- [ ] INV-CORE-API: Warehouse Core API
- [ ] INV-DASHBOARD-UI: Warehouse Operations Dashboard
- [ ] INV-BROWSER-UI: Inventory Browser Interface
- [ ] INV-ITEM-DETAIL-UI: Inventory Item Detail Interface
- [ ] INV-LOCATION-MANAGEMENT: Location Management System
- [ ] INV-STOCK-COUNTING: Stock Counting System
- [ ] INV-RECEIVING-INTERFACE: Goods Receiving Interface
- [ ] INV-FORECASTING-SYSTEM: Demand Forecasting System
- [ ] INV-ALERTS-MANAGEMENT: Inventory Alerts Management
- [ ] INV-ANALYTICS-REPORTING: Warehouse Analytics and Reporting
- [ ] INV-INTEGRATION-API: Warehouse System Integration Layer
- [ ] INV-MOBILE-INTERFACE: Mobile Warehouse Interface

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

## Premortem Remediation

**IMPORTANT: Schema Migration Dependencies**

This domain has been remediated to resolve circular dependencies between Products, Inventory, and Suppliers domains.

### Key Changes

1. **warehouseLocations and inventoryMovements are NOT defined in this PRD's migration**
   - These tables are defined in the shared `007_inventory-core.ts` migration
   - The Inventory migration (`011_inventory.ts`) should NOT recreate these tables
   - Instead, `011_inventory.ts` should ADD a FK constraint:
     ```sql
     ALTER TABLE "inventoryMovements"
       ADD CONSTRAINT fk_movement_inventory_item
       FOREIGN KEY ("inventoryItemId") REFERENCES "inventoryItems"(id) ON DELETE CASCADE;
     ```

2. **Migration Execution Order**
   ```
   007_inventory-core.ts  -- Creates warehouseLocations and inventoryMovements (SHARED)
   008_products.ts        -- Creates products tables, adds FK to inventoryMovements
   010_suppliers.ts       -- Creates supplier tables
   011_inventory.ts       -- Creates inventoryItems etc., adds FK to inventoryMovements
   ```

3. **Schema Ownership**
   | Table | Migration | Notes |
   |-------|-----------|-------|
   | warehouseLocations | 007_inventory-core.ts | Shared infrastructure |
   | inventoryMovements | 007_inventory-core.ts | Shared audit trail |
   | inventoryItems | 011_inventory.ts | Inventory domain owns |
   | stockCounts | 011_inventory.ts | Inventory domain owns |
   | inventoryCostLayers | 011_inventory.ts | Inventory domain owns |
   | inventoryForecasts | 011_inventory.ts | Inventory domain owns |
   | inventoryAlerts | 011_inventory.ts | Inventory domain owns |

4. **Reference Documentation**
   - See `_meta/remediation-schema-migrations.md` for full context
   - The schema conflict was identified in PRD-2 premortem analysis

### Implementation Notes

- When implementing INV-CORE-SCHEMA, do NOT create `warehouseLocations` or `inventoryMovements` tables
- Use the shared tables from 007_inventory-core.ts
- The PRD JSON still documents the full schema for reference, but implementation defers to 007

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Inventory Domain
**Wireframe Reference:** DOM-INV-001c through DOM-INV-008
**Completion Promise:** DOM_INVENTORY_COMPLETE
