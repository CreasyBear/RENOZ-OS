# Communications Domain - Detailed Refactoring Breakdown

**Status:** NOT STARTED - No route files exist yet
**Priority:** Medium-High
**Estimated Complexity:** HIGH (17 presenters with hooks + need to create routes)

---

## Critical Issue: Missing Route Files ⚠️

**Problem:** Communications domain has 17 presenter components with data hooks, but NO dedicated route files exist yet.

**Impact:** This refactoring requires:
1. Creating new route files (containers)
2. Moving hooks from presenters to new containers
3. Establishing routing structure

**This is a TWO-PHASE refactoring:**
- **Phase A:** Create route structure
- **Phase B:** Move hooks to routes

---

## Components Inventory

### Presenters WITH Data Hooks ❌ (17 total)

#### Campaign Management (5 components)
1. **`campaigns-list.tsx`** - 1 query (list campaigns)
2. **`campaign-wizard.tsx`** - 1 queryClient (cache invalidation)
3. **`campaign-preview-panel.tsx`** - 1 query (preview data)
4. **`campaign-detail-panel.tsx`** - 2 queries (campaign + recipients)

#### Email Management (4 components)
5. **`scheduled-emails-list.tsx`** - 1 query + 1 mutation (list + cancel)
6. **`schedule-email-dialog.tsx`** - 1 mutation (schedule email)
7. **`templates-list.tsx`** - 2 queries + 2 mutations (templates + versions + delete + clone)
8. **`template-editor/hooks/use-template-editor.ts`** - 2 mutations (create + update)

#### Signature Management (3 components)
9. **`signatures-list.tsx`** - 1 query + 2 mutations (list + delete + set default)
10. **`signature-selector.tsx`** - 1 query (list for selection)
11. **`signature-editor.tsx`** - 2 mutations (create + update)

#### Call Management (5 components)
12. **`scheduled-calls-list.tsx`** - 1 query (list calls)
13. **`scheduled-call-action-menu.tsx`** - 2 mutations (snooze + cancel)
14. **`schedule-call-dialog.tsx`** - 1 mutation (schedule call)
15. **`quick-log-dialog.tsx`** - 1 mutation (log call)
16. **`call-outcome-dialog.tsx`** - 1 mutation (complete call)

#### Widgets & Preferences (2 components)
17. **`upcoming-calls-widget.tsx`** - 1 query (upcoming calls)
18. **`communication-preferences.tsx`** - 2 queries + 1 mutation (prefs + history + update)

---

## Proposed Route Structure

### Routes to Create

```
src/routes/_authenticated/communications/
├── index.tsx                    # Main dashboard (campaigns-list)
├── campaigns/
│   ├── index.tsx                # Campaign list view
│   ├── new.tsx                  # Campaign wizard
│   └── $campaignId.tsx          # Campaign detail (preview + detail panels)
├── emails/
│   ├── index.tsx                # Scheduled emails list
│   └── templates/
│       ├── index.tsx            # Templates list
│       └── editor.tsx           # Template editor
├── signatures/
│   └── index.tsx                # Signatures list + editor
├── calls/
│   ├── index.tsx                # Scheduled calls list
│   └── log.tsx                  # Quick log dialog (or keep as dialog)
└── settings/
    └── preferences.tsx          # Communication preferences
```

### Alternative: Tabs-Based Approach
```
src/routes/_authenticated/communications/
├── index.tsx                    # Tabs: Campaigns | Emails | Calls | Templates
```

**Recommendation:** Use separate routes for better:
- Deep linking
- Code splitting
- URL-based navigation

---

## Refactoring Strategy

### Phase A: Create Route Structure (Do First)

**Step 1:** Create base route structure
```typescript
// src/routes/_authenticated/communications/index.tsx
export const Route = createFileRoute('/_authenticated/communications/')({
  component: CommunicationsDashboard,
});

function CommunicationsDashboard() {
  return (
    <div>
      <Tabs>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
```

**Step 2:** Create nested routes as needed

**Step 3:** Verify routing works before moving hooks

### Phase B: Move Hooks to Containers (Do Second)

Follow this order (easy → complex):

#### Tier 1: Simple Queries (Start Here)
1. `upcoming-calls-widget.tsx` - Single query
2. `scheduled-calls-list.tsx` - Single query
3. `scheduled-emails-list.tsx` - Single query + mutation
4. `signature-selector.tsx` - Single query
5. `campaigns-list.tsx` - Single query

#### Tier 2: Medium Complexity
6. `campaign-preview-panel.tsx` - Single query
7. `schedule-email-dialog.tsx` - Single mutation
8. `schedule-call-dialog.tsx` - Single mutation
9. `quick-log-dialog.tsx` - Single mutation
10. `call-outcome-dialog.tsx` - Single mutation
11. `signature-editor.tsx` - 2 mutations
12. `scheduled-call-action-menu.tsx` - 2 mutations

#### Tier 3: Complex
13. `campaign-detail-panel.tsx` - 2 queries (parallel)
14. `signatures-list.tsx` - 1 query + 2 mutations
15. `templates-list.tsx` - 2 queries + 2 mutations
16. `communication-preferences.tsx` - 2 queries + 1 mutation
17. `campaign-wizard.tsx` - QueryClient coordination

