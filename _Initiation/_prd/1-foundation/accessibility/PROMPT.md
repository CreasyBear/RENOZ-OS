# Ralph Loop: Accessibility (CC-A11Y)

## Objective
Implement accessibility patterns and compliance for the Renoz application. Establish full keyboard navigation, focus management, screen reader support, and WCAG 2.1 AA compliance to ensure the application is usable by all team members.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with CC-A11Y-001.

## Context

### PRD File
- `opc/_Initiation/_prd/cross-cutting/accessibility.prd.json` - Complete accessibility specification

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- Foundation PROMPT: `opc/_Initiation/_prd/1-foundation/PROMPT.md`

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **State Management**: TanStack Query

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Reference wireframes** from `./wireframes/CC-A11Y-*`
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

Execute stories in dependency order from accessibility.prd.json:

### Phase 1: Foundation & Keyboard Navigation
1. **CC-A11Y-001** - Semantic HTML and Landmark Structure
   - Wireframes: `CC-A11Y-001a.wireframe.md`
   - Dependencies: Foundation
   - Creates: Semantic landmark structure, skip link component
   - Promise: `CC_A11Y_001_COMPLETE`

2. **CC-A11Y-002** - Keyboard Navigation and Focus Management
   - Wireframes: `CC-A11Y-002a.wireframe.md`
   - Dependencies: CC-A11Y-001
   - Creates: Focus management utilities, keyboard event handlers, focus visible styles
   - Promise: `CC_A11Y_002_COMPLETE`

3. **CC-A11Y-003** - Screen Reader Support and ARIA
   - Wireframes: `CC-A11Y-003a.wireframe.md`
   - Dependencies: CC-A11Y-001
   - Creates: ARIA live regions, aria-label patterns, semantic ARIA attributes
   - Promise: `CC_A11Y_003_COMPLETE`

### Phase 2: Form and Component Accessibility
4. **CC-A11Y-004** - Heading Hierarchy and Text Contrast
   - Wireframes: `CC-A11Y-004a.wireframe.md`
   - Dependencies: CC-A11Y-001, CC-A11Y-003
   - Creates: Heading structure validation, color contrast checker utilities
   - Promise: `CC_A11Y_004_COMPLETE`

5. **CC-A11Y-005** - Form Accessibility Consistency
   - Wireframes: `CC-A11Y-005a.wireframe.md`
   - Dependencies: CC-A11Y-002, CC-A11Y-003
   - Creates: ErrorSummary, FormFieldGroup, form accessibility patterns
   - Promise: `CC_A11Y_005_COMPLETE`

6. **CC-A11Y-006** - Modal and Dialog Accessibility
   - Wireframes: `CC-A11Y-006a.wireframe.md`
   - Dependencies: CC-A11Y-002, CC-A11Y-003
   - Creates: Focus trap patterns, modal dialog accessibility
   - Promise: `CC_A11Y_006_COMPLETE`

### Phase 3: Motion and Advanced Features
7. **CC-A11Y-007** - Motion and Animation Accessibility
   - Wireframes: `CC-A11Y-007a.wireframe.md`
   - Dependencies: CC-A11Y-001
   - Creates: useReducedMotion hook, animation guidelines
   - Promise: `CC_A11Y_007_COMPLETE`

8. **CC-A11Y-008** - Data Table Accessibility
   - Wireframes: `CC-A11Y-008a.wireframe.md`
   - Dependencies: CC-A11Y-002, CC-A11Y-003
   - Creates: AccessibleDataTable component, table ARIA patterns
   - Promise: `CC_A11Y_008_COMPLETE`

### Phase 4: Testing and Compliance
9. **CC-A11Y-009** - Accessibility Testing and Validation
   - Dependencies: All previous stories
   - Creates: Automated accessibility tests with axe-core
   - Promise: `CC_A11Y_009_COMPLETE`

10. **CC-A11Y-010** - WCAG 2.1 AA Compliance Audit
    - Dependencies: All previous stories
    - Creates: Compliance report, remediation documentation
    - Promise: `CC_A11Y_010_COMPLETE`

## Wireframe References

All accessibility wireframes follow the naming pattern `CC-A11Y-*`:

| Wireframe | Story | Purpose |
|-----------|-------|---------|
| CC-A11Y-001a | CC-A11Y-001 | Semantic HTML structure and landmarks |
| CC-A11Y-002a | CC-A11Y-002 | Keyboard navigation and focus management |
| CC-A11Y-003a | CC-A11Y-003 | Screen reader support and ARIA usage |
| CC-A11Y-004a | CC-A11Y-004 | Heading hierarchy and color contrast |
| CC-A11Y-005a | CC-A11Y-005 | Form accessibility patterns |
| CC-A11Y-006a | CC-A11Y-006 | Modal and dialog accessibility |
| CC-A11Y-007a | CC-A11Y-007 | Motion and animation guidelines |
| CC-A11Y-008a | CC-A11Y-008 | Data table accessibility |

Wireframes are located in: `./wireframes/`

## Completion Promise

When ALL accessibility stories pass successfully:
```xml
<promise>CC_ACCESSIBILITY_COMPLETE</promise>
```

## Constraints

### DO
- Follow WCAG 2.1 AA standards
- Use semantic HTML (h1-h6, nav, main, section, article, aside)
- Implement keyboard navigation for all interactive components
- Test with screen readers (NVDA, JAWS, Safari VoiceOver)
- Use Radix UI primitives which have built-in accessibility
- Add aria-label, aria-describedby, aria-live as appropriate
- Create reusable accessibility utilities and hooks
- Run accessibility tests with axe-core
- Document accessibility patterns in code comments
- Test with keyboard only (no mouse)

### DO NOT
- Skip accessibility testing for speed
- Use color alone to convey information
- Create custom components when Radix UI has accessible alternatives
- Hardcode focus management (use refs and useEffect properly)
- Forget aria-hidden for decorative elements
- Create inaccessible modals (missing focus trap)
- Use generic <div> for interactive elements (use appropriate semantic elements)

## File Structure

Accessibility pattern files follow this structure:

```
renoz-v3/
├── src/
│   ├── lib/
│   │   ├── accessibility/
│   │   │   ├── helpers.ts (focus management, aria utilities)
│   │   │   ├── hooks/
│   │   │   │   ├── use-reduced-motion.ts
│   │   │   │   ├── use-keyboard-navigation.ts
│   │   │   │   └── use-focus-trap.ts
│   │   │   └── validators/
│   │   │       ├── heading-hierarchy.ts
│   │   │       └── color-contrast.ts
│   │   └── constants/
│   │       └── a11y-roles.ts
│   ├── components/
│   │   └── shared/
│   │       ├── skip-link.tsx
│   │       ├── error-summary.tsx
│   │       ├── form-field-group.tsx
│   │       ├── accessible-data-table.tsx
│   │       ├── accessible-modal.tsx
│   │       └── accessible-tooltip.tsx
│   ├── styles/
│   │   ├── accessibility.css
│   │   └── focus-visible.css
│   └── routes/
│       └── _authed/
│           └── accessibility/
│               └── compliance-guide.tsx
```

## Key Success Metrics

- All interactive elements keyboard accessible
- All forms have proper labels and error messages
- All modals have focus traps and proper semantics
- Color contrast meets WCAG AA standards (4.5:1 normal, 3:1 large)
- Screen reader announcements work correctly
- Keyboard navigation flows logically
- Motion respects prefers-reduced-motion
- Zero TypeScript errors
- All tests passing
- Accessibility audit score > 90%

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - Focus management → Check useEffect cleanup in focus utilities
  - ARIA attributes → Verify aria-describedby IDs match element IDs
  - Screen reader testing → Use axe-core or Deque tools for automated scanning
  - Keyboard navigation → Check tabindex values and focus order

## Progress Template

```markdown
# Accessibility (CC-A11Y) Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] CC-A11Y-001: Semantic HTML and Landmark Structure
- [ ] CC-A11Y-002: Keyboard Navigation and Focus Management
- [ ] CC-A11Y-003: Screen Reader Support and ARIA
- [ ] CC-A11Y-004: Heading Hierarchy and Text Contrast
- [ ] CC-A11Y-005: Form Accessibility Consistency
- [ ] CC-A11Y-006: Modal and Dialog Accessibility
- [ ] CC-A11Y-007: Motion and Animation Accessibility
- [ ] CC-A11Y-008: Data Table Accessibility
- [ ] CC-A11Y-009: Accessibility Testing and Validation
- [ ] CC-A11Y-010: WCAG 2.1 AA Compliance Audit

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
**Target:** renoz-v3 Accessibility (CC-A11Y)
**Completion Promise:** CC_ACCESSIBILITY_COMPLETE
