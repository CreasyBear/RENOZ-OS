# Users Domain Wireframes - UI Pattern Application Review

**Date**: 2026-01-10
**Domain**: Users (DOM-USER)
**Wireframes Reviewed**: 8 files
**Purpose**: Map wireframe components to reference UI patterns for implementation

---

## Overview

This document maps each Users domain wireframe to corresponding UI patterns available in:
- `_reference/.reui-reference/registry/default/ui/` (Reui component library)
- `_reference/.midday-reference/` (Midday application examples)

---

## Wireframe: DOM-USER-001 - Enhance User Activity View

**File**: `DOM-USER-001.wireframe.md`
**Status**: ✓ READY (Schema implemented)
**Components**: Activity Tab, DataTable, Pagination, Export Dialog

### UI Patterns (Reference Implementation)

| Wireframe Component | Reference Component | Path |
|---------------------|---------------------|------|
| **Activity Tab** | Base Tabs | `_reference/.reui-reference/registry/default/ui/base-tabs.tsx` |
| **Activity DataTable** | DataGrid Table | `_reference/.reui-reference/registry/default/ui/data-grid-table.tsx` |
| **Pagination** | DataGrid Pagination | `_reference/.reui-reference/registry/default/ui/data-grid-pagination.tsx` |
| **Export Dialog** | Base Dialog | `_reference/.reui-reference/registry/default/ui/base-dialog.tsx` |
| **Export Form** | Base Form | `_reference/.reui-reference/registry/default/ui/base-form.tsx` |
| **Date Range Picker** | DateField | `_reference/.reui-reference/registry/default/ui/datefield.tsx` |
| **Checkbox Group** | Base Checkbox Group | `_reference/.reui-reference/registry/default/ui/base-checkbox-group.tsx` |
| **Progress Indicator** | Base Progress | `_reference/.reui-reference/registry/default/ui/base-progress.tsx` |
| **Toast Notification** | Base Toast | `_reference/.reui-reference/registry/default/ui/base-toast.tsx` |

### Midday Examples
- **Activity log pattern**: `_reference/.midday-reference/apps/dashboard/src/components/transaction-list.tsx`
- **Export functionality**: Similar pattern in Midday's transaction exports

---

## Wireframe: DOM-USER-002c - User Groups UI

**File**: `DOM-USER-002c.wireframe.md`
**Status**: ⚠️ PENDING (Requires DOM-USER-002a, DOM-USER-002b)
**Components**: DataTable, Dialog, Multi-select Combobox, Badge

### UI Patterns (Reference Implementation)

| Wireframe Component | Reference Component | Path |
|---------------------|---------------------|------|
| **Groups DataTable** | DataGrid Table | `_reference/.reui-reference/registry/default/ui/data-grid-table.tsx` |
| **Create/Edit Dialog** | Base Dialog | `_reference/.reui-reference/registry/default/ui/base-dialog.tsx` |
| **Group Form** | Base Form | `_reference/.reui-reference/registry/default/ui/base-form.tsx` |
| **User Multi-select** | Base Combobox (multi) | `_reference/.reui-reference/registry/default/ui/base-combobox.tsx` |
| **Group Badge** | Base Badge | `_reference/.reui-reference/registry/default/ui/base-badge.tsx` |
| **Member List** | Data Grid | `_reference/.reui-reference/registry/default/ui/data-grid.tsx` |
| **Search Input** | Base Input | `_reference/.reui-reference/registry/default/ui/base-input.tsx` |
| **Empty State** | Card with custom content | `_reference/.reui-reference/registry/default/ui/card.tsx` |

### Midday Examples
- **Team management**: `_reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/(sidebar)/account/teams/page.tsx`
- **Member assignment**: `_reference/.midday-reference/apps/dashboard/src/components/assign-user.tsx`
- **User badges**: `_reference/.midday-reference/apps/dashboard/src/components/assigned-user.tsx`

---

## Wireframe: DOM-USER-003c - Delegation UI

**File**: `DOM-USER-003c.wireframe.md`
**Status**: ⚠️ PENDING (Requires DOM-USER-003a, DOM-USER-003b)
**Components**: Form, Alert Banner, Badge, Date Range Picker

### UI Patterns (Reference Implementation)

