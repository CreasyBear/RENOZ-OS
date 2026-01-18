# Ralph Loop: Empty States (CC-EMPTY)

## Objective
Implement helpful empty state patterns across the Renoz application. Establish first-run experience guidance, empty states with clear calls-to-action, zero-data illustrations, and onboarding hints. Ensure users never feel lost when encountering empty views.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with CC-EMPTY-001.

## Context

### PRD File
- `opc/_Initiation/_prd/cross-cutting/empty-states.prd.json` - Complete empty states specification

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
- **Data Fetching**: TanStack Query
- **State Management**: User preferences via database

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Reference wireframes** from `./wireframes/CC-EMPTY-*`
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

Execute stories in dependency order from empty-states.prd.json:

### Phase 1: Empty State Foundations
1. **CC-EMPTY-001** - Empty State Component Patterns
   - Wireframes: `CC-EMPTY-001a.wireframe.md`
   - Dependencies: Foundation
   - Creates: BaseEmptyState, EmptyStateContainer, reusable empty state layouts
   - Promise: `CC_EMPTY_001_COMPLETE`

2. **CC-EMPTY-002** - Empty States with Call-to-Action
   - Wireframes: `CC-EMPTY-002a.wireframe.md`
   - Dependencies: CC-EMPTY-001
   - Creates: EmptyState with CTA, action button variants, link patterns
   - Promise: `CC_EMPTY_002_COMPLETE`

3. **CC-EMPTY-003** - Empty State Illustrations
   - Wireframes: `CC-EMPTY-003a.wireframe.md`
   - Dependencies: CC-EMPTY-001
   - Creates: EmptyStateIllustration component, SVG collection, custom illustrations
   - Promise: `CC_EMPTY_003_COMPLETE`

### Phase 2: Contextual Empty States and Guidance
4. **CC-EMPTY-004** - Welcome Checklist and First-Run Experience
   - Wireframes: `CC-EMPTY-004a.wireframe.md`
   - Dependencies: CC-EMPTY-002
   - Creates: WelcomeChecklist component, onboarding tracking, completion rewards
   - Promise: `CC_EMPTY_004_COMPLETE`

5. **CC-EMPTY-005** - Feature Hints and Contextual Guidance
   - Wireframes: `CC-EMPTY-005a.wireframe.md`
   - Dependencies: CC-EMPTY-001
   - Creates: FeatureHint component, dismissal tracking, useDismissedHints hook
   - Promise: `CC_EMPTY_005_COMPLETE`

6. **CC-EMPTY-006** - Zero Data State Messaging
   - Wireframes: `CC-EMPTY-006a.wireframe.md`
   - Dependencies: CC-EMPTY-002
   - Creates: Zero data messages for specific domains, helpful guidance text
   - Promise: `CC_EMPTY_006_COMPLETE`

### Phase 3: Advanced Empty States
7. **CC-EMPTY-007** - Search Results Empty State
   - Wireframes: `CC-EMPTY-007a.wireframe.md`
   - Dependencies: CC-EMPTY-002
   - Creates: Search empty state with suggestions, filter reset, refinement options
   - Promise: `CC_EMPTY_007_COMPLETE`

8. **CC-EMPTY-008** - Filter Results Empty State
   - Wireframes: `CC-EMPTY-008a.wireframe.md`
   - Dependencies: CC-EMPTY-002
   - Creates: Filter empty state with broadening options, clear filters button
   - Promise: `CC_EMPTY_008_COMPLETE`

9. **CC-EMPTY-009** - Permission and Access Empty States
   - Wireframes: `CC-EMPTY-009a.wireframe.md`
   - Dependencies: CC-EMPTY-001
   - Creates: Access denied empty state, permission request flow, upgrade prompts
   - Promise: `CC_EMPTY_009_COMPLETE`

10. **CC-EMPTY-010** - Empty State Analytics and Monitoring
    - Dependencies: All previous stories
    - Creates: Empty state occurrence tracking, user guidance effectiveness metrics
    - Promise: `CC_EMPTY_010_COMPLETE`

## Wireframe References

All empty state wireframes follow the naming pattern `CC-EMPTY-*`:

