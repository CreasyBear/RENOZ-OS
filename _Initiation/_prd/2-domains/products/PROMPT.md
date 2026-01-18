# Ralph Loop: Products Domain

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective

Implement the complete product catalog management system: core schema, comprehensive CRUD APIs, advanced pricing engine, bundle handling, image management, attribute system, inventory tracking, and professional UI interfaces. This creates a flexible, scalable product management platform for the entire business system.

## Current State

Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with PROD-CORE-SCHEMA.

## Context

### PRD Files (in execution order)
1. `opc/_Initiation/_prd/2-domains/products/products.prd.json` - Complete product domain specification

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- Wireframes: `./wireframes/PROD-*.wireframe.md`

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **Storage**: Supabase Storage (images)

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Implement the acceptance criteria** completely
4. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
5. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
6. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

### Phase 1: Core Product Infrastructure (PROD-CORE)
Execute stories in priority order:
- PROD-CORE-SCHEMA: Database schema with all tables and relationships
- PROD-CORE-API: Product CRUD, search, category management, validation

### Phase 2: Pricing System (PROD-PRICING)
- PROD-PRICING-API: Price resolution, volume tiers, customer-specific pricing
- PROD-PRICING-UI: Pricing management interface

### Phase 3: Product Bundles (PROD-BUNDLES)
- PROD-BUNDLES-API: Bundle creation, component management, price calculation
- PROD-BUNDLES-UI: Bundle editor interface

### Phase 4: Images & Media (PROD-IMAGES)
- PROD-IMAGES-API: Image upload, storage, optimization
- PROD-IMAGES-UI: Gallery management with lightbox

### Phase 5: Attributes System (PROD-ATTRIBUTES)
- PROD-ATTRIBUTES-API: Dynamic attribute definitions and values
- PROD-ATTRIBUTES-UI: Attribute management and product form editor

### Phase 6: Inventory Management (PROD-INVENTORY)
- PROD-INVENTORY-API: Stock tracking, movements, adjustments
- PROD-INVENTORY-UI: Stock level monitoring interface

### Phase 7: Advanced Features (PROD-ADVANCED)
- PROD-BULK-OPERATIONS: CSV/Excel import/export, batch updates
- PROD-SEARCH-OPTIMIZATION: Full-text search, autocomplete, analytics
- PROD-CATEGORY-MANAGEMENT: Hierarchical categories with inheritance
- PROD-CATALOG-UI: Product catalog browsing interface
- PROD-DETAIL-UI: Complete product detail page
- PROD-FORM-UI: Product creation/edit form

## Completion

When ALL products domain stories pass:
```xml
<promise>DOM_PRODUCTS_COMPLETE</promise>
```

## Constraints

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Create Drizzle migrations for schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Reference wireframes in DOM-PROD-*.wireframe.md files
- Follow existing database patterns (org isolation, RLS, audit fields)
- Run `bun run typecheck` after each story

### DO NOT
- Modify files outside products domain scope
- Skip acceptance criteria
- Create components that duplicate shadcn/ui primitives
- Hardcode configuration values
- Bypass RLS policies for organization data isolation
- Skip Zod validation for API inputs

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   └── _authed/
│   │       └── products/
│   │           ├── index.tsx                    # Catalog listing
│   │           ├── $productId.tsx               # Product detail
│   │           └── new.tsx                      # Create product
│   ├── components/
│   │   └── domain/products/
│   │       ├── product-catalog.tsx              # Main listing
│   │       ├── product-detail.tsx               # Detail view
│   │       ├── product-form.tsx                 # Create/edit form
│   │       ├── price-tier-editor.tsx            # Pricing tab
│   │       ├── bundle-editor.tsx                # Bundles tab
│   │       ├── image-gallery.tsx                # Images tab
│   │       ├── attribute-editor.tsx             # Attributes tab
│   │       └── product-search.tsx               # Search interface
│   ├── lib/
│   │   ├── schema/
│   │   │   ├── products.ts                      # Product tables
│   │   │   ├── categories.ts                    # Category table
│   │   │   ├── product-pricing.ts               # Pricing tables
│   │   │   ├── product-bundles.ts               # Bundle tables
│   │   │   ├── product-images.ts                # Image table
│   │   │   ├── product-attributes.ts            # Attribute tables
│   │   │   ├── product-relations.ts             # Relations table
│   │   │   └── inventory-movements.ts           # Inventory table
│   │   └── server/
│   │       └── functions/
│   │           ├── products.ts                  # Product CRUD
│   │           ├── product-pricing.ts           # Pricing logic
│   │           ├── product-images.ts            # Image handling
│   │           └── product-search.ts            # Search logic
├── drizzle/
│   ├── migrations/
│   │   └── 008_products.ts                      # All product tables
│   └── schema/
│       └── index.ts
└── tests/
    └── products/                                 # Integration tests
