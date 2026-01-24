# Refactor Communications Domain - Full Container/Presenter Standardization

---
title: "Refactor Communications Domain - Full Container/Presenter Standardization"
type: refactor
date: 2026-01-24
domains: [communications]
severity: high
estimated_components: 17
estimated_hours: 8-12
---

## Overview

Complete refactoring of all 17 Communications presenter components to follow the container-presenter pattern:

- **Routes (containers)** own all data hooks and pass data/handlers via props
- **Presenters** are pure UI components with no `useQuery`/`useMutation` calls
- **Proper plumbing** ensures all data flows correctly from hooks → containers → presenters

## Problem Statement

The Communications domain has **17 presenter components** that directly call data hooks:

| Component | Violations |
|-----------|------------|
| `campaigns-list.tsx` | `useCampaigns`, `useCancelCampaign`, `useDeleteCampaign` |
| `campaign-wizard.tsx` | `useCreateCampaign`, `usePopulateCampaignRecipients` |
| `campaign-preview-panel.tsx` | `useCampaignPreview` |
| `campaign-detail-panel.tsx` | `useCampaign`, `useCampaignRecipients` |
| `scheduled-emails-list.tsx` | `useScheduledEmails`, `useCancelScheduledEmail` |
| `schedule-email-dialog.tsx` | `useScheduleEmail`, `useUpdateScheduledEmail` |
| `templates-list.tsx` | `useTemplates`, `useTemplateVersions`, `useDeleteTemplate`, `useCloneTemplate` |
| `signatures-list.tsx` | `useSignatures`, `useDeleteSignature`, `useSetDefaultSignature` |
| `signature-selector.tsx` | `useSignatures` |
| `signature-editor.tsx` | `useCreateSignature`, `useUpdateSignature` |
| `scheduled-calls-list.tsx` | `useScheduledCalls` |
| `scheduled-call-action-menu.tsx` | `useRescheduleCall`, `useCancelScheduledCall` |
| `schedule-call-dialog.tsx` | `useScheduleCall` |
| `quick-log-dialog.tsx` | `useCreateQuickLog` |
| `call-outcome-dialog.tsx` | `useCompleteCall` |
| `upcoming-calls-widget.tsx` | `useUpcomingCalls` |
| `communication-preferences.tsx` | `useContactPreferences`, `useUpdateContactPreferences`, `usePreferenceHistory` |

**Total: 47+ hook violations**

## Proposed Solution

### Architectural Decisions

#### 1. Container Strategy for Embedded Components

Components fall into two categories:

**Route-Owned (standalone pages):**
- Campaigns list, Templates list, Signatures list, Scheduled calls/emails lists
- Container = route file in `src/routes/_authenticated/communications/`

**Parent-Owned (embedded in other contexts):**
- `SignatureSelector` → embedded in email composers, parent passes props
- `UpcomingCallsWidget` → dashboard widget, dashboard route passes props
- `QuickLogDialog` → global keyboard shortcut, app shell or layout passes props
- `ScheduledCallActionMenu` → embedded in list rows, parent list passes props

#### 2. Nested Component Boundary

- Convert **direct children** to presenters
- Deeply nested atomic actions (like `ScheduledCallActionMenu`) can remain hook-aware if:
  - They're truly atomic (single responsibility)
  - Moving hooks creates excessive prop drilling (>3 levels)

#### 3. Form State Ownership

- **Keep `react-hook-form` in presenters** (UI concern)
- Container provides `initialData` and `onSubmit(values)` callback
- Presenter handles validation display, field state, form UX

#### 4. Error Handling Strategy

