# Ralph Loop: Notifications (CC-NOTIFY)

## Objective
Implement a comprehensive notification system for the Renoz application. Establish toast notifications for immediate feedback, in-app alerts for important messages, user notification preferences, and background job progress tracking. Keep users informed of actions and changes happening in real time.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with CC-NOTIFY-001.

## Context

### PRD File
- `opc/_Initiation/_prd/cross-cutting/notifications.prd.json` - Complete notifications specification

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- Foundation PROMPT: `opc/_Initiation/_prd/1-foundation/PROMPT.md`

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query + Context
- **Real-time**: Supabase Realtime subscriptions

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Reference wireframes** from `./wireframes/CC-NOTIFY-*`
4. **Implement the acceptance criteria** completely
5. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
6. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
7. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

Execute stories in dependency order from notifications.prd.json:

### Phase 1: Toast and Basic Notifications
1. **CC-NOTIFY-001** - Toast Notification Component
   - Wireframes: `CC-NOTIFY-001a.wireframe.md`
   - Dependencies: Foundation
   - Creates: Toast component, useToast hook, toast queue system
   - Promise: `CC_NOTIFY_001_COMPLETE`

2. **CC-NOTIFY-002** - Toast Variants (Success, Error, Warning, Info)
   - Wireframes: `CC-NOTIFY-002a.wireframe.md`
   - Dependencies: CC-NOTIFY-001
   - Creates: Toast variants with icons, duration config, auto-dismiss
   - Promise: `CC_NOTIFY_002_COMPLETE`

3. **CC-NOTIFY-003** - Toast Action Buttons
   - Wireframes: `CC-NOTIFY-003a.wireframe.md`
   - Dependencies: CC-NOTIFY-001
   - Creates: Dismissible toasts, action buttons, undo toast pattern
   - Promise: `CC_NOTIFY_003_COMPLETE`

### Phase 2: Accessibility and In-App Alerts
4. **CC-NOTIFY-004** - Accessible Toast Announcements
   - Wireframes: `CC-NOTIFY-004a.wireframe.md`
   - Dependencies: CC-NOTIFY-001
   - Creates: aria-live announcements for toasts, screen reader support
   - Promise: `CC_NOTIFY_004_COMPLETE`

5. **CC-NOTIFY-005** - In-App Alert Center
   - Wireframes: `CC-NOTIFY-005a.wireframe.md`
   - Dependencies: CC-NOTIFY-001
   - Creates: Notification center component, notification history, mark as read
   - Promise: `CC_NOTIFY_005_COMPLETE`

6. **CC-NOTIFY-006** - Notification Badge and Bell Icon
   - Wireframes: `CC-NOTIFY-006a.wireframe.md`
   - Dependencies: CC-NOTIFY-005
   - Creates: Notification bell with badge, unread count, notification dropdown
   - Promise: `CC_NOTIFY_006_COMPLETE`

### Phase 3: Advanced Notifications
7. **CC-NOTIFY-007** - Confirmation and Undoable Action Toasts
   - Wireframes: `CC-NOTIFY-007a.wireframe.md`
   - Dependencies: CC-NOTIFY-003
   - Creates: ConfirmationToast, useUndoableAction hook, undo UI patterns
   - Promise: `CC_NOTIFY_007_COMPLETE`

8. **CC-NOTIFY-008a** - Background Job Progress Tracking (Database)
   - Wireframes: `CC-NOTIFY-008a.wireframe.md`
   - Dependencies: CC-NOTIFY-001
   - Creates: Job status tracking, progress updates, trackJobProgress function
   - Promise: `CC_NOTIFY_008A_COMPLETE`

9. **CC-NOTIFY-008b** - Background Job Progress Notifications (UI)
   - Wireframes: `CC-NOTIFY-008b.wireframe.md`
   - Dependencies: CC-NOTIFY-008a
   - Creates: JobProgressNotification component, real-time progress updates
   - Promise: `CC_NOTIFY_008B_COMPLETE`

### Phase 4: User Preferences and Advanced Features
10. **CC-NOTIFY-009** - User Notification Preferences
    - Wireframes: `CC-NOTIFY-009a.wireframe.md`
    - Dependencies: CC-NOTIFY-005
    - Creates: Notification settings UI, preference persistence, opt-in/out per type
    - Promise: `CC_NOTIFY_009_COMPLETE`

11. **CC-NOTIFY-010** - Real-Time Notifications via Supabase
    - Wireframes: `CC-NOTIFY-010a.wireframe.md`
    - Dependencies: CC-NOTIFY-005
    - Creates: Real-time notification subscriptions, live updates, WebSocket handling
    - Promise: `CC_NOTIFY_010_COMPLETE`

12. **CC-NOTIFY-011** - Notification Analytics and Monitoring
    - Dependencies: All previous stories
    - Creates: Notification delivery tracking, user engagement metrics, performance monitoring
    - Promise: `CC_NOTIFY_011_COMPLETE`

## Wireframe References

All notification wireframes follow the naming pattern `CC-NOTIFY-*`:

| Wireframe | Story | Purpose |
|-----------|-------|---------|
| CC-NOTIFY-001a | CC-NOTIFY-001 | Toast component and queue system |
| CC-NOTIFY-002a | CC-NOTIFY-002 | Toast variants and styling |
| CC-NOTIFY-003a | CC-NOTIFY-003 | Toast with action buttons |
| CC-NOTIFY-004a | CC-NOTIFY-004 | Accessible announcements |
| CC-NOTIFY-005a | CC-NOTIFY-005 | In-app notification center |
| CC-NOTIFY-006a | CC-NOTIFY-006 | Notification bell and badge |
| CC-NOTIFY-007a | CC-NOTIFY-007 | Confirmation and undo toasts |
| CC-NOTIFY-008a | CC-NOTIFY-008a | Job progress tracking |
| CC-NOTIFY-008b | CC-NOTIFY-008b | Job progress UI |
| CC-NOTIFY-009a | CC-NOTIFY-009 | User preferences |
| CC-NOTIFY-010a | CC-NOTIFY-010 | Real-time notifications |

Wireframes are located in: `./wireframes/`

## Completion Promise

When ALL notification stories pass successfully:
```xml
<promise>CC_NOTIFICATIONS_COMPLETE</promise>
```

## Constraints

### DO
- Always announce toasts with aria-live regions
- Queue notifications instead of stacking them
- Auto-dismiss toasts after 3-5 seconds
- Allow manual dismissal of all notifications
- Persist notification history in database
- Respect user notification preferences
- Show notification badges for unread items
- Handle real-time updates gracefully
- Log notification delivery for analytics
- Test with screen readers (NVDA, JAWS, VoiceOver)

### DO NOT
- Use pop-up modal notifications (use toasts)
- Block user interactions with notifications
- Spam users with too many notifications
- Ignore notification preferences (always check)
- Stack more than 2-3 toasts at once
- Auto-dismiss critical alerts (errors, confirmations)
- Create notification center without history
- Forget to handle offline notification queueing
- Use generic "Something happened" messages
- Create inaccessible notification elements

## File Structure

Notification pattern files follow this structure:

```
renoz-v3/
├── src/
│   ├── server/
│   │   ├── functions/
│   │   │   ├── notifications.ts (createNotification, markRead)
│   │   │   ├── jobs.ts (trackJobProgress, getJobStatus)
│   │   │   └── subscriptions.ts (real-time handlers)
│   │   └── schemas/
│   │       └── notifications.ts (Zod schemas)
│   ├── lib/
│   │   ├── notifications/
│   │   │   ├── hooks/
│   │   │   │   ├── use-toast.ts
│   │   │   │   ├── use-notifications.ts
│   │   │   │   ├── use-notification-preferences.ts
│   │   │   │   ├── use-undoable-action.ts
│   │   │   │   └── use-job-progress.ts
│   │   │   ├── context/
│   │   │   │   └── notification-context.tsx
│   │   │   └── constants/
│   │   │       └── notification-config.ts
│   ├── components/
│   │   └── shared/
│   │       ├── toast.tsx
│   │       ├── toast-container.tsx
│   │       ├── notification-center.tsx
│   │       ├── notification-bell.tsx
│   │       ├── notification-badge.tsx
│   │       ├── confirmation-toast.tsx
│   │       ├── undo-toast.tsx
│   │       ├── job-progress-notification.tsx
│   │       └── notification-preferences.tsx
│   └── routes/
│       └── _authed/
│           └── notifications/
│               ├── index.tsx
│               └── preferences.tsx
```

## Key Success Metrics

- All toasts announce via aria-live
- Toast queue displays max 2-3 items
- Notification center loads with 20+ items
- Mark as read updates in real-time
- Job progress updates every 1-2 seconds
- User preferences persist correctly
- Zero notification memory leaks
- Offline notifications queue properly
- All TypeScript strict mode passing
- Tests covering success, error, and edge cases

## Required Reading

Before implementing any story, read these pattern files:

| Pattern | Path | When to Apply |
|---------|------|---------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories - component render and accessibility tests |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | Job progress stories (008a, 008b) - retry with dead letter pattern |
| Performance Benchmarks | `_Initiation/_meta/patterns/performance-benchmarks.md` | UI stories - toast render must not block main thread |

**IMPORTANT**: Foundation code is used by all domains. Pattern compliance is mandatory.

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - Toast queue not working → Check useToast hook and toast state management
  - Real-time not updating → Verify Supabase subscription and channel setup
  - Accessibility failing → Confirm aria-live regions and role='status'
  - Job progress stuck → Check trackJobProgress implementation and timeout handling
  - Preferences not persisting → Verify database upsert and user context

## Progress Template

```markdown
# Notifications (CC-NOTIFY) Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] CC-NOTIFY-001: Toast Notification Component
- [ ] CC-NOTIFY-002: Toast Variants (Success, Error, Warning, Info)
- [ ] CC-NOTIFY-003: Toast Action Buttons
- [ ] CC-NOTIFY-004: Accessible Toast Announcements
- [ ] CC-NOTIFY-005: In-App Alert Center
- [ ] CC-NOTIFY-006: Notification Badge and Bell Icon
- [ ] CC-NOTIFY-007: Confirmation and Undoable Action Toasts
- [ ] CC-NOTIFY-008a: Background Job Progress Tracking (Database)
- [ ] CC-NOTIFY-008b: Background Job Progress Notifications (UI)
- [ ] CC-NOTIFY-009: User Notification Preferences
- [ ] CC-NOTIFY-010: Real-Time Notifications via Supabase
- [ ] CC-NOTIFY-011: Notification Analytics and Monitoring

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

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Notifications (CC-NOTIFY)
**Completion Promise:** CC_NOTIFICATIONS_COMPLETE
