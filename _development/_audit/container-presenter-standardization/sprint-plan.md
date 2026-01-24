# Container/Presenter Standardization Sprint Plan

## Goal

Standardize all domains to the container/presenter pattern described in
`_development/_audit/DB Migration Audit/10-codebasewiring/design-patterns.md`
so routes are containers (hooks + transforms) and domain components are pure
presenters (props only, no data hooks).

## Success Criteria

- Every route page acts as a container (hooks + data transform + props).
- Presenter components do not call data hooks (local UI state only).
- Presenter props document hook source via JSDoc.
- Loading state is passed through and handled consistently.
- No UI regressions.

## Scope

- Routes: `src/routes/**`
- Presenters: `src/components/domain/**`

## Approach (Repeatable Checklist)

1) Identify route container and corresponding presenter.
2) Move data hooks from presenter → route container (if any).
3) Transform data in container and pass props down.
4) Add JSDoc on presenter props indicating hook source.
5) Ensure `isLoading` (or equivalent) is passed and used for skeletons.
6) Verify route output unchanged (visual check).

## Work Plan

- Phase 1: Inventory all domain routes + presenters.
- Phase 2: Audit each domain against checklist.
- Phase 3: Refactor where needed and document findings.
- Phase 4: Final consistency pass (no hooks in presenters).

## Deliverables

- Audit findings log: `audit-findings.md`
- Refactored routes/components per domain

## Customers Domain Close‑Out

- Status: Complete
- Verification: No data hooks remain in `src/components/domain/customers/**`.
- Notes: Customer communications uses loader for bulk templates and `useQuery` for
  customer-specific communications; keep this split explicit to avoid reintroducing
  presenter hooks.

## Products Domain Retrospective

### What worked well

- Centralizing data hooks in the route container made presenter props predictable.
- Normalizing server response shapes in the container reduced UI churn.
- Adding JSDoc on presenter props kept hook ownership explicit and reviewable.

### What slowed us down

- Mixed responsibilities in presenters (data hooks + UI) increased refactor surface.
- Server responses did not always match presenter-friendly shapes.
- Orphan schema files created extra cleanup (avoid file moves mid-stream).

### Optimizations for next domain

- Start from the "Presenter Components Using Data Hooks" list to prioritize.
- Normalize response shapes in the container before touching presenters.
- Keep UI-only types in `*.types.ts` and reuse across presenters.
- Add JSDoc to new props as they are introduced, not after.

### Debt-reduction strategies

- Avoid adding new hooks to presenters; route container owns data.
- Keep schema files in `src/lib/schemas/**` from the start.
- Prefer small, targeted refactors to reduce accidental UI changes.
- Update `audit-findings.md` immediately after each domain pass.

## Orders Domain Close‑Out

- Status: Complete
- Verification: No data hooks remain in `src/components/domain/orders/**`
  (presenters now receive data/loading/callbacks via props).
- Notes: Schemas and inline-edit hook extracted into dedicated files to keep
  presenter exports component-only and avoid Fast Refresh lint issues.

## Fulfillment Close‑Out

- Status: Complete
- Verification: Fulfillment dashboard wired to a container route and presenters are hook-free.

## Pipeline Domain Close‑Out

- Status: **Complete** - All hooks removed from presenters, route containers wired
- Verification: No data hooks remain in `src/components/domain/pipeline/**`
- Premortem Run: 2026-01-23
- Mitigations Applied: Quote expiry queries now limited; Quick Quote supports existing opportunities.

### ✅ Completed

#### Presenter Refactoring (10 components)

All `useQuery`/`useMutation` hooks removed, now accept props + callbacks.

#### Route Container Wiring (`$opportunityId.tsx`)

- Added `logActivityMutation` → `handleLogActivity`
- Added `completeActivityMutation` → `handleCompleteActivity`
- Added `createQuoteVersionMutation` → `handleSaveQuoteVersion`

#### OpportunityDetail Integration

- `ActivityLogger` - wired to Activities tab
- `OpportunityActivityTimeline` - wired to Activities tab
- `QuoteBuilder` - wired to Quote tab
- `QuoteVersionHistory` - wired to Versions tab

### 📋 Standalone Components (not route-specific)

These presenters are now wired and rendered:

- `ExpiredQuotesAlert` - pipeline index alerts (expiring/expired quotes)
- `FollowUpScheduler` - opportunity Activities tab (scheduled follow-ups)
- `ProductQuickAdd` - Quote Builder quick-add panel
- `QuickQuoteForm` / `QuickQuoteDialog` - pipeline index quick quote action
- `ExtendValidityDialog` - wired via ExpiredQuotesAlert
- `QuotePdfPreview` - Versions tab preview + PDF generation

## Inventory Domain Close‑Out

- Status: Complete
- Verification: Inventory routes are containers; presenters are hook-free with JSDoc prop sources.
- Wiring: `listInventory`/`listMovements` join product + location; `getStockCount`/`startStockCount`
  return product + location; `getLocation` returns product details; alerts acknowledge wired.
- Notes: Location filters now use warehouse hierarchy; receiving and dashboards render names, not IDs.

## Jobs Domain Close‑Out

- Status: Complete
- Verification: Jobs presenters are hook-free; route containers own data and mutations.
- Notes: `JobTasksTab`, `JobMaterialsTab`, `JobTimeTab`, `JobChecklistTab`, and
  `JobDocumentsTab` are now presenter-only with route containers. Added job assignment
  detail route tabs for Tasks/Materials/Time/Checklist/Documents.
- Data Model Note: Calendar/Weekly Kanban/Timeline all derive from `jobAssignments`
  (no separate calendar/kanban tables). Assignment updates should propagate across views
  via shared queries + invalidations.
- Pre-Mortem Run: 2026-01-23
- Mitigation Applied: Wired job documents to `jobs/assignments/$assignmentId` route.
- Mitigation Applied: Calendar + Timeline now deep-link to assignment detail.
- Manual Verification Checklist:
  - Kanban: open task → assignment detail tabs render.
  - Calendar: click event → assignment detail tabs render.
  - Timeline: click job card → assignment detail tabs render.
  - Each tab loads: Tasks/Materials/Time/Checklist/Documents.

---

## Sprint Close‑Out

- Status: Complete
- Verification: Customers, Products, Orders, Pipeline, Jobs, and Inventory domains standardized
  to the container/presenter pattern with audit log updated.
- Jobs verification: assignment detail tabs reachable from Kanban/Calendar/Timeline.

## Notes

- Use the dashboard as the reference implementation.
- Avoid functional changes beyond data wiring standardization.
