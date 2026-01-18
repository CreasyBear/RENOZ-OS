# Ralph Loop: Jobs/Projects Domain

> **Phase**: 0 - DOMAIN
> **PRD**: memory-bank/prd/domains/jobs.prd.json
> **Track**: C (can run parallel with other Phase 0 domains)

---

## Objective

YOU MUST complete the stories in `memory-bank/prd/domains/jobs.prd.json` sequentially.

This domain manages **field installations** for the Australian B2B battery/window installation business.

**Completion Promise**: `<promise>DOM_JOBS_COMPLETE</promise>`

---

## Business Context (Renoz)

| Aspect | Detail |
|--------|--------|
| **Business** | Australian B2B battery and window installation company |
| **Job Types** | Battery system installation, window tinting, solar panel installation, maintenance |
| **Field Workers** | Installers (can be staff or subcontractors via `userType: 'installer'`) |
| **Tracking** | Serial numbers for batteries, before/during/after photos, customer sign-off |
| **Schedule** | Jobs linked to orders, scheduled by dispatchers |
| **Mobile** | PWA for field workers (offline-capable) |

### Job Scenarios

1. **Dispatcher** schedules battery installation job from confirmed order
2. **Installer** starts job, takes "before" photos of site
3. **Installer** records which serial numbers installed (from inventory)
4. **Installer** tracks time spent on job (for billing)
5. **Installer** completes checklist, takes "after" photos
6. **Customer** signs off on completed work (signature capture)
7. **Office** reviews job costing vs quoted amount

### Australian Context

- GST-inclusive job costing
- Date format: DD/MM/YYYY
- Time format: 9:00 AM (12-hour with AM/PM)
- Timezone: AEST/AEDT (auto-adjusts)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Check existing job routes
ls renoz-v2/src/routes/installer/jobs/
ls renoz-v2/src/routes/_authed/jobs/
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: `memory-bank/prd/_progress/dom-jobs.progress.txt`
2. **PRD File**: `memory-bank/prd/domains/jobs.prd.json`
3. **Conventions**: `memory-bank/_meta/conventions.md`
4. **Glossary**: `memory-bank/_meta/glossary.md`
5. **Assumptions**: `memory-bank/_meta/assumptions.md`

### Reference Patterns

| Pattern | Reference File |
|---------|---------------|
| Job assignment schema | `renoz-v2/lib/schema/job-assignments.ts` |
| Job photos schema | `renoz-v2/lib/schema/job-assignments.ts` (jobPhotos) |
| Installer job view | `renoz-v2/src/routes/installer/jobs/$jobId.tsx` |
| Server functions | `renoz-v2/src/server/functions/jobs.ts` |

---

## File Ownership

YOU MAY modify these paths:

```
renoz-v2/lib/schema/job-tasks.ts (create)
renoz-v2/lib/schema/job-materials.ts (create)
renoz-v2/lib/schema/job-time-entries.ts (create)
renoz-v2/lib/schema/checklists.ts (create)
renoz-v2/lib/schema/job-templates.ts (create)
renoz-v2/src/server/functions/jobs.ts (modify)
renoz-v2/src/server/functions/job-*.ts (create)
renoz-v2/src/routes/_authed/jobs/**
renoz-v2/src/routes/installer/jobs/**
renoz-v2/src/components/domain/jobs/**
memory-bank/prd/_progress/dom-jobs.progress.txt
```

YOU MUST NOT modify:

- Order schema (job linked via FK)
- Inventory allocation logic
- Customer routes

---

## Execution Process

### Each Iteration

```
1. READ progress file → Find current story
2. READ PRD → Get story acceptance criteria
3. CHECK story type → schema/server-function/ui-component
4. IMPLEMENT → Follow acceptance criteria exactly
5. VERIFY → npm run typecheck
6. UPDATE → Mark progress
7. PROMISE → Output completion if passed
8. LOOP → Continue or complete
```

### Story Completion Checklist

Before outputting `<promise>DOM_JOBS_NNN_COMPLETE</promise>`:

- [ ] ALL acceptance criteria met
- [ ] `npm run typecheck` passes
- [ ] ui_spec accessibility requirements met (if UI story)
- [ ] Mobile-friendly (44px tap targets, touch gestures)
- [ ] Progress file updated with [x] marker

---

## Story Type Limits

| Type | Max Iterations | Max Files |
|------|----------------|-----------|
| schema | 2 | 3 |
| server-function | 3 | 3 |
| ui-component | 4 | 5 |

---

## Dependencies

### This PRD Depends On

