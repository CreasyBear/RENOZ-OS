# Settings Domain Wireframes Index

**Domain:** Settings (DOM-SET)
**Last Updated:** 2026-01-10
**PRD Reference:** `/memory-bank/prd/domains/settings.prd.json`

---

## Overview

This directory contains detailed wireframes for all UI components in the Settings domain. The Settings domain provides organization-wide configuration, system defaults, integrations management, custom fields, audit logging, and data export capabilities.

Each wireframe includes:
- Mobile (375px), Tablet (768px), and Desktop (1280px+) responsive layouts
- All interaction states (loading, error, empty, success)
- Accessibility specifications (ARIA, keyboard navigation, screen reader)
- Animation choreography with timing specifications
- Component props interfaces (TypeScript)

---

## Wireframe Files

| File | PRD Stories | Description |
|------|-------------|-------------|
| [DOM-SET-001b.wireframe.md](./DOM-SET-001b.wireframe.md) | DOM-SET-001b | System Defaults Settings Page - payment terms, tax rate, currency, order status, quote validity |
| [DOM-SET-001c.wireframe.md](./DOM-SET-001c.wireframe.md) | DOM-SET-001c | System Defaults Form Integration - "Using default" indicators and reset patterns |
| [DOM-SET-002.wireframe.md](./DOM-SET-002.wireframe.md) | DOM-SET-002 | Audit Log Viewer - search, filters, CSV export, detail panel |
| [DOM-SET-003b.wireframe.md](./DOM-SET-003b.wireframe.md) | DOM-SET-003b | Export Page UI - entity selection, format choice, progress tracking, export history |
| [DOM-SET-005b.wireframe.md](./DOM-SET-005b.wireframe.md) | DOM-SET-005b | Business Hours Settings - 7-day schedule, timezone selector, holidays management |
| [DOM-SET-006b.wireframe.md](./DOM-SET-006b.wireframe.md) | DOM-SET-006b | Custom Fields Configuration - entity selector, field CRUD, drag-and-drop reordering |
| [DOM-SET-006c.wireframe.md](./DOM-SET-006c.wireframe.md) | DOM-SET-006c | Custom Fields Form Component - reusable form section for dynamic field rendering |
| [DOM-SET-006d.wireframe.md](./DOM-SET-006d.wireframe.md) | DOM-SET-006d | Custom Fields Customer Integration - collapsible section in customer forms |
| [DOM-SET-007.wireframe.md](./DOM-SET-007.wireframe.md) | DOM-SET-007 | Integrations Hub - Xero, Resend, Trigger.dev status cards with test connection |
| [DOM-SET-008.wireframe.md](./DOM-SET-008.wireframe.md) | DOM-SET-008 | Settings Search - Cmd/Ctrl+K shortcut, debounced search, scroll-to-highlight |

---

## Story to Wireframe Mapping

| Story ID | Story Name | Wireframe(s) |
|----------|------------|--------------|
| DOM-SET-001b | System Defaults Settings Page | DOM-SET-001b |
| DOM-SET-001c | Integrate System Defaults into Forms | DOM-SET-001c |
| DOM-SET-002 | Enhance Audit Log Viewer | DOM-SET-002 |
| DOM-SET-003b | Create Export Page UI | DOM-SET-003b |
| DOM-SET-005b | Business Hours Settings Page | DOM-SET-005b |
| DOM-SET-006b | Custom Fields Configuration UI | DOM-SET-006b |
| DOM-SET-006c | Custom Fields Form Component | DOM-SET-006c |
| DOM-SET-006d | Integrate Custom Fields into Customers | DOM-SET-006d |
| DOM-SET-007 | Create Unified Integrations Hub | DOM-SET-007 |
| DOM-SET-008 | Add Settings Search | DOM-SET-008 |

---

## Signature Moments

The Settings domain includes these distinctive interaction moments:

### 1. Global Search Reveal (Cmd/Ctrl+K)
- **Location:** Settings Search
- **Trigger:** Keyboard shortcut Cmd/Ctrl+K
- **Animation:** Modal fade-in with backdrop blur, input auto-focus
- **Duration:** 150ms fade, 200ms focus ring
- **File:** `DOM-SET-008.wireframe.md`