| Wireframe | Story | Purpose |
|-----------|-------|---------|
| CC-EMPTY-001a | CC-EMPTY-001 | Empty state component patterns |
| CC-EMPTY-002a | CC-EMPTY-002 | Empty states with call-to-action |
| CC-EMPTY-003a | CC-EMPTY-003 | Empty state illustrations |
| CC-EMPTY-004a | CC-EMPTY-004 | Welcome checklist and onboarding |
| CC-EMPTY-005a | CC-EMPTY-005 | Feature hints and contextual guidance |
| CC-EMPTY-006a | CC-EMPTY-006 | Zero data state messaging |
| CC-EMPTY-007a | CC-EMPTY-007 | Search results empty state |
| CC-EMPTY-008a | CC-EMPTY-008 | Filter results empty state |
| CC-EMPTY-009a | CC-EMPTY-009 | Permission and access empty states |

Wireframes are located in: `./wireframes/`

## Completion Promise

When ALL empty state stories pass successfully:
```xml
<promise>CC_EMPTY_STATES_COMPLETE</promise>
```

## Constraints

### DO
- Always provide a clear call-to-action in empty states
- Show helpful illustrations or icons
- Explain why the state is empty (not just "No data")
- Include a primary action to create/add content
- Track empty state occurrences for analytics
- Use meaningful, user-friendly messaging
- Persist user dismissal of hints (in database)
- Make empty states accessible with aria-live
- Show contextual guidance when appropriate
- Test empty states across all list/table views

### DO NOT
- Leave empty states without clear next actions
- Use generic "No data" messages
- Show multiple conflicting CTAs
- Make hints impossible to dismiss
- Forget to handle edge cases (no search results, filtered to zero)
- Use empty states as advertising (avoid sales pitches)
- Create modal-blocking empty states
- Duplicate empty state messaging (reuse components)
- Skip emptiness in database queries (always check)
- Ignore accessibility (role='status', aria-live)

## File Structure

Empty state pattern files follow this structure:

```
renoz-v3/
├── src/
│   ├── lib/
│   │   ├── empty-states/
│   │   │   ├── hooks/
│   │   │   │   ├── use-dismissed-hints.ts
│   │   │   │   ├── use-empty-state.ts
│   │   │   │   └── use-checklist-progress.ts
│   │   │   └── constants/
│   │   │       └── empty-messages.ts
│   ├── components/
│   │   └── shared/
│   │       ├── empty-state.tsx
│   │       ├── empty-state-container.tsx
│   │       ├── empty-state-illustration.tsx
│   │       ├── welcome-checklist.tsx
│   │       ├── feature-hint.tsx
│   │       ├── search-empty-state.tsx
│   │       ├── filter-empty-state.tsx
│   │       └── access-denied-state.tsx
│   ├── assets/
│   │   └── illustrations/
│   │       ├── empty-customers.svg
│   │       ├── empty-products.svg
│   │       ├── empty-opportunities.svg
│   │       ├── no-search-results.svg
│   │       └── access-denied.svg
│   └── routes/
│       └── _authed/
│           └── empty-states/
│               └── demo.tsx
```

## Key Success Metrics

- All lists/tables have appropriate empty states
- Empty state messages are clear and actionable
- CTAs lead to correct creation flows
- Illustrations are relevant and on-brand
- Hints can be dismissed and dismissal persists
- Welcome checklist tracks progress accurately
- Zero empty state hangs or infinite loads
- Accessibility score for empty states > 95%
- TypeScript errors < 5
- All tests passing

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - Hint dismissal not persisting → Check user preferences table and upsert logic
  - Empty state logic → Verify data fetch completion before showing empty state
  - Illustration sizing → Check SVG viewBox and responsive container widths
  - CTA routing → Verify route paths and navigation state
  - Accessibility → Confirm aria-live and role attributes on containers

## Progress Template

```markdown
# Empty States (CC-EMPTY) Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] CC-EMPTY-001: Empty State Component Patterns
- [ ] CC-EMPTY-002: Empty States with Call-to-Action
- [ ] CC-EMPTY-003: Empty State Illustrations
- [ ] CC-EMPTY-004: Welcome Checklist and First-Run Experience
- [ ] CC-EMPTY-005: Feature Hints and Contextual Guidance
- [ ] CC-EMPTY-006: Zero Data State Messaging
- [ ] CC-EMPTY-007: Search Results Empty State
- [ ] CC-EMPTY-008: Filter Results Empty State
- [ ] CC-EMPTY-009: Permission and Access Empty States
- [ ] CC-EMPTY-010: Empty State Analytics and Monitoring

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
**Target:** renoz-v3 Empty States (CC-EMPTY)
**Completion Promise:** CC_EMPTY_STATES_COMPLETE
