# Pipeline Domain Wireframes Index

**Domain:** Sales Pipeline (DOM-PIPELINE)
**Last Updated:** 2026-01-10
**PRD Reference:** `/memory-bank/prd/domains/pipeline.prd.json`

---

## Overview

This directory contains detailed wireframes for all UI components in the Pipeline (Sales) domain. Each wireframe includes:
- Mobile, Tablet, and Desktop responsive layouts
- All interaction states (loading, error, empty, success)
- Accessibility specifications (ARIA, keyboard navigation, screen reader)
- Performance requirements

---

## Wireframe Files

| File | PRD Stories | Description |
|------|-------------|-------------|
| [pipeline-kanban-board.wireframe.md](./pipeline-kanban-board.wireframe.md) | DOM-PIPE-007a, DOM-PIPE-007b | Main pipeline Kanban board with drag-drop, weighted totals, stale highlighting, and filters |
| [pipeline-forecasting-fields.wireframe.md](./pipeline-forecasting-fields.wireframe.md) | DOM-PIPE-001c | Probability slider, expected close date picker, weighted value display |
| [pipeline-quote-builder.wireframe.md](./pipeline-quote-builder.wireframe.md) | DOM-PIPE-002, DOM-PIPE-003c | Quote line items, PDF generation, version history and comparison |
| [pipeline-quote-validity.wireframe.md](./pipeline-quote-validity.wireframe.md) | DOM-PIPE-004b | Expiration badges, warning banners, extend validity dialog |
| [pipeline-win-loss-reasons.wireframe.md](./pipeline-win-loss-reasons.wireframe.md) | DOM-PIPE-005c | Mark won/lost dialogs, reasons settings manager |
| [pipeline-forecasting-report.wireframe.md](./pipeline-forecasting-report.wireframe.md) | DOM-PIPE-006 | Dedicated forecast report with charts and drill-down |
| [pipeline-quick-quote.wireframe.md](./pipeline-quick-quote.wireframe.md) | DOM-PIPE-008 | Quick quote creation from customer context |

---

## Story to Wireframe Mapping

| Story ID | Story Name | Wireframe(s) |
|----------|------------|--------------|
| DOM-PIPE-001c | Forecasting Fields: UI Integration | forecasting-fields |
| DOM-PIPE-002 | Quote PDF Integration | quote-builder |
| DOM-PIPE-003c | Quote Versioning: UI | quote-builder |
| DOM-PIPE-004b | Quote Validity Enforcement: UI | quote-validity |
| DOM-PIPE-005c | Win/Loss Reasons: UI | win-loss-reasons |
| DOM-PIPE-006 | Pipeline Forecasting Report | forecasting-report |
| DOM-PIPE-007a | Enhanced Kanban: Weighted Totals | kanban-board |
| DOM-PIPE-007b | Enhanced Kanban: Filters & Quick Edit | kanban-board |
| DOM-PIPE-008 | Quick Quote Creation | quick-quote |

---

## Signature Moments

The Pipeline domain includes these distinctive interaction moments:

### 1. Card Flip on Stage Change
- **Location:** Kanban Board
- **Trigger:** Drag-drop card to new stage
- **Animation:** 180-degree Y-axis flip with stage color transition
- **Duration:** 500ms
- **File:** `pipeline-kanban-board.wireframe.md`

### 2. Win Celebration
- **Location:** Mark as Won Dialog
- **Trigger:** Confirm win submission
- **Animation:** Confetti burst + trophy scale animation
- **Duration:** 2000ms
- **File:** `pipeline-win-loss-reasons.wireframe.md`

### 3. Weighted Value Update
- **Location:** Column headers, metrics bar
- **Trigger:** Any value/probability change
- **Animation:** Number counter animation
- **Duration:** 300ms
- **File:** `pipeline-kanban-board.wireframe.md`

---

## Responsive Breakpoints

| Breakpoint | Width | Key Adaptations |
|------------|-------|-----------------|
| Mobile | < 768px | List view instead of Kanban, stepped flows, bottom sheets |
| Tablet | 768px - 1279px | Horizontal scroll Kanban, collapsible panels |
| Desktop | >= 1280px | Full Kanban, side-by-side layouts, inline editing |

---

## Component Patterns Used

### From Shared UI Library
- **FormHeader/Section/Footer** - Quote builder, dialogs
- **DataTable** - Forecast report, version history
- **StatusBadge** - Validity badges, probability badges
- **Dialog** - All modals and confirmations
- **Combobox** - Product search
- **Slider** - Probability adjustment
- **DatePicker** - Expected close, validity dates

### Domain-Specific Components
- **OpportunityCard** - Kanban card with all states
- **PipelineColumn** - Kanban column with weighted totals
- **QuoteLineItem** - Quote builder row
- **ValidityBadge** - Quote expiration indicator
- **ForecastChart** - Pipeline forecast visualization

---

## Accessibility Checklist

All wireframes include:

- [ ] ARIA roles and labels for all interactive elements
- [ ] Keyboard navigation paths documented
- [ ] Screen reader announcements for state changes
- [ ] Focus management for dialogs and modals
- [ ] Color-independent status indicators (icons + color)
- [ ] Touch targets >= 44px on mobile
- [ ] Live regions for dynamic updates

---

## Performance Targets

| Component | Load Target | Response Target |
|-----------|-------------|-----------------|
| Kanban Board | < 2s (500 opps) | Drag: < 100ms, Drop: < 500ms |
| Quote Builder | < 1s | Add item: < 200ms |
| Forecasting Report | < 2s | View change: < 500ms |
| Quick Quote | < 500ms | Search: < 300ms |

---

## Related Documentation

- **PRD:** `/memory-bank/prd/domains/pipeline.prd.json`
- **Audit:** `/memory-bank/prd/_audits/pipeline-audit.json`
- **UI Reference:** `.square-ui-reference/templates/task-management/`
- **Patterns:** `/memory-bank/prd/_meta/reference-mapping.md`

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-10 | UI Skill | Initial wireframes for all UI stories |

---

**Next Steps:**
1. Review wireframes with design team
2. Prototype signature moments in Framer/Figma
3. Component implementation following wireframe specs
4. Accessibility audit on implemented components
