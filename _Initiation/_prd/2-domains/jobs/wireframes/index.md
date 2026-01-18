# Jobs Domain Wireframes Index

**Domain:** Jobs/Projects (DOM-JOBS)
**Created:** 2026-01-10
**Aesthetic:** Rugged Utilitarian - designed for harsh field conditions

---

## Design Philosophy

The Jobs domain is **MOBILE-FIRST** for field technicians. All wireframes prioritize:

- **Touch-friendly targets:** Minimum 44px, prefer 48px for primary actions
- **One-handed operation:** Primary actions reachable by thumb
- **Outdoor visibility:** High contrast, no subtle grays, bold typography
- **Offline-capable indicators:** Clear sync status on all actions
- **Glove-friendly:** Extra padding, forgiving hit areas

---

## Wireframe Files

| Story ID | Name | Primary Device | File |
|----------|------|----------------|------|
| DOM-JOBS-001c | Task Management UI | Mobile | [jobs-task-management.wireframe.md](./jobs-task-management.wireframe.md) |
| DOM-JOBS-002c | BOM Tracking UI | Mobile | [jobs-bom-tracking.wireframe.md](./jobs-bom-tracking.wireframe.md) |
| DOM-JOBS-003c | Time Tracking UI | Mobile | [jobs-time-tracking.wireframe.md](./jobs-time-tracking.wireframe.md) |
| DOM-JOBS-004c | Checklist/Punchlist UI | Mobile | [jobs-checklist.wireframe.md](./jobs-checklist.wireframe.md) |
| DOM-JOBS-005a/b | Scheduling Calendar | Desktop/Tablet | [jobs-scheduling-calendar.wireframe.md](./jobs-scheduling-calendar.wireframe.md) |
| DOM-JOBS-007c | Job Templates UI | Desktop | [jobs-templates.wireframe.md](./jobs-templates.wireframe.md) |
| DOM-JOBS-008b | Costing Report UI | Desktop | [jobs-costing-report.wireframe.md](./jobs-costing-report.wireframe.md) |

---

## Key Components Summary

### Mobile-First Components (Field Use)

| Component | Purpose | Touch Target |
|-----------|---------|--------------|
| TaskCard | Task list item with swipe actions | 48px row height |
| MaterialCard | BOM item with quantity controls | 48px +/- buttons |
| ActiveTimer | Start/stop timer with FAB | 72px button |
| ChecklistItem | Swipe to complete with photo | 48px checkbox |
| FloatingTimer | Persistent timer when scrolling | 56px FAB |

### Desktop-First Components (Office Use)

| Component | Purpose |
|-----------|---------|
| JobCalendar | Drag-drop scheduling calendar |
| TemplateForm | Multi-step template creation |
| JobCostingTable | Profitability analysis table |
| UnscheduledJobsSidebar | Drag source for scheduling |

---

## Breakpoint Summary

All wireframes follow these breakpoints:

| Device | Width | Primary Use |
|--------|-------|-------------|
| Mobile | 375px | Field technicians |
| Tablet | 768px | Office scheduling, field supervisors |
| Desktop | 1280px+ | Admin, managers, reports |

---

## Shared UI Patterns

### Offline Indicators
```
[*] = Synced (green)
[~] = Syncing (blue, animated)
[ ] = Offline (gray, "Offline" label)
[!] = Sync error (red)
```

### Status Color Coding
```
Green  = Completed, Profitable, Synced
Blue   = In Progress, Active
Orange = At Risk, Blocked, Warning
Red    = Loss, Error, Overdue
Gray   = Pending, Not Started
```

### Swipe Actions (Mobile)
```
<- Swipe Left:  [EDIT] [COMPLETE/DELETE]
-> Swipe Right: [BLOCK/FLAG] (context-dependent)
```

---

## Component Dependencies

```
Job Detail Page ($jobId.tsx)
+-- TabPanel
    +-- Overview Tab (existing)
    +-- Tasks Tab (DOM-JOBS-001c)
    |   +-- TaskProgress
    |   +-- TaskList (SortableList)
    |       +-- TaskCard (swipeable)
    |   +-- TaskDialog (add/edit)
    |
    +-- BOM Tab (DOM-JOBS-002c)
    |   +-- MaterialsSummary
    |   +-- MaterialsList
    |       +-- MaterialCard
    |       +-- QuantityControl
    |   +-- AddMaterialDialog
    |   +-- BarcodeScanner
    |
    +-- Time Tab (DOM-JOBS-003c)
    |   +-- ActiveTimer
    |   +-- TimeSummary
    |   +-- TimeEntriesList
    |       +-- TimeEntryCard
    |   +-- TimeEntryDialog
    |   +-- FloatingTimer (global)
    |
    +-- Checklist Tab (DOM-JOBS-004c)
        +-- ChecklistProgress
        +-- ChecklistSections
            +-- ChecklistItem
            +-- PhotoAttachment
        +-- SignaturePad
        +-- ApplyTemplateDialog
```

---

## Files to Create (Summary)

### Components
- src/components/domain/jobs/job-tasks-list.tsx
- src/components/domain/jobs/task-card.tsx
- src/components/domain/jobs/task-dialog.tsx
- src/components/domain/jobs/job-materials-tab.tsx
- src/components/domain/jobs/material-card.tsx
- src/components/domain/jobs/quantity-control.tsx
- src/components/domain/jobs/barcode-scanner.tsx
- src/components/domain/jobs/job-time-tab.tsx
- src/components/domain/jobs/active-timer.tsx
- src/components/domain/jobs/floating-timer.tsx
- src/components/domain/jobs/time-entry-dialog.tsx
- src/components/domain/jobs/job-checklist-tab.tsx
- src/components/domain/jobs/checklist-item.tsx
- src/components/domain/jobs/signature-pad.tsx
- src/components/domain/jobs/job-calendar.tsx
- src/components/domain/jobs/calendar-job-card.tsx
- src/components/domain/jobs/unscheduled-jobs-sidebar.tsx
- src/components/domain/jobs/job-template-form.tsx
- src/components/domain/jobs/job-costing-table.tsx

### Routes
- src/routes/_authed/jobs/calendar.tsx
- src/routes/_authed/settings/job-templates.tsx
- src/routes/_authed/settings/checklist-templates.tsx
- src/routes/_authed/reports/job-costing.tsx

### Modifications
- src/routes/installer/jobs/$jobId.tsx (add all new tabs)
- src/components/domain/orders/assign-job-dialog.tsx (add template selector)
- src/server/functions/jobs.ts (add rescheduleJob)

---

## Accessibility Checklist

All wireframes include:

- [ ] Minimum 44px touch targets (48px preferred)
- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation support
- [ ] Screen reader announcements for status changes
- [ ] Focus management after dialog/action completion
- [ ] Color-independent status indicators (icons + text)
- [ ] High contrast for outdoor visibility

---

## Next Steps

1. Review wireframes with stakeholders
2. Create component stubs with TypeScript interfaces
3. Implement schema changes (DOM-JOBS-001a, 002a, 003a, 004a)
4. Implement server functions (DOM-JOBS-001b, 002b, 003b, 004b)
5. Build UI components following wireframes
6. Test on actual mobile devices in field conditions
