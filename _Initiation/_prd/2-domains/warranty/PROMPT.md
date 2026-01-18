# Warranty Domain: Implementation Guide

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective
Implement warranty registration, policies, claims, extensions, and analytics. Manages warranty lifecycle from installation through claims resolution and transfers.

## Premortem Remediation: Unified SLA Engine

**Source:** `_meta/remediation-sla-engine.md`

This domain MUST use the unified SLA calculation engine instead of hardcoding SLA values.

### Key Changes from Remediation

1. **NO hardcoded SLA values** - The PRD mentions "24h response, 5 day resolution" but these must be stored in `sla_configurations` table
2. **warranty_policies.slaConfigurationId** - Links warranty policies to unified SLA config instead of inline slaResponseHours/slaResolutionDays
3. **warranty_claims.sla_tracking_id** - Each claim has SLA tracking via unified engine

### Required Tables (from unified engine)

| Table | Purpose |
|-------|---------|
| `sla_configurations` | Store warranty SLA config (domain='warranty') |
| `sla_tracking` | Per-claim SLA state tracking |
| `sla_events` | Audit log for claim SLA events |
| `business_hours_config` | For "5 business days" calculation |
| `organization_holidays` | Exclude holidays from business days |

### Default Warranty SLA Configuration

```typescript
// Create this sla_configuration entry during warranty setup
{
  domain: 'warranty',
  name: 'Default Warranty Claim SLA',
  responseTargetValue: 24,
  responseTargetUnit: 'hours',
  resolutionTargetValue: 5,
  resolutionTargetUnit: 'business_days',
  atRiskThresholdPercent: 25,
  isDefault: true,
}
```

### Implementation Pattern

```typescript
// When creating a warranty claim
import { SlaStateManager } from '@/lib/sla/state-manager';

const tracking = await SlaStateManager.startTracking({
  organizationId,
  domain: 'warranty',
  entityType: 'warranty_claim',
  entityId: claim.id,
  configId: warrantySlaConfigId,
});

// Store tracking ID on claim
await updateWarrantyClaim(claim.id, { slaTrackingId: tracking.id });
```

### DO NOT Implement

- Hardcoded "24h response, 5 day resolution" values in warranty code
- Custom business days calculation (use SLA Calculator)
- Domain-specific SLA breach detection (use unified Breach Detector)

## Current State
Read `progress.txt` to determine the current story.
If progress.txt doesn't exist, start with DOM-WAR-001a.

## Context

### PRD Files
- `opc/_Initiation/_prd/2-domains/warranty/warranty.prd.json` - Complete warranty domain specification
- Wireframes: `./wireframes/index.md`

