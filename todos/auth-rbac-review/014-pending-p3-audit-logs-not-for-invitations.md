---
status: pending
priority: p3
issue_id: "014"
tags: [code-review, audit, compliance, invitations]
dependencies: []
---

# No Audit Logging for Invitation Operations

## Problem Statement

The invitation system (sendInvitation, cancelInvitation, resendInvitation, acceptInvitation, batchSendInvitations) has NO audit logging. This creates a compliance gap - there's no record of who invited whom or when invitations were accepted/cancelled.

## Findings

**File:** `src/server/functions/users/invitations.ts`

Functions without `logAuditEvent()` calls:
- `sendInvitation` (line 61-136) - No audit
- `cancelInvitation` (line 364-397) - No audit
- `resendInvitation` (line 407-449) - No audit
- `acceptInvitation` (line 279-354) - No audit (public endpoint)
- `batchSendInvitations` (line 507-647) - No audit

## Proposed Solution

Add audit logging to all invitation operations.

**Implementation:**
```typescript
// In sendInvitation
await logAuditEvent({
  organizationId: ctx.organizationId,
  userId: ctx.user.id,
  action: AUDIT_ACTIONS.INVITATION_SEND,
  entityType: AUDIT_ENTITY_TYPES.INVITATION,
  entityId: invitation.id,
  newValues: { email: invitation.email, role: invitation.role },
});

// In acceptInvitation (use system user or special flag)
await logAuditEvent({
  organizationId: invitation.organizationId,
  userId: newUser.id,  // The new user
  action: AUDIT_ACTIONS.INVITATION_ACCEPT,
  entityType: AUDIT_ENTITY_TYPES.INVITATION,
  entityId: invitation.id,
  metadata: { acceptedFrom: request.headers.get('x-forwarded-for') },
});
```

## Acceptance Criteria

- [ ] All invitation operations are logged
- [ ] Public endpoints log with appropriate context
- [ ] Can trace full invitation lifecycle in audit logs

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From data-integrity-guardian review |
