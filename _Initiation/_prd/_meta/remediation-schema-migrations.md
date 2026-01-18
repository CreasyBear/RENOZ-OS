# Schema Migration Remediation Plan

**Created**: 2026-01-17
**Issue**: Circular dependency between Products, Inventory, and Suppliers migrations
**Severity**: BLOCKING - Must resolve before Phase 2 implementation

---

## Problem Statement

Three PRDs define overlapping or conflicting schema definitions for inventory-related tables:

| PRD | Migration | Table Conflict |
|-----|-----------|----------------|
| Products (DOM-PRODUCTS) | 008_products.ts | Defines `inventoryMovements` |
| Suppliers (DOM-SUPPLIERS) | 010_suppliers.ts | References `products(id)` |
| Inventory (DOM-INVENTORY) | 011_inventory.ts | Redefines `inventoryMovements` (different schema!) |

### Critical Conflict: `inventoryMovements` Table

**Products PRD defines (lines 249-275):**
```sql
inventoryMovements {
  id: uuid PRIMARY KEY
  organizationId: uuid NOT NULL REFERENCES organizations(id)
  productId: uuid NOT NULL REFERENCES products(id)        -- FK to products
  movementType: enum('purchase', 'sale', 'adjustment', 'transfer', 'return')
  quantity: integer NOT NULL
  referenceId: uuid
  referenceType: varchar(50)
  notes: text
  costPerUnit: decimal(10,2)
  locationId: uuid                                        -- nullable, no FK
  performedBy: uuid NOT NULL REFERENCES users(id)
  createdAt: timestamp NOT NULL DEFAULT NOW()
}
```

**Inventory PRD defines (lines 60-91):**
```sql
inventoryMovements {
  id: uuid PRIMARY KEY
  organizationId: uuid NOT NULL REFERENCES organizations(id)
  inventoryItemId: uuid NOT NULL REFERENCES inventoryItems(id)  -- FK to inventoryItems!
  movementType: enum('receive', 'allocate', 'deallocate', 'pick', 'ship', 'adjust', 'return', 'transfer')
  quantity: integer NOT NULL
  previousQuantity: integer NOT NULL                      -- additional field
  newQuantity: integer NOT NULL                           -- additional field
  referenceId: uuid
  referenceType: enum('purchase_order', 'sales_order', 'adjustment', 'transfer', 'count', 'return')
  reason: varchar(255)                                    -- additional field
  notes: text
  performedBy: uuid NOT NULL REFERENCES users(id)
  performedAt: timestamp NOT NULL DEFAULT NOW()
  costImpact: decimal(10,2)
  locationId: uuid REFERENCES warehouseLocations(id)      -- FK to warehouseLocations!
  metadata: jsonb DEFAULT '{}'                            -- additional field
}
```

**Key Differences:**
1. Products links to `products(id)`, Inventory links to `inventoryItems(id)`
2. Inventory has richer movement tracking (previousQuantity, newQuantity, reason)
3. Inventory uses enum for referenceType, Products uses varchar
4. Inventory has proper FK to `warehouseLocations`

---

## Root Cause Analysis

The two PRDs were designed for different conceptual models:

1. **Products PRD model**: Inventory movements are simple product-centric transactions
2. **Inventory PRD model**: Inventory movements are comprehensive warehouse audit trails

The Inventory PRD model is more complete and should be the canonical source.

---

## Remediation Strategy

### Option A: Consolidated Schema Migration (RECOMMENDED)

Create a shared "inventory-core" migration that runs BEFORE domain-specific migrations.

**New Migration Sequence:**
```
007_inventory-core.ts     -- Shared inventory tables (inventoryMovements, warehouseLocations)
008_products.ts           -- Products (no inventoryMovements)
010_suppliers.ts          -- Suppliers (references products)
011_inventory.ts          -- Inventory domain tables (inventoryItems, stockCounts, etc.)
```

**Files to modify:**
- Remove `inventoryMovements` from Products PRD schema
- Create `007_inventory-core.ts` with shared tables
- Update `011_inventory.ts` to not recreate shared tables

### Option B: Deferred FK with Nullable Fields

Keep migrations in current order but use nullable FK initially.