```

## Wireframe References

All UI stories reference detailed wireframes:

| Story | Wireframe | Focus |
|-------|-----------|-------|
| PROD-PRICING-UI | [DOM-PROD-001c](.././wireframes/PROD-001c.wireframe.md) | Price tier editor, preview, customer pricing |
| PROD-BUNDLES-UI | [DOM-PROD-002c](.././wireframes/PROD-002c.wireframe.md) | Bundle editor, component management |
| PROD-IMAGES-UI | [DOM-PROD-003c](.././wireframes/PROD-003c.wireframe.md) | Image upload, gallery, lightbox |
| PROD-ATTRIBUTES-UI | [DOM-PROD-004c](.././wireframes/PROD-004c.wireframe.md) | Attribute definitions, product editor |
| PROD-CATEGORY-MANAGEMENT | (inline in PRD) | Category hierarchy, tree navigation |
| PROD-CATALOG-UI | (inline in PRD) | List, filters, search, pagination |
| PROD-DETAIL-UI | (inline in PRD) | Tabbed interface, all sections |
| PROD-FORM-UI | (inline in PRD) | Multi-section form with validation |
| PROD-SEARCH-OPTIMIZATION | [DOM-PROD-008c](.././wireframes/PROD-008c.wireframe.md) | Enhanced search with suggestions |

## Business Context

### Renoz Industry & Currency
- **Industry**: Australian B2B battery/renewable energy systems
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY
- **Product Focus**: Battery Energy Storage Systems (BESS), Solar Inverters, Solar Panels, Mounting Systems
- **Price Tiers**: Small jobs (1-5 systems), Medium projects (6-20), Large developments (20+), Government/Utility contracts

### Key Business Rules
- **SKU Format**: Organization prefix + sequential number (e.g., RENOZ-001)
- **Price Resolution**: Customer-specific → Volume tier → Base price
- **Inventory Tracking**: Real-time with allocation tracking and low-stock alerts
- **Bundle Handling**: Components deducted individually on fulfillment
- **Category Hierarchy**: Unlimited nesting with attribute inheritance
- **Attribute System**: Dynamic assignment based on product category

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues → Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts → Verify policy SQL syntax
  - Import errors → Check TanStack Start path aliases
  - Pricing calculation issues → Trace through resolve order in tests

## Progress Template

```markdown
# Products Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories

### Phase 1: Core Infrastructure
- [ ] PROD-CORE-SCHEMA: Product Core Schema
- [ ] PROD-CORE-API: Product Core API

### Phase 2: Pricing System
- [ ] PROD-PRICING-API: Pricing Engine API
- [ ] PROD-PRICING-UI: Pricing Management Interface

### Phase 3: Bundles
- [ ] PROD-BUNDLES-API: Product Bundles API
- [ ] PROD-BUNDLES-UI: Bundle Management Interface

### Phase 4: Images
- [ ] PROD-IMAGES-API: Product Images API
- [ ] PROD-IMAGES-UI: Image Gallery Interface

### Phase 5: Attributes
- [ ] PROD-ATTRIBUTES-API: Product Attributes API
- [ ] PROD-ATTRIBUTES-UI: Attributes Management Interface

### Phase 6: Inventory
- [ ] PROD-INVENTORY-API: Inventory Management API
- [ ] PROD-INVENTORY-UI: Inventory Management Interface

### Phase 7: Advanced Features
- [ ] PROD-BULK-OPERATIONS: Bulk Operations System
- [ ] PROD-SEARCH-OPTIMIZATION: Search Optimization
- [ ] PROD-CATEGORY-MANAGEMENT: Category Management System
- [ ] PROD-CATALOG-UI: Product Catalog Interface
- [ ] PROD-DETAIL-UI: Product Detail Interface
- [ ] PROD-FORM-UI: Product Creation/Edit Form

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

1. **inventoryMovements table is NOT defined in this PRD**
   - The `inventoryMovements` table is defined in the shared `007_inventory-core.ts` migration
   - The Products migration (`008_products.ts`) should only ADD a FK constraint:
     ```sql
     ALTER TABLE "inventoryMovements"
       ADD CONSTRAINT fk_movement_product
       FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE SET NULL;
     ```

2. **Migration Execution Order**
   ```
   007_inventory-core.ts  -- Creates warehouseLocations and inventoryMovements
   008_products.ts        -- Creates products tables, adds FK to inventoryMovements
   010_suppliers.ts       -- Creates supplier tables (depends on products)
   011_inventory.ts       -- Creates inventoryItems, adds FK to inventoryMovements
   ```

3. **Reference Documentation**
   - See `_meta/remediation-schema-migrations.md` for full context
   - The schema conflict was identified in PRD-2 premortem analysis

### Implementation Notes

- When implementing PROD-CORE-SCHEMA, do NOT create the `inventoryMovements` table
- When implementing PROD-INVENTORY-API, use the shared `inventoryMovements` table from 007
- The `_schema_remediation` field in the PRD JSON documents this change

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Products Domain
**Completion Promise:** DOM_PRODUCTS_COMPLETE
