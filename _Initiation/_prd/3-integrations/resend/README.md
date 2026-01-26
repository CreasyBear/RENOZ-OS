# Resend Email Integration

Complete email infrastructure for transactional and marketing emails with webhook-based delivery tracking, suppression list management, and CAN-SPAM/GDPR compliance.

## Quick Start

### 1. Environment Variables

Add to your `.env`:

```bash
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
UNSUBSCRIBE_HMAC_SECRET=your-random-32-char-secret

# Optional
RESEND_DOMAIN_ID=d_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Company
```

Generate a secure HMAC secret:
```bash
openssl rand -hex 32
```

### 2. Database Migrations

```bash
npm run db:generate
npm run db:push
```

This creates:
- `email_suppression` table
- `webhook_events` table
- Adds `resendMessageId`, `bounceType`, `complainedAt` to `email_history`

### 3. Resend Dashboard Setup

#### Domain Verification

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your sending domain (e.g., `yourdomain.com`)
4. Add the DNS records Resend provides:

| Type | Name | Value |
|------|------|-------|
| TXT | `@` or `yourdomain.com` | SPF record |
| CNAME | `resend._domainkey` | DKIM record |
| TXT | `_dmarc` | DMARC record (optional but recommended) |

5. Wait for verification (usually 5-15 minutes)
6. Copy the Domain ID to `RESEND_DOMAIN_ID`

#### Webhook Configuration

