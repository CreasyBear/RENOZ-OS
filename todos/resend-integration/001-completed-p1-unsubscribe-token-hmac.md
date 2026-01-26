---
status: completed
priority: p1
issue_id: SEC-001
tags: [code-review, security, resend, unsubscribe]
dependencies: []
completed_at: 2026-01-25
completed_by: INT-RES-007
---

# SEC-001: Unsubscribe Token Lacks HMAC Signature

## Problem Statement

The current unsubscribe token in `src/routes/api/unsubscribe.$token.ts` uses simple base64 encoding without cryptographic signature verification. This allows attackers to forge unsubscribe tokens and unsubscribe arbitrary email addresses.

**Why it matters**: This is a CAN-SPAM/GDPR compliance risk and a security vulnerability that could be exploited to suppress legitimate customer communications.

## Resolution

**COMPLETED** as part of INT-RES-007 (Unsubscribe Enhancement)

Implemented Solution A (HMAC Pattern) with additional enhancements:
- Created `src/lib/server/unsubscribe-tokens.ts` with secure token generation/verification
- HMAC-SHA256 signature using UNSUBSCRIBE_HMAC_SECRET environment variable
- 30-day token expiration
- Timing-safe comparison for signature validation
- Token includes email, organizationId, contactId, channel, and emailId
- Legacy tokens still supported for backwards compatibility (with deprecation warnings)
- Rate limiting: 10 requests/minute per IP on unsubscribe endpoint

## Acceptance Criteria

- [x] Unsubscribe tokens include HMAC signature
- [x] Token validation uses timing-safe comparison
- [x] Tokens expire after 30 days
- [x] Forged tokens are rejected with 400 response
- [x] Existing unsubscribe links continue to work (backwards compatibility maintained)
- [x] Rate limiting prevents abuse (10 req/min per IP)
- [x] Suppression list integration (unsubscribes added to email_suppression table)

## Files Changed

### Created
- `src/lib/server/unsubscribe-tokens.ts` - New secure token module

### Modified
- `src/routes/api/unsubscribe.$token.ts` - Updated to use secure tokens + rate limiting
- `src/trigger/jobs/send-campaign.ts` - Added unsubscribe URL generation + List-Unsubscribe header comments
- `src/trigger/jobs/process-scheduled-emails.ts` - Added unsubscribe URL generation
- `src/lib/server/communication-preferences.ts` - Marked legacy functions as deprecated
- `src/lib/server/rate-limit.ts` - Added unsubscribe rate limit preset

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from multi-agent review | Found existing HMAC pattern to reuse |
| 2026-01-25 | Implemented in INT-RES-007 | Used JSON payload format for flexibility, added expiration |

## Resources

- PRD: `_Initiation/_prd/3-integrations/resend/PROMPT.md` (SEC-002 section)
- Existing pattern: `src/lib/server/email-tracking.ts:56-80`
- Story: INT-RES-007 (Unsubscribe Enhancement)
