# Implementation Plan: PRD Reference Component Adoption

**Date:** January 19, 2026
**Status:** READY FOR IMPLEMENTATION
**Priority:** CRITICAL
**Timeline:** 6 weeks (Phased approach)

## Goal

Address critical architectural gaps by implementing missing components referenced in PRDs. This will:

- **Standardize UX patterns** across all domains
- **Reduce development time** through component reuse (70%+)
- **Improve maintainability** by eliminating custom implementations
- **Ensure architectural consistency** with PRD specifications

## Technical Choices

- **Component Architecture**: Adopt shadcn/ui patterns (already established)
- **State Management**: Preserve TanStack Query for server state, consider Zustand for complex UIs
- **Styling**: Maintain Tailwind CSS with consistent design tokens
- **Testing**: Follow existing Vitest + React Testing Library patterns
- **Type Safety**: Maintain TypeScript strict mode

## Current State Analysis

### Key Files & Patterns

- **UI Components**: `src/components/ui/` - 56 shadcn/ui components (Radix + Tailwind)
- **Domain Structure**: `src/components/domain/[domain]/` - Feature-specific components
- **Reference Libraries**: `renoz-v3/_reference/` - 3 comprehensive libraries (midday, reui, square-ui)
- **Fulfillment Dashboard**: Custom DND implementation in `fulfillment-board.tsx`

### Architecture Gaps Identified

1. **Missing Kanban Component** - REUI kanban referenced in jobs domain
2. **Fulfillment Pattern Mismatch** - Should use square-ui instead of custom DND
3. **Order Creation Gap** - Missing midday invoice form architecture
4. **Jobs Domain Gaps** - 15+ REUI components not implemented

## Tasks

### Phase 1: Critical Infrastructure (Week 1-2)

#### Task 1.1: Implement REUI Kanban Component

Implement the comprehensive kanban component from REUI reference library.

- [ ] Copy `renoz-v3/_reference/.reui-reference/registry/default/ui/kanban.tsx` to `src/components/ui/kanban.tsx`
- [ ] Adapt import paths for local utilities (`@/lib/utils`)
- [ ] Update TypeScript types to match project conventions
- [ ] Add comprehensive unit tests following existing patterns
- [ ] Update component exports in `src/components/ui/index.ts`

**Files to modify:**

- `src/components/ui/kanban.tsx` (new)
- `src/components/ui/index.ts` (add export)
- `tests/unit/components/ui/kanban.test.tsx` (new)

**Success Criteria:**

- [ ] Kanban component renders without errors
- [ ] Basic drag-and-drop functionality works
- [ ] All tests pass (unit + integration)
- [ ] TypeScript compilation succeeds

#### Task 1.2: Implement REUI Data Grid Component

Implement advanced data grid component referenced in jobs and support domains.

- [ ] Copy `renoz-v3/_reference/.reui-reference/registry/default/ui/data-grid.tsx` to `src/components/ui/data-grid.tsx`
- [ ] Adapt for shadcn/ui patterns and local utilities
- [ ] Add sorting, filtering, pagination features
- [ ] Create comprehensive test suite
- [ ] Update component exports

**Files to modify:**

- `src/components/ui/data-grid.tsx` (new)
- `src/components/ui/index.ts` (add export)
- `tests/unit/components/ui/data-grid.test.tsx` (new)

**Success Criteria:**

- [ ] Data grid renders tabular data correctly
- [ ] Sorting and filtering work as expected
- [ ] Pagination functions properly
- [ ] Accessibility compliant (WCAG 2.1)

### Phase 2: Domain-Specific Implementation (Week 3-4)

#### Task 2.1: Refactor Fulfillment Dashboard to Square-UI Patterns

Replace custom DND implementation with square-ui task management patterns.

- [ ] Analyze `renoz-v3/_reference/.square-ui-reference/templates/task-management/`
- [ ] Create order status utilities following `lib/status-utils.tsx` pattern
- [ ] Refactor `fulfillment-board.tsx` to use square-ui architecture
- [ ] Implement `fulfillment-column.tsx` following `task-column.tsx` pattern
- [ ] Update `fulfillment-card.tsx` to match `task-card.tsx` structure
- [ ] Create order status configuration constants

**Files to modify:**

- `src/lib/order-status-utils.ts` (new - status config)
- `src/components/domain/orders/fulfillment-dashboard/fulfillment-board.tsx` (refactor)
- `src/components/domain/orders/fulfillment-dashboard/fulfillment-column.tsx` (refactor)
- `src/components/domain/orders/fulfillment-dashboard/fulfillment-card.tsx` (refactor)

**Success Criteria:**

- [ ] All existing functionality preserved
- [ ] Code complexity reduced by 40%
- [ ] Consistent with square-ui patterns
- [ ] All tests pass (no regressions)

#### Task 2.2: Implement Midday Invoice Patterns for Order Creation

Adopt midday invoice form architecture for order creation workflow.

- [ ] Implement calculation utilities from `packages/invoice/src/utils/calculate.ts`
- [ ] Adapt for Australian GST (10%) instead of VAT
- [ ] Create order form context following midday `form-context.tsx` pattern
- [ ] Implement line items with `useFieldArray` pattern from midday
- [ ] Create order form schemas with Zod

**Files to modify:**

