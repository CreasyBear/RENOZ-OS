---
date: 2026-01-19
type: plan
status: complete
plan_file: renoz-v3/_development/_audit/prd_reference/implementation-plan.md
---

# Plan Handoff: PRD Component Reference Adoption

## Summary

Comprehensive 6-week plan to address critical architectural gaps by implementing 18+ missing components referenced in PRDs. This will standardize UX patterns, reduce development time by 70%+, and eliminate custom component duplication across orders, jobs, and support domains.

## Plan Created

`renoz-v3/_development/_audit/prd_reference/implementation-plan.md`

## Key Technical Decisions

- **Component Architecture**: Adopt shadcn/ui patterns (already established in codebase)
- **State Management**: Preserve TanStack Query, consider Zustand for complex UIs
- **Implementation Strategy**: Phased approach (infrastructure → domain-specific → integration)
- **Testing**: Maintain Vitest + React Testing Library patterns
- **Type Safety**: Strict TypeScript compliance

## Task Overview

1. **Phase 1 (Week 1-2)**: Critical infrastructure - REUI kanban and data-grid components
2. **Phase 2 (Week 3-4)**: Domain implementation - Fulfillment dashboard refactor, midday invoice patterns, jobs components
3. **Phase 3 (Week 5-6)**: Integration & optimization - Update domains, finalize library

## Research Findings

- **Current State**: 56 shadcn/ui components exist, but 18+ PRD-referenced components missing
- **Reference Libraries**: Comprehensive midday/reui/square-ui libraries available but unused
- **Architecture Gap**: Fulfillment dashboard uses custom DND instead of square-ui patterns
- **Domain Impact**: Jobs domain blocked by missing kanban component

## Assumptions Made

- **Component Compatibility**: Reference components can be adapted to current shadcn/ui patterns
- **Performance**: New components won't significantly impact bundle size (VERIFY BEFORE IMPLEMENTING)
- **Business Logic**: Custom DND logic in fulfillment can be safely migrated to square-ui patterns
- **Testing**: Existing test patterns sufficient for new components

## For Next Steps

- User should review plan at: `renoz-v3/_development/_audit/prd_reference/implementation-plan.md`
- After approval, begin with Phase 1: REUI Kanban Component implementation
- Research validation will occur before Phase 2 to confirm component compatibility
- Monitor bundle size impact during Phase 1 implementation

## Implementation Priority

**IMMEDIATE (Week 1)**:

- REUI Kanban component (unblocks jobs domain)
- REUI Data Grid component (critical for tables)

**HIGH (Week 2)**:

- Fulfillment dashboard refactor to square-ui patterns
- Midday invoice calculation utilities

**MEDIUM (Weeks 3-6)**:

- Jobs domain component integration
- Support domain updates
- Component library optimization

## Success Metrics

- **70%+ code reuse** from reference libraries achieved
- **40% reduction** in custom component code
- **100% PRD compliance** for component references
- **Zero regressions** in existing functionality

## Dependencies

- **Reference Libraries**: `renoz-v3/_reference/` must remain accessible
- **Testing Infrastructure**: Vitest + React Testing Library setup required
- **Build System**: Vite + TypeScript compilation working
- **UI Patterns**: shadcn/ui foundation established

## Risk Mitigation

- **Phased Rollout**: Each phase validates previous work before proceeding
- **Comprehensive Testing**: Automated + manual verification at each stage
- **Rollback Plan**: Git-based rollback capability for each major change
- **Performance Monitoring**: Bundle size and runtime performance tracking

---

**Plan Status**: Ready for implementation approval
**Estimated Effort**: 6 weeks (part-time across team)
**Risk Level**: Medium (mitigated by phased approach)
**Business Impact**: High (unblocks multiple domains, improves consistency)