### Reference
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **Charts**: Recharts (for analytics)
- **PDF**: @react-pdf/renderer (for certificates)

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD story** section for acceptance criteria
3. **Check wireframe reference** (if UI story)
4. **Implement the acceptance criteria** completely
5. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
6. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>DOM_WARRANTY_[STORY_ID]_COMPLETE</promise>`
   - Move to next story
7. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

Execute stories in the following priority order from warranty.prd.json:

### Phase 1: Warranty Policies (Priority 1)
1. **DOM-WAR-001a**: Warranty Policies - Schema
   - Create warranty_policies table
   - Add FK to products and categories
   - Wireframe: None (schema-only)

2. **DOM-WAR-001b**: Warranty Policies - Server Functions
   - CRUD operations for policies
   - Policy resolution (product > category > org default)
   - SLA tracking (24h response, 5 day resolution)
   - Depends on: DOM-WAR-001a

3. **DOM-WAR-001c**: Warranty Policies - UI
   - Settings page for policy management
   - Wireframe: [DOM-WAR-001c.wireframe.md](./wireframes/WAR-001c.wireframe.md)
   - Depends on: DOM-WAR-001b

### Phase 2: Auto-Registration & Notifications (Priority 2)
4. **DOM-WAR-002**: Complete Auto-Registration Notifications
   - Wire up warranty confirmation emails
   - Create notification records
   - Include SLA terms in email
   - Depends on: DOM-WAR-001c

### Phase 3: Expiry Alerts (Priority 3)
5. **DOM-WAR-003a**: Warranty Expiry Alerts - Notification Creation
   - Create notification records for expiring warranties
   - Send 30/60/90 day alerts
   - Depends on: None

6. **DOM-WAR-003b**: Warranty Expiry Alerts - Dashboard Widget
   - Add expiring warranties widget to dashboard
   - Compact list showing next 30 days
   - Wireframe: [DOM-WAR-003b.wireframe.md](./wireframes/WAR-003b.wireframe.md)
   - Depends on: DOM-WAR-003a

7. **DOM-WAR-003c**: Warranty Expiry Alerts - Report Page
   - Dedicated report for expiring warranties
   - Filters: expiry range, customer, product
   - CSV export
   - Wireframe: [DOM-WAR-003c.wireframe.md](./wireframes/WAR-003c.wireframe.md)
   - Depends on: None

8. **DOM-WAR-003d**: Warranty Expiry Alerts - Opt-Out Setting
   - Add opt-out column to warranties and customers
   - Respect opt-out in notification jobs
   - Depends on: DOM-WAR-003a

### Phase 4: Warranty Certificates (Priority 4)
9. **DOM-WAR-004a**: Warranty Certificate - PDF Template
   - Create certificate PDF template
   - Include Renoz Energy branding
   - QR code linking to warranty lookup
   - Depends on: DOM-WAR-001c

10. **DOM-WAR-004b**: Warranty Certificate - Server Functions
    - generateWarrantyCertificate function
    - Store PDF in Supabase storage
    - Return public URL
    - Depends on: DOM-WAR-004a

11. **DOM-WAR-004c**: Warranty Certificate - UI
    - Generate/download/email certificate actions
    - Progress indicator during generation
    - Preview and regeneration
    - Wireframe: [DOM-WAR-004c.wireframe.md](./wireframes/WAR-004c.wireframe.md)
    - Depends on: DOM-WAR-004b

### Phase 5: CSV Bulk Registration (Priority 5)
12. **DOM-WAR-005a**: CSV Bulk Warranty Registration - Server Functions
    - Parse and validate CSV files
    - Detect duplicates and serial number conflicts
    - previewBulkWarrantyImport and bulkRegisterWarrantiesFromCsv
    - Depends on: None

13. **DOM-WAR-005b**: CSV Bulk Warranty Registration - UI
    - CSV upload dialog with drag-drop
    - Preview table with validation status
    - Customer assignment
    - Progress indicator and error download
    - Wireframe: [DOM-WAR-005b.wireframe.md](./wireframes/WAR-005b.wireframe.md)
    - Depends on: DOM-WAR-005a

### Phase 6: Warranty Claims (Priority 6)
14. **DOM-WAR-006a**: Warranty Claim Workflow - Schema
    - Create warranty_claims table
    - Status enum: submitted, under_review, approved, denied, resolved
    - Claim types: cell_degradation, bms_fault, inverter_failure, installation_defect
    - Depends on: None

15. **DOM-WAR-006b**: Warranty Claim Workflow - Server Functions
    - createWarrantyClaim, updateClaimStatus, approveClaim, denyClaim, resolveClaim
    - SLA tracking for response and resolution
    - High-value claim approval (configurable threshold)
    - Capture cycle count for battery claims
    - Depends on: DOM-WAR-006a

16. **DOM-WAR-006c**: Warranty Claim Workflow - UI
    - Claim form dialog with claim type and resolution preference
    - Claim history tab/table
    - Approval dialog for high-value claims
    - SLA countdown timer
    - Wireframe: [DOM-WAR-006c.wireframe.md](./wireframes/WAR-006c.wireframe.md)
    - Depends on: DOM-WAR-006b

### Phase 7: Warranty Extensions (Priority 7)
17. **DOM-WAR-007a**: Warranty Extensions - Schema
    - Create warranty_extensions table
    - Track months/cycles added, approval, reason
    - Depends on: DOM-WAR-001c

18. **DOM-WAR-007b**: Warranty Extensions - Server Functions
    - extendWarranty function
    - Extension approval requirement
    - Support cycle limit extensions for batteries
    - Tie to claim resolution
    - Depends on: DOM-WAR-007a

19. **DOM-WAR-007c**: Warranty Extensions - UI
    - Extend warranty action button and dialog
    - Extension history display
    - Extensions report page
    - Wireframe: [DOM-WAR-007c.wireframe.md](./wireframes/WAR-007c.wireframe.md)
    - Depends on: DOM-WAR-007b

### Phase 8: Analytics (Priority 8)
20. **DOM-WAR-008**: Warranty Analytics Enhancement
    - Claims by battery model chart
    - Claims by type breakdown
    - SLA compliance metrics
    - Trend analysis over time
    - Average cycle count at claim time
    - Warranty extension vs resolution type breakdown
    - Wireframe: [DOM-WAR-008.wireframe.md](./wireframes/WAR-008.wireframe.md)
    - Depends on: DOM-WAR-006c

## Wireframe References

All UI wireframes located in `./wireframes/`:

| Story | Wireframe File |
|-------|---|
| DOM-WAR-001c | DOM-WAR-001c.wireframe.md |
| DOM-WAR-003b | DOM-WAR-003b.wireframe.md |
| DOM-WAR-003c | DOM-WAR-003c.wireframe.md |
| DOM-WAR-004c | DOM-WAR-004c.wireframe.md |
| DOM-WAR-005b | DOM-WAR-005b.wireframe.md |
| DOM-WAR-006c | DOM-WAR-006c.wireframe.md |
| DOM-WAR-007c | DOM-WAR-007c.wireframe.md |
| DOM-WAR-008 | DOM-WAR-008.wireframe.md |

## Completion

When ALL warranty stories pass:
```xml
<promise>DOM_WARRANTY_COMPLETE</promise>
```

## Constraints

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Create Drizzle migrations for schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Run `bun run typecheck` after each story
- Reference wireframes for UI stories
- Implement all acceptance criteria

### DO NOT
- Modify files outside warranty domain scope
- Skip acceptance criteria
- Use client-side validation only (always server-side validation too)
- Create components that duplicate shadcn/ui primitives
- Hardcode configuration values
- Skip SLA tracking features
- Omit accessibility features (ARIA, keyboard navigation)

## Key Features

### Warranty Policies
- Battery (10-year/10k cycles), Inverter (5-year), Installation (2-year)
- SLA terms: 24h response, 5 day resolution
- Configurable by product/category with org default fallback

### Claims Workflow
- Formal claim types: cell degradation, BMS faults, inverter failures, installation defects
- Resolution types: repair, replace, refund, warranty extension
- SLA compliance tracking
- High-value claim approval workflow

### Bulk Operations
- CSV bulk registration with validation
- Preview before import
- Error row export for correction

### Notifications
- Auto-registration confirmation
- Expiry alerts (30/60/90 days)
- Opt-out support per warranty or customer

### Analytics
- Claims by product category and type
- SLA compliance metrics
- Trend analysis
- Revenue vs cost tracking

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/
│   │   │   ├── settings/
│   │   │   │   └── warranty-policies.tsx          # DOM-WAR-001c
│   │   │   └── reports/
│   │   │       ├── expiring-warranties.tsx        # DOM-WAR-003c
│   │   │       ├── warranty-extensions.tsx        # DOM-WAR-007c
│   │   │       └── warranties.tsx                 # DOM-WAR-008
│   │   └── support/
│   │       └── warranties/
│   │           ├── index.tsx                      # DOM-WAR-005b trigger
│   │           └── $warrantyId.tsx               # DOM-WAR-004c, 006c, 007c
│   ├── components/
│   │   ├── domain/
│   │   │   ├── settings/
│   │   │   │   └── warranty-policy-manager.tsx    # DOM-WAR-001c
│   │   │   ├── dashboard/
│   │   │   │   └── widgets/
│   │   │   │       └── expiring-warranties-widget.tsx # DOM-WAR-003b
│   │   │   └── support/
│   │   │       ├── warranty-certificate-preview.tsx  # DOM-WAR-004c
│   │   │       ├── warranty-claim-form.tsx           # DOM-WAR-006c
│   │   │       ├── claim-approval-dialog.tsx         # DOM-WAR-006c
│   │   │       ├── extend-warranty-dialog.tsx        # DOM-WAR-007c
│   │   │       ├── bulk-warranty-csv-dialog.tsx      # DOM-WAR-005b
│   │   │       └── warranty-analytics-charts.tsx    # DOM-WAR-008
│   ├── server/
│   │   └── functions/
│   │       ├── warranty-policies.ts       # DOM-WAR-001b
│   │       ├── warranty-claims.ts         # DOM-WAR-006b
│   │       ├── warranty-extensions.ts     # DOM-WAR-007b
│   │       ├── warranty-certificates.ts   # DOM-WAR-004b
│   │       └── warranty-analytics.ts      # DOM-WAR-008
│   └── lib/
│       ├── schema/
│       │   ├── warranty-policies.ts       # DOM-WAR-001a
│       │   ├── warranty-claims.ts         # DOM-WAR-006a
│       │   └── warranty-extensions.ts     # DOM-WAR-007a
│       ├── schemas/
│       │   ├── warranty-policies.ts       # DOM-WAR-001b (validation)
│       │   ├── warranty-claims.ts         # DOM-WAR-006b (validation)
│       │   └── warranty-extensions.ts     # DOM-WAR-007b (validation)
│       └── pdf/
│           └── warranty-certificate.tsx   # DOM-WAR-004a
├── drizzle/
│   └── migrations/                        # Generated for schema changes
└── trigger/
    └── warranty-jobs.ts                   # DOM-WAR-002, 003a, 003d
```