- Containers catch mutation errors and show toast notifications
- Presenters receive `error` prop for query errors and render error states
- Forms preserve state on error (don't close dialog)

---

## Implementation Plan

### Phase 1: Route Structure (Foundation)

Create dedicated communications routes as containers.

```
src/routes/_authenticated/communications/
├── index.tsx                    # Main communications hub (tabs)
├── campaigns/
│   ├── index.tsx                # CampaignsList container
│   ├── new.tsx                  # CampaignWizard container
│   └── $campaignId.tsx          # CampaignDetailPanel + CampaignPreviewPanel container
├── emails/
│   ├── index.tsx                # ScheduledEmailsList container
│   └── templates/
│       └── index.tsx            # TemplatesList container
├── signatures/
│   └── index.tsx                # SignaturesList + SignatureEditor container
├── calls/
│   ├── index.tsx                # ScheduledCallsList container
│   └── schedule.tsx             # ScheduleCallDialog container (or keep as dialog)
└── settings/
    └── preferences.tsx          # CommunicationPreferences container
```

**Files to create:**

| File | Container For |
|------|---------------|
| `communications/index.tsx` | Hub with navigation to sub-routes |
| `communications/campaigns/index.tsx` | `CampaignsList` |
| `communications/campaigns/new.tsx` | `CampaignWizard` |
| `communications/campaigns/$campaignId.tsx` | `CampaignDetailPanel`, `CampaignPreviewPanel` |
| `communications/emails/index.tsx` | `ScheduledEmailsList` |
| `communications/emails/templates/index.tsx` | `TemplatesList` |
| `communications/signatures/index.tsx` | `SignaturesList`, `SignatureEditor` |
| `communications/calls/index.tsx` | `ScheduledCallsList` |
| `communications/settings/preferences.tsx` | `CommunicationPreferences` |

---

### Phase 2: Presenter Refactoring (By Tier)

#### Tier 1: Simple List Components (Low Risk) - 3 components

**2.1 `campaigns-list.tsx`**

```typescript
// BEFORE (violation)
export function CampaignsList() {
  const { data, isLoading } = useCampaigns();
  const cancelMutation = useCancelCampaign();
  // ...
}

// AFTER (presenter)
export interface CampaignsListProps {
  /** @source useCampaigns() in communications/campaigns/index.tsx */
  campaigns: Campaign[];
  /** @source useCampaigns() in communications/campaigns/index.tsx */
  isLoading: boolean;
  /** @source useCancelCampaign() in communications/campaigns/index.tsx */
  onCancel: (id: string) => Promise<void>;
  /** @source useDeleteCampaign() in communications/campaigns/index.tsx */
  onDelete: (id: string) => Promise<void>;
  /** @source useRouter() in communications/campaigns/index.tsx */
  onView: (id: string) => void;
  /** @source navigation in communications/campaigns/index.tsx */
  onCreate: () => void;
}

export function CampaignsList({
  campaigns,
  isLoading,
  onCancel,
  onDelete,
  onView,
  onCreate,
}: CampaignsListProps) {
  // Pure UI rendering - no hooks except useState for local UI state
}
```

**Container in `communications/campaigns/index.tsx`:**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useCampaigns, useCancelCampaign, useDeleteCampaign } from '@/hooks/communications';
import { CampaignsList } from '@/components/domain/communications/campaigns-list';

export const Route = createFileRoute('/_authenticated/communications/campaigns/')({
  component: CampaignsContainer,
});

function CampaignsContainer() {
  const router = useRouter();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const { data: campaigns = [], isLoading, error } = useCampaigns();

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  const cancelMutation = useCancelCampaign();
  const deleteMutation = useDeleteCampaign();

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleCancel = useCallback(async (id: string) => {
    await cancelMutation.mutateAsync({ data: { id } });
    toast.success('Campaign cancelled');
  }, [cancelMutation]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync({ data: { id } });
    toast.success('Campaign deleted');
  }, [deleteMutation]);

  const handleView = useCallback((id: string) => {
    router.navigate({ to: '/communications/campaigns/$campaignId', params: { campaignId: id } });
  }, [router]);

  const handleCreate = useCallback(() => {
    router.navigate({ to: '/communications/campaigns/new' });
  }, [router]);

  // ============================================================================
  // RENDER
  // ============================================================================
  if (error) {
    return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <CampaignsList
      campaigns={campaigns}
      isLoading={isLoading}
      onCancel={handleCancel}
      onDelete={handleDelete}
      onView={handleView}
      onCreate={handleCreate}
    />
  );
}
```

**2.2 `scheduled-emails-list.tsx`** - Same pattern as above

**2.3 `scheduled-calls-list.tsx`** - Same pattern, plus nested `ScheduledCallActionMenu`

---

#### Tier 2: Dialog/Form Components (Medium Risk) - 6 components

**2.4 `schedule-email-dialog.tsx`**

```typescript
// AFTER (presenter)
export interface ScheduleEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial data for edit mode */
  initialData?: ScheduledEmail;
  /** @source useScheduleEmail() or useUpdateScheduledEmail() in parent */
  onSubmit: (values: ScheduleEmailInput) => Promise<void>;
  /** @source mutation.isPending in parent */
  isSubmitting: boolean;
}