| Wireframe Component | Reference Component | Path |
|---------------------|---------------------|------|
| **Delegation Form** | Base Form | `_reference/.reui-reference/registry/default/ui/base-form.tsx` |
| **Delegate Selector** | Base Select | `_reference/.reui-reference/registry/default/ui/base-select.tsx` |
| **Date Range** | DateField (2 fields) | `_reference/.reui-reference/registry/default/ui/datefield.tsx` |
| **Alert Banner** | Alert | `_reference/.reui-reference/registry/default/ui/alert.tsx` |
| **Status Card** | Card | `_reference/.reui-reference/registry/default/ui/card.tsx` |
| **Delegation Badge** | Base Badge | `_reference/.reui-reference/registry/default/ui/base-badge.tsx` |
| **History Table** | DataGrid Table | `_reference/.reui-reference/registry/default/ui/data-grid-table.tsx` |
| **Confirmation Dialog** | Alert Dialog | `_reference/.reui-reference/registry/default/ui/alert-dialog.tsx` |

### Midday Examples
- **Settings forms**: `_reference/.midday-reference/apps/dashboard/src/components/account-settings.tsx`
- **Date range selection**: Used throughout Midday for filtering
- **Alert patterns**: Dashboard banners in Midday

---

## Wireframe: DOM-USER-004 - Add Image Cropper to Avatar Upload

**File**: `DOM-USER-004.wireframe.md`
**Status**: ✓ READY (Schema implemented)
**Components**: Image Cropper Dialog, File Upload, Preview

### UI Patterns (Reference Implementation)

| Wireframe Component | Reference Component | Path |
|---------------------|---------------------|------|
| **Avatar Display** | Base Avatar | `_reference/.reui-reference/registry/default/ui/base-avatar.tsx` |
| **Avatar Group** | Avatar Group | `_reference/.reui-reference/registry/default/ui/avatar-group.tsx` |
| **Cropper Dialog** | Base Dialog | `_reference/.reui-reference/registry/default/ui/base-dialog.tsx` |
| **File Drop Zone** | Custom (drag & drop) | Implement with HTML5 drag events |
| **Zoom Slider** | Base Slider | `_reference/.reui-reference/registry/default/ui/base-slider.tsx` |
| **Button Group** | Button (multiple) | `_reference/.reui-reference/registry/default/ui/button.tsx` |
| **Progress Bar** | Base Progress | `_reference/.reui-reference/registry/default/ui/base-progress.tsx` |
| **Confirmation Dialog** | Alert Dialog | `_reference/.reui-reference/registry/default/ui/alert-dialog.tsx` |

### Midday Examples
- **Avatar upload**: `_reference/.midday-reference/apps/dashboard/src/components/avatar-upload.tsx` ✨ **EXACT MATCH**
- **Profile settings**: `_reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/(sidebar)/account/page.tsx`

**Implementation Note**: Midday has an `avatar-upload.tsx` component that likely implements the cropper functionality - review this for direct reference.

---

## Wireframe: DOM-USER-005c - Last Login UI Display

**File**: `DOM-USER-005c.wireframe.md`
**Status**: ✓ READY (Schema implemented)
**Components**: DataTable Column, Badge, Sortable Header, Tooltip

### UI Patterns (Reference Implementation)

| Wireframe Component | Reference Component | Path |
|---------------------|---------------------|------|
| **Last Login Column** | Data Grid Column | `_reference/.reui-reference/registry/default/ui/data-grid-column-header.tsx` |
| **Sortable Header** | DataGrid Column Header | `_reference/.reui-reference/registry/default/ui/data-grid-column-header.tsx` |
| **Inactive Badge** | Base Badge (warning) | `_reference/.reui-reference/registry/default/ui/base-badge.tsx` |
| **Tooltip** | Base Tooltip | `_reference/.reui-reference/registry/default/ui/base-tooltip.tsx` |
| **Filter Dropdown** | DataGrid Column Filter | `_reference/.reui-reference/registry/default/ui/data-grid-column-filter.tsx` |
| **Alert Banner** | Alert | `_reference/.reui-reference/registry/default/ui/alert.tsx` |
| **Relative Time** | Custom utility | Implement with date-fns or similar |

