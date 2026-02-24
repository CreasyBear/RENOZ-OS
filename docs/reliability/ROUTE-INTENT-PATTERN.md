# Route Intent Pattern

Use this pattern for URL-driven dialogs, tabs, and workflow intents.

**@see ORCH-038** – Route intent pattern doc (search state, dialog state, cleanup rules).

## Contract

1. Declare intent in route search schema.
- Example: `tab`, `edit`, `pick`, `ship`, `escalate`.
- Do not use untyped ad-hoc query parsing in components.

2. Route is source of truth.
- UI reads intent from `Route.useSearch()`.
- Initial UI state must be restorable from URL on refresh/deep link.

3. Deterministic cleanup.
- Closing a URL-driven dialog clears that URL intent.
- Unsupported intents must be cleaned and surfaced with feedback.

4. No render-time side effects.
- Use handlers/effects, never navigate/toast during render.

## Implementation Template

1. Add typed search keys to route `validateSearch`.
2. Pass URL intent props into container.
3. Container syncs URL intent to internal open state with guarded `useEffect`.
4. Container reports open-state changes back to route via callback.
5. Route updates URL intent using typed `navigate({ search })`.

## Rules

- Avoid dual state authority for tabs/dialogs (URL + unrelated local state).
- If local state is needed for transient UI, it must converge back to URL state.
- Prefer `replace: true` for ephemeral intent updates.

## Regression Checklist

- Open deep link directly and verify UI state.
- Refresh and verify same UI state.
- Close dialog/tab and verify URL cleanup.
- Use browser back/forward and verify state restoration.