export function ScheduleEmailDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: ScheduleEmailDialogProps) {
  const form = useForm<ScheduleEmailInput>({
    defaultValues: initialData ?? {},
    // Form stays in presenter - UI concern
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    onOpenChange(false);
  });

  // Pure UI rendering
}
```

**2.5 `schedule-call-dialog.tsx`** - Same pattern

**2.6 `quick-log-dialog.tsx`** - Same pattern, global dialog triggered by keyboard

**2.7 `call-outcome-dialog.tsx`** - Simple form, receives `onComplete` callback

**2.8 `signature-editor.tsx`** - Receives `onSave` callback, keeps form logic

**2.9 `scheduled-call-action-menu.tsx`** - Receives action callbacks from parent list

---

#### Tier 3: Complex Multi-Component Flows (Higher Risk) - 4 components

**2.10 `campaign-wizard.tsx`**

Multi-step wizard with 4 steps. Container orchestrates the full flow:

```typescript
// Container in communications/campaigns/new.tsx
function CampaignWizardContainer() {
  const router = useRouter();
  const createMutation = useCreateCampaign();
  const populateMutation = usePopulateCampaignRecipients();

  const handleCreate = useCallback(async (
    campaignData: CreateCampaignInput,
    recipientFilters: RecipientFilters
  ) => {
    // Atomic-ish: create then populate
    const campaign = await createMutation.mutateAsync({ data: campaignData });
    await populateMutation.mutateAsync({
      data: { campaignId: campaign.id, filters: recipientFilters }
    });
    toast.success('Campaign created');
    router.navigate({ to: '/communications/campaigns/$campaignId', params: { campaignId: campaign.id } });
  }, [createMutation, populateMutation, router]);

  return (
    <CampaignWizard
      onSubmit={handleCreate}
      isSubmitting={createMutation.isPending || populateMutation.isPending}
      onCancel={() => router.navigate({ to: '/communications/campaigns' })}
    />
  );
}
```

**2.11 `campaign-detail-panel.tsx`** - Receives `campaign` and `recipients` data from container

**2.12 `campaign-preview-panel.tsx`** - Embedded in wizard, receives preview data or null

**2.13 `communication-preferences.tsx`** - Receives contact prefs data and update handler

---

#### Tier 4: Settings/Management Components - 2 components

**2.14 `templates-list.tsx`**

Complex with versions, clone, delete. Container handles all mutations:

```typescript
export interface TemplatesListProps {
  templates: Template[];
  isLoading: boolean;
  /** Selected template's version history */
  versions?: TemplateVersion[];
  versionsLoading?: boolean;
  onSelectTemplate: (id: string) => void;
  onClone: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestoreVersion: (templateId: string, versionId: string) => Promise<void>;
  onEdit: (id: string) => void;
  onCreate: () => void;
}
```

**2.15 `signatures-list.tsx`** - Same pattern with set-default mutation

---

#### Tier 5: Embedded/Widget Components - 3 components

**2.16 `signature-selector.tsx`**

Embedded in email composers. Parent (email composer or route) passes signatures:

```typescript
export interface SignatureSelectorProps {
  /** @source useSignatures() in parent composer */
  signatures: Signature[];
  isLoading: boolean;
  value: string | null;
  onChange: (signatureId: string | null) => void;
  defaultSignatureId?: string;
}
```

**2.17 `upcoming-calls-widget.tsx`**

Dashboard widget. Dashboard route passes data:

```typescript
export interface UpcomingCallsWidgetProps {
  /** @source useUpcomingCalls() in dashboard route */
  calls: ScheduledCall[];
  isLoading: boolean;
  onLogOutcome: (callId: string) => void;
  onSnooze: (callId: string, minutes: number) => void;
  onViewAll: () => void;
}
```

---

### Phase 3: Plumbing Verification

After refactoring, verify all data flows correctly:

#### 3.1 Verification Commands

```bash
# Check NO useQuery/useMutation in presenters
grep -rn "useQuery\|useMutation" src/components/domain/communications/ --include="*.tsx"
# Expected: 0 results

# Check NO @tanstack/react-query imports in presenters (except useQueryClient for edge cases)
grep -rn "from '@tanstack/react-query'" src/components/domain/communications/ --include="*.tsx"
# Expected: 0 results

# Verify hooks are only called in routes
grep -rn "useCampaigns\|useScheduledEmails\|useSignatures" src/routes/_authenticated/communications/ --include="*.tsx"
# Expected: Multiple results (containers using hooks)