1. Go to [Resend Webhooks](https://resend.com/webhooks)
2. Click "Add Webhook"
3. Configure:
   - **Endpoint URL**: `https://yourdomain.com/api/webhooks/resend`
   - **Events**: Select all email events:
     - `email.sent`
     - `email.delivered`
     - `email.opened`
     - `email.clicked`
     - `email.bounced`
     - `email.complained`
4. Copy the signing secret to `RESEND_WEBHOOK_SECRET`

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Your App       │────▶│  Resend API     │────▶│  Recipient      │
│  (send email)   │     │  (delivery)     │     │  (inbox)        │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼ webhooks
                        ┌─────────────────┐
                        │  /api/webhooks  │
                        │  /resend        │
                        └────────┬────────┘
                                 │
                                 ▼ queue
                        ┌─────────────────┐
                        │  Trigger.dev    │
                        │  process-resend │
                        │  -webhook       │
                        └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
            ┌───────────┐ ┌───────────┐ ┌───────────┐
            │ Update    │ │ Create    │ │ Add to    │
            │ email_    │ │ activity  │ │ suppres-  │
            │ history   │ │ record    │ │ sion list │
            └───────────┘ └───────────┘ └───────────┘
```

## Features

### Email Sending

All email jobs are wired to Resend:

```typescript
// Campaign emails
import { sendCampaign } from '@/trigger/jobs/send-campaign';
await sendCampaign.trigger({ campaignId, organizationId });

// Scheduled emails
import { processScheduledEmails } from '@/trigger/jobs/process-scheduled-emails';
await processScheduledEmails.trigger({ organizationId });

// Transactional emails
import { sendOrderConfirmationJob } from '@/trigger/jobs/send-email';
await sendOrderConfirmationJob.trigger({ orderId, organizationId });

// Warranty emails
import { sendWarrantyRegistrationEmail } from '@/trigger/jobs/warranty-notifications';
await sendWarrantyRegistrationEmail.trigger({ warrantyId, ... });

// User invitation emails (auto-triggered)
// Fires automatically when sendInvitation() or resendInvitation() is called
// See: src/trigger/jobs/send-invitation-email.tsx
```

### Suppression Management

#### Auto-Suppression (Automatic)

- **Hard bounces**: Immediately suppressed globally
- **Soft bounces**: Suppressed after 3 occurrences within 7 days
- **Spam complaints**: Immediately suppressed globally
- **Unsubscribes**: Added to suppression list

#### Manual Suppression (UI)

Access at `/settings/email`:

1. **View suppression list** with filters by reason
2. **Add emails manually** via dialog
3. **Remove emails** with audit trail

#### Programmatic Suppression

```typescript
import {
  addSuppression,
  removeSuppression,
  isEmailSuppressed
} from '@/server/functions/communications/email-suppression';

// Check before sending
const suppressed = await isEmailSuppressed({
  data: { email: 'user@example.com' }
});

// Add manually
await addSuppression({
  data: {
    email: 'user@example.com',
    reason: 'manual',
    notes: 'Customer requested removal'
  }
});

// Remove (soft delete with audit)
await removeSuppression({
  data: {
    suppressionId: 'xxx',
    reason: 'Customer re-subscribed'
  }
});
```

### Email Preview & Test

```typescript
import { renderEmailPreview, sendTestEmail } from '@/server/functions/communications/email-preview';

// Preview template
const preview = await renderEmailPreview({
  data: {
    templateId: 'xxx',
    variables: { customerName: 'John' }
  }
});
// Returns: { html, text, subject, missingVariables }

// Send test
await sendTestEmail({
  data: {
    templateId: 'xxx',
    recipientEmail: 'test@example.com',
    variables: { customerName: 'John' }
  }
});
// Sends with [TEST] prefix in subject
```

### Email Metrics

Access at `/settings/email` or programmatically:

```typescript
import { getEmailMetrics } from '@/server/functions/communications/email-analytics';

const metrics = await getEmailMetrics({
  data: {
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
});
// Returns: { sent, delivered, opened, clicked, bounced, complained, rates }
```

### Domain Status

```typescript
import { getDomainVerificationStatus } from '@/server/functions/communications/email-domain';

const status = await getDomainVerificationStatus();
// Returns: { domain, status, records: [{ type, name, value, status }] }
```

## Unsubscribe Flow

### Token Format

Tokens are HMAC-signed with 30-day expiration:

```
base64url(payload).signature
```

Payload contains:
- `contactId`
- `email`
- `channel`
- `organizationId`
- `emailId`
- `exp` (expiration timestamp)

### Headers

All marketing emails include:

```
List-Unsubscribe: <https://yourdomain.com/api/unsubscribe/TOKEN>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

### Template Variable

Use in email templates:

```html
<a href="{{unsubscribe_url}}">Unsubscribe</a>
```

## Webhook Events

| Event | Action |
|-------|--------|
| `email.sent` | Update status to 'sent', set sentAt |
| `email.delivered` | Update status to 'delivered', set deliveredAt |
| `email.opened` | Set openedAt (first open only), create activity |
| `email.clicked` | Set clickedAt (first click only), create activity |
| `email.bounced` | Set bouncedAt, bounceType, add to suppression |
| `email.complained` | Set complainedAt, add to suppression |

### Idempotency

Events are deduplicated by `(eventId, eventType)` in `webhook_events` table.

### State Machine

Status transitions are enforced:

```
pending → sent → delivered → opened → clicked
                         ↘ bounced (terminal)
                         ↘ complained (terminal)
```

## Security

### Webhook Verification

SVIX signatures verified on every webhook:

```typescript
const isValid = await resend.webhooks.verify({
  payload: rawBody,
  headers: {
    'svix-id': request.headers.get('svix-id'),
    'svix-timestamp': request.headers.get('svix-timestamp'),
    'svix-signature': request.headers.get('svix-signature'),
  },
  webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
});
```

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/webhooks/resend` | 100/min |
| `/api/unsubscribe/:token` | 10/min per IP |

### Token Security

- HMAC-SHA256 signature prevents forgery
- 30-day expiration limits token lifetime
- Timing-safe comparison prevents timing attacks

## Troubleshooting

### Webhooks Not Received

1. Check webhook URL is publicly accessible
2. Verify HTTPS certificate is valid
3. Check `RESEND_WEBHOOK_SECRET` matches dashboard
4. Review Resend webhook logs for delivery attempts

### Emails Not Sending

1. Verify `RESEND_API_KEY` is valid
2. Check domain is verified in Resend
3. Check recipient is not in suppression list
4. Review Trigger.dev job logs

### Domain Not Verifying

1. Check DNS records are correctly configured
2. Wait up to 48 hours for DNS propagation
3. Use [MXToolbox](https://mxtoolbox.com/) to verify records
4. Ensure no conflicting SPF records

### Bounces Not Processing

1. Check webhook is configured for `email.bounced`
2. Verify webhook secret is correct
3. Check Trigger.dev job `process-resend-webhook` is running
4. Review `webhook_events` table for errors

## File Reference

### Server Functions
- `src/server/functions/communications/email-suppression.ts`
- `src/server/functions/communications/email-preview.ts`
- `src/server/functions/communications/email-analytics.ts`
- `src/server/functions/communications/email-domain.ts`

### Trigger Jobs
- `src/trigger/jobs/process-resend-webhook.ts`
- `src/trigger/jobs/send-campaign.ts`
- `src/trigger/jobs/process-scheduled-emails.ts`
- `src/trigger/jobs/send-email.ts`
- `src/trigger/jobs/warranty-notifications.ts`
- `src/trigger/jobs/send-invitation-email.tsx` - User invitation emails

### Routes
- `src/routes/api/webhooks/resend.ts`
- `src/routes/api/unsubscribe.$token.ts`
- `src/routes/_authenticated/settings/email.tsx`

### Schema
- `drizzle/schema/communications/email-suppression.ts`
- `drizzle/schema/communications/webhook-events.ts`
- `drizzle/schema/communications/email-history.ts`

### Hooks
- `src/hooks/communications/use-email-suppression.ts`
- `src/hooks/communications/use-email-preview.ts`
- `src/hooks/communications/use-email-analytics.ts`
- `src/hooks/communications/use-domain-verification.ts`

### Email Templates
- `src/lib/email/templates/users/invitation-email.tsx` - User invitation template
- `src/lib/email/render.ts` - Email rendering utility
