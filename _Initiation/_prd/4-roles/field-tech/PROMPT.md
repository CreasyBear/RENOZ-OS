# Ralph Loop: Field Technician Role Optimization

## Objective
Build the Field Technician role experience optimized for mobile and offline use. Enable fast job execution with time tracking, location capture, photo documentation, and sync conflict handling for technicians working in the field.

## Required Reading

Before implementing any story, review these critical resources:

### Frontend Components
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

### Pattern Files

| Pattern | Path | When to Apply |
|---------|------|---------------|
| Testing Standards | `_meta/patterns/testing-standards.md` | All stories |
| 3-Click Rule | `_meta/patterns/ux-3-click-rule.md` | UI stories - verify click counts |
| Performance | `_meta/patterns/performance-benchmarks.md` | API endpoints - verify response times |
| Error Recovery | `_meta/patterns/error-recovery.md` | Offline sync stories - conflict resolution |

**IMPORTANT**: Pattern compliance is part of acceptance criteria.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with ROLE-FIELD-001.

## Context

### PRD Files (in execution order)
1. `opc/_Initiation/_prd/4-roles/field-tech.prd.json` - Field Technician optimization stories

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Mobile**: Responsive design for small screens
- **Offline**: Service workers for offline-first capability

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Implement the acceptance criteria** completely
4. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
5. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>[STORY_COMPLETION_PROMISE]</promise>`
   - Move to next story
6. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

### Phase: Field Technician Role (ROLE-FIELD)
Execute stories in priority order from field-tech.prd.json:

1. ROLE-FIELD-001: Enhance Mobile Touch Targets and Swipe Gestures
2. ROLE-FIELD-003a: Add Sync Conflict Detection on Server
3. ROLE-FIELD-003b: Add Sync Conflict Resolution UI
4. ROLE-FIELD-004: Quick Time Entry Mobile UI
5. ROLE-FIELD-005: Simple Punchlist Completion Mobile UI
6. ROLE-FIELD-006: Offline Photo Queuing Integration
7. ROLE-FIELD-007a: Add GPS Location Fields to Job Schema
8. ROLE-FIELD-007b: Capture GPS on Job Start and Complete
9. ROLE-FIELD-007c: Add Job Locations Map View
10. ROLE-FIELD-008: Today View Enhancements

## Completion

When ALL field technician stories pass:
```xml
<promise>ROLE_FIELD_PHASE_COMPLETE</promise>
```

## Constraints

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Design for mobile-first (small screens, touch-friendly)
- Optimize for field usage (fast, minimal data, offline-ready)
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Run `bun run typecheck` after each story
- Handle sync conflicts gracefully
- Capture timestamps for all field actions

### DO NOT
- Modify files outside role scope
- Skip acceptance criteria
- Design for desktop-only experience
- Create components that require data for offline use
- Forget to handle offline scenarios
- Implement features for other roles
- Make touch targets smaller than 44x44px

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/
│   │   │   ├── fieldtech/               # Field tech-specific routes
│   │   │   │   ├── today.tsx
│   │   │   │   ├── jobs/
│   │   │   │   ├── timesheet.tsx
│   │   │   │   ├── photos.tsx
│   │   │   │   └── locations.tsx
│   ├── components/
│   │   ├── fieldtech/                   # Field tech-specific components
│   │   │   ├── MobileJobCard.tsx
│   │   │   ├── TimeEntry.tsx
│   │   │   ├── PhotoCapture.tsx
│   │   │   ├── SyncConflictResolver.tsx
│   │   │   └── ...
│   │   └── shared/
│   └── lib/
│       ├── fieldtech/                   # Field tech business logic
│       ├── offline/                     # Offline sync logic
│       ├── server/                      # Server functions
│       └── schemas/
├── drizzle/
│   └── schema/
└── tests/
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference → Check Drizzle $inferSelect patterns
  - Offline sync issues → Check service worker and conflict detection logic
  - GPS accuracy → Verify Geolocation API integration
  - Touch target sizing → Ensure all interactive elements are at least 44x44px
  - Mobile performance → Optimize image handling and data transfers

## Progress Template

```markdown
# Field Technician Role Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] ROLE-FIELD-001: Enhance Mobile Touch Targets and Swipe Gestures
- [ ] ROLE-FIELD-003a: Add Sync Conflict Detection on Server
- [ ] ROLE-FIELD-003b: Add Sync Conflict Resolution UI
...

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

## Error Recovery Patterns

This role uses patterns from the central error recovery documentation.

**Reference:** `opc/_Initiation/_meta/patterns/error-recovery.md`

### Applicable Pattern

#### Pattern 2: Offline Conflict Resolution
Used for all field technician sync operations when working offline.

```
Strategy: Last-write-wins with conflict audit log

On Sync:
1. Compare server_updated_at vs local_updated_at
2. If conflict: Keep most recent, log conflicting version
3. Show user: "Synced with N conflicts" (clickable)
4. User can manually override if needed
```

Key implementations:
- Job status updates (start/complete times)
- Time entries created offline
- Photo documentation queued offline
- Punchlist completions

### Conflict Handling by Entity

| Entity | Conflict Fields | Resolution |
|--------|-----------------|------------|
| Job | status, notes | Last-write-wins, preserve both notes |
| Time Entry | hours, description | Last-write-wins, log discrepancy |
| Photo | metadata only | Append both (photos never conflict) |
| Punchlist Item | completed_at, notes | Last-write-wins |
| GPS Location | lat/lng | Server wins (more accurate timestamp) |

### UI Implementation

Stories ROLE-FIELD-003a and ROLE-FIELD-003b implement this pattern:

1. **Server Detection (003a):**
   - Compare timestamps on sync request
   - Return conflict details in response
   - Store losing version in `conflict_audit` table

2. **Resolution UI (003b):**
   - Toast notification: "Synced with 2 conflicts"
   - Click opens conflict review modal
   - Side-by-side comparison of versions
   - "Accept Server" / "Accept Mine" / "Merge" buttons

### Mobile-Specific Considerations

- Queue all changes locally with timestamps
- Batch sync when connectivity returns
- Show pending sync count in UI
- Allow manual "Sync Now" trigger
- Preserve offline work even if conflicts arise

---

## 3-Click Rule Compliance

See `_meta/patterns/ux-3-click-rule.md` for standards.

Key shortcuts for this role:
- **Swipe Right** - Start job / Mark task complete
- **Tap FAB** - Start/stop timer (single tap)
- **Pull Down** - Refresh schedule
- **Tap Camera** - Take photo (with offline queuing)

Key UX patterns:
- Today's jobs is default landing page (1 click to see schedule)
- Floating Action Button for primary action (timer)
- 44px+ touch targets for outdoor/gloved use
- Swipe gestures with button alternatives for accessibility
- Punchlist items with 48px checkboxes

Audit status: **PASSED**

---

**Document Version:** 1.2
**Created:** 2026-01-11
**Updated:** 2026-01-17 (3-Click Rule Compliance added)
**Target:** renoz-v3 Field Technician Role Phase
**Completion Promise:** ROLE_FIELD_PHASE_COMPLETE