### Midday Examples
- **Activity tracking**: Similar patterns in transaction lists
- **Status badges**: `_reference/.midday-reference/apps/dashboard/src/components/animated-status.tsx`

---

## Wireframe: DOM-USER-006b - Bulk User Operations UI

**File**: `DOM-USER-006b.wireframe.md`
**Status**: ✓ READY (Schema implemented)
**Components**: Bulk Action Toolbar, Progress Dialog, Result Dialog

### UI Patterns (Reference Implementation)

| Wireframe Component | Reference Component | Path |
|---------------------|---------------------|------|
| **Bulk Actions Toolbar** | Base Toolbar | `_reference/.reui-reference/registry/default/ui/base-toolbar.tsx` |
| **Selection State** | DataGrid (row selection) | `_reference/.reui-reference/registry/default/ui/data-grid.tsx` |
| **Role Dropdown** | Base Select | `_reference/.reui-reference/registry/default/ui/base-select.tsx` |
| **Email Dialog** | Base Dialog | `_reference/.reui-reference/registry/default/ui/base-dialog.tsx` |
| **Progress Dialog** | Dialog + Progress | `_reference/.reui-reference/registry/default/ui/base-progress.tsx` |
| **Result Summary** | Alert Dialog | `_reference/.reui-reference/registry/default/ui/alert-dialog.tsx` |
| **Confirmation** | Alert Dialog | `_reference/.reui-reference/registry/default/ui/alert-dialog.tsx` |
| **Impact Table** | DataGrid | `_reference/.reui-reference/registry/default/ui/data-grid.tsx` |

### Midday Examples
- **Bulk actions**: `_reference/.midday-reference/apps/dashboard/src/components/bulk-actions.tsx` ✨ **EXACT MATCH**
- **Multi-select patterns**: Used in transaction management

**Implementation Note**: Midday has a `bulk-actions.tsx` component - this is a perfect reference for the pattern.

---

## Wireframe: DOM-USER-007c - User Onboarding UI

**File**: `DOM-USER-007c.wireframe.md`
**Status**: ⚠️ PENDING (Requires DOM-USER-007a, DOM-USER-007b)
**Components**: Dashboard Card, Checklist, Progress Bar, Video Player

### UI Patterns (Reference Implementation)

| Wireframe Component | Reference Component | Path |
|---------------------|---------------------|------|
| **Onboarding Card** | Card | `_reference/.reui-reference/registry/default/ui/card.tsx` |
| **Progress Bar** | Base Progress | `_reference/.reui-reference/registry/default/ui/base-progress.tsx` |
| **Checklist** | Checkbox Group | `_reference/.reui-reference/registry/default/ui/base-checkbox-group.tsx` |
| **Step Details** | Collapsible | `_reference/.reui-reference/registry/default/ui/collapsible.tsx` |
| **Video Player** | Custom HTML5 video | Native `<video>` with controls |
| **Skip Dialog** | Alert Dialog | `_reference/.reui-reference/registry/default/ui/alert-dialog.tsx` |
| **Celebration** | Custom animation | CSS/Framer Motion |
| **Admin View** | DataGrid | `_reference/.reui-reference/registry/default/ui/data-grid.tsx` |

### Midday Examples
- **Setup flow**: `_reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/setup/page.tsx`
- **All done state**: `_reference/.midday-reference/apps/dashboard/src/app/[locale]/(public)/all-done/page.tsx`

**Implementation Note**: Midday's setup and all-done pages provide excellent reference for onboarding UX.

---

## Wireframe: DOM-USER-008c - Invitation Enhancement UI

**File**: `DOM-USER-008c.wireframe.md`
**Status**: ✓ READY (Schema implemented)
**Components**: Form, Preview Card, CSV Upload, Status Table

### UI Patterns (Reference Implementation)

| Wireframe Component | Reference Component | Path |
|---------------------|---------------------|------|
| **Invite Form** | Base Form | `_reference/.reui-reference/registry/default/ui/base-form.tsx` |
| **Email Preview** | Preview Card | `_reference/.reui-reference/registry/default/ui/base-preview-card.tsx` |
| **CSV Upload** | File input + Dialog | `_reference/.reui-reference/registry/default/ui/base-dialog.tsx` |
| **Validation Table** | DataGrid | `_reference/.reui-reference/registry/default/ui/data-grid.tsx` |
| **Expiration Badge** | Badge (variants) | `_reference/.reui-reference/registry/default/ui/badge.tsx` |
| **History Dialog** | Dialog | `_reference/.reui-reference/registry/default/ui/dialog.tsx` |
| **Character Counter** | Custom with Input | Add to `base-input.tsx` |
| **Resend Confirmation** | Alert Dialog | `_reference/.reui-reference/registry/default/ui/alert-dialog.tsx` |

