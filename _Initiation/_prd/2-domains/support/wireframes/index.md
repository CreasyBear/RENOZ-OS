# Support Domain Wireframes Index

**Domain:** Support/Issues (DOM-SUPPORT)
**Domain Color:** Orange-500
**Last Updated:** 2026-01-10
**PRD Reference:** `/memory-bank/prd/domains/support.prd.json`

---

## Overview

This directory contains detailed wireframes for all UI components in the Support/Issues domain. Each wireframe includes:
- Mobile (375px), Tablet (768px), and Desktop (1280px+) responsive layouts
- All interaction states (loading, empty, error, success)
- Accessibility specifications (ARIA, keyboard navigation, screen reader)
- Animation choreography with timing
- Component props interfaces (TypeScript)

---

## Wireframe Files

| File | PRD Stories | Description |
|------|-------------|-------------|
| [support-sla-tracking.wireframe.md](./support-sla-tracking.wireframe.md) | DOM-SUP-001a, DOM-SUP-001b, DOM-SUP-001c | SLA breach warnings, status sections, pause/resume, dashboard widgets |
| [support-escalation.wireframe.md](./support-escalation.wireframe.md) | DOM-SUP-002a, DOM-SUP-002b | Manual escalation, history tracking, de-escalation, automatic escalation rules |
| [support-rma-workflow.wireframe.md](./support-rma-workflow.wireframe.md) | DOM-SUP-003a, DOM-SUP-003b, DOM-SUP-003c | RMA creation, status workflow, item inspection, processing |
| [support-issue-templates.wireframe.md](./support-issue-templates.wireframe.md) | DOM-SUP-004 | Template management, quick issue creation, usage suggestions |
| [support-csat-feedback.wireframe.md](./support-csat-feedback.wireframe.md) | DOM-SUP-005a, DOM-SUP-005b, DOM-SUP-005c | Rating display, public form, email requests, low rating follow-up |
| [support-dashboard.wireframe.md](./support-dashboard.wireframe.md) | DOM-SUP-006 | Team performance, issue metrics, SLA health, trend charts |
| [support-knowledge-base.wireframe.md](./support-knowledge-base.wireframe.md) | DOM-SUP-007a, DOM-SUP-007b, DOM-SUP-007c | Article CRUD, categories, search, helpfulness tracking |
| [support-issue-kanban.wireframe.md](./support-issue-kanban.wireframe.md) | DOM-SUP-008 | Kanban board, drag-drop, bulk actions, duplicate detection |

---

## Story to Wireframe Mapping

| Story ID | Story Name | Wireframe(s) |
|----------|------------|--------------|
| DOM-SUP-001a | SLA Schema and Basic Tracking | sla-tracking |
| DOM-SUP-001b | SLA Breach Detection and Warnings | sla-tracking |
| DOM-SUP-001c | SLA Dashboard and Pause Feature | sla-tracking, dashboard |
| DOM-SUP-002a | Escalation Schema and Manual Improvements | escalation |
| DOM-SUP-002b | Automatic Escalation Engine | escalation |
| DOM-SUP-003a | RMA Schema and Basic CRUD | rma-workflow |
| DOM-SUP-003b | RMA Workflow and Status Transitions | rma-workflow |
| DOM-SUP-003c | RMA UI and Issue Integration | rma-workflow |
| DOM-SUP-004 | Add Issue Templates | issue-templates |
| DOM-SUP-005a | CSAT Schema and Internal Entry | csat-feedback |
| DOM-SUP-005b | CSAT Email and Public Form | csat-feedback |
| DOM-SUP-005c | CSAT Dashboard and Follow-up | csat-feedback, dashboard |
| DOM-SUP-006 | Create Support Dashboard | dashboard |
| DOM-SUP-007a | Knowledge Base Schema and Basic CRUD | knowledge-base |
| DOM-SUP-007b | Knowledge Base Search and Categories | knowledge-base |
| DOM-SUP-007c | Knowledge Base Issue Integration | knowledge-base, issue-templates |
| DOM-SUP-008 | Enhance Issue Workflow | issue-kanban |

---

## Signature Moments

The Support domain includes these distinctive interaction moments:

### 1. SLA Breach Alert
- **Location:** Issue List, Issue Detail
- **Trigger:** SLA timer reaches critical threshold
- **Animation:** Badge color transition (green -> orange -> red) with pulse
- **Duration:** 300ms transition, continuous subtle pulse when breached
- **File:** `support-sla-tracking.wireframe.md`

### 2. Escalation Entry
- **Location:** Issue Detail, Activity Timeline
- **Trigger:** Issue escalated
- **Animation:** Banner slides down, timeline entry highlights
- **Duration:** 350ms
- **File:** `support-escalation.wireframe.md`

### 3. RMA Status Progression
- **Location:** RMA Detail
- **Trigger:** Status advancement
- **Animation:** Workflow line fills, next status circle activates
- **Duration:** 450ms
- **File:** `support-rma-workflow.wireframe.md`

