# Task: Implement Inventory Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/inventory.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-inventory.progress.txt

## PRD ID
DOM-INVENTORY

## Phase
domain-core

## Priority
2

## Dependencies
- DOM-PRODUCTS (product reference)
- FOUND-SCHEMA (schema patterns)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Check product domain is available
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`

### Domain References

| Reference | Purpose |
|-----------|---------|
| `lib/schema/inventory.ts` | Inventory database schema |
| `src/server/functions/inventory.ts` | Inventory server functions |
| `src/components/domain/inventory/` | Inventory UI components |

---

## Business Context

### Serial Number Tracking

**MANDATORY** for warranty purposes:
- All batteries and inverters MUST have serial numbers recorded
- Serial numbers link products to warranty claims
- Track serial at receipt, installation, and RMA
- No warranty claim can be processed without serial number

### Storage Requirements

#### Battery Storage Conditions
- **Temperature**: 10-35°C (ideal: 20-25°C)
- **Humidity**: 30-50% relative humidity
- **Charge Level**: 30-50% for long-term storage (>1 month)
- **Ventilation**: Well-ventilated, dry location
- **Rotation**: FIFO (First In First Out) to prevent age degradation

**Why**: Batteries degrade faster when stored fully charged or in extreme temperatures. A battery stored at 100% charge in 35°C heat can lose 20% capacity in 3 months.

### Stock Locations

| Location | Purpose | Rules |
|----------|---------|-------|
| **Warehouse** | Main inventory storage | Climate controlled, security |
| **In Transit** | Goods en route from supplier | Track ETA, carrier |
| **Customer Site** | Installed but not yet handed over | Link to job ID |
| **RMA** | Return Merchandise Authorization | Awaiting assessment |
| **Quarantine** | Damaged/defective items | Cannot be allocated to jobs |

### Supplier Lead Times

| Supplier | Products | Lead Time | Min Order | Notes |
|----------|----------|-----------|-----------|-------|
| **BYD** | Battery-Box series | 6 weeks | 5 units | Direct from manufacturer |
| **Pylontech** | US/UP series | 4 weeks | 10 units | Via Australian distributor |
| **LG Energy** | RESU series | 8 weeks | 3 units | Import delays common |
| **Fronius** | Inverters | 3 weeks | 2 units | Local stock available |
| **SolarEdge** | Inverters | 2 weeks | 1 unit | Fast turnaround |

**Why this matters**: Accurate lead times prevent job delays. If BYD batteries are ordered too late, a 6-week delay can push the entire installation schedule.

---

## Inventory Concepts

- **Stock Level**: Current quantity on hand at location
- **Allocated**: Reserved for specific orders/jobs
- **Available**: Stock Level - Allocated (what can be sold)
- **Reorder Point**: Trigger threshold for low stock alert
- **Lot Tracking**: For expiry and traceability
- **Serial Tracking**: Individual unit identification for warranty

### Formulas
```
Available Stock = Stock Level - Allocated
Reorder Needed = Available Stock < Reorder Point
```

---

## UI Pattern: Inventory Grid

### DataGrid with Conditional Formatting

```
[Product SKU] [Description] [Location] [Stock] [Allocated] [Available] [Status]
-------------------------------------------------------------------------------
BAT-BYD-102   BYD 10.2kWh   Warehouse     15        8           7       OK
BAT-PYL-48    Pylontech US  Warehouse      2        0           2       LOW STOCK ⚠️
INV-FRO-50    Fronius 5kW   In Transit    10        0          10       ARRIVING 2026-01-15
BAT-LG-96     LG RESU 9.6   Quarantine     1        0           0       DEFECTIVE 🔴
```

### Conditional Formatting Rules

| Condition | Visual Treatment |
|-----------|------------------|
| Available < Reorder Point | Orange row, warning icon |
| Available = 0 | Red text, "OUT OF STOCK" badge |
| Location = Quarantine | Red indicator, disable allocation |
| Location = In Transit | Blue indicator, show ETA |
| Has pending RMA | Yellow indicator, "RMA" badge |

### Filter/Search Features
- Filter by location
- Filter by stock status (In Stock, Low Stock, Out of Stock)
- Filter by product category
- Search by SKU or serial number
- Show only allocatable stock toggle

### Bulk Actions
- Transfer stock between locations
- Adjust stock levels (with reason)
- Mark as quarantine/defective
- Generate stock take report

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

### DO
- Track stock movements with audit trail (who, when, why)
- Support multiple warehouse locations
- Calculate available stock accurately (Stock - Allocated)
- Integrate with order allocation
- Enforce serial number recording for warranty items
- Implement location-based rules (e.g., cannot allocate from Quarantine)
- Track storage conditions for batteries

### DON'T
- Allow negative stock without explicit flag
- Break stock movement history
- Skip audit logging
- Allow allocation of quarantined stock
- Store batteries without recording charge level and conditions
- Skip serial number validation for warranty-critical items

### Serial Number Rules
- MUST capture at goods receipt
- MUST link to job/installation
- MUST reference in warranty claims
- CANNOT duplicate serial numbers
- SHOULD validate format per supplier

### Location Transfer Rules
- Audit trail required (from, to, qty, reason, user, timestamp)
- Stock counts must balance
- Cannot transfer from Quarantine without approval
- In Transit items auto-transfer to Warehouse on receipt

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_INVENTORY_COMPLETE</promise>
```

---

*Domain PRD - Inventory and stock management*