### 2. Search Result Scroll-to-Highlight
- **Location:** Settings Search navigation
- **Trigger:** Click search result
- **Animation:** Smooth scroll + 1s yellow highlight flash on target element
- **Duration:** 300ms scroll, 1000ms highlight fade
- **File:** `DOM-SET-008.wireframe.md`

### 3. Custom Field Drag-and-Drop Reorder
- **Location:** Custom Fields Configuration
- **Trigger:** Drag handle grab
- **Animation:** Lift with shadow, placeholder gap, drop with settle bounce
- **Duration:** 200ms lift, 150ms drop settle
- **File:** `DOM-SET-006b.wireframe.md`

### 4. Integration Test Connection
- **Location:** Integrations Hub
- **Trigger:** Click "Test Connection" button
- **Animation:** Button spinner, success checkmark scale-in or error shake
- **Duration:** Variable (network), 300ms result animation
- **File:** `DOM-SET-007.wireframe.md`

### 5. Export Progress Animation
- **Location:** Data Export Page
- **Trigger:** Start export
- **Animation:** Progress bar fill with percentage counter, completion checkmark
- **Duration:** Variable (export time), 500ms completion celebration
- **File:** `DOM-SET-003b.wireframe.md`

### 6. Business Hours Toggle
- **Location:** Business Hours Settings
- **Trigger:** Toggle closed/open for a day
- **Animation:** Row fade out/in, time inputs slide collapse/expand
- **Duration:** 200ms fade, 300ms slide
- **File:** `DOM-SET-005b.wireframe.md`

---

## Responsive Breakpoints

| Breakpoint | Width | Key Adaptations |
|------------|-------|-----------------|
| Mobile | < 768px | Single column forms, full-screen modals, stacked cards, collapsed tables, bottom sheets for actions |
| Tablet | 768px - 1279px | Two-column layouts, side panels, collapsible sections, horizontal scroll for tables |
| Desktop | >= 1280px | Multi-column forms, inline editing, side-by-side comparisons, full data tables with actions |

---

## Component Patterns Used

### From Shared UI Library
- **Form / FormField / FormMessage** - All settings forms with validation
- **DataTable** - Audit log, export history, custom fields list
- **Dialog** - Confirmations, field editor modal, export progress
- **Combobox** - Entity type selectors, timezone picker
- **Select** - Currency, status dropdowns
- **Switch** - Toggle settings, day open/closed
- **Button** - Primary, secondary, destructive variants
- **Input / NumberInput** - Text and numeric fields
- **DatePicker / TimePicker** - Business hours, date ranges
- **Tabs** - Settings navigation sections
- **Card** - Integration cards, section grouping
- **Badge / StatusBadge** - Connection status, field type indicators
- **Skeleton** - Loading states throughout
- **Toast** - Success/error notifications
- **Command** - Search palette (Settings Search)

### Domain-Specific Components
- **SystemDefaultsForm** - System defaults settings with validation
- **DefaultValueIndicator** - "Using default" badge with reset button
- **AuditLogTable** - Specialized table with expandable details
- **AuditLogFilters** - User, date range, entity type, action filters
- **ExportEntitySelector** - Checkbox list with select all
- **ExportProgressCard** - Progress bar with status and cancel
- **BusinessHoursGrid** - 7-day schedule with time inputs
- **HolidayTable** - Holiday management with date picker
- **CustomFieldEditor** - Modal for field CRUD operations
- **CustomFieldsList** - Drag-sortable field list
- **CustomFieldsFormSection** - Dynamic field renderer for forms
- **IntegrationCard** - Status, stats, actions for each integration
- **SettingsSearchPalette** - Command palette with results dropdown
- **SearchResult** - Result card with highlighting and navigation

---

## Accessibility Checklist

All wireframes include:

