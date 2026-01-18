# Communications Domain Wireframes Index

**PRD Reference:** `/memory-bank/prd/domains/communications.prd.json`
**Design Aesthetic:** Clean, functional, communication-focused - emphasis on clarity and action
**Created:** 2026-01-10

## Wireframe Files

| File | Description | Related Stories |
|------|-------------|-----------------|
| [DOM-COMMS-001c.wireframe.md](./DOM-COMMS-001c.wireframe.md) | Email tracking stats display with open/click rates | DOM-COMMS-001c |
| [DOM-COMMS-002c.wireframe.md](./DOM-COMMS-002c.wireframe.md) | Email scheduling UI with datetime picker | DOM-COMMS-002c |
| [DOM-COMMS-003d.wireframe.md](./DOM-COMMS-003d.wireframe.md) | Campaign management wizard and analytics | DOM-COMMS-003d |
| [DOM-COMMS-004c.wireframe.md](./DOM-COMMS-004c.wireframe.md) | Call scheduling and follow-up tracking | DOM-COMMS-004c |
| [DOM-COMMS-005.wireframe.md](./DOM-COMMS-005.wireframe.md) | Communication preferences and compliance | DOM-COMMS-005 |
| [DOM-COMMS-006.wireframe.md](./DOM-COMMS-006.wireframe.md) | Email signature management (personal/company) | DOM-COMMS-006 |
| [DOM-COMMS-007.wireframe.md](./DOM-COMMS-007.wireframe.md) | Custom email templates with version control | DOM-COMMS-007 |
| [DOM-COMMS-008.wireframe.md](./DOM-COMMS-008.wireframe.md) | Enhanced communications timeline | DOM-COMMS-008 |

## Story-to-Wireframe Mapping

| Story ID | Story Name | Wireframe(s) |
|----------|------------|--------------|
| DOM-COMMS-001c | Add Email Tracking Stats UI | DOM-COMMS-001c.wireframe.md |
| DOM-COMMS-002c | Add Email Scheduling UI | DOM-COMMS-002c.wireframe.md |
| DOM-COMMS-003d | Add Campaign Management UI | DOM-COMMS-003d.wireframe.md |
| DOM-COMMS-004c | Add Call Scheduling UI | DOM-COMMS-004c.wireframe.md |
| DOM-COMMS-005 | Add Communication Preferences | DOM-COMMS-005.wireframe.md |
| DOM-COMMS-006 | Add Email Signature Management | DOM-COMMS-006.wireframe.md |
| DOM-COMMS-007 | Add Custom Email Templates Management | DOM-COMMS-007.wireframe.md |
| DOM-COMMS-008 | Fix and Enhance Communications Timeline | DOM-COMMS-008.wireframe.md |

## Design Principles

### Communication-Centric Design

1. **Clarity First:** Every communication touchpoint should be immediately understandable
2. **Action-Oriented:** Quick actions for common tasks (reply, follow-up, log)
3. **Context Preservation:** Show relevant history when composing/responding
4. **Compliance Awareness:** Preference status always visible before sending

### Information Hierarchy

1. **Primary:** Communication content and recipient
2. **Secondary:** Engagement metrics and status
3. **Tertiary:** Metadata (timestamps, users, versions)

### Responsive Strategy

| Breakpoint | Layout | Key Adaptations |
|------------|--------|-----------------|
| Mobile (<640px) | Single column, full-screen dialogs | Bottom sheets for actions, collapsed filters |
| Tablet (768-1024px) | Two columns, modal dialogs | Side filters, inline previews |
| Desktop (1280px+) | Three columns, panel details | Full toolbar, split views |

## Component Patterns

### Shared Components

| Component | Used In | Purpose |
|-----------|---------|---------|
| `RichTextEditor` | Signatures, Templates, Composer | WYSIWYG editing with toolbar |
| `DateTimePicker` | Scheduling, Campaigns | Date and time selection |
| `FilterBar` | Timeline, Lists | Multi-criteria filtering |
| `StatusBadge` | Tracking, Campaigns | Visual status indicators |
| `VariableToolbar` | Templates | Dynamic content insertion |
| `PreviewPanel` | Templates, Signatures | Live preview rendering |

### Dialog Patterns

| Pattern | Use Case | Behavior |
|---------|----------|----------|
| Full-Screen Dialog | Mobile editing (templates, signatures) | Slides up, covers screen |
| Modal Dialog | Desktop editing, confirmations | Centered overlay |
| Bottom Sheet | Mobile actions (snooze, export) | Slides from bottom |
| Side Panel | Desktop detail views | Slides from right |