#### Tier 4: Special Cases
18. `template-editor/hooks/use-template-editor.ts` - Custom hook (may keep as is)

---

## Detailed Task Breakdown

### Example: scheduled-calls-list.tsx (TIER 1 - EASY)

**Current State:**
```typescript
// In presenter - BAD
export function ScheduledCallsList() {
  const { data: callsData, isLoading } = useQuery({...});
  // render logic
}
```

**Target State:**
```typescript
// In route (container) - GOOD
function CallsRoute() {
  const { data: callsData, isLoading } = useQuery({...});
  return <ScheduledCallsList callsData={callsData} isLoading={isLoading} />;
}

// In presenter - GOOD
interface ScheduledCallsListProps {
  /** @source useQuery(getScheduledCalls) in /communications/calls/index.tsx */
  callsData: ScheduledCall[];
  /** @source useQuery loading state */
  isLoading: boolean;
}

export function ScheduledCallsList({ callsData, isLoading }: ScheduledCallsListProps) {
  if (isLoading) return <LoadingSkeleton />;
  // render logic
}
```

---

### Example: campaign-detail-panel.tsx (TIER 3 - COMPLEX)

**Challenge:** Parallel queries

**Current State:**
```typescript
// In presenter - BAD
export function CampaignDetailPanel({ campaignId }: { campaignId: string }) {
  const { data: campaignData, isLoading: campaignLoading } = useQuery({...});
  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({...});
  // render logic
}
```

**Target State:**
```typescript
// In route (container) - GOOD
function CampaignDetailRoute() {
  const { campaignId } = Route.useParams();

  const { data: campaignData, isLoading: campaignLoading } = useQuery({...});
  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({...});

  return (
    <CampaignDetailPanel
      campaignData={campaignData}
      recipientsData={recipientsData}
      isLoading={campaignLoading || recipientsLoading}
    />
  );
}

// In presenter - GOOD
interface CampaignDetailPanelProps {
  /** @source useQuery(getCampaign) in /communications/campaigns/$campaignId.tsx */
  campaignData: Campaign | undefined;
  /** @source useQuery(getCampaignRecipients) in /communications/campaigns/$campaignId.tsx */
  recipientsData: Recipient[] | undefined;
  /** @source Combined loading state */
  isLoading: boolean;
}
```

---

## Special Case: template-editor Hook

**File:** `template-editor/hooks/use-template-editor.ts`

**Decision Point:** This is a custom hook with business logic.

**Options:**
1. **Keep as-is** - If it's reusable business logic, leave it as a hook
2. **Move mutations up** - Extract mutations to container, keep other logic in hook
3. **Convert to utility** - If it's just mutation wrappers, move entirely to container

**Recommendation:** Review the hook - if it has complex state management beyond data fetching, it may be fine to keep.

---

## Success Criteria

### Phase A (Routes)
- [ ] All route files created
- [ ] Routing structure works (can navigate between views)
- [ ] Tabs/navigation UI implemented
- [ ] No broken imports

### Phase B (Hooks)
- [ ] All 17 presenters have NO `useQuery`/`useMutation`/`useServerFn` imports
- [ ] All props have JSDoc `@source` annotations
- [ ] Loading/error states properly handled
- [ ] Mutations have error handling
- [ ] Tests pass
- [ ] No TypeScript errors

---

## Estimated Effort

### Phase A: Route Creation
**Time:** 2-3 hours
**Risk:** LOW - Straightforward routing setup
**Complexity:** LOW

### Phase B: Hook Migration
**Time:** 5-7 hours (17 components)
**Risk:** MEDIUM - Many components, complex data flows
**Complexity:** MEDIUM-HIGH

**Breakdown:**
- Tier 1 (5 components): 15 min each = 75 min
- Tier 2 (7 components): 25 min each = 175 min (3 hrs)
- Tier 3 (4 components): 40 min each = 160 min (2.5 hrs)
- Tier 4 (1 component): 30 min

**Total:** 7-10 hours

---

## Dependencies & Blockers

### Blockers:
1. **No existing routes** - Must create Phase A first
2. **Routing decision needed** - Tabs vs. separate routes?
3. **Template editor hook** - Need to review if it stays as hook

### Dependencies:
- Server functions must exist (verify before starting)
- Query keys need to be consistent
- May need to create shared types for communications domain

---

## Recommended Approach

**Option 1: Phased (Recommended)**
1. Create ALL routes (Phase A)
2. Migrate hooks component-by-component (Phase B)
3. Test after each migration

**Option 2: Incremental**
1. Create route for one feature (e.g., campaigns)
2. Migrate those components
3. Repeat for next feature
4. More incremental, safer, but slower

**Recommendation:** Option 1 - Create all routes first, then systematically migrate. This gives you a clear structure to work within.

---

## Notes

- This is the LARGEST remaining domain (17 components)
- Requires route creation - more than just refactoring
- Consider if some components (dialogs) should stay as dialogs vs. routes
- template-editor hook may be intentionally a hook - review before changing
- Parallel queries pattern appears in campaign-detail - preserve it
