# Plan: Implement REUI Base Components

**Date:** January 19, 2026
**Status:** READY FOR IMPLEMENTATION
**Priority:** MEDIUM
**Timeline:** 1-2 weeks
**Component:** UI Library Expansion

## Goal

Implement essential REUI base components (combobox, number-field, progress, dialog, sheet, etc.) to support jobs domain and other advanced UI requirements, establishing consistent form and interaction patterns.

## Technical Choices

- **Reference Source**: `renoz-v3/_reference/.reui-reference/registry/default/ui/base-*.tsx`
- **Design System**: Maintain shadcn/ui compatibility
- **Component Scope**: Focus on frequently referenced base components
- **Testing**: Unit tests for each component
- **Accessibility**: WCAG 2.1 AA compliance

## Current State Analysis

### Key Files

- **Reference Sources**: Multiple `base-*.tsx` files in REUI registry
- **Current Components**: Basic shadcn/ui components exist
- **Usage Requirements**: Jobs domain (15+ references), forms, dialogs

### Components to Implement

- base-combobox (product picker, template selection)
- base-number-field (quantities, pricing)
- base-progress (job completion, checklists)
- base-dialog (forms, confirmations)
- base-sheet (side panels, details)
- base-alert-dialog (confirmations)
- base-tabs (multi-section forms)
- base-switch (boolean toggles)
- base-toast (notifications)

## Tasks

### Task 1: Core Form Components

Implement essential form input components.

- [ ] Implement base-combobox with search and selection
- [ ] Create base-number-field with stepper controls
- [ ] Add base-switch for boolean inputs
- [ ] Implement base-textarea with auto-resize
- [ ] Test all components with form libraries

**Files to modify:**

- `src/components/ui/base-combobox.tsx` (new)
- `src/components/ui/base-number-field.tsx` (new)
- `src/components/ui/base-switch.tsx` (new)
- `src/components/ui/base-textarea.tsx` (new)

### Task 2: Overlay Components

Implement dialog and sheet components.

- [ ] Implement base-dialog for modal forms
- [ ] Create base-sheet for side panel interfaces
- [ ] Add base-alert-dialog for confirmations
- [ ] Implement base-popover for dropdowns
- [ ] Ensure proper focus management and accessibility

**Files to modify:**

- `src/components/ui/base-dialog.tsx` (new)
- `src/components/ui/base-sheet.tsx` (new)
- `src/components/ui/base-alert-dialog.tsx` (new)
- `src/components/ui/base-popover.tsx` (new)

### Task 3: Feedback Components

Implement progress and notification components.

- [ ] Create base-progress for completion indicators
- [ ] Implement base-toast for notifications
- [ ] Add base-alert for status messages
- [ ] Create base-badge for status indicators

**Files to modify:**

- `src/components/ui/base-progress.tsx` (new)
- `src/components/ui/base-toast.tsx` (new)
- `src/components/ui/base-alert.tsx` (new)
- `src/components/ui/base-badge.tsx` (new)

### Task 4: Navigation Components

Implement remaining navigation components.

- [ ] Create base-tabs for multi-section interfaces
- [ ] Implement base-accordion for collapsible content
- [ ] Add base-collapsible for expandable sections
- [ ] Create base-separator for visual divisions

**Files to modify:**

- `src/components/ui/base-tabs.tsx` (new)
- `src/components/ui/base-accordion.tsx` (new)
- `src/components/ui/base-collapsible.tsx` (new)
- `src/components/ui/base-separator.tsx` (new)

### Task 5: Testing and Documentation

Create comprehensive testing and documentation.

- [ ] Unit tests for all base components
- [ ] Integration tests with form libraries
- [ ] Accessibility testing and compliance
- [ ] Documentation with usage examples
- [ ] Update component library exports

**Files to modify:**

- `tests/unit/components/ui/base-*.test.tsx` (multiple new files)
- `src/components/ui/index.ts` (add exports)
- `src/components/ui/README.md` (update)

## Success Criteria

### Automated Verification

- [ ] All base component tests pass
- [ ] TypeScript compilation succeeds
- [ ] Bundle size impact acceptable (< 100kb total)
- [ ] No conflicts with existing shadcn/ui components

### Manual Verification

- [ ] All components render correctly
- [ ] Form integration works properly
- [ ] Accessibility features functional
- [ ] Design consistent with shadcn/ui
- [ ] Mobile responsiveness verified

## Risks (Pre-Mortem)

### Tigers

- **Component Conflicts** (MEDIUM)
  - Risk: Base components may conflict with existing shadcn/ui components
  - Mitigation: Namespace carefully, test thoroughly

### Elephants

- **Maintenance Burden** (LOW)
  - Concern: Adding many components increases maintenance load
  - Note: Prioritize most-used components, implement others as needed

## Out of Scope

- Advanced data visualization components
- Custom business logic components
- Mobile-specific component variants
- Theming system integration

---

**Implementation Order:** combobox, number-field, progress, dialog, sheet (most critical first)

**Next Plan:** After completion, implement REUI filters component.
