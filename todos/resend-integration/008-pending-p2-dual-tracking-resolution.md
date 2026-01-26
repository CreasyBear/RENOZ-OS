---
status: pending
priority: p2
issue_id: ARCH-001
tags: [code-review, architecture, resend, tracking]
dependencies: []
---

# ARCH-001: Resolve Dual Tracking Conflict

## Problem Statement

The codebase has self-hosted email tracking (`src/lib/server/email-tracking.ts`) with pixel tracking and link wrapping. Resend also provides webhook-based tracking. Running both would cause:
- Double-counted opens/clicks
- Inconsistent metrics between systems
- Confusion about which data is authoritative

**Why it matters**: Email analytics must be accurate and come from a single source of truth.

## Findings

### Discovery 1: Self-Hosted Tracking
- **Location**: `src/lib/server/email-tracking.ts`
- **Features**: Pixel tracking, link wrapping, HMAC signatures
- **Status**: Fully implemented

### Discovery 2: PRD Architecture Decision
- **Source**: `_Initiation/_prd/3-integrations/resend/PROMPT.md`
- **Decision**: "RESEND_WEBHOOKS_ONLY - Use Resend webhooks for all delivery tracking"
- **Rationale**: Avoid dual tracking conflict

### Discovery 3: Existing Tracking Endpoints
- **Location**: `src/routes/api/track/open.$emailId.ts`, `src/routes/api/track/click.$emailId.$linkId.ts`
- **Status**: May still be in use by non-Resend emails

## Proposed Solutions

### Solution A: Conditional Tracking by Provider (Recommended)
Keep self-hosted for non-Resend emails, use webhooks for Resend

**Pros**:
- Supports multiple email providers
- Preserves existing functionality
- Clear separation

**Cons**:
- More complex routing logic

**Effort**: Medium (4-5 hours)
**Risk**: Low

### Solution B: Full Migration to Resend Webhooks
Remove self-hosted tracking entirely

**Pros**:
- Simplest architecture
- Single source of truth

**Cons**:
- Only works if 100% Resend
- Loses tracking for non-Resend sends

**Effort**: Medium (3-4 hours)
**Risk**: Medium (if other providers added later)

### Solution C: Keep Both, Separate Metrics
Track both but display separately in UI

**Pros**:
- Maximum data capture
- Flexibility

**Cons**:
- Confusing UX
- Data duplication

**Effort**: Large (6-8 hours)
**Risk**: High (maintenance burden)

## Recommended Action
[To be filled during triage]

## Technical Details

### Affected Files
- `src/lib/server/email-tracking.ts` - ADD provider check
- `src/trigger/jobs/send-campaign.ts` - DON'T add pixel/link wrapping for Resend
- `src/trigger/jobs/process-scheduled-emails.ts` - Same

### Implementation Pattern (Solution A)
```typescript
// In email sending code
async function sendEmail(params: SendEmailParams) {
  const { provider = 'resend', html, emailId } = params;

  let finalHtml = html;

  // Only add self-hosted tracking for non-Resend providers
  if (provider !== 'resend') {
    const { html: trackedHtml } = prepareEmailForTracking(html, emailId, {
      trackOpens: true,
      trackClicks: true,
    });
    finalHtml = trackedHtml;
  }
  // Resend tracking handled by webhooks

  return sendViaProvider(provider, { ...params, html: finalHtml });
}
```

### Decision Tree
```
Is email sent via Resend?
├── YES → Use webhook tracking only
│         - Don't wrap links
│         - Don't insert pixel
│         - Process via webhook job
└── NO  → Use self-hosted tracking
          - Wrap links
          - Insert pixel
          - Process via tracking endpoints
```

## Acceptance Criteria

- [ ] Resend emails don't have self-hosted tracking
- [ ] Non-Resend emails (if any) still use self-hosted tracking
- [ ] Metrics are accurate (not double-counted)
- [ ] Clear documentation of which system handles what
- [ ] Email history shows consistent data

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from multi-agent review | Need to support potential future providers |

## Resources

- PRD: `_Initiation/_prd/3-integrations/resend/PROMPT.md` (Architecture Decisions)
- Existing: `src/lib/server/email-tracking.ts`
- Stories: INT-RES-001, INT-RES-002