### Loading Patterns

| State | Visualization | Duration |
|-------|---------------|----------|
| Initial Load | Shimmer skeletons | Until data ready |
| Inline Action | Button spinner | During operation |
| Background Sync | Subtle indicator | Continuous |
| Full-page Load | Centered spinner | Major transitions |

## Accessibility Standards

### WCAG 2.1 AA Compliance

- **Color Contrast:** 4.5:1 minimum for text, 3:1 for UI components
- **Focus Indicators:** Visible focus ring on all interactive elements
- **Keyboard Navigation:** All features accessible via keyboard
- **Screen Reader:** Proper ARIA labels and live regions

### Key ARIA Patterns

| Pattern | Implementation | Used In |
|---------|----------------|---------|
| `role="feed"` | Timeline activities | Communications tab |
| `role="dialog"` | Modal dialogs | All dialogs |
| `role="application"` | Rich text editor | Templates, Signatures |
| `role="tablist"` | Tab navigation | Template categories |
| `aria-live="polite"` | Real-time updates | Stats, progress |

### Focus Management

- Dialog open: Focus first interactive element
- Dialog close: Return focus to trigger
- Form submit: Focus error or success message
- List filter: Maintain focus, announce count

## Animation Timings

| Animation Type | Duration | Easing |
|----------------|----------|--------|
| Micro (buttons) | 100-150ms | ease-out |
| Standard (dropdowns) | 200ms | ease-out |
| Complex (dialogs) | 250-300ms | ease-out |
| Enter (staggered) | 200ms + 50ms stagger | ease-out |
| Exit | 150-200ms | ease-in |

## Integration Points

### Routes

```
/communications                    -> Summary dashboard
/communications/emails            -> Email history
/communications/scheduled         -> Scheduled emails
/communications/templates         -> Template management
/communications/templates/:id     -> Template editor
/communications/campaigns         -> Campaign list
/communications/campaigns/new     -> Campaign wizard
/communications/campaigns/:id     -> Campaign detail
/communications/calls             -> Call management
/communications/preferences       -> Preference report
/settings/signature               -> Personal signature
/settings/signatures              -> Company signatures (admin)
/unsubscribe/:token               -> Public unsubscribe
```

### Server Functions

| Function | Purpose | Used By |
|----------|---------|---------|
| `getEmailTrackingStats` | Template performance metrics | DOM-COMMS-001c |
| `scheduleEmail` | Create scheduled email | DOM-COMMS-002c |
| `createCampaign` | Create bulk campaign | DOM-COMMS-003d |
| `scheduleCall` | Schedule follow-up call | DOM-COMMS-004c |
| `updatePreferences` | Save opt-in/out | DOM-COMMS-005 |
| `saveSignature` | Save user signature | DOM-COMMS-006 |
| `saveTemplate` | Save custom template | DOM-COMMS-007 |
| `getActivities` | Fetch timeline data | DOM-COMMS-008 |

### External Services

- **Resend:** Email sending and tracking
- **Trigger.dev:** Scheduled tasks (sending, reminders)
- **React Email:** Template rendering (system templates)

## Performance Targets

| Metric | Target |
|--------|--------|
| Timeline initial load | < 1.5 seconds |
| Template preview render | < 500ms |
| Email send response | < 2 seconds |
| Search results | < 500ms |
| Export generation | < 10 seconds |
| Mobile render | < 2 seconds on 3G |

## Testing Considerations

### Critical Paths

1. **Email Compose Flow:** Recipient selection -> Template -> Schedule/Send
2. **Campaign Creation:** Name -> Template -> Recipients -> Review -> Send
3. **Call Scheduling:** Customer -> Date/Time -> Reminder -> Confirm
4. **Preference Update:** Toggle -> Confirm -> History recorded

### Edge Cases

- Large recipient lists (1000+) in campaigns
- Long email threads in timeline
- Timezone edge cases in scheduling
- Network failures during send
- Concurrent template edits

## Related Documentation

- [Communications PRD](/memory-bank/prd/domains/communications.prd.json)
- [Email History Schema](/lib/schema/email-history.ts)
- [Activities Schema](/lib/schema/activities.ts)
- [Server Functions](/src/server/functions/communications.ts)
- [Trigger Jobs](/trigger/email-jobs.ts)
