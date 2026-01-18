# Task: Implement Support Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/support.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-support.progress.txt

## PRD ID
DOM-SUPPORT

## Phase
domain-core

## Priority
3

## Dependencies
- DOM-CUSTOMERS (customer reference)
- DOM-ORDERS (order reference)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck
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
| `lib/schema/issues.ts` | Support issue database schema |
| `src/server/functions/issues.ts` | Support server functions |
| `src/components/domain/support/` | Support UI components |

---

## Support Issue Lifecycle

```
Open → In Progress → Waiting on Customer → Resolved → Closed
                           ↓
                       Escalated
```

---

## Business Context

### Issue Categories

Renoz support deals with battery system technical issues:

| Category | Description | Common Patterns |
|----------|-------------|-----------------|
| **Battery Not Charging** | Battery won't charge from grid/solar | Check inverter connection, BMS communication, charge controller settings |
| **Inverter Fault** | Inverter error codes or shutdown | Review error logs, check firmware version, verify grid parameters |
| **BMS Communication Error** | Battery Management System offline | CAN bus connection, firmware compatibility, wiring issues |
| **Capacity Degradation** | Battery losing capacity faster than expected | SoH readings, cycle count, usage patterns, warranty consideration |

### SLA Tiers

Response time commitments based on issue severity:

| Priority | Response Time | Example Issues |
|----------|--------------|----------------|
| **Critical** | 4 hours | System down, no power, safety hazard |
| **High** | 24 hours | Reduced capacity, intermittent faults |
| **Medium** | 48 hours | Performance optimization, feature questions |
| **Low** | 5 business days | General inquiries, documentation requests |

### UI Patterns

#### Ticket Queue View
- Priority badges (Critical: red, High: orange, Medium: yellow, Low: gray)
- SLA countdown timer (shows time remaining before SLA breach)
- Visual indicators: Overdue (red pulse), Due Soon (orange), On Track (green)
- Filter by status, priority, assigned tech, customer

#### Ticket Detail View
- Chat-style thread for all communications
- Chronological activity log (status changes, assignments, internal notes)
- Quick actions: Change status, Escalate, Assign, Add note
- Related context panel (right sidebar)

#### Customer Context Panel
Shows relevant customer history to inform support response:

| Section | Content |
|---------|---------|
| **Order History** | Past purchases, install dates, product serial numbers |
| **Issue History** | Previous tickets, common problems, resolutions that worked |
| **Warranty Status** | Active warranties, expiration dates, claim history |
| **System Config** | Battery model, inverter type, system size, firmware versions |

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
- Track issue priority and SLA countdown
- Support escalation workflow with reason capture
- Link to customers and orders for context
- Enable email integration for customer communication
- Store diagnostic data (error logs, SoH readings, photos)
- Provide customer history context in ticket view
- Allow internal notes separate from customer-facing messages

### DON'T
- Break existing issue tracking
- Remove customer linkage
- Allow SLA time to be manually overridden (calculated from priority)
- Expose internal notes to customers

---

## Support-Specific Schema Considerations

### Issue Fields
- **category**: Enum from issue categories above
- **priority**: Critical/High/Medium/Low
- **sla_deadline**: Calculated from created_at + SLA tier time
- **diagnostic_data**: JSON field for logs, readings, photos
- **internal_notes**: Array of notes (staff-only)
- **customer_messages**: Array of messages (visible to customer)
- **related_order_id**: Link to order for warranty/product context
- **escalation_reason**: Why it was escalated (if applicable)

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_SUPPORT_COMPLETE</promise>
```

---

*Domain PRD - Customer support and issue tracking for battery system technical support*
