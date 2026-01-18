# Cross-Cutting PRDs

> **Purpose**: Define patterns and systems that span all domains in renoz-v3
> **Last Updated**: 2026-01-09
> **Status**: Active

---

## Overview

Cross-cutting concerns are patterns, components, and systems that apply across the entire Renoz application rather than belonging to a single domain. These PRDs ensure consistency in user experience, accessibility, and error handling throughout the system.

Unlike domain PRDs (customers, orders, products), cross-cutting PRDs are woven throughout development - their stories may be implemented alongside any domain work to ensure consistent behavior.

---

## PRDs in This Directory

| ID | Name | Priority | Stories | Focus |
|----|------|----------|---------|-------|
| **CC-ERROR** | [Error Handling](./error-handling.prd.json) | 1 | 8 | AppError hierarchy, error boundaries, user-friendly messages, logging |
| **CC-LOADING** | [Loading States](./loading-states.prd.json) | 1 | 6 | Skeletons, spinners, Suspense, performance targets |
| **CC-EMPTY** | [Empty States](./empty-states.prd.json) | 2 | 6 | First-run experience, empty views with CTAs, onboarding |
| **CC-NOTIFY** | [Notifications](./notifications.prd.json) | 1 | 8 | Toast system, notification center, Midday SDK, preferences |
| **CC-A11Y** | [Accessibility](./accessibility.prd.json) | 1 | 8 | Keyboard navigation, focus management, WCAG 2.1 AA, screen readers |

---

## Story Count Summary

- **CC-ERROR**: 8 stories
- **CC-LOADING**: 6 stories
- **CC-EMPTY**: 6 stories
- **CC-NOTIFY**: 8 stories
- **CC-A11Y**: 8 stories

**Total**: 36 cross-cutting stories

---

## Dependencies

Cross-cutting PRDs generally have few external dependencies but create dependencies for domain PRDs:

### Provides To Other PRDs

| Cross-Cutting | Provides |
|---------------|----------|
| **CC-ERROR** | Error boundary components, error message mapping, form error display |
| **CC-LOADING** | Skeleton components, spinner components, loading patterns |
| **CC-EMPTY** | Empty state components, first-run guidance |
| **CC-NOTIFY** | Toast notifications, confirmation dialogs |
| **CC-A11Y** | Focus utilities, screen reader announcements, keyboard patterns |

### Internal Dependencies

```
CC-ERROR ──┬── CC-A11Y-003 (focus management for error dialogs)
           └── CC-NOTIFY-001 (error toasts)

CC-LOADING ─── CC-A11Y-007 (reduced motion support)

CC-EMPTY ──── (no dependencies)

CC-NOTIFY ─── CC-A11Y-004 (screen reader announcements)

CC-A11Y ──── (no dependencies - foundational)
```

---

## Implementation Order

### Phase 1: Foundations (Implement First)

These have no dependencies and are required by other cross-cutting PRDs:

1. **CC-A11Y-001** - Skip links and landmarks
2. **CC-A11Y-003** - Focus management utilities
3. **CC-A11Y-004** - Screen reader announcements
4. **CC-LOAD-001** - Spinner components
5. **CC-LOAD-002** - Skeleton components
6. **CC-ERR-001** - AppError class hierarchy

### Phase 2: Core Systems

Build on foundations:

1. **CC-NOTIFY-001/002** - Toast system
2. **CC-ERR-002/003** - Error boundaries and message mapping
3. **CC-LOAD-003/004** - Suspense boundaries, table loading
4. **CC-EMPTY-001** - Empty state component

### Phase 3: Integration

Integrate with domains:

1. **CC-ERR-004/005** - Form errors, API error handling
2. **CC-NOTIFY-003/004** - Notification center
3. **CC-EMPTY-002/003** - Domain-specific empty states
4. **CC-A11Y-005/008** - Form and table accessibility

### Phase 4: Refinement

Polish and preferences:

1. **CC-NOTIFY-006** - Notification preferences
2. **CC-EMPTY-004/05** - First-run experience
3. **CC-A11Y-006/07** - Color contrast, reduced motion
4. **CC-ERR-007/08** - Retry mechanism, concurrency resolution

---

## Key Requirements Sources

These PRDs derive requirements from:

1. **conventions.md**
   - Component states (Default, Hover, Focus, Active, Disabled, Loading, Error)
   - AppError class hierarchy
   - Color usage tokens

2. **assumptions.md**
   - Performance targets (< 2s page load, < 500ms subsequent)
   - Full keyboard navigation requirement
   - Midday SDK for notifications

3. **VISION.md**
   - The Gasp Test (immediate understanding, 10-second lookup)
   - Single source of truth principle

---

## Quality Standards

All cross-cutting stories share these acceptance criteria:

1. **TypeScript compiles without errors**
2. **Components are accessible via keyboard**
3. **Screen readers can perceive and operate components**
4. **Visual states use correct color tokens**
5. **Loading states meet performance targets**
6. **Patterns documented for domain PRD use**

---

## Integration with Domain PRDs

When implementing domain features, reference cross-cutting patterns:

```tsx
// Example: Customer form using cross-cutting patterns
import { FormFieldError } from '@/components/shared/errors/form-error'
import { useToast } from '@/components/shared/notifications/use-toast'
import { SkeletonForm } from '@/components/shared/loading/skeleton-form'
import { CustomersEmptyState } from '@/components/shared/empty-states/customers'

export function CustomerForm() {
  const { toast } = useToast()

  const onSuccess = () => {
    toast.success('Customer saved successfully')
  }

  const onError = (error: AppError) => {
    toast.error(getErrorMessage(error))
  }

  // Form implementation...
}
```

---

*Cross-cutting concerns are woven throughout the codebase. Implement foundations first, then ensure every domain feature uses these patterns consistently.*