### Midday Examples
- **Team invitations**: `_reference/.midday-reference/apps/dashboard/src/app/[locale]/(app)/(sidebar)/account/teams/page.tsx`
- **Invite flow**: Check team management pages for invitation patterns

---

## Common UI Pattern Summary

### Most Frequently Used Components

| Component | Usage Count | Files |
|-----------|-------------|-------|
| **Base Dialog** | 8/8 | All wireframes use dialogs |
| **Base Form** | 6/8 | Forms in invite, delegation, groups, onboarding, etc. |
| **DataGrid/Table** | 7/8 | Activity, groups, bulk ops, invitations, etc. |
| **Base Badge** | 6/8 | Status indicators throughout |
| **Alert Dialog** | 5/8 | Confirmations and destructive actions |
| **Card** | 4/8 | Status displays, onboarding, preview |
| **Base Progress** | 4/8 | Upload, bulk ops, onboarding |
| **Toast** | 8/8 | Success/error notifications (all) |

### Custom Components Needed

Components that don't have direct matches in reference and need custom implementation:

1. **Image Cropper Canvas** (DOM-USER-004)
   - Use library like `react-easy-crop` or `react-avatar-editor`
   - Integrate with Reui Dialog and Slider

2. **Video Player with Chapters** (DOM-USER-007c)
   - HTML5 `<video>` element
   - Custom chapter navigation UI
   - Progress tracking logic

3. **CSV Parser & Validator** (DOM-USER-008c)
   - Use `papaparse` for CSV parsing
   - Custom validation logic
   - Display results in DataGrid

4. **Bulk Operations Engine** (DOM-USER-006b)
   - Queue management for bulk actions
   - Progress tracking with status updates
   - Error handling and retry logic

5. **Relative Time Display** (DOM-USER-005c)
   - Use `date-fns` formatDistanceToNow
   - Auto-update with React interval
   - Tooltip with exact timestamp

---

## Implementation Priority

