# Plan: Implement Midday Order Calculation Utilities

**Date:** January 19, 2026
**Status:** READY FOR IMPLEMENTATION
**Priority:** HIGH
**Timeline:** 3-5 days
**Component:** Business Logic Library

## Goal

Implement order calculation utilities based on midday invoice patterns, adapted for Australian GST instead of VAT, providing consistent, tested calculation logic across order workflows.

## Technical Choices

- **Reference Pattern**: `renoz-v3/_reference/.midday-reference/packages/invoice/src/utils/calculate.ts`
- **Tax System**: Australian GST (10%) instead of VAT
- **Architecture**: Pure functions with null-safety and comprehensive error handling
- **Testing**: Comprehensive unit tests with edge cases
- **Type Safety**: Full TypeScript with precise return types

## Current State Analysis

### Key Files

- **Reference Source**: `renoz-v3/_reference/.midday-reference/packages/invoice/src/utils/calculate.ts`
- **Current Calculations**: Likely scattered or minimal in order components
- **Usage Context**: Order creation, fulfillment, and reporting workflows

### Architecture Context

- Pure calculation functions with no side effects
- Null-safe operations with `?? 0` defaults
- Separate concerns: subtotal, tax, total calculations
- Comprehensive input validation and error handling

## Tasks

### Task 1: Core Calculation Functions

Implement the main calculation utilities adapted for Australian GST.

- [ ] Copy and adapt `calculateTotal` function from midday reference
- [ ] Replace VAT logic with Australian GST (10%)
- [ ] Implement `calculateLineItemTotal` function
- [ ] Add order-specific calculation functions (shipping, discounts)
- [ ] Ensure null-safety and error handling throughout

**Files to modify:**

- `src/lib/order-calculations.ts` (new)

### Task 2: Order-Specific Calculations

Extend calculations for order-specific business logic.

- [ ] Implement line item calculations with quantity and pricing
- [ ] Add shipping cost calculations
- [ ] Implement discount calculations (percentage and fixed amount)
- [ ] Create order total calculations combining all factors
- [ ] Add tax-exclusive and tax-inclusive calculation modes

**Files to modify:**

- `src/lib/order-calculations.ts` (extend)

### Task 3: Type Definitions

Create comprehensive TypeScript types for calculations.

- [ ] Define input/output interfaces for all calculation functions
- [ ] Create types for order calculation results
- [ ] Define line item calculation types
- [ ] Add error types for calculation failures

**Files to modify:**

- `src/lib/order-calculations.ts` (add types)
- `src/types/order-calculations.ts` (new - if complex)

### Task 4: Comprehensive Testing

Create thorough test coverage for all calculation scenarios.

- [ ] Unit tests for each calculation function
- [ ] Edge cases: null values, zero amounts, large numbers
- [ ] Tax calculation accuracy tests (GST 10%)
- [ ] Rounding and precision tests
- [ ] Error handling and validation tests

**Files to modify:**

- `tests/unit/lib/order-calculations.test.ts` (new)
- `tests/unit/lib/order-calculations-edge-cases.test.ts` (new)

### Task 5: Documentation and Usage Examples

Document the calculation utilities for team usage.

- [ ] JSDoc comments for all functions
- [ ] Usage examples in different contexts
- [ ] Business rule documentation (GST calculations)
- [ ] Migration guide from any existing calculations

**Files to modify:**

- `src/lib/order-calculations.ts` (documentation)
- `src/lib/README.md` (add calculations section)

## Success Criteria

### Automated Verification

- [ ] All calculation tests pass (100% coverage target)
- [ ] TypeScript compilation succeeds
- [ ] No linting errors
- [ ] Calculation accuracy verified with manual spot checks

### Manual Verification

- [ ] GST calculations correct (10% of taxable amount)
- [ ] Rounding behavior appropriate for currency
- [ ] Error handling provides meaningful messages
- [ ] Performance acceptable for real-time calculations

## Risks (Pre-Mortem)

### Tigers

- **Tax Calculation Errors** (HIGH)
  - Risk: Incorrect GST calculations could cause financial issues
  - Mitigation: Multiple review cycles, comprehensive testing, manual verification

### Elephants

- **Breaking Changes** (MEDIUM)
  - Concern: Existing order calculations may need updates
  - Note: Identify and update all existing usage points

## Out of Scope

- UI components for displaying calculations
- Integration with payment processors
- Multi-currency support (single currency assumption)
- Historical order recalculation

---

**Business Rules:**

- Australian GST: 10% on taxable items
- Inclusive pricing: GST included in displayed prices
- Rounding: Banker's rounding to 2 decimal places
- Zero tolerance: Treat null/undefined as zero

**Next Plan:** After completion, implement midday order form architecture.
