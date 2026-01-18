# 3-Click Rule: Common Tasks Must Be <=3 Actions

## Why This Matters

Users abandon workflows that feel tedious. Every extra click is friction that leads to:
- Skipped activity logging
- Incomplete data entry
- Workaround spreadsheets
- Eventual churn

## High-Frequency Tasks Audit

### Sales Role

| Task | Current Clicks | Target | Solution | PRD Reference |
|------|---------------|--------|----------|---------------|
| Log a call | 2 | 2 | Cmd+L shortcut -> type -> Enter | ROLE-SALES quick_action_panel |
| Create quick quote | 3 | 3 | Cmd+Q -> wizard (5-step but streamlined) | ROLE-SALES-001 |
| Find customer | 2 | 2 | Cmd+K -> type name (global search) | current_state: implemented |
| Set follow-up date | 2 | 2 | Click date field -> pick date | ROLE-SALES-005c |
| View pipeline | 1 | 1 | Default landing page for sales role | ROLE-SALES-004a |
| New customer | 2 | 2 | Cmd+N shortcut | ROLE-SALES quick_action_panel |
| Customer quick actions | 1 | 1 | Hover preview card with Call/Email/Quote | ROLE-SALES-003 |

**Sales Role Status: COMPLIANT** - All priority actions have shortcuts (Cmd+Q, Cmd+N, Cmd+L)

### Field Tech Role

| Task | Current Clicks | Target | Solution | PRD Reference |
|------|---------------|--------|----------|---------------|
| Start timer | 1 | 1 | Floating FAB tap (single tap start) | ROLE-FIELD-004 |
| Mark task complete | 1 | 1 | Swipe right gesture | ROLE-FIELD-001 |
| Log materials used | 2 | 2 | Scan barcode -> confirm (via Operations barcode scanner) | Not in field-tech scope |
| Take job photo | 2 | 2 | Camera icon -> snap (with offline queuing) | ROLE-FIELD-006 |
| View today's jobs | 1 | 1 | Default landing page (today.tsx) | ui_spec: todays-jobs primary |
| Start job | 1 | 1 | Swipe right on job card | ROLE-FIELD-001 |
| Stop timer | 1 | 1 | Single tap stop -> opens category | ROLE-FIELD-004 |
| Check item on punchlist | 1 | 1 | Tap 48px checkbox | ROLE-FIELD-005 |
| Navigate to job | 2 | 2 | Navigate button on card -> opens maps | ROLE-FIELD-008 |
| Refresh schedule | 1 | 1 | Pull-to-refresh gesture | ROLE-FIELD-008 |

**Field Tech Role Status: COMPLIANT** - Mobile-first with swipe gestures, FAB, 44px+ touch targets

### Operations Role

| Task | Current Clicks | Target | Solution | PRD Reference |
|------|---------------|--------|----------|---------------|
| Check stock level | 2 | 2 | Search -> view | ROLE-OPS-007 |
| Pick order items | 1 | 2 | Swipe right to mark picked | ROLE-OPS-002 |
| Mark shipped | 2 | 2 | Select -> Ship button | ROLE-OPS-006 |
| View low stock | 1 | 1 | Dashboard widget (prominent display) | ROLE-OPS-001 |
| Start picking session | 2 | 2 | Dashboard -> Start Picking quick action | ROLE-OPS-001 |
| Receive goods | 2 | 2 | Swipe right for quick receive OR tap for detailed | ROLE-OPS-005 |
| Create PO from low stock | 2 | 2 | One-click PO creation from alert | ROLE-OPS-004 |
| Scan barcode | 1 | 1 | Scan -> auto-advance after 2s | ROLE-OPS-008b |
| Batch pick multiple orders | 3 | 3 | Select orders -> pick consolidated -> distribute | ROLE-OPS-003 |

**Operations Role Status: COMPLIANT** - Action-oriented dashboard, swipe gestures, one-click PO creation

### Finance Role