### Phase 1: Foundation (READY - No dependencies)
1. ✅ **DOM-USER-001** - Activity View (straightforward DataGrid + Tabs)
2. ✅ **DOM-USER-004** - Avatar Upload (leverage Midday's avatar-upload.tsx)
3. ✅ **DOM-USER-005c** - Last Login Display (column + badge + tooltip)
4. ✅ **DOM-USER-008c** - Invitation Enhancement (form + preview + table)
5. ✅ **DOM-USER-006b** - Bulk Operations (leverage Midday's bulk-actions.tsx)

### Phase 2: Schema-Dependent (PENDING backend)
6. ⚠️ **DOM-USER-002c** - User Groups (needs userGroups schema)
7. ⚠️ **DOM-USER-003c** - Delegation (needs userDelegations schema)
8. ⚠️ **DOM-USER-007c** - Onboarding (needs userOnboarding schema)

---

## Accessibility Checklist

All wireframes include detailed accessibility requirements. Ensure:

- [ ] **Keyboard Navigation**: Tab order, Enter/Space, Arrow keys, Escape
- [ ] **ARIA Labels**: Proper role, aria-label, aria-describedby, aria-live
- [ ] **Screen Reader**: Meaningful announcements for state changes
- [ ] **Focus Management**: Clear focus indicators, focus trap in modals
- [ ] **Color Contrast**: WCAG AA compliance (4.5:1 minimum)
- [ ] **Form Validation**: Error messages linked to inputs (aria-invalid, aria-describedby)

Reference: Each wireframe has an "Accessibility Notes" section with specific requirements.

---

## Animation Standards

### Motion Principles (from wireframes)

| Animation Type | Duration | Easing | Notes |
|----------------|----------|--------|-------|
| **Dialog Open** | 250ms | ease-out | Backdrop fade + scale |
| **Dialog Close** | 200ms | ease-in | Reverse of open |
| **Toast Appear** | 300ms | ease-out | Slide or translate |
| **Toast Dismiss** | 200ms | ease-in | After 3-5s delay |
| **Progress Bar** | 300ms | ease-out | Smooth width transition |
| **Badge Pulse** | 2s | ease-in-out | For warnings/alerts |
| **Row Animation** | 200ms | ease-out | Staggered (50ms delay) |
| **Form Error** | 200ms | ease-out | Slide down + fade |

Use Framer Motion or CSS transitions consistently across all components.

---

## Mobile Responsiveness

All wireframes include 3 breakpoints:
- **Mobile**: 375px (full-screen dialogs, bottom sheets)
- **Tablet**: 768px (side-by-side layouts, compact tables)
- **Desktop**: 1280px+ (full features, multi-column)

### Key Patterns:
- **Mobile**: Stack vertically, hide non-essential columns, use bottom sheets
- **Tablet**: 2-column layouts, compact tables, slide-over panels
- **Desktop**: Full tables, side-by-side previews, floating dialogs

Reference Reui's responsive utilities and Tailwind breakpoints.

---

## Data Fetching Patterns

### TanStack Query Hooks

Based on Midday patterns, implement:

```typescript
// Example from DOM-USER-001 (Activity)
useQuery({
  queryKey: ['user-activity', userId, page],
  queryFn: () => getUserActivity({ userId, page, pageSize: 10 }),
  staleTime: 1000 * 60 * 5, // 5 minutes
});

// Example from DOM-USER-005c (Last Login)
useQuery({
  queryKey: ['users-list', filters],
  queryFn: () => getUsersList(filters),
  select: (data) => ({
    ...data,
    users: data.users.map(user => ({
      ...user,
      isInactive: isMoreThan30DaysAgo(user.lastLoginAt),
    })),
  }),
});
```

### Server Actions

Use Midday's server action pattern:
- Located in `src/server/functions/users/`
- Return type-safe responses
- Handle errors with proper error boundaries

---

## Testing Strategy

### Component Tests
- Unit tests for each component with Vitest
- Use `@testing-library/react` for user interactions
- Mock TanStack Query with `QueryClient` wrapper

### Integration Tests
- E2E tests with Playwright
- Test full user flows (invite, bulk ops, delegation)
- Accessibility audits with axe-core

### Visual Regression
- Chromatic for visual testing
- Test all 3 breakpoints
- Test all interaction states (loading, error, empty, success)

---

## Next Steps

1. **Review Midday Examples**: Study the exact matches (avatar-upload, bulk-actions)
2. **Set up Reui Components**: Import needed base components from .reui-reference
3. **Implement Phase 1**: Start with DOM-USER-001 (Activity View)
4. **Backend Coordination**: Work with backend team on Phase 2 schemas
5. **Design Review**: Validate implementations match wireframes
6. **Accessibility Audit**: Test with screen readers and keyboard navigation

---

## File Paths Reference

### Reui Base Components
```
_reference/.reui-reference/registry/default/ui/
├── base-dialog.tsx
├── base-form.tsx
├── base-input.tsx
├── base-select.tsx
├── base-checkbox.tsx
├── base-badge.tsx
├── base-progress.tsx
├── base-toast.tsx
├── base-tabs.tsx
├── data-grid.tsx
├── data-grid-table.tsx
├── data-grid-pagination.tsx
├── data-grid-column-header.tsx
├── data-grid-column-filter.tsx
└── ... (100+ components available)
```

### Midday Key Examples
```
_reference/.midday-reference/apps/dashboard/src/
├── components/
│   ├── avatar-upload.tsx          ← Avatar cropper reference
│   ├── bulk-actions.tsx           ← Bulk operations reference
│   ├── assign-user.tsx            ← User assignment pattern
│   └── account-settings.tsx       ← Settings form pattern
└── app/[locale]/(app)/(sidebar)/
    ├── account/teams/page.tsx     ← Team management reference
    └── setup/page.tsx             ← Onboarding flow reference
```

---

**End of Review**

Total Wireframes: 8
Ready to Implement: 5
Pending Dependencies: 3
Reui Components Used: ~25 unique
Midday Examples Found: ~8 direct references