```sql
-- In 008_products.ts
CREATE TABLE inventoryMovements (
  ...
  inventoryItemId uuid,  -- nullable, FK added later
  productId uuid REFERENCES products(id)
);

-- In 011_inventory.ts  
ALTER TABLE inventoryMovements
  ADD CONSTRAINT fk_inventory_item 
  FOREIGN KEY (inventoryItemId) REFERENCES inventoryItems(id);
```

**Drawback:** Requires application-level enforcement until FK is added.

### Option C: Domain Ownership with Views

Products owns the base table, Inventory creates an enriched view.

```sql
-- 008_products.ts: Base table
CREATE TABLE inventory_movements_base (...);

-- 011_inventory.ts: Enriched view
CREATE VIEW inventoryMovements AS 
  SELECT b.*, i.serialNumber, l.name as locationName
  FROM inventory_movements_base b
  LEFT JOIN inventoryItems i ON b.inventoryItemId = i.id
  LEFT JOIN warehouseLocations l ON b.locationId = l.id;
```

**Drawback:** Views complicate writes.

---

## Recommended Implementation: Option A

### Step 1: Create Shared Migration (007_inventory-core.ts)

```typescript
// drizzle/migrations/007_inventory-core.ts
import { sql } from 'drizzle-orm';

export async function up(db) {
  // Warehouse Locations (needed by both Inventory and Products)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "warehouseLocations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      "locationCode" varchar(20) NOT NULL,
      "name" varchar(100) NOT NULL,
      "locationType" varchar(20) NOT NULL CHECK ("locationType" IN ('warehouse', 'zone', 'aisle', 'rack', 'shelf', 'bin')),
      "parentId" uuid REFERENCES "warehouseLocations"(id),
      "capacity" integer,
      "isActive" boolean DEFAULT true,
      "attributes" jsonb DEFAULT '{}',
      "createdAt" timestamp NOT NULL DEFAULT NOW(),
      "updatedAt" timestamp NOT NULL DEFAULT NOW(),
      "createdBy" uuid REFERENCES users(id),
      "updatedBy" uuid REFERENCES users(id),
      "version" integer NOT NULL DEFAULT 1
    );
    
    CREATE INDEX idx_warehouseLocations_org ON "warehouseLocations"("organizationId");
    CREATE INDEX idx_warehouseLocations_parent ON "warehouseLocations"("parentId");
    CREATE INDEX idx_warehouseLocations_active ON "warehouseLocations"("organizationId", "isActive");
  `);

  // Inventory Movements (comprehensive version from Inventory PRD)
  // Note: inventoryItemId is nullable initially, as inventoryItems created in 011
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "inventoryMovements" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      "productId" uuid,  -- Will add FK after 008_products runs
      "inventoryItemId" uuid,  -- Will add FK after 011_inventory runs
      "movementType" varchar(20) NOT NULL CHECK ("movementType" IN ('receive', 'allocate', 'deallocate', 'pick', 'ship', 'adjust', 'return', 'transfer', 'purchase', 'sale')),
      "quantity" integer NOT NULL CHECK ("quantity" != 0),
      "previousQuantity" integer,
      "newQuantity" integer,
      "referenceId" uuid,
      "referenceType" varchar(50),
      "reason" varchar(255),
      "notes" text,
      "performedBy" uuid NOT NULL REFERENCES users(id),
      "performedAt" timestamp NOT NULL DEFAULT NOW(),
      "costPerUnit" decimal(10,4),
      "costImpact" decimal(10,2),
      "locationId" uuid REFERENCES "warehouseLocations"(id),
      "metadata" jsonb DEFAULT '{}',
      "createdAt" timestamp NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX idx_inventoryMovements_org ON "inventoryMovements"("organizationId");
    CREATE INDEX idx_inventoryMovements_product ON "inventoryMovements"("productId");
    CREATE INDEX idx_inventoryMovements_item ON "inventoryMovements"("inventoryItemId");
    CREATE INDEX idx_inventoryMovements_type ON "inventoryMovements"("movementType");
    CREATE INDEX idx_inventoryMovements_performed ON "inventoryMovements"("performedAt");
  `);
}

export async function down(db) {
  await db.execute(sql`DROP TABLE IF EXISTS "inventoryMovements" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "warehouseLocations" CASCADE`);
}
```