# Type check
npm run typecheck
```

#### 3.2 Manual Verification Checklist

| Flow | Test |
|------|------|
| Campaigns list | Create → appears in list |
| Campaign cancel | Cancel → status updates, list refreshes |
| Campaign delete | Delete → removed from list |
| Campaign detail | View → loads campaign + recipients |
| Scheduled emails | Schedule → appears in list, Edit → updates, Cancel → removed |
| Templates | Create → appears, Clone → creates copy, Delete → removed |
| Signatures | Create → appears, Set default → badge updates, Delete → removed |
| Scheduled calls | Schedule → appears, Snooze → time updates, Cancel → removed |
| Call outcome | Log outcome → call status updates |
| Quick log | Keyboard shortcut → dialog opens → log saved |
| Preferences | Toggle → updates immediately, shows in history |

#### 3.3 Cache Invalidation Verification

Each mutation should invalidate related caches:

| Mutation | Invalidates |
|----------|-------------|
| `createCampaign` | `campaignsList`, `communications.all` |
| `cancelCampaign` | `campaignsList`, `campaignDetail(id)` |
| `deleteCampaign` | `campaignsList` |
| `scheduleEmail` | `scheduledEmailsList` |
| `cancelScheduledEmail` | `scheduledEmailsList` |
| `createTemplate` | `templatesList` |
| `deleteTemplate` | `templatesList`, `templateVersions(id)` |
| `cloneTemplate` | `templatesList` |
| `createSignature` | `signaturesList` |
| `deleteSignature` | `signaturesList` |
| `setDefaultSignature` | `signaturesList` |
| `scheduleCall` | `scheduledCallsList`, `upcomingCalls` |
| `rescheduleCall` | `scheduledCallsList`, `upcomingCalls` |
| `cancelScheduledCall` | `scheduledCallsList`, `upcomingCalls` |
| `completeCall` | `scheduledCallsList`, `upcomingCalls` |
| `createQuickLog` | `communications.timeline(customerId)` |
| `updateContactPreferences` | `contactPreferences(contactId)`, `preferenceHistory(contactId)` |

---

## Acceptance Criteria

### Structural
- [x] All 17 presenter components have no `useQuery`/`useMutation` calls
- [x] All presenters accept data via props with JSDoc `@source` annotations
- [x] All presenters handle `isLoading` and `error` states
- [x] Route containers exist for all standalone views

### Functional
- [ ] All user flows work: create, read, update, delete for each entity
- [ ] Cache invalidation works: mutations refresh related views
- [ ] Forms preserve state on error
- [ ] Loading states display during async operations

### Type Safety
- [ ] `npm run typecheck` passes
- [x] All props interfaces are exported and documented

### Testing
- [ ] Manual verification of all flows completes
- [ ] No console errors during normal operation

---

## Files Summary

### Routes to Create (9 files)

| File | Priority |
|------|----------|
| `src/routes/_authenticated/communications/index.tsx` | P1 |
| `src/routes/_authenticated/communications/campaigns/index.tsx` | P1 |
| `src/routes/_authenticated/communications/campaigns/new.tsx` | P1 |
| `src/routes/_authenticated/communications/campaigns/$campaignId.tsx` | P1 |
| `src/routes/_authenticated/communications/emails/index.tsx` | P1 |
| `src/routes/_authenticated/communications/emails/templates/index.tsx` | P2 |
| `src/routes/_authenticated/communications/signatures/index.tsx` | P2 |
| `src/routes/_authenticated/communications/calls/index.tsx` | P2 |
| `src/routes/_authenticated/communications/settings/preferences.tsx` | P3 |

### Presenters to Refactor (17 files)

| File | Tier | Priority |
|------|------|----------|
| `campaigns-list.tsx` | 1 | P1 |
| `scheduled-emails-list.tsx` | 1 | P1 |
| `scheduled-calls-list.tsx` | 1 | P1 |
| `schedule-email-dialog.tsx` | 2 | P1 |
| `schedule-call-dialog.tsx` | 2 | P1 |
| `call-outcome-dialog.tsx` | 2 | P1 |
| `quick-log-dialog.tsx` | 2 | P2 |
| `signature-editor.tsx` | 2 | P2 |
| `scheduled-call-action-menu.tsx` | 2 | P2 |
| `campaign-wizard.tsx` | 3 | P1 |
| `campaign-detail-panel.tsx` | 3 | P1 |
| `campaign-preview-panel.tsx` | 3 | P2 |
| `communication-preferences.tsx` | 3 | P3 |
| `templates-list.tsx` | 4 | P2 |
| `signatures-list.tsx` | 4 | P2 |
| `signature-selector.tsx` | 5 | P2 |
| `upcoming-calls-widget.tsx` | 5 | P3 |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing routes using presenters | Audit all imports of each presenter before refactoring |
| Prop drilling becomes excessive | Use composition; embedded components can remain hook-aware if atomic |
| Cache invalidation misses | Verify each mutation in hooks invalidates correct keys |
| Forms lose state on refactor | Keep react-hook-form in presenters, only extract data flow |

---

## References

- [Container/Presenter Standardization](/_development/_audit/container-presenter-standardization/design-patterns.md)
- [Hook Architecture Rules](/.claude/rules/hook-architecture.md)
- [Audit Findings](/_development/_audit/container-presenter-standardization/audit-findings.md)
- [Orders Domain (Pattern Reference)](src/routes/_authenticated/orders/$orderId.tsx)
- [Pipeline Domain (Pattern Reference)](src/routes/_authenticated/pipeline/$opportunityId.tsx)
