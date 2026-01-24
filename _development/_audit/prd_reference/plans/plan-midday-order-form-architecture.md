# Plan: Implement Midday Order Form Architecture

**Date:** January 19, 2026
**Status:** READY FOR IMPLEMENTATION
**Priority:** HIGH
**Timeline:** 1-2 weeks
**Component:** Form Architecture

## Goal

Implement order creation form architecture using midday invoice patterns, providing robust form management with schema validation, line item handling, and consistent user experience.

## Technical Choices

- **Reference Pattern**: `renoz-v3/_reference/.midday-reference/packages/invoice/src/components/`
- **Form Library**: React Hook Form (already used in project)
- **Schema Validation**: Zod (already established)
- **State Management**: Form context provider pattern
- **Line Items**: useFieldArray for dynamic item management

## Current State Analysis

### Key Files

- **Reference Source**: `renoz-v3/_reference/.midday-reference/packages/invoice/src/components/form-context.tsx`
- **Current Forms**: `src/components/domain/orders/order-creation-wizard/`
- **Line Items**: Basic implementation exists but may lack advanced features

### Architecture Context

- FormProvider wrapper for React Hook Form context
- Nested schemas: order schema containing line item array
- Template support for configurable forms
- Dynamic line item management with add/remove/reorder

## Tasks

### Task 1: Order Form Context Implementation

Create the form context following midday patterns.

- [ ] Study `form-context.tsx` from midday reference
- [ ] Create order form schema with nested line items
- [ ] Implement FormProvider wrapper component
- [ ] Add template schema for configurable form fields
- [ ] Integrate with existing React Hook Form setup

**Files to modify:**

- `src/components/domain/orders/order-creation-wizard/order-form-context.tsx` (new/refactor)

### Task 2: Line Items Component Enhancement

Enhance line items using useFieldArray pattern.

- [ ] Study midday `line-items.tsx` implementation
- [ ] Implement dynamic line item management
- [ ] Add drag-and-drop reordering capability
- [ ] Enhance quantity and pricing inputs
- [ ] Add product autocomplete integration

**Files to modify:**

- `src/components/domain/orders/order-creation-wizard/order-line-items.tsx` (refactor)

### Task 3: Form Schema Definition

Create comprehensive Zod schemas for order forms.

- [ ] Define order form schema with all required fields
- [ ] Create line item schema with validation rules
- [ ] Add customer and product relationship schemas
- [ ] Implement conditional validation rules
- [ ] Add template schema for form customization

**Files to modify:**

- `src/schemas/order-schemas.ts` (extend)
- `src/schemas/order-form-schemas.ts` (new)

### Task 4: Form Components Enhancement

Update form components to use new architecture.

- [ ] Enhance customer selector with form integration
- [ ] Update product selector for line item addition
- [ ] Implement form validation display
- [ ] Add form persistence and draft saving
- [ ] Create form summary and totals display

**Files to modify:**

- `src/components/domain/orders/order-creation-wizard/order-form-step-*.tsx` (update multiple)
- `src/components/domain/orders/order-creation-wizard/order-summary.tsx` (enhance)

### Task 5: Integration and Testing

Integrate new architecture with existing workflows.

- [ ] Update order creation wizard to use new form context
- [ ] Integrate with order calculation utilities
- [ ] Add comprehensive form validation testing
- [ ] Test line item CRUD operations
- [ ] Verify form persistence and recovery

**Files to modify:**

- `src/components/domain/orders/order-creation-wizard/index.tsx` (update)
- `tests/unit/components/orders/order-form.test.tsx` (new)
- `tests/integration/orders/order-creation.test.tsx` (update)

## Success Criteria

### Automated Verification

- [ ] All form validation tests pass
- [ ] Line item operations work correctly
- [ ] Form submission succeeds with valid data
- [ ] TypeScript compilation succeeds
- [ ] Form performance acceptable (no lag with 50+ line items)

### Manual Verification

- [ ] Form UX matches midday invoice patterns
- [ ] Line item reordering works smoothly
- [ ] Validation messages are clear and helpful
- [ ] Form saves drafts automatically
- [ ] Mobile form experience is usable

## Risks (Pre-Mortem)

### Tigers

- **Form State Complexity** (MEDIUM)
  - Risk: Complex form state management could introduce bugs
  - Mitigation: Incremental implementation, comprehensive testing

- **Breaking Existing Workflows** (HIGH)
  - Risk: Changes to order creation could break existing user workflows
  - Mitigation: Feature flags, gradual rollout, extensive testing

### Elephants

- **Learning Curve** (LOW)
  - Concern: Team may need time to understand new patterns
  - Note: Provide documentation and examples

## Out of Scope

- Payment integration in order forms
- Advanced product catalog features
- Multi-step wizard redesign
- Form analytics and tracking

---

**Form Patterns Adopted:**

- FormProvider at top level for context
- Zod schemas for validation
- useFieldArray for dynamic fields
- Template-based form configuration
- Optimistic updates and error handling

**Next Plan:** After completion, implement REUI base components (combobox, number-field, etc.).