- [x] ARIA roles and labels for all interactive elements
- [x] Keyboard navigation paths documented (Tab, Arrow, Enter, Escape)
- [x] Screen reader announcements for state changes (aria-live regions)
- [x] Focus management for dialogs and modals (focus trap, return focus)
- [x] Color-independent status indicators (icons + color + text)
- [x] Touch targets >= 44px on mobile
- [x] Live regions for dynamic updates (search results, progress, notifications)
- [x] Skip links for settings navigation
- [x] Keyboard shortcuts with visible hints (Cmd/Ctrl+K indicator)
- [x] Drag-and-drop has keyboard alternative (move up/down buttons)

---

## Performance Targets

| Component | Load Target | Response Target |
|-----------|-------------|-----------------|
| System Defaults Page | < 500ms | Save: < 300ms |
| Audit Log (1000 entries) | < 1s | Filter: < 200ms, Search: < 300ms |
| Export Page | < 500ms | Start export: immediate, Progress: real-time |
| Business Hours | < 500ms | Toggle/Save: < 300ms |
| Custom Fields Config | < 500ms | Reorder: < 100ms, Save: < 300ms |
| Custom Fields Form Section | < 200ms | Field change: < 50ms |
| Integrations Hub | < 1s | Test connection: < 5s timeout |
| Settings Search | < 100ms | Search debounce: 300ms, Results: < 100ms |

---

## Navigation Structure

```
/settings
├── /user-preferences         (User-level settings)
├── /organization             (Organization info, branding)
├── /system-defaults          (DOM-SET-001b)
├── /business-hours           (DOM-SET-005b)
├── /custom-fields            (DOM-SET-006b)
│   └── /:entityType          (Custom fields for specific entity)
├── /templates                (Email/document templates)
├── /integrations             (DOM-SET-007)
│   ├── /xero
│   ├── /resend
│   └── /trigger
├── /audit-log                (DOM-SET-002)
└── /export                   (DOM-SET-003b)
```

---

## State Management

| State | Storage | Description |
|-------|---------|-------------|
| System Defaults | Server (DB) | Organization-wide defaults via tRPC |
| Form Field Overrides | Component | Track which fields use defaults vs custom |
| Audit Log Filters | URL params | Shareable filter state |
| Export Progress | Server + Polling | Job status via tRPC subscription |
| Business Hours | Server (DB) | Organization schedule via tRPC |
| Custom Fields | Server (DB) | Field definitions via tRPC |
| Custom Field Values | Server (DB) | Entity-specific values |
| Integration Status | Server + Cache | Connection status with refresh |
| Recent Searches | localStorage | User's recent search terms |
| Search Results | Component | Debounced search results |

---

## Related Documentation

- **PRD:** `/memory-bank/prd/domains/settings.prd.json`
- **Audit:** `/memory-bank/prd/_audits/settings-audit.json`
- **Design System:** `/memory-bank/prd/_meta/design-system.md`
- **Patterns:** `/memory-bank/prd/_meta/reference-mapping.md`
- **Shared Components:** `@/components/ui/`

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-10 | UI Skill | Initial wireframes for all 10 UI stories |

---

## Implementation Priority

Based on dependencies and user impact:

| Priority | Stories | Rationale |
|----------|---------|-----------|
| P0 - Critical | DOM-SET-001b, DOM-SET-001c | System defaults required by all forms |
| P1 - High | DOM-SET-006b, DOM-SET-006c, DOM-SET-006d | Custom fields extend all entities |
| P1 - High | DOM-SET-007 | Integration management for core features |
| P2 - Medium | DOM-SET-005b | Business hours for scheduling features |
| P2 - Medium | DOM-SET-002 | Audit log for compliance |
| P2 - Medium | DOM-SET-003b | Data export for reporting |
| P3 - Low | DOM-SET-008 | Settings search is a UX enhancement |

---

**Next Steps:**
1. Review wireframes with design team
2. Validate custom fields schema against all entity types
3. Prototype signature moments (search palette, drag-and-drop)
4. Component implementation following wireframe specs
5. Integration testing with Xero, Resend, Trigger.dev APIs
6. Accessibility audit on implemented components
