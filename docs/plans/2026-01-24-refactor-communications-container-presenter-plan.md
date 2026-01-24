# Refactor Communications Domain to Container/Presenter Pattern

---
title: "Refactor Communications Domain to Container/Presenter Pattern"
type: refactor
date: 2026-01-24
domains: [communications]
severity: high
estimated_files: 4
reviewed: true
reviewers: [dhh-style, technical, simplicity]
---

## Overview

Systematically eliminate container/presenter pattern violations in the communications domain by:
1. Adding minimal centralized query keys for communications
2. Creating hooks in `src/hooks/communications/`
3. Migrating the communications route to use centralized hooks

**Scope reduced per reviewer feedback:** Templates hooks deferred (handlers are placeholders), statements.tsx extracted to separate task.

## Problem Statement

The communications domain violates the established container/presenter pattern:

- **Inline query keys** like `['customer-communications', customerId]` bypass the centralized `queryKeys` factory
- **Direct `useQuery` in routes** instead of using centralized hooks
- **`window.location.reload()`** instead of proper cache invalidation

These violations cause:
- Cache invalidation failures (inline keys don't match centralized keys)
- Inconsistent data freshness after mutations

## Proposed Solution

Follow the established suppliers domain pattern to standardize communications.

### Phase 1: Add Query Keys (Minimal)

Add only the query keys we need today to `src/lib/query-keys.ts`:

```typescript
// src/lib/query-keys.ts - Add after notifications section

communications: {
  all: ['communications'] as const,
  timeline: (customerId: string) => [...queryKeys.communications.all, 'timeline', customerId] as const,
  campaigns: () => [...queryKeys.communications.all, 'campaigns'] as const,
},
```

**Note:** Reviewers recommended against adding `templates`, `templatesList`, `campaignsList`, etc. until we have actual use cases. Add more when needed.

### Phase 2: Create Hooks Directory (Minimal)

Create `src/hooks/communications/` with only what's needed:

```
src/hooks/communications/
├── index.ts                           # Barrel export
├── use-customer-communications.ts     # Timeline query hook
└── use-email-campaigns.ts             # Campaign mutation hook
```

**use-customer-communications.ts:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getCustomerCommunications } from '@/server/functions/communications';

export interface UseCustomerCommunicationsOptions {
  customerId: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useCustomerCommunications(options: UseCustomerCommunicationsOptions) {
  const { customerId, limit = 50, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.timeline(customerId),
    queryFn: () => getCustomerCommunications({
      data: { customerId, limit, offset }
    }),
    enabled: enabled && !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes - emails don't change often
  });
}
```

**use-email-campaigns.ts:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { createCampaign } from '@/lib/server/email-campaigns';

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      // Invalidate campaigns
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns()
      });
      // Invalidate all timelines (new emails may appear)
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.all
      });
    },
  });
}
```

**index.ts:**
```typescript
export * from './use-customer-communications';
export * from './use-email-campaigns';
```

### Phase 3: Migrate Communications Route

Update `src/routes/_authenticated/customers/communications.tsx`:

**Changes:**
1. Replace inline `useQuery` with `useCustomerCommunications` hook
2. Replace `window.location.reload()` with `useCreateCampaign` mutation
3. Remove direct imports of server functions used by hooks

## Acceptance Criteria

- [ ] `src/lib/query-keys.ts` has `communications` section with `all`, `timeline`, `campaigns`
- [ ] `src/hooks/communications/index.ts` exports hooks
- [ ] `src/hooks/communications/use-customer-communications.ts` exists
- [ ] `src/hooks/communications/use-email-campaigns.ts` exists
- [ ] `src/routes/_authenticated/customers/communications.tsx` uses centralized hooks
- [ ] No `window.location.reload()` in communications.tsx
- [ ] `npm run typecheck` passes
- [ ] No grep matches for `queryKey: ['customer-communications'` in routes

## Files to Create/Modify

| File | Action | Priority |
|------|--------|----------|
| `src/lib/query-keys.ts` | Add communications section | P1 |
| `src/hooks/communications/index.ts` | Create barrel export | P1 |
| `src/hooks/communications/use-customer-communications.ts` | Create hook | P1 |
| `src/hooks/communications/use-email-campaigns.ts` | Create hook | P1 |
| `src/routes/_authenticated/customers/communications.tsx` | Migrate to hooks | P1 |

## Out of Scope (Deferred)

Per reviewer feedback, these are extracted to separate tasks:

1. **Template hooks** - `handleSaveTemplate`, `handleDeleteTemplate`, `handleUseTemplate` are currently `console.log` placeholders. Create hooks when implementing actual functionality.

2. **Statements.tsx query keys** - Different domain (financial). Create separate task: "Centralize financial.statements query keys in statements.tsx"

## Verification Commands

```bash
# Check for remaining inline query keys
grep -rn "queryKey: \['customer-communications" src/routes/

# Check for window.location.reload
grep -rn "window.location.reload" src/routes/_authenticated/customers/communications.tsx

# Verify hooks are exported
grep -n "useCustomerCommunications" src/hooks/communications/index.ts

# Type check
npm run typecheck
```

## References

- [Container/Presenter Standardization](../solutions/architecture/container-presenter-standardization.md)
- [Hook Architecture Rules](../../.claude/rules/hook-architecture.md)
- [Suppliers Hooks (Pattern Reference)](../../src/hooks/suppliers/)

## Review History

- **2026-01-24**: Plan reviewed by DHH-style, Technical, and Simplicity reviewers
- **Verdict**: APPROVE WITH CHANGES
- **Changes applied**: Reduced query keys to minimal set, removed template hooks, extracted statements.tsx to separate task
