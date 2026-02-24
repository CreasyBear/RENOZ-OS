## Summary

- What changed:
- Why:

## Mutation Contract Checklist (Required for UI mutations)

See [MUTATION-CONTRACT-STANDARD.md](../docs/reliability/MUTATION-CONTRACT-STANDARD.md)

- [ ] Uses controlled async mutation path (`mutateAsync` handler)
- [ ] Pending lock prevents double-submit/double-confirm
- [ ] Dialog cannot close via escape/outside while pending
- [ ] Failure path is recoverable (inline error or retry action)
- [ ] Partial-failure behavior is explicit where downstream notifications/emails can fail
- [ ] List/detail cache invalidation is covered
- [ ] No route-cast escapes (`params: {} as never`, `as string` route casts)

## Route Intent Checklist (Required for URL-driven UI)

See [ROUTE-INTENT-PATTERN.md](../docs/reliability/ROUTE-INTENT-PATTERN.md)

- [ ] URL state is typed in route search schema
- [ ] URL intent opens the expected UI on refresh/deep link
- [ ] Closing UI cleans URL intent deterministically
- [ ] Back/forward navigation restores the same UI state

## Validation

- [ ] `bun run lint`
- [ ] `bun run lint:reliability`
- [ ] `bun run typecheck`
- [ ] `bun run test:unit` (or documented reason not run)
