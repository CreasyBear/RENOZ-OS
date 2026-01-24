# Plan: Refactor Fulfillment Dashboard to Square-UI Patterns

**Date:** January 19, 2026
**Status:** READY FOR IMPLEMENTATION
**Priority:** CRITICAL
**Timeline:** 1-2 weeks
**Component:** Domain Refactor

## Goal

Replace custom drag-and-drop implementation in fulfillment dashboard with standardized square-ui task management patterns, reducing code complexity while maintaining all functionality.

## Technical Choices

- **Reference Pattern**: `renoz-v3/_reference/.square-ui-reference/templates/task-management/`
- **State Management**: Evaluate Zustand store vs current TanStack Query approach
- **Component Structure**: Follow square-ui task-board, task-column, task-card pattern
- **Status Configuration**: Create order-specific status utilities
- **Preservation**: Maintain all existing business logic and workflows

## Infrastructure Integration Strategy

### Server/Client Architecture

- **Component Boundaries**: Maintain existing route-based component separation
- **State Synchronization**: Ensure TanStack Query integration with any new stores
- **Route Compatibility**: Verify components work within TanStack Router structure
- **Performance**: Preserve existing loading states and error boundaries

### Code Organization

- **Import Structure**: Maintain existing barrel exports and component organization
- **File Co-location**: Keep related components together following domain patterns
- **Type Exports**: Ensure TypeScript types are properly exported from domain modules
- **Bundle Impact**: Minimize impact on existing route chunks

## Current State Analysis

### Key Files

- **Current Implementation**: `src/components/domain/orders/fulfillment-dashboard/fulfillment-board.tsx`
- **Reference Pattern**: `renoz-v3/_reference/.square-ui-reference/templates/task-management/components/task/board/`
- **Status Utilities**: Need to create order-specific equivalents
- **Business Logic**: Custom workflow rules must be preserved

### Architecture Context

- Current: Custom DND with 332 lines of complex logic
- Target: Square-ui pattern with store-driven approach
- Gap: ~70% code reduction possible through pattern reuse

## Tasks

### Task 1: Infrastructure Assessment

Evaluate architectural impact before implementation.

- [ ] Analyze existing fulfillment dashboard bundle size and performance
- [ ] Verify TanStack Query integration points and data flow
- [ ] Assess impact on existing route chunking strategy
- [ ] Test compatibility with current component architecture patterns
- [ ] Establish performance baselines for comparison

**Files to assess:**

- `src/routes/_authenticated/orders/fulfillment.tsx` (route structure)
- `src/components/domain/orders/fulfillment-dashboard/` (component organization)
- `package.json` (bundle size analysis tools)

### Task 2: Create Order Status Configuration

Implement status utilities following square-ui patterns.

- [ ] Analyze square-ui `lib/status-utils.tsx` and `mock-data/statuses.tsx`
- [ ] Create order status configuration with icons, colors, labels
- [ ] Map existing order statuses to standardized format
- [ ] Include workflow transition rules and validation
- [ ] Ensure compatibility with existing order status enums

**Files to modify:**

- `src/lib/order-status-utils.ts` (new)
- `src/lib/order-status-config.ts` (new)

### Task 2: Refactor FulfillmentBoard Component

Replace custom DND with square-ui task-board pattern.

- [ ] Study `task-board.tsx` reference implementation
- [ ] Adapt for order workflow (5 stages vs generic task statuses)
- [ ] Maintain horizontal scrolling and responsive design
- [ ] Preserve bulk operations and selection logic

**Files to modify:**

- `src/components/domain/orders/fulfillment-dashboard/fulfillment-board.tsx` (major refactor)

### Task 3: Update FulfillmentColumn Component

Align with square-ui task-column pattern.

- [ ] Study `task-column.tsx` reference structure
- [ ] Adapt column header with status indicator and actions
- [ ] Maintain order count and value totals display
- [ ] Preserve bulk selection functionality per column

**Files to modify:**

- `src/components/domain/orders/fulfillment-dashboard/fulfillment-column.tsx` (refactor)

### Task 4: Update FulfillmentCard Component

Align with square-ui task-card pattern.

- [ ] Study `task-card.tsx` reference implementation
- [ ] Adapt card layout for order-specific data
- [ ] Maintain drag handles and selection indicators
- [ ] Preserve order details and action buttons

**Files to modify:**

- `src/components/domain/orders/fulfillment-dashboard/fulfillment-card.tsx` (refactor)

### Task 5: State Management Evaluation

Evaluate and potentially implement store pattern.

- [ ] Compare current TanStack Query approach with square-ui Zustand pattern
- [ ] Determine if store is needed or if Query is sufficient
- [ ] If needed, create `useOrdersStore` following square-ui patterns
- [ ] Ensure real-time updates and optimistic updates work

**Files to modify:**

- `src/stores/orders-store.ts` (new - if needed)
- `src/hooks/use-orders-realtime.ts` (verify compatibility)

### Task 6: Comprehensive Testing

Ensure no regressions in functionality.

- [ ] Update existing tests for new component structure
- [ ] Test all drag-and-drop scenarios
- [ ] Verify bulk operations still work
- [ ] Test edge cases and error conditions
- [ ] Performance testing with large order sets

**Files to modify:**

- `tests/unit/components/orders/fulfillment-kanban.test.tsx` (update)
- `tests/integration/orders/fulfillment-workflow.test.tsx` (new)

## Success Criteria

### Automated Verification

- [ ] All existing tests pass (no regressions)
- [ ] New component structure tests pass
- [ ] TypeScript compilation succeeds
- [ ] Bundle size reduced or maintained
- [ ] Route-based code splitting preserved
- [ ] Component lazy loading works within router structure
- [ ] TanStack Query integration maintained

### Manual Verification

- [ ] All order fulfillment workflows work identically
- [ ] Drag-and-drop feels smooth and responsive
- [ ] Bulk operations function correctly
- [ ] Mobile experience maintained
- [ ] Accessibility features preserved

## Risks (Pre-Mortem)

### Tigers

- **Business Logic Loss** (HIGH)
  - Risk: Custom workflow rules not captured in refactor
  - Mitigation: Comprehensive testing, gradual rollout, feature flags

- **Route Architecture Disruption** (HIGH)
  - Risk: Component changes break TanStack Router structure
  - Mitigation: Test route navigation and lazy loading thoroughly

- **State Management Conflicts** (MEDIUM)
  - Risk: Zustand store conflicts with existing TanStack Query patterns
  - Mitigation: Evaluate store necessity, prefer Query integration

### Elephants

- **Bundle Splitting Changes** (MEDIUM)
  - Concern: Refactor may affect how components are chunked
  - Note: Monitor and optimize route-based code splitting

### Elephants

- **State Management Complexity** (MEDIUM)
  - Concern: Adding Zustand store increases complexity
  - Note: Evaluate necessity vs current TanStack Query approach

## Out of Scope

- New features or UI changes
- Database or API modifications
- Mobile app updates (if separate)
- Integration with other order workflows

---

**Dependencies:** Square-ui reference patterns, existing order APIs

**Code Reduction Target:** 40% reduction in custom component code

**Next Plan:** After completion, implement midday invoice calculation utilities.
