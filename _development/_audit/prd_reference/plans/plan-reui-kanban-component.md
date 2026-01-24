# Plan: Implement REUI Kanban Component

**Date:** January 19, 2026
**Status:** READY FOR IMPLEMENTATION
**Priority:** CRITICAL
**Timeline:** 3-5 days
**Component:** UI Library Addition

## Goal

Implement the comprehensive kanban component from REUI reference library to unblock jobs domain functionality and establish reusable kanban patterns across the application.

## Technical Choices

- **Base Framework**: Copy from `renoz-v3/_reference/.reui-reference/registry/default/ui/kanban.tsx`
- **Styling**: Adapt to shadcn/ui patterns (Tailwind + CSS variables)
- **State Management**: Maintain DND context patterns from reference
- **Type Safety**: Full TypeScript support with generics

## Infrastructure Integration Strategy

### Bundle Management

- **Lazy Loading**: Implement dynamic imports for kanban component
- **Code Splitting**: Separate DND utilities into async chunks
- **Tree Shaking**: Ensure unused DND features are eliminated

### Import Resolution

- **Path Aliases**: Use `@/lib/utils` instead of relative paths
- **Dependency Management**: Verify @dnd-kit versions match existing usage
- **Export Pattern**: Follow existing `src/components/ui/index.ts` barrel exports

### Component Architecture

- **Composition**: Maintain compound component pattern from reference
- **TypeScript**: Use project tsconfig.json settings
- **CSS**: Integrate with existing Tailwind configuration
- **Accessibility**: Preserve ARIA patterns from reference

## Current State Analysis

### Key Files

- **Reference Source**: `renoz-v3/_reference/.reui-reference/registry/default/ui/kanban.tsx`
- **Current UI Library**: `src/components/ui/` (56 shadcn/ui components)
- **Jobs Domain**: References kanban component but cannot implement without it

### Architecture Context

- Component uses @dnd-kit/core and @dnd-kit/sortable for drag-and-drop
- Comprehensive API with context providers and compound components
- Supports sortable columns and items with accessibility features

## Tasks

### Task 1: Infrastructure Compatibility Check

Ensure component integrates cleanly with existing architecture.

- [ ] Verify @dnd-kit dependencies match existing versions
- [ ] Test import resolution with `@/lib/utils` alias
- [ ] Confirm TypeScript compilation with existing tsconfig
- [ ] Validate Tailwind CSS classes work with current config
- [ ] Check bundle size impact estimation

**Files to verify:**

- `package.json` (dependency versions)
- `tsconfig.json` (TypeScript configuration)
- `tailwind.config.ts` (CSS framework setup)
- `vite.config.ts` (build configuration)

### Task 2: Component Implementation

Implement the kanban component by adapting the reference implementation.

- [ ] Copy kanban.tsx from reference library to `src/components/ui/kanban.tsx`
- [ ] Update import paths to use `@/lib/utils` alias
- [ ] Adapt CSS classes to match shadcn/ui design system
- [ ] Update TypeScript generics and types for project conventions
- [ ] Implement lazy loading with dynamic imports for performance
- [ ] Add component to `src/components/ui/index.ts` exports

**Files to modify:**

- `src/components/ui/kanban.tsx` (new - 500+ lines)
- `src/components/ui/index.ts` (add export)

### Task 3: Bundle Optimization

Optimize component for production builds.

- [ ] Implement code splitting for DND utilities
- [ ] Add tree shaking hints for unused features
- [ ] Configure lazy loading with React.lazy()
- [ ] Test bundle size impact and performance
- [ ] Add bundle analyzer integration if needed

**Files to modify:**

- `src/components/ui/kanban.tsx` (add lazy loading)
- `vite.config.ts` (potential bundle splitting config)

### Task 2: Testing Implementation

Create comprehensive test suite following existing patterns.

- [ ] Create unit tests for kanban component functionality
- [ ] Test drag-and-drop behavior with mocking
- [ ] Test accessibility features (ARIA labels, keyboard navigation)
- [ ] Test TypeScript types and generics
- [ ] Add integration tests for compound component usage

**Files to modify:**

- `tests/unit/components/ui/kanban.test.tsx` (new)
- `tests/unit/components/ui/kanban.integration.test.tsx` (new)

### Task 3: Documentation and Examples

Create usage documentation and examples.

- [ ] Add JSDoc comments to component
- [ ] Create usage examples in component file
- [ ] Document props interface and usage patterns
- [ ] Add to component library documentation

**Files to modify:**

- `src/components/ui/kanban.tsx` (add documentation)
- `src/components/ui/README.md` (add kanban section)

## Success Criteria

### Automated Verification

- [ ] `npm run test` passes all kanban tests
- [ ] `npm run build` succeeds with kanban component
- [ ] `npm run type-check` passes for kanban types
- [ ] Bundle size impact < 50kb (gzipped)
- [ ] Tree shaking eliminates unused DND utilities
- [ ] Import resolution works with `@/lib/utils` alias
- [ ] TypeScript compilation succeeds with existing config

### Manual Verification

- [ ] Kanban component renders correctly in Storybook (if available)
- [ ] Drag-and-drop functionality works smoothly
- [ ] Keyboard navigation and accessibility compliant
- [ ] Visual design matches shadcn/ui aesthetic

## Risks (Pre-Mortem)

### Tigers

- **Bundle Size Impact** (HIGH)
  - Risk: Large component increases initial bundle size significantly
  - Mitigation: Lazy loading, code splitting, and performance monitoring

- **Import Resolution Conflicts** (MEDIUM)
  - Risk: Path aliases or import conflicts with existing utilities
  - Mitigation: Test import resolution thoroughly before integration

### Elephants

- **TypeScript Configuration Drift** (MEDIUM)
  - Concern: Component types may not align with project TypeScript settings
  - Note: Validate against existing tsconfig.json before implementation

- **CSS Framework Integration** (LOW)
  - Concern: Tailwind classes may not work with current configuration
  - Note: Test CSS compilation and verify design system compatibility

## Out of Scope

- Jobs domain integration (separate plan)
- Custom kanban variants or themes
- Mobile-specific kanban implementations
- Alternative DND library integration

---

**Dependencies:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (already used elsewhere)

**Next Plan:** After completion, implement REUI data-grid component for table functionality.
