# Task: Implement Products Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/products.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-products.progress.txt

## PRD ID
DOM-PRODUCTS

## Phase
domain-core

## Priority
1

## Dependencies
- FOUND-SCHEMA (schema patterns)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Database generation
npm run db:generate
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
| `lib/schema/products.ts` | Product database schema |
| `lib/schemas/products.ts` | Product Zod schemas |
| `src/server/functions/products.ts` | Product server functions |
| `src/components/domain/products/` | Product UI components |

---

## Business Context

### Product Categories

Renoz deals with solar/battery installation products across these categories:

1. **Batteries** - Energy storage systems
2. **Inverters** - DC to AC conversion
3. **Panels** - Solar photovoltaic modules
4. **Mounting** - Racking and hardware
5. **Cables** - Wiring and connectors
6. **Monitoring** - Energy management systems

### Product Attributes by Category

#### Battery Products
- **Chemistry**: LFP (Lithium Iron Phosphate), NMC (Nickel Manganese Cobalt)
- **Capacity**: kWh rating (e.g., 5kWh, 10kWh, 13.5kWh)
- **Voltage**: System voltage (48V, 400V, etc.)
- **Warranty**: Cycle count (6000, 10000 cycles)
- **DoD**: Depth of Discharge percentage (80%, 90%, 100%)
- **Efficiency**: Round-trip efficiency (90%, 95%)

Examples: BYD Battery-Box Premium HVS 10.2kWh, Pylontech US5000 4.8kWh, Tesla Powerwall 2 13.5kWh

#### Inverter Products
- **Power Rating**: kW output (3kW, 5kW, 10kW)
- **Topology**: String, Hybrid, Microinverter
- **MPPT Inputs**: Number of independent MPPT trackers (1, 2, 3)
- **Compliance**: AS4777.2 certification (Australia standard)
- **Efficiency**: Peak efficiency percentage (97%, 98%)
- **Warranty**: Years (5yr, 10yr, 25yr)

Examples: Fronius Primo 5.0-1, SolarEdge HD-Wave SE5000H, Enphase IQ8+

### Price Tiers

Products have tiered pricing based on job size:

| Tier | Quantity Range | Discount | Use Case |
|------|----------------|----------|----------|
| **Small Job** | 1-5 units | List price | Residential single install |
| **Medium Job** | 6-20 units | 5-10% off | Multi-unit residential or small commercial |
| **Large Job** | 20+ units | 15-25% off | Commercial/bulk projects |

### Product Variants

Products can have variants for:
- Size/capacity (e.g., 5kWh vs 10kWh battery)
- Color (e.g., black vs silver frame)
- Mounting options (e.g., wall-mount vs floor-stand)
- Warranty tier (e.g., 10yr vs 25yr)

---

## UI Pattern: Product Selection

### Responsive Card Grid
```
Desktop (3 cols) → Tablet (2 cols) → Mobile (1 col)

[Card: Product Image]
BYD Battery-Box HVS 10.2
LFP | 10.2kWh | 6000 cycles
$8,500 → $7,200 (Medium Job)
[Quick Add to Quote]
```

### Card Elements
- Product thumbnail image
- Product name
- Key specs (chemistry, kWh, cycles for batteries)
- Price with tier discount
- Quick add action button
- Detail view link

### Filter/Sort Options
- Category filter (Batteries, Inverters, etc.)
- In-stock only toggle
- Price range slider
- Sort: Name, Price, Newest

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

### Product Structure
- Products can have variants (size, color, capacity)
- Products link to suppliers
- Products have pricing tiers (Small/Medium/Large job)
- Products track inventory levels
- Products belong to categories (Batteries, Inverters, etc.)

### Technical Attributes
- Store technical specs as structured data (JSON/JSONB)
- Battery: chemistry, kWh, voltage, warranty_cycles, dod, efficiency
- Inverter: kw_rating, topology, mppt_inputs, as4777_certified, efficiency
- Validation rules for category-specific attributes

### DO
- Follow existing product patterns
- Support variant management
- Include pricing tier logic
- Validate category-specific attributes
- Store technical specs in structured format

### DON'T
- Break existing product CRUD
- Remove variant functionality
- Change SKU format
- Mix incompatible product categories

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_PRODUCTS_COMPLETE</promise>
```

---

*Domain PRD - Product catalog and variants*
