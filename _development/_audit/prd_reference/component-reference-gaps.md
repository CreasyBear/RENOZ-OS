# PRD Reference Component Cross-Reference Analysis

**Date:** January 19, 2026
**Analysis:** Cross-reference of midday/reui/square components referenced in PRDs vs actual implementation
**Status:** Critical Gaps Identified

## Executive Summary

The cross-reference analysis reveals significant architectural deviations between PRD specifications and current implementation. Multiple high-priority components referenced in domain PRDs have not been implemented, leading to:

- **Inconsistent UI patterns** across domains
- **Duplicated effort** with custom implementations
- **Maintenance burden** from diverging from reference architectures
- **UX fragmentation** due to mixed component sources

## Critical Gaps by Domain

### 🎯 Orders Domain (HIGH PRIORITY)

#### Missing: Square-UI Task Management Patterns

**PRD Reference:** `renoz-v3/_Initiation/_prd/2-domains/orders/reference-patterns.md`

**Expected Implementation:**

```typescript
// Should use: opc/_reference/.square-ui-reference/templates/task-management/
// - task-board.tsx (kanban layout)
// - task-column.tsx (column structure)
// - task-card.tsx (draggable cards)
// - lib/status-utils.tsx (status configuration)
```

**Current Implementation:**

- ❌ Custom DND logic in `fulfillment-board.tsx`
- ❌ Manual drag-drop handling
- ❌ No reuse of square-ui patterns

**Impact:** Fulfillment dashboard should be 70%+ reuse of square-ui patterns, currently 0%.

#### Missing: Midday Invoice Form Architecture

**Expected Components:**

```typescript
// From: opc/_reference/.midday-reference/packages/invoice/src/
// - form-context.tsx (FormProvider + schemas)
// - line-items.tsx (useFieldArray pattern)
// - calculate.ts (pure calculation functions)
```

**Current Gap:** Order creation uses basic forms instead of established invoice patterns.

### 🛠️ Jobs Domain (HIGH PRIORITY)

#### Missing: REUI Kanban Component

**PRD Reference:** `renoz-v3/_Initiation/_prd/2-domains/jobs/jobs.prd.json` (41 references)

**Missing Component:**

```typescript
// Expected: src/components/ui/kanban.tsx
// Source: opc/_reference/.reui-reference/registry/default/ui/kanban.tsx
```

**Referenced Usage Patterns:**

- Task management kanban boards
- Checklist item reordering
- Template task sequencing
- Status-based column layouts

#### Missing: 15+ REUI Components

**Critical Missing Components:**

- `data-grid.tsx` (8 references - tables with advanced features)
- `filters.tsx` (5 references - filter panels)
- `base-*` variants (dialog, sheet, combobox, etc.)
- `statistic-cards` (3 references - metric displays)

### 📊 Support Domain (MEDIUM PRIORITY)

#### Missing: REUI Form Components

**PRD Reference:** `renoz-v3/_Initiation/_prd/2-domains/support/support.prd.json`

**Missing Components:**

- Form validation patterns
- Data grid implementations
- Chart components for metrics

## Component Source Analysis

### ✅ Available Reference Libraries

#### Midday Reference (`opc/_reference/.midday-reference/`)

- **UI Components:** 70+ components in `packages/ui/src/components/`
- **Invoice Package:** Complete form architecture in `packages/invoice/src/`
- **Calculation Utils:** Pure functions in `packages/invoice/src/utils/calculate.ts`

#### REUI Reference (`opc/_reference/.reui-reference/`)

- **Registry:** 120+ components in `registry/default/ui/`
- **Blocks:** Pre-built component combinations
- **Documentation:** Complete usage docs in `public/docs/`

#### Square-UI Reference (`opc/_reference/.square-ui-reference/`)

- **Templates:** Complete task management system
- **Mock Data:** Status utilities and configurations
- **Store Patterns:** Zustand-based state management

### ❌ Current Implementation Gaps

#### UI Components Inventory

**Present:** 56 components in `src/components/ui/`
**Missing from PRD References:** kanban, advanced data-grid, filters, base-* variants

#### Domain-Specific Patterns

**Orders:** Custom DND instead of square-ui patterns
**Jobs:** Missing kanban and data-grid implementations
**Support:** Basic components instead of REUI patterns

## Implementation Priority Matrix

### 🚨 CRITICAL (Immediate Action Required)

1. **REUI Kanban Component**
   - **Impact:** Jobs domain blocked
   - **Effort:** Medium (copy from reference)
   - **Risk:** High (core functionality missing)

2. **Square-UI Fulfillment Dashboard Refactor**
   - **Impact:** UX inconsistency
   - **Effort:** High (architecture change)
   - **Risk:** Medium (existing functionality)

3. **Midday Order Form Architecture**
   - **Impact:** Order creation UX
   - **Effort:** High (pattern adoption)
   - **Risk:** Low (new feature)

### ⚠️ HIGH (Next Sprint)

1. **REUI Data Grid Component**
   - **Impact:** Table functionality across domains
   - **Effort:** Medium
   - **Risk:** Medium

2. **REUI Filters Component**
   - **Impact:** Search/filter UX
   - **Effort:** Low
   - **Risk:** Low

### 📋 MEDIUM (Future Sprints)

1. **REUI Base Component Variants**
2. **Midday Calculation Utilities**
3. **REUI Chart Components**

## Recommended Action Plan

### Phase 1: Critical Components (Week 1-2)

```bash
# 1. Implement REUI kanban component
cp opc/_reference/.reui-reference/registry/default/ui/kanban.tsx src/components/ui/

# 2. Refactor fulfillment dashboard to use square-ui patterns
# - Replace custom DND with square-ui task management
# - Adopt status-utils.tsx patterns

# 3. Implement REUI data-grid
cp opc/_reference/.reui-reference/registry/default/ui/data-grid.tsx src/components/ui/
```

### Phase 2: Form Architecture (Week 3-4)

```bash
# Adopt midday invoice patterns for order creation
# - Implement form-context.tsx pattern
# - Add line-items.tsx with useFieldArray
# - Integrate calculate.ts utilities
```

### Phase 3: Remaining Components (Week 5-6)

```bash
# Implement remaining REUI components
# - filters.tsx
# - base-* component variants
# - statistic-cards blocks
```

## Risk Assessment

### High Risk Items

- **Fulfillment Dashboard Refactor:** Existing custom DND logic may have specific business rules
- **Jobs Domain Kanban:** May require coordination with existing job workflows

### Mitigation Strategies

- **Incremental Migration:** Test each component adoption separately
- **A/B Testing:** Compare UX of reference vs custom implementations
- **Documentation:** Update component documentation with reference sources

## Success Metrics

### Completion Criteria

- [ ] 100% of HIGH priority components implemented
- [ ] 80% reduction in custom component code
- [ ] Consistent UX patterns across domains
- [ ] All PRD references resolved

### Quality Gates

- [ ] Component tests pass
- [ ] UX consistency reviews
- [ ] Performance benchmarks maintained
- [ ] Accessibility compliance verified

---

**Next Steps:** Begin with REUI kanban component implementation. This unblocks the jobs domain and establishes the pattern for other component adoptions.
