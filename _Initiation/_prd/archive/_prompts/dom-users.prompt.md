# Ralph Loop: Users/Team Domain

> **Phase**: 0 - DOMAIN
> **PRD**: memory-bank/prd/domains/users.prd.json
> **Track**: C (can run parallel with other Phase 0 domains)

---

## Objective

YOU MUST complete the stories in `memory-bank/prd/domains/users.prd.json` sequentially.

This domain manages **internal team members** for the Australian B2B battery/window installation business.

**Completion Promise**: `<promise>DOM_USERS_COMPLETE</promise>`

---

## Business Context (Renoz)

| Aspect | Detail |
|--------|--------|
| **Business** | Australian B2B battery and window installation company |
| **Users** | Internal staff only (no customer portal in v1) |
| **Team Size** | 5-15 users per organization |
| **Roles** | Admin, Sales, Warehouse, Viewer (4 roles, no complex hierarchy) |
| **User Types** | Staff (internal), Installer (subcontractor), Customer Portal (future) |
| **Locale** | Australian date formats (DD/MM/YYYY), AEST/AEDT timezone |

### User Scenarios

1. **Admin** invites new Sales team member via email
2. **Admin** creates user groups (e.g., "Sydney Team", "Battery Specialists")
3. **Sales** sets up delegation when going on leave
4. **Warehouse** tracks who picked/shipped orders via user audit
5. **Admin** identifies inactive users (no login >30 days)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Check existing user routes
ls renoz-v2/src/routes/_authed/settings/
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: `memory-bank/prd/_progress/dom-users.progress.txt`
2. **PRD File**: `memory-bank/prd/domains/users.prd.json`
3. **Conventions**: `memory-bank/_meta/conventions.md`
4. **Glossary**: `memory-bank/_meta/glossary.md`
5. **Assumptions**: `memory-bank/_meta/assumptions.md`

### Reference Patterns

| Pattern | Reference File |
|---------|---------------|
| Schema structure | `renoz-v2/lib/schema/users.ts` |
| Server functions | `renoz-v2/src/server/functions/auth.ts` |
| DataTable pattern | `renoz-v2/src/routes/inventory/index.tsx` |
| Inline sidebar | `renoz-v2/src/routes/suppliers/index.tsx` |

---

## File Ownership

YOU MAY modify these paths:

```
renoz-v2/lib/schema/user-groups.ts (create)
renoz-v2/lib/schema/user-delegations.ts (create)
renoz-v2/lib/schema/user-onboarding.ts (create)
renoz-v2/src/server/functions/users.ts (modify)
renoz-v2/src/server/functions/user-groups.ts (create)
renoz-v2/src/routes/_authed/settings/users/**
renoz-v2/src/components/domain/users/**
memory-bank/prd/_progress/dom-users.progress.txt
```

YOU MUST NOT modify:

- Other domain routes
- Core auth functions (login, logout)
- Supabase auth configuration

---

## Execution Process

### Each Iteration

```
1. READ progress file → Find current story
2. READ PRD → Get story acceptance criteria
3. CHECK story type → schema/server/ui layer
4. IMPLEMENT → Follow acceptance criteria exactly
5. VERIFY → npm run typecheck
6. UPDATE → Mark progress
7. PROMISE → Output completion if passed
8. LOOP → Continue or complete
```

### Story Completion Checklist

Before outputting `<promise>DOM_USER_NNN_COMPLETE</promise>`:

- [ ] ALL acceptance criteria met
- [ ] `npm run typecheck` passes
- [ ] ui_spec accessibility requirements met (if UI story)
- [ ] Progress file updated with [x] marker

---

## Story Type Limits

| Type | Max Iterations | Max Files |
|------|----------------|-----------|
| schema | 2 | 3 |
| server | 3 | 3 |
| ui | 4 | 5 |

---

## Dependencies

### This PRD Depends On

No blocking dependencies - can start immediately.

### Stories That Depend On Others

```
DOM-USER-002c (Groups UI) → depends on DOM-USER-002b (Groups Server)
DOM-USER-003c (Delegation UI) → depends on DOM-USER-003b (Delegation Server)
DOM-USER-005c (Last Login UI) → depends on DOM-USER-005b (Last Login Server)
DOM-USER-006b (Bulk UI) → depends on DOM-USER-006a + DOM-USER-002c
DOM-USER-007c (Onboarding UI) → depends on DOM-USER-007b + DOM-USER-004
DOM-USER-008c (Invitation UI) → depends on DOM-USER-008b
```

---

## Signals

### Success Signals

```xml
<!-- Single story complete -->
<promise>DOM_USER_001_COMPLETE</promise>

<!-- All stories in PRD complete -->
<promise>DOM_USERS_COMPLETE</promise>
```

### Failure Signals

```xml
<promise>STUCK_NEEDS_HELP</promise>
<promise>FAILED_NEEDS_INTERVENTION</promise>
```

---

## UI Implementation Guidelines

### Role Badges (from schema)

```typescript
// Role colors - consistent across app
const ROLE_COLORS = {
  admin: 'bg-indigo-600 text-white',
  sales: 'bg-blue-500 text-white',
  warehouse: 'bg-amber-500 text-black',
  viewer: 'bg-gray-400 text-black',
} as const;

// User type badges
const TYPE_BADGES = {
  staff: null, // No badge - default
  installer: 'border-emerald-500', // Shows company name
  customer_portal: 'border-purple-500',
} as const;
```

### Status Indicators

```typescript
// User status with visual indicator
const STATUS_INDICATORS = {
  active: { dot: 'bg-green-500', label: 'Active' },
  invited: { dot: 'bg-yellow-500', label: 'Pending' },
  suspended: { dot: 'bg-red-500', label: 'Suspended' },
} as const;
```

### Accessibility Requirements (All UI Stories)

- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus management on dialog open/close
- [ ] Screen reader announcements for status changes
- [ ] Minimum 44px tap targets on mobile

---

## Specific Implementation Notes

### DOM-USER-002c (Groups UI)

- Add to Settings page, not separate route
- Use DataTable for group list (pattern from inventory)
- Multi-select Combobox for adding users to groups
- Group badge shows on user profile/list

### DOM-USER-003c (Delegation UI)

- Delegation form in user settings (Card wrapper)
- DateRangePicker for start/end dates
- Show Alert banner on dashboard when someone has delegated to current user
- Notifications route to delegate during active delegation

### DOM-USER-007c (Onboarding UI)

- Dashboard widget for new users only
- Show when: profile incomplete OR preferences not set OR tutorial not viewed
- Dismissible with "don't show again"
- Admin can see onboarding status in user detail

---

## Commands

### Start This Loop

```bash
/ralph-loop "Execute memory-bank/prd/domains/users.prd.json" \
  --max-iterations 50 \
  --completion-promise "DOM_USERS_COMPLETE"
```

### Check Progress

```bash
cat memory-bank/prd/_progress/dom-users.progress.txt
```

---

*Phase 0 Domain PRD - Users/Team Management*
