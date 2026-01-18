# Ralph Loop: Loading States (CC-LOADING)

## Objective
Implement consistent loading state patterns across the Renoz application. Establish skeleton screens, progressive loading, spinner components, and Suspense boundaries to meet the < 2s page load and < 500ms subsequent navigation targets from assumptions.md.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with CC-LOAD-001.

## Context

### PRD File
- `opc/_Initiation/_prd/cross-cutting/loading-states.prd.json` - Complete loading states specification

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
- **Suspense**: React 19 Suspense with TanStack Router

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Reference wireframes** from `./wireframes/CC-LOADING-*`
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

Execute stories in dependency order from loading-states.prd.json:

### Phase 1: Spinner Components and Basic Loading
1. **CC-LOAD-001** - Spinner Component Library
   - Wireframes: `CC-LOADING-001a.wireframe.md`
   - Dependencies: Foundation
   - Creates: Spinner, InlineSpinner, PageSpinner components with size variants
   - Promise: `CC_LOAD_001_COMPLETE`

2. **CC-LOAD-002** - Skeleton Screen Components
   - Wireframes: `CC-LOADING-002a.wireframe.md`
   - Dependencies: Foundation
   - Creates: Skeleton patterns (Table, Card, Form, List) with shimmer animation
   - Promise: `CC_LOAD_002_COMPLETE`

3. **CC-LOAD-003** - Page-Level Loading Boundaries
   - Wireframes: `CC-LOADING-003a.wireframe.md`
   - Dependencies: CC-LOAD-001, CC-LOAD-002
   - Creates: ListPageSkeleton, DetailPageSkeleton, DashboardSkeleton
   - Promise: `CC_LOAD_003_COMPLETE`

### Phase 2: Component-Level and Progressive Loading
4. **CC-LOAD-004** - Table and List Item Loading States
   - Wireframes: `CC-LOADING-004a.wireframe.md`
   - Dependencies: CC-LOAD-001, CC-LOAD-002
   - Creates: TableLoadingOverlay, ListItemSkeleton, progressive row loading
   - Promise: `CC_LOAD_004_COMPLETE`

5. **CC-LOAD-005** - Form and Input Loading States
   - Wireframes: `CC-LOADING-005a.wireframe.md`
   - Dependencies: CC-LOAD-001
   - Creates: useFormLoadingState hook, submit button loading states, disabled field handling
   - Promise: `CC_LOAD_005_COMPLETE`

6. **CC-LOAD-006** - Modal and Dialog Loading States
   - Wireframes: `CC-LOADING-006a.wireframe.md`
   - Dependencies: CC-LOAD-001
   - Creates: Modal loading states, dialog content loading, backdrop loading
   - Promise: `CC_LOAD_006_COMPLETE`

### Phase 3: Navigation and Advanced Loading
7. **CC-LOAD-007** - Navigation Progress Indicator
   - Wireframes: `CC-LOADING-007a.wireframe.md`
   - Dependencies: CC-LOAD-001
   - Creates: NavigationProgress component, route transition progress, page load indicator
   - Promise: `CC_LOAD_007_COMPLETE`

8. **CC-LOAD-008** - Suspense Boundary Integration
   - Wireframes: `CC-LOADING-008a.wireframe.md`
   - Dependencies: CC-LOAD-001, CC-LOAD-003
   - Creates: Suspense boundaries with fallbacks, streaming component loading
   - Promise: `CC_LOAD_008_COMPLETE`

9. **CC-LOAD-009** - Progressive Data Loading and Lazy Loading
   - Wireframes: `CC-LOADING-009a.wireframe.md`
   - Dependencies: CC-LOAD-002, CC-LOAD-008
   - Creates: Pagination loading, infinite scroll loading, progressive data reveal
   - Promise: `CC_LOAD_009_COMPLETE`

10. **CC-LOAD-010** - Loading Performance Optimization
    - Dependencies: All previous stories
    - Creates: Performance metrics, load time monitoring, optimization checklist
    - Promise: `CC_LOAD_010_COMPLETE`

## Wireframe References

All loading state wireframes follow the naming pattern `CC-LOADING-*`:

| Wireframe | Story | Purpose |
|-----------|-------|---------|
| CC-LOADING-001a | CC-LOAD-001 | Spinner component variants and sizes |
| CC-LOADING-002a | CC-LOAD-002 | Skeleton screen patterns |
| CC-LOADING-003a | CC-LOAD-003 | Page-level loading boundaries |
| CC-LOADING-004a | CC-LOAD-004 | Table and list loading overlays |
| CC-LOADING-005a | CC-LOAD-005 | Form submission loading states |
| CC-LOADING-006a | CC-LOAD-006 | Modal and dialog loading |
| CC-LOADING-007a | CC-LOAD-007 | Navigation progress indicator |
| CC-LOADING-008a | CC-LOAD-008 | Suspense boundary integration |
| CC-LOADING-009a | CC-LOAD-009 | Progressive and lazy loading |

Wireframes are located in: `./wireframes/`

## Completion Promise

When ALL loading state stories pass successfully:
```xml
<promise>CC_LOADING_STATES_COMPLETE</promise>
```

## Constraints

### DO
- Create reusable spinner and skeleton components
- Use skeleton screens before data loads
- Implement Suspense boundaries for async components
- Show loading progress for long operations
- Disable interactions during loading (forms, buttons)
- Use aria-live for loading announcements
- Respect prefers-reduced-motion (reduce animation)
- Implement progressive loading for large datasets
- Test loading states with network throttling
- Meet < 2s page load and < 500ms navigation targets

### DO NOT
- Use spinners without context (always pair with text)
- Show loading state indefinitely (timeout after 30s)
- Block entire page when partial content can load
- Create janky skeleton animations
- Forget to handle loading state errors (timeout, fail)
- Skip accessibility for loading indicators
- Use multiple competing loading indicators
- Ignore Suspense errors in error boundaries
- Create loading states that prevent user interaction unnecessarily

## File Structure

Loading state pattern files follow this structure:

```
renoz-v3/
├── src/
│   ├── lib/
│   │   ├── loading/
│   │   │   ├── hooks/
│   │   │   │   ├── use-loading-state.ts
│   │   │   │   ├── use-form-loading-state.ts
│   │   │   │   └── use-page-loading.ts
│   │   │   └── constants/
│   │   │       └── loading-config.ts
│   ├── components/
│   │   ├── shared/
│   │   │   ├── spinner.tsx
│   │   │   ├── inline-spinner.tsx
│   │   │   ├── page-spinner.tsx
│   │   │   ├── navigation-progress.tsx
│   │   │   └── offline-indicator.tsx
│   │   └── ui/
│   │       ├── skeleton.tsx
│   │       ├── skeleton-patterns.tsx
│   │       ├── table-loading-overlay.tsx
│   │       └── loading-state.tsx
│   ├── styles/
│   │   ├── loading-animations.css
│   │   └── skeleton-shimmer.css
│   └── routes/
│       └── _authed/
│           └── loading/
│               └── demo.tsx
```

## Key Success Metrics

- All spinners properly styled and accessible
- Skeleton screens match actual content layout
- Suspense boundaries load progressively
- Page load < 2s, navigation < 500ms
- Loading states cancellable (can stop waiting)
- Zero layout shifts (Cumulative Layout Shift < 0.1)
- Loading announcements work with screen readers
- Reduced motion respected
- All animations smooth at 60fps
- Zero TypeScript errors
- All tests passing

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - Suspense not working → Check React 19 version and async component setup
  - Layout shift → Use skeleton dimensions matching actual content
  - Performance → Use React.lazy and route-level code splitting
  - Accessibility → Verify aria-live and aria-busy attributes
  - Animation → Check CSS animation values and timing functions

## Progress Template

```markdown
# Loading States (CC-LOADING) Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] CC-LOAD-001: Spinner Component Library
- [ ] CC-LOAD-002: Skeleton Screen Components
- [ ] CC-LOAD-003: Page-Level Loading Boundaries
- [ ] CC-LOAD-004: Table and List Item Loading States
- [ ] CC-LOAD-005: Form and Input Loading States
- [ ] CC-LOAD-006: Modal and Dialog Loading States
- [ ] CC-LOAD-007: Navigation Progress Indicator
- [ ] CC-LOAD-008: Suspense Boundary Integration
- [ ] CC-LOAD-009: Progressive Data Loading and Lazy Loading
- [ ] CC-LOAD-010: Loading Performance Optimization

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
**Target:** renoz-v3 Loading States (CC-LOADING)
**Completion Promise:** CC_LOADING_STATES_COMPLETE