| Task | Current Clicks | Target | Solution | PRD Reference |
|------|---------------|--------|----------|---------------|
| Create invoice | 2 | 2 | Cmd+I shortcut -> from ready list | ROLE-FIN-002b |
| Record payment | 2 | 2 | Cmd+P shortcut | ui_spec quick_action_panel |
| View AR aging | 1 | 1 | Dashboard widget click | ROLE-FIN-005b |
| Bulk invoice orders | 3 | 3 | Select -> Create Invoices button -> Confirm | ROLE-FIN-002b |
| Match payment to invoice | 2 | 2 | Auto-match by reference + confirm | ROLE-FIN-003b |
| Sync Xero | 1 | 1 | Sync Now button on widget | ROLE-FIN-008b |
| View reconciliation | 2 | 2 | Tab navigation to Reconciliation | ROLE-FIN-004b |
| Send payment reminder | 2 | 2 | Send Reminder Now button per invoice | ROLE-FIN-007b |
| Export report | 2 | 2 | Report view -> Export button | ROLE-FIN-006b |

**Finance Role Status: COMPLIANT** - Keyboard shortcuts (Cmd+I, Cmd+P), bulk actions, auto-match

---

## Required UI Patterns

### 1. Command Palette (Cmd+K)
- Global search + quick actions
- Recent items when empty
- Keyboard navigation
- **Status**: Implemented (command-palette.tsx in current_state)

### 2. Floating Action Button (Mobile)
- Primary action always visible
- Context-aware (timer on job, add on list)
- **Status**: Specified for Field Tech (bottom floating FAB)
- **Status**: Specified for Operations (mobile: floating action button menu)

### 3. Inline Editing
- Click to edit, no modal
- Tab to next field
- Enter to save
- **Status**: Required for payment allocation, stock editing

### 4. Swipe Actions (Mobile)
- Right swipe: complete/approve
- Left swipe: delete/archive or secondary action (shortage)
- No confirmation for reversible actions
- **Status**: Specified for Field Tech (SwipeableRow)
- **Status**: Specified for Operations (swipe to pick/receive)

### 5. Smart Defaults
- Pre-fill customer from context
- Remember last used values
- Today as default date
- Auto-match payments by reference number
- **Status**: Specified in multiple PRDs

### 6. Keyboard Shortcuts (Desktop)
All roles have defined shortcuts in quick_action_panel:

| Role | Shortcut | Action |
|------|----------|--------|
| Sales | Cmd+Q | New Quote |
| Sales | Cmd+N | New Customer |
| Sales | Cmd+L | Log Call |
| Finance | Cmd+I | Create Invoice |
| Finance | Cmd+P | Record Payment |
| All | Cmd+K | Global Search |

### 7. Touch Targets (Mobile)
- Minimum 44x44px for all interactive elements
- 48px for critical actions (checkboxes, timers)
- 8px minimum gap between targets
- **Status**: Explicitly required in Field Tech and Operations PRDs

### 8. Pull-to-Refresh (Mobile)
- 60px pull threshold
- Haptic feedback on trigger
- Skeleton cards during refresh
- Alternative button for motor impairments
- **Status**: Specified for Field Tech (ROLE-FIELD-008)

---

## Audit Summary

| Role | Status | Notes |
|------|--------|-------|
| Sales | PASSED | All high-frequency tasks <=3 clicks with keyboard shortcuts |
| Field Tech | PASSED | Mobile-first with swipe gestures, FAB, large touch targets |
| Operations | PASSED | Action-oriented dashboard, one-click PO creation, swipe picking |
| Finance | PASSED | Keyboard shortcuts, bulk actions, auto-match payment |

**Overall Assessment**: All 4 role PRDs comply with the 3-click rule. Each role has:
1. A default landing page showing the most relevant information (1 click to view)
2. Quick action panels or FABs for primary actions (1-2 clicks)
3. Keyboard shortcuts for desktop users (Sales: Cmd+Q/N/L, Finance: Cmd+I/P)
4. Swipe gestures for mobile users (Field Tech, Operations)
5. Smart defaults to minimize data entry

---

## Implementation Checklist

Before shipping any role, verify:

- [ ] Default landing page shows most-needed data
- [ ] Primary actions accessible from dashboard
- [ ] Keyboard shortcuts documented and working
- [ ] Mobile touch targets >= 44px
- [ ] Swipe gestures have button alternatives
- [ ] Smart defaults reduce typing
- [ ] No task requires > 3 actions to complete

---

**Document Version:** 1.0
**Created:** 2026-01-17
**Last Audit:** 2026-01-17
