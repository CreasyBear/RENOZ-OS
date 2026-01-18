# Task: Implement Pipeline Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/pipeline.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-pipeline.progress.txt

## PRD ID
DOM-PIPELINE

## Phase
domain-core

## Priority
1

## Dependencies
- DOM-CUSTOMERS (customer reference)
- DOM-PRODUCTS (product reference)
- FOUND-SCHEMA (schema patterns)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck
```

---

## Renoz Business Context

### Pipeline Stages
```
Lead → Site Assessment → System Design → Technical Review → Quoting → Won/Lost
```

Each stage represents a step in the solar installation sales process:
- **Lead**: Initial contact, qualification
- **Site Assessment**: On-site evaluation of property
- **System Design**: Engineering solar system specifications
- **Technical Review**: Validation of design feasibility
- **Quoting**: Price calculation and proposal generation
- **Won/Lost**: Final deal outcome

### Products & Quote Line Items

**Battery Products:**
- Tesla Powerwall (13.5 kWh modules)
- Pylontech US5000 (4.8 kWh modules)

**Inverters:**
- Fronius (various kW ratings)

**Quote Line Items:**
- Batteries (measured in kWh)
- Inverters (measured in kW)
- Solar panels (quantity)
- Installation kits
- Labor/installation services

### System Design Fields

Opportunities track:
- **System size**: Total kWh capacity
- **Panel count**: Number of solar panels
- **Grid type**: On-grid, off-grid, or hybrid
- **Battery capacity**: Total kWh storage
- **Inverter capacity**: Total kW output

---

## UI Pattern References

### Kanban Board
- **Library**: DnD Kit for drag-and-drop
- **Stage visualization**: Color gradients per stage
- **Deal cards**: Compact display with key metrics
- **Reference**: `_reference/.square-ui-reference/templates-baseui/dashboard-4/` for leads/pipeline patterns

### Deal Card Design
Display on each card:
- Customer name
- Deal value (use Fraunces font for emphasis)
- Win probability percentage
- Days in current stage
- System size summary
- Stage color indicator

### Quote Builder UI
- **Component**: Editable data grid
- **Features**:
  - Product autocomplete (batteries, inverters, panels)
  - Inline editing of quantities
  - Real-time total calculation
  - Product specification display (kWh, kW)
- **Reference**: Similar to dashboard table patterns in `_reference/.square-ui-reference/`

### Stage Colors
Use design system colors with gradients:
- Lead: Blue gradient
- Site Assessment: Teal gradient
- System Design: Green gradient
- Technical Review: Yellow gradient
- Quoting: Orange gradient
- Won: Emerald gradient
- Lost: Red/gray gradient

### Typography
- **Deal values**: Fraunces font (distinctive serif for emphasis)
- **Metrics**: System default
- **Labels**: Design system body text

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`

### Domain References

| Reference | Purpose |
|-----------|---------|
| `lib/schema/opportunities.ts` | Opportunity database schema |
| `src/server/functions/opportunities.ts` | Pipeline server functions |
| `src/components/domain/pipeline/` | Pipeline UI components |

---

## Pipeline Stages

```
Lead → Qualified → Proposal → Negotiation → Won/Lost
```

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

## Implementation Notes

### DO
- Track opportunity value and probability
- Support quote generation with product autocomplete
- Enable win/loss analysis
- Calculate weighted pipeline value
- Use stage color gradients for visual clarity
- Display Renoz-specific fields (system size, panel count, grid type)
- Support drag-and-drop stage transitions
- Show days-in-stage metrics

### DON'T
- Break existing opportunity CRUD
- Remove quote functionality
- Hardcode product catalogs (should be DB-driven)
- Ignore stage-specific validation rules

### Technical Patterns
- Use DnD Kit for kanban interactions
- Apply design system colors with CSS custom properties
- Use Fraunces font for emphasized values via className
- Implement optimistic updates for drag-and-drop
- Store quote line items as JSON in opportunity records

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_PIPELINE_COMPLETE</promise>
```

---

*Domain PRD - Sales pipeline and opportunities*