### Step 2: Update 008_products.ts

Remove `inventoryMovements` table definition entirely.

Add FK constraint for productId:
```sql
-- At end of 008_products.ts
ALTER TABLE "inventoryMovements" 
  ADD CONSTRAINT fk_movement_product 
  FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE SET NULL;
```

### Step 3: Update 011_inventory.ts

Remove `warehouseLocations` and `inventoryMovements` table creation.

Add FK constraint for inventoryItemId:
```sql
-- After creating inventoryItems table
ALTER TABLE "inventoryMovements"
  ADD CONSTRAINT fk_movement_inventory_item
  FOREIGN KEY ("inventoryItemId") REFERENCES "inventoryItems"(id) ON DELETE CASCADE;
```

---

## Updated Migration Dependency Graph

```
007_inventory-core
    |
    +---> 008_products (adds FK: inventoryMovements.productId -> products.id)
    |         |
    |         +---> 010_suppliers (references products.id)
    |
    +---> 011_inventory (adds FK: inventoryMovements.inventoryItemId -> inventoryItems.id)
```

---

## PRD Updates Required

### Products PRD (products.prd.json)

1. **Remove** `inventoryMovements` table definition (lines 249-275)
2. **Update** files_to_modify in PROD-CORE-SCHEMA story to remove `inventory-movements.ts`
3. **Add note** that inventory movements are defined in shared schema (007)

### Inventory PRD (inventory.prd.json)

1. **Remove** `warehouseLocations` from INV-CORE-SCHEMA story (moved to 007)
2. **Update** files_to_modify to reference shared schema
3. **Add dependency** on 007_inventory-core migration

---

## Validation Checklist

Before proceeding with Phase 2 implementation:

- [ ] 007_inventory-core.ts created and tested
- [ ] Products PRD updated to remove inventoryMovements
- [ ] 008_products.ts updated to add FK constraint only
- [ ] 011_inventory.ts updated to not recreate shared tables
- [ ] All FK constraints verified with test data
- [ ] RLS policies work across shared tables
- [ ] TypeScript types generated from unified schema

---

## Risk Assessment After Remediation

| Risk | Before | After | Notes |
|------|--------|-------|-------|
| Table creation conflict | HIGH | ELIMINATED | Single source of truth |
| FK reference errors | HIGH | LOW | Proper ordering with nullable initial FKs |
| Migration rollback complexity | MEDIUM | MEDIUM | Need careful rollback order |
| Cross-domain data integrity | HIGH | LOW | Unified audit trail |

---

## Appendix: Cross-Domain Reference Matrix

After remediation, the reference hierarchy is:

```
organizations (foundation)
    |
    +---> users (foundation)
    |       |
    |       +---> inventoryMovements.performedBy
    |       +---> products.createdBy
    |       +---> suppliers.createdBy
    |
    +---> warehouseLocations (007_inventory-core)
    |       |
    |       +---> inventoryMovements.locationId
    |       +---> inventoryItems.locationId
    |
    +---> inventoryMovements (007_inventory-core)
    |       |
    |       +---> products.id (nullable, FK added in 008)
    |       +---> inventoryItems.id (nullable, FK added in 011)
    |
    +---> products (008_products)
    |       |
    |       +---> purchaseOrderItems.productId
    |       +---> supplierPriceLists.productId
    |       +---> inventoryItems.productId
    |       +---> inventoryForecasts.productId
    |
    +---> suppliers (010_suppliers)
    |       |
    |       +---> purchaseOrders.supplierId
    |
    +---> inventoryItems (011_inventory)
            |
            +---> stockCountItems.inventoryItemId
            +---> inventoryCostLayers.inventoryItemId
```

---

## Implementation Timeline

| Task | Owner | Duration | Dependencies |
|------|-------|----------|--------------|
| Create 007_inventory-core.ts | Schema Lead | 2 hours | None |
| Update Products PRD | Architect | 1 hour | None |
| Update Inventory PRD | Architect | 1 hour | None |
| Test migration sequence | QA | 4 hours | All above |
| Update TypeScript types | Dev | 2 hours | Migration test pass |

**Total estimated effort**: 1 dev-day

---

*This remediation plan resolves the circular dependency identified in the PRD-2 premortem analysis.*