- `src/lib/order-calculations.ts` (new - adapted from midday)
- `src/components/domain/orders/order-creation-wizard/order-form-context.tsx` (new/refactor)
- `src/components/domain/orders/order-creation-wizard/order-line-items.tsx` (refactor)
- `src/schemas/order-schemas.ts` (new - form validation)

**Success Criteria:**

- [ ] Order calculations accurate for GST
- [ ] Form validation works correctly
- [ ] Line item management follows established patterns
- [ ] All order creation tests pass

#### Task 2.3: Implement Jobs Domain REUI Components

Implement missing REUI components referenced in jobs PRD.

- [ ] Implement `base-combobox.tsx`, `base-number-field.tsx`, `base-progress.tsx`
- [ ] Implement `base-dialog.tsx`, `base-sheet.tsx`, `base-alert-dialog.tsx`
- [ ] Implement `base-tabs.tsx`, `base-switch.tsx`, `base-toast.tsx`
- [ ] Implement `filters.tsx` component
- [ ] Adapt all components for shadcn/ui patterns

**Files to modify:**

- `src/components/ui/base-combobox.tsx` (new)
- `src/components/ui/base-number-field.tsx` (new)
- `src/components/ui/base-progress.tsx` (new)
- `src/components/ui/base-dialog.tsx` (new)
- `src/components/ui/base-sheet.tsx` (new)
- `src/components/ui/base-alert-dialog.tsx` (new)
- `src/components/ui/base-tabs.tsx` (new)
- `src/components/ui/base-switch.tsx` (new)
- `src/components/ui/base-toast.tsx` (new)
- `src/components/ui/filters.tsx` (new)

**Success Criteria:**

- [ ] All components render correctly
- [ ] Follow shadcn/ui design patterns
- [ ] TypeScript types are correct
- [ ] Basic functionality verified

### Phase 3: Integration & Optimization (Week 5-6)

#### Task 3.1: Update Jobs Domain to Use New Components

Refactor jobs domain components to use newly implemented REUI components.

- [ ] Update job task components to use kanban component
- [ ] Implement data grids for materials and time entries
- [ ] Use filters component for job filtering
- [ ] Update forms to use base-* variants
- [ ] Ensure calendar integration works with new components

**Files to modify:**

- `src/components/domain/jobs/job-tasks-tab.tsx` (refactor)
- `src/components/domain/jobs/job-materials-tab.tsx` (refactor)
- `src/components/domain/jobs/job-time-tab.tsx` (refactor)
- `src/components/domain/jobs/job-template-form-dialog.tsx` (refactor)

**Success Criteria:**

- [ ] All jobs domain functionality works
- [ ] Consistent component usage across features
- [ ] No performance regressions
- [ ] User workflows unchanged

#### Task 3.2: Update Support Domain Components

Implement REUI components in support domain.

- [ ] Replace existing components with REUI data-grid
- [ ] Implement proper form patterns
- [ ] Update filtering to use filters component
- [ ] Ensure accessibility compliance

**Files to modify:**

- `src/components/domain/support/` (multiple files to refactor)

**Success Criteria:**

- [ ] Support workflows function correctly
- [ ] Improved UX consistency
- [ ] All accessibility requirements met

#### Task 3.3: Component Library Optimization

Finalize component library and documentation.

- [ ] Create comprehensive component documentation
- [ ] Add usage examples for complex components
- [ ] Optimize bundle size and tree shaking
- [ ] Create migration guide for future components

**Files to modify:**

- `src/components/ui/README.md` (update)
- `src/components/ui/index.ts` (complete exports)
- Performance optimization and documentation files

**Success Criteria:**

- [ ] All components properly exported
- [ ] Documentation complete and accurate
- [ ] Bundle size optimized
- [ ] Developer experience improved

## Success Criteria

### Automated Verification

- [ ] `npm run test` passes all tests (unit, integration, e2e)
- [ ] `npm run build` succeeds without errors
- [ ] `npm run type-check` passes
- [ ] Lighthouse performance scores maintained (>90)

### Manual Verification

- [ ] All domain workflows function correctly
- [ ] UX consistency across domains verified
- [ ] Accessibility testing passes (WCAG 2.1 AA)
- [ ] Cross-browser compatibility confirmed

## Risks (Pre-Mortem)

### Tigers

- **Fulfillment Dashboard Refactor** (HIGH)
  - Risk: Existing custom DND logic has business rules not captured in square-ui patterns
  - Mitigation: Comprehensive testing before/after, gradual rollout with rollback plan

- **Component Integration Issues** (MEDIUM)
  - Risk: New components may not integrate well with existing state management
  - Mitigation: Integration testing for each component, gradual adoption

### Elephants

- **Performance Impact** (MEDIUM)
  - Concern: Adding complex components may impact bundle size and runtime performance
  - Note: Monitor bundle size, implement lazy loading where appropriate

## Out of Scope

- Database schema changes
- API modifications
- New feature development
- UI/UX redesign beyond component standardization
- Mobile app updates (if separate)

---

**Implementation Approach:** Phased rollout with comprehensive testing at each stage. Each phase builds upon the previous, allowing for early validation and course correction.

**Success Metrics:**

- 70%+ code reuse from reference libraries
- 40% reduction in custom component code
- 100% PRD reference compliance
- Zero functionality regressions