### 4. Star Rating Selection
- **Location:** CSAT Form (Internal & Public)
- **Trigger:** User selects rating
- **Animation:** Stars fill left-to-right with scale pulse
- **Duration:** 150ms per star
- **File:** `support-csat-feedback.wireframe.md`

### 5. Dashboard Number Counter
- **Location:** Support Dashboard
- **Trigger:** Metrics load or update
- **Animation:** Numbers count up/down to value
- **Duration:** 500ms
- **File:** `support-dashboard.wireframe.md`

### 6. Kanban Card Drop
- **Location:** Issue Board
- **Trigger:** Card dropped in new column
- **Animation:** Card settles with status change flash
- **Duration:** 300ms drop + 200ms success flash
- **File:** `support-issue-kanban.wireframe.md`

---

## Responsive Breakpoints

| Breakpoint | Width | Key Adaptations |
|------------|-------|-----------------|
| Mobile | < 768px | Bottom sheets, single-column layouts, swipe actions, FAB |
| Tablet | 768px - 1279px | Horizontal scroll for Kanban, collapsible sidebars |
| Desktop | >= 1280px | Full layouts, side-by-side panels, inline editing |

---

## Domain Color Usage

The Support domain uses **Orange-500** as its primary accent color:

| Element | Color Token |
|---------|-------------|
| Domain accent | orange-500 |
| Escalated badges | orange-500 to orange-600 |
| SLA at-risk | orange-400 (warning) |
| SLA breached | red-500 |
| SLA on-track | green-500 |
| SLA paused | gray-400 |
| Priority High | orange-500 |
| Priority Urgent | red-500 |

---

## Component Patterns Used

### From Shared UI Library
- **Card** - Issue cards, RMA cards, template cards
- **Badge** - SLA status, escalation, priority
- **Dialog/Sheet** - Status changes, forms, confirmations
- **DataTable** - Issue lists, RMA lists, KB articles
- **Tabs** - Issue detail, KB categories
- **Progress** - SLA timers, workflow status
- **Form** - Issue creation, template management

### Domain-Specific Components
- **SLABadge** - Status indicator with time remaining
- **SLAStatusCard** - Detailed SLA section
- **EscalationBanner** - Escalated issue highlight
- **RMAWorkflow** - Visual status progression
- **StarRating** - CSAT input and display
- **KanbanColumn** - Issue board column
- **KanbanCard** - Draggable issue card
- **TemplateCard** - Issue template display
- **ArticleCard** - KB article display
- **HelpfulnessWidget** - Article feedback

---

## Accessibility Checklist

All wireframes include:

- [x] ARIA roles and labels for all interactive elements
- [x] Keyboard navigation paths documented
- [x] Screen reader announcements for state changes
- [x] Focus management for dialogs and modals
- [x] Color-independent status indicators (icons + color)
- [x] Touch targets >= 44px on mobile
- [x] Live regions for dynamic updates

---

## Performance Targets

| Component | Load Target | Response Target |
|-----------|-------------|-----------------|
| Issue List | < 1s | Filter: < 300ms |
| Issue Kanban | < 2s | Drag: < 100ms, Drop: < 500ms |
| Support Dashboard | < 2s | Widget refresh: < 500ms |
| SLA Calculations | < 500ms | Per-issue |
| RMA Detail | < 500ms | Status change: < 1s |
| KB Search | < 300ms | Results appear |
| CSAT Form (Public) | < 1s | Submit: < 2s |

---

## Related Documentation

- **PRD:** `/memory-bank/prd/domains/support.prd.json`
- **Schema:** `/lib/schema/issues.ts`
- **Server Functions:** `/src/server/functions/issues.ts`
- **Validation:** `/lib/schemas/issues.ts`

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-10 | UI Skill | Initial wireframes for all Support domain UI stories |

---

## Next Steps

1. **Review wireframes** with design and product team
2. **Prototype signature moments** (SLA alerts, Kanban interactions)
3. **Component implementation** following wireframe specifications
4. **Accessibility audit** on implemented components
5. **User testing** for key workflows (RMA, CSAT public form)

---

## Quick Links

### By Feature Area

**Issue Management**
- [Kanban Board](./support-issue-kanban.wireframe.md)
- [Issue Templates](./support-issue-templates.wireframe.md)

**SLA & Escalation**
- [SLA Tracking](./support-sla-tracking.wireframe.md)
- [Escalation Management](./support-escalation.wireframe.md)

**Returns**
- [RMA Workflow](./support-rma-workflow.wireframe.md)

**Satisfaction**
- [CSAT Feedback](./support-csat-feedback.wireframe.md)

**Knowledge & Reporting**
- [Knowledge Base](./support-knowledge-base.wireframe.md)
- [Support Dashboard](./support-dashboard.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