- Orders domain (jobs link to orders via `orderId`)
- Inventory domain (materials track products)
- Users domain (installers are users with `userType: 'installer'`)

### Stories That Depend On Others

```
DOM-JOBS-001b → DOM-JOBS-001a (tasks schema)
DOM-JOBS-001c → DOM-JOBS-001b (tasks server)
DOM-JOBS-002b → DOM-JOBS-002a (materials schema)
DOM-JOBS-002c → DOM-JOBS-002b (materials server)
DOM-JOBS-003b → DOM-JOBS-003a (time schema)
DOM-JOBS-003c → DOM-JOBS-003b (time server)
DOM-JOBS-004b → DOM-JOBS-004a (checklists schema)
DOM-JOBS-004c → DOM-JOBS-004b (checklists server)
DOM-JOBS-005b → DOM-JOBS-005a (calendar basic)
DOM-JOBS-007a → DOM-JOBS-001c, DOM-JOBS-002c, DOM-JOBS-004c (templates need tasks/BOM/checklists)
DOM-JOBS-007b → DOM-JOBS-007a
DOM-JOBS-007c → DOM-JOBS-007b
DOM-JOBS-008a → DOM-JOBS-002c, DOM-JOBS-003c (costing needs materials + time)
DOM-JOBS-008b → DOM-JOBS-008a
```

---

## Signals

### Success Signals

```xml
<!-- Single story complete -->
<promise>DOM_JOBS_001A_COMPLETE</promise>

<!-- All stories in PRD complete -->
<promise>DOM_JOBS_COMPLETE</promise>
```

### Failure Signals

```xml
<promise>STUCK_NEEDS_HELP</promise>
<promise>FAILED_NEEDS_INTERVENTION</promise>
```

---

## UI Implementation Guidelines

### Job Status Badges

```typescript
// Job status colors - from schema
const JOB_STATUS_COLORS = {
  scheduled: 'bg-blue-500 text-white',
  in_progress: 'bg-amber-500 text-black',
  completed: 'bg-green-500 text-white',
  cancelled: 'bg-gray-400 text-black line-through',
} as const;
```

### Photo Types

```typescript
// Photo type colors for indicators
const PHOTO_TYPE_COLORS = {
  before: 'bg-purple-100 text-purple-800',
  during: 'bg-amber-100 text-amber-800',
  after: 'bg-green-100 text-green-800',
  issue: 'bg-red-100 text-red-800', // Requires attention
} as const;
```

### Mobile-First Requirements (Field Workers)

- [ ] Minimum 44px tap targets
- [ ] Swipe gestures for common actions
- [ ] Offline-capable forms (PWA)
- [ ] Large timer display (active timer always visible)
- [ ] Camera integration for photos
- [ ] GPS location capture
- [ ] Signature canvas for customer sign-off

### Accessibility Requirements (All UI Stories)

- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus management on dialog open/close
- [ ] Screen reader announcements for status changes
- [ ] Drag-drop has keyboard alternative

---

## Specific Implementation Notes

### DOM-JOBS-001c (Task Management UI)

- Add Tasks tab to existing job detail page (`installer/jobs/$jobId.tsx`)
- SortableList pattern for drag-drop reordering
- Quick completion: tap task to toggle (touch-friendly)
- Progress percentage shown in job header

### DOM-JOBS-002c (BOM Tracking UI)

- Add BOM tab to existing job detail page
- Product search uses ComboboxSearch (same as orders)
- Track required vs used quantities
- Reserve stock action links to inventory allocation

### DOM-JOBS-003c (Time Tracking UI)

- Sticky timer header on mobile (always visible)
- Start/Stop prominent button (48px minimum)
- Live elapsed time display
- Manual entry for missed times
- Billable toggle per entry

### DOM-JOBS-004c (Checklist UI)

- Apply template from settings
- Photo attachment per checklist item
- Swipe to complete on mobile
- Progress bar shows completion %

### DOM-JOBS-005 (Calendar)

- Calendar view for dispatchers (not installers)
- Drag-drop to reschedule
- Color code by status
- Filter by installer
- Unscheduled jobs sidebar

---

## Commands

### Start This Loop

```bash
/ralph-loop "Execute memory-bank/prd/domains/jobs.prd.json" \
  --max-iterations 80 \
  --completion-promise "DOM_JOBS_COMPLETE"
```

### Check Progress

```bash
cat memory-bank/prd/_progress/dom-jobs.progress.txt
```

---

*Phase 0 Domain PRD - Jobs/Field Operations*
