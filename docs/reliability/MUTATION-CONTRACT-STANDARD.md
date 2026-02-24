# Mutation Contract Standard

Use this contract for any create/update/delete/status mutation in Renoz v3.

## Required Behavior

1. Error surfacing
- Surface server error messages when actionable.
- Use fallback generic messaging only when no actionable detail exists.
- Never silently swallow errors.

2. Pending locks
- Disable submit/confirm/cancel controls while mutation is pending.
- Prevent duplicate confirmation paths for destructive actions.
- Block dialog escape/outside-close while pending.

3. Async close rules
- Do not close dialogs optimistically before mutation success.
- Close only on success or explicit user cancel.
- Keep dialog state open on failure so user can retry.

4. Partial-failure behavior
- If business operation succeeds but downstream side effects fail (email/notification), show warning:
  - primary operation succeeded
  - secondary side effect failed
- Keep success state visible; do not represent as full failure.

5. Cache aftermath
- Invalidate/update list + detail query keys impacted by mutation.
- Keep UI deterministic during mutation settlement.

## Destructive Flow Pattern

`confirm -> pending lock -> mutateAsync -> success feedback -> redirect/reset`

Rules:
- Confirmation must be explicit and single-fire.
- Pending state must prevent re-trigger.
- Redirect must use typed route targets (no cast escapes).

## Review Checklist

- [ ] Uses `mutateAsync` in controlled async handler
- [ ] Pending lock exists for all submit/confirm buttons
- [ ] Dialog cannot close via escape/outside while pending
- [ ] Failure keeps user in recoverable state (retry path)
- [ ] Partial-failure warnings handled where applicable
- [ ] Query invalidation/refetch covers list + detail
- [ ] No `params: {} as never` or route-cast escapes