## Progress Template

```markdown
# Warranty Domain Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] DOM-WAR-001a: Warranty Policies - Schema
- [ ] DOM-WAR-001b: Warranty Policies - Server Functions
- [ ] DOM-WAR-001c: Warranty Policies - UI
- [ ] DOM-WAR-002: Complete Auto-Registration Notifications
- [ ] DOM-WAR-003a: Warranty Expiry Alerts - Notification Creation
- [ ] DOM-WAR-003b: Warranty Expiry Alerts - Dashboard Widget
- [ ] DOM-WAR-003c: Warranty Expiry Alerts - Report Page
- [ ] DOM-WAR-003d: Warranty Expiry Alerts - Opt-Out Setting
- [ ] DOM-WAR-004a: Warranty Certificate - PDF Template
- [ ] DOM-WAR-004b: Warranty Certificate - Server Functions
- [ ] DOM-WAR-004c: Warranty Certificate - UI
- [ ] DOM-WAR-005a: CSV Bulk Warranty Registration - Server Functions
- [ ] DOM-WAR-005b: CSV Bulk Warranty Registration - UI
- [ ] DOM-WAR-006a: Warranty Claim Workflow - Schema
- [ ] DOM-WAR-006b: Warranty Claim Workflow - Server Functions
- [ ] DOM-WAR-006c: Warranty Claim Workflow - UI
- [ ] DOM-WAR-007a: Warranty Extensions - Schema
- [ ] DOM-WAR-007b: Warranty Extensions - Server Functions
- [ ] DOM-WAR-007c: Warranty Extensions - UI
- [ ] DOM-WAR-008: Warranty Analytics Enhancement

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

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference → Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts → Verify policy SQL syntax
  - Import errors → Check TanStack Start path aliases
  - Wireframe mismatches → Reference the specific wireframe.md file

## Success Criteria

From warranty.prd.json:
- Warranty policies define terms for Battery (10yr/10k cycles), Inverter (5yr), Installation (2yr)
- Auto-registration sends customer notifications with SLA terms (24h response, 5 day resolution)
- Expiry alerts enable renewal with dashboard widget showing cycle count for batteries
- Certificates professional with Renoz Energy branding and warranty type badges
- Claims tracked through formal workflow with claim types (cell degradation, BMS faults, inverter failures, installation defects)
- SLA compliance tracked and displayed (24h response, 5 business day resolution)
- Extensions formalized with approval for both time and cycle limits
- Analytics show claims by battery model, claim type, and SLA performance
- npm run typecheck passes
- No warranty functionality regressions

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Warranty Domain Implementation
**Completion Promise:** DOM_WARRANTY_COMPLETE
