# GDPR & Privacy PRD Execution

> **PRD**: gdpr-privacy.prd.json
> **Stories**: 4
> **Dependencies**: FOUND-AUTH, FOUND-SCHEMA, FOUND-SHARED, FOUND-FILE-STORAGE, FOUND-REALTIME

## Overview

Privacy compliance features:
- **Data Export**: Users can request a copy of all their data
- **Account Deletion**: 30-day grace period with cancellation option
- **Privacy Settings**: Self-service UI for privacy controls

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Execution Order

### Phase 1: Schema (1 story)
1. **GDPR-001** - Privacy Request Schemas

### Phase 2: API & Jobs (2 stories)
2. **GDPR-002** - Data Export API and Job (depends on 001)
3. **GDPR-003** - Account Deletion API and Job (depends on 001)

### Phase 3: UI (1 story)
4. **GDPR-004** - Privacy Settings UI (depends on 002, 003)

## Key Patterns

### Export Data Structure
```json
{
  "exportedAt": "2026-01-13T10:00:00Z",
  "user": { "id", "email", "name", ... },
  "organizations": [...],
  "conversations": [...],
  "activities": [...],
  "orders": [...],
  "invoices": [...],
  "attachments": [{ "id", "filename", "uploadedAt" }]
}
```

### Deletion Anonymization
```typescript
// Replace PII, don't hard delete
await db.update(users).set({
  email: `deleted-${user.id}@deleted.local`,
  firstName: '[DELETED]',
  lastName: '[DELETED]',
  phone: null,
  deletedAt: new Date()
}).where(eq(users.id, userId));
```

### Grace Period
- 30 days from request to execution
- User receives email reminders at: request, 7 days before, 1 day before
- Cancellation allowed until execution starts

## Validation

```bash
bun run typecheck
python scripts/validate-prd-corpus.py --prd-root "_Initiation/_prd/"
```

## Completion

When ALL GDPR/privacy stories pass:
```xml
<promise>GDPR_PRIVACY_COMPLETE</promise>
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
