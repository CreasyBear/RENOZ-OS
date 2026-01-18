# Cross-Cutting PRD PROMPT.md Reference

Quick reference guide for the 5 cross-cutting PRD PROMPT files created 2026-01-11.

## File Locations

| PRD | PROMPT Location | PRD File | Stories |
|-----|-----------------|----------|---------|
| Accessibility | `accessibility/PROMPT.md` | `accessibility.prd.json` | 10 (CC-A11Y) |
| Error Handling | `error-handling/PROMPT.md` | `error-handling.prd.json` | 10 (CC-ERR) |
| Loading States | `loading-states/PROMPT.md` | `loading-states.prd.json` | 10 (CC-LOAD) |
| Empty States | `empty-states/PROMPT.md` | `empty-states.prd.json` | 10 (CC-EMPTY) |
| Notifications | `notifications/PROMPT.md` | `notifications.prd.json` | 11 (CC-NOTIFY) |

## Master Completion Promises

- `CC_ACCESSIBILITY_COMPLETE` - When all accessibility stories done
- `CC_ERROR_HANDLING_COMPLETE` - When all error handling stories done
- `CC_LOADING_STATES_COMPLETE` - When all loading state stories done
- `CC_EMPTY_STATES_COMPLETE` - When all empty state stories done
- `CC_NOTIFICATIONS_COMPLETE` - When all notification stories done

## Each PROMPT.md Includes

1. **Objective** - Clear goal and user benefit
2. **Current State** - How to find current progress
3. **Context** - Tech stack and references
4. **Process** - 7-step verification workflow
5. **Story Execution Order** - 4 phases with dependencies
6. **Wireframe References** - Mapping to wireframes
7. **Completion Promise** - XML format for automation
8. **Constraints** - DO and DO NOT guidelines
9. **File Structure** - Folder templates
10. **Success Metrics** - Measurable outcomes
11. **Troubleshooting** - Common blockers and fixes
12. **Progress Template** - Markdown for tracking

## Story Phases

### Accessibility (10 stories)
- Phase 1: Foundation & Keyboard (3 stories)
- Phase 2: Form & Components (3 stories)
- Phase 3: Motion & Advanced (2 stories)
- Phase 4: Testing & Compliance (2 stories)

### Error Handling (10 stories)
- Phase 1: Class Hierarchy & Boundaries (3 stories)
- Phase 2: Messages & Display (3 stories)
- Phase 3: Logging & Recovery (2 stories)
- Phase 4: Advanced (2 stories)

### Loading States (10 stories)
- Phase 1: Spinner & Basic (3 stories)
- Phase 2: Component-Level (3 stories)
- Phase 3: Navigation & Advanced (3 stories)
- Phase 4: Performance (1 story)

### Empty States (10 stories)
- Phase 1: Foundations (3 stories)
- Phase 2: Contextual & Guidance (3 stories)
- Phase 3: Advanced (3 stories)
- Phase 4: Analytics (1 story)

### Notifications (11 stories)
- Phase 1: Toast & Basic (3 stories)
- Phase 2: Accessibility & In-App (3 stories)
- Phase 3: Advanced (3 stories)
- Phase 4: Preferences & Real-Time (3 stories)

## PRD Dependencies

```
Accessibility (CC-A11Y) ← Foundation
    ↓
Error Handling (CC-ERROR)
Loading States (CC-LOADING)
Empty States (CC-EMPTY)
Notifications (CC-NOTIFY)
```

Accessibility enables all other cross-cutting PRDs.

## How to Use

1. Navigate to desired PRD folder (e.g., `accessibility/`)
2. Open `PROMPT.md` in that folder
3. Create `progress.txt` from the template
4. Execute stories in order (phases ensure dependencies)
5. Reference `PROMPT.md` for wireframes and success metrics
6. Output completion promises on story completion

## Quick Start Commands

```bash
# View accessibility PROMPT
cat opc/_Initiation/_prd/cross-cutting/accessibility/PROMPT.md

# Find all PROMPT.md files
find opc/_Initiation/_prd/cross-cutting -name "PROMPT.md"

# Create progress.txt template (from PROMPT.md)
cat > opc/_Initiation/_prd/cross-cutting/accessibility/progress.txt << 'PROG'
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
- [Story notes]
PROG
```

## File Sizes

- `accessibility/PROMPT.md` - 258 lines
- `empty-states/PROMPT.md` - 264 lines
- `error-handling/PROMPT.md` - 261 lines
- `loading-states/PROMPT.md` - 262 lines
- `notifications/PROMPT.md` - 287 lines
- **Total**: 1,332 lines of comprehensive documentation

## Key Template Features

### Story Execution Order
Each story includes:
- Story ID and name
- Wireframe references
- Dependencies (what must complete first)
- What it creates
- Completion promise

### Wireframe Mapping
All wireframes follow naming patterns:
- `CC-A11Y-001a` through `CC-A11Y-008a`
- `CC-ERROR-001a` through `CC-ERROR-009a`
- `CC-LOADING-001a` through `CC-LOADING-009a`
- `CC-EMPTY-001a` through `CC-EMPTY-009a`
- `CC-NOTIFY-001a` through `CC-NOTIFY-010a`

Located in: `opc/_Initiation/_prd/_wireframes/cross-cutting/`

### Success Metrics
Each PROMPT defines:
- Measurable outcomes
- Performance targets
- Accessibility standards
- TypeScript/test requirements

---

**Created**: 2026-01-11
**Version**: 1.0
**Total Stories**: 51
**Total Promises**: 5 master + 51 individual = 56
