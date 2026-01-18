# Task: Implement Warranty Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/warranty.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-warranty.progress.txt

## PRD ID
DOM-WARRANTY

## Phase
domain-core

## Priority
3

## Dependencies
- DOM-ORDERS (order reference)
- DOM-PRODUCTS (product reference)
- DOM-CUSTOMERS (customer reference)

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
| `lib/schema/warranties.ts` | Warranty database schema |
| `src/server/functions/warranties.ts` | Warranty server functions |
| `src/components/domain/warranties/` | Warranty UI components |

---

## Warranty Lifecycle

```
Active → Claim Filed → Under Review → Approved/Denied → Resolved
```

---

## Business Context

### Claim Types

Battery system warranty claims fall into several categories:

| Claim Type | Description | Required Evidence |
|------------|-------------|-------------------|
| **Manufacturing Defect** | Product fault from factory | Photos, error logs, installer report |
| **Premature Capacity Loss** | Battery capacity below warranty threshold | SoH readings over time, cycle count, usage data |
| **DOA (Dead on Arrival)** | Product failed immediately after installation | Installation date, initial test results, photos |
| **Shipping Damage** | Damage occurred during transit | Unboxing photos, delivery receipt, damage description |

### RMA (Return Merchandise Authorization) Fields

Data required to process warranty claims:

| Field | Purpose | Format |
|-------|---------|--------|
| **Serial Number** | Identify specific unit | Alphanumeric, typically on product label |
| **Installation Date** | Determine warranty period | Date field, required for capacity claims |
| **SoH Reading** | State of Health percentage | 0-100%, from BMS diagnostic |
| **Error Logs** | System fault codes | Text or file upload |
| **Photos** | Visual evidence of issue | File uploads, multiple images |
| **Installer Notes** | Professional assessment | Text field, optional but helpful |

### Proactive Alerts

System-generated notifications to prevent expired warranties:

| Alert Type | Timing | Recipient | Action |
|------------|--------|-----------|--------|
| **30-day warning** | 30 days before expiry | Customer + Sales Rep | Reminder email, dashboard notification |
| **60-day warning** | 60 days before expiry | Customer + Sales Rep | Offer extended warranty |
| **90-day warning** | 90 days before expiry | Sales Rep only | Proactive outreach opportunity |
| **Expiration notice** | Day of expiry | Customer + Sales Rep | Log expiration event |

### UI Patterns

#### Warranty Cards (Dashboard)
- Visual countdown display (circular progress or bar)
- Color coding: Active (green), Expiring Soon (yellow), Expired (gray)
- Key info: Product name, serial number, days remaining
- Quick action: "File Claim" button
- Group by: Customer, Product, Expiration date

#### Warranty Timeline View
- Horizontal timeline showing warranty periods
- Multiple products on same timeline for comparison
- Markers for: Purchase, Installation, Expiration
- Visual indicators for claims filed
- Filter by customer, product type, status

#### Claim Submission Form
- Step-by-step wizard: Type → Evidence → Review → Submit
- Inline validation (serial number format, required fields)
- File upload with drag-and-drop
- Auto-populate from order data when possible
- Save draft capability for complex claims

#### Warranty Expiration Dashboard
- Calendar view of upcoming expirations
- Sort by: Days remaining, Customer, Product
- Bulk action: Send reminder emails
- Export list for proactive sales outreach

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
- Track warranty periods from installation date (not purchase date)
- Support claim management with evidence uploads
- Link to order line items (not just orders)
- Enable supplier warranty claims (pass-through from manufacturer)
- Generate proactive expiration alerts at 30/60/90 days
- Store SoH readings over time for capacity claims
- Allow draft claims (customer may need time to gather evidence)

### DON'T
- Break warranty tracking on orders
- Remove existing warranty display
- Calculate expiry from purchase date (use installation date)
- Allow claim submission without required evidence
- Delete expired warranties (keep for historical reference)

---

## Warranty-Specific Schema Considerations

### Warranty Fields
- **order_line_item_id**: Link to specific product in order
- **start_date**: Installation date (when warranty begins)
- **end_date**: Calculated from start_date + warranty_period
- **status**: active/expiring_soon/expired/claim_filed
- **alert_sent**: JSON tracking which alerts sent (30/60/90 day)
- **soh_history**: Array of State of Health readings with timestamps

### Claim Fields
- **claim_type**: Enum from claim types above
- **serial_number**: Product identifier
- **evidence_files**: Array of file uploads (photos, logs)
- **soh_readings**: Current and historical readings
- **installer_report**: Text field for professional assessment
- **review_status**: pending/approved/denied/more_info_needed
- **resolution_notes**: Internal notes on claim outcome

### Alert Tracking
- **last_alert_date**: When last expiration alert sent
- **alert_history**: Array of alerts with dates and types
- **alert_preferences**: Customer opt-in/out preferences

---

## Expiration Alert Logic

```
For each warranty:
  days_remaining = (end_date - today)

  If days_remaining == 90 AND alert_sent.90_day == false:
    → Send alert to sales_rep
    → Set alert_sent.90_day = true

  If days_remaining == 60 AND alert_sent.60_day == false:
    → Send alert to customer + sales_rep
    → Set alert_sent.60_day = true

  If days_remaining == 30 AND alert_sent.30_day == false:
    → Send alert to customer + sales_rep
    → Set alert_sent.30_day = true

  If days_remaining == 0:
    → Set status = 'expired'
    → Send expiration notice
```

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_WARRANTY_COMPLETE</promise>
```

---

*Domain PRD - Warranty tracking and claims for battery system products*
