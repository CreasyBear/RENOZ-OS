# Supabase Edge Functions

This directory contains Supabase Edge Functions for webhook processing and background tasks.

## Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `order-webhook` | Database webhook on `orders` | Processes new orders and status changes |
| `inventory-alert` | Database webhook on `inventory` | Handles low stock alerts |
| `pipeline-webhook` | Database webhook on `opportunities` | Processes pipeline stage changes |

## Development

### Prerequisites

1. Install Supabase CLI: `brew install supabase/tap/supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref <your-project-ref>`

### Local Development

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve

# Serve a specific function
supabase functions serve order-webhook
```

### Testing Locally

```bash
# Test order webhook
curl -X POST http://localhost:54321/functions/v1/order-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-webhook-secret" \
  -d '{
    "type": "INSERT",
    "table": "orders",
    "record": {
      "id": "test-123",
      "order_number": "ORD-001",
      "status": "pending"
    }
  }'
```

### Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy a specific function
supabase functions deploy order-webhook
```

## Webhook Payload Format

All webhooks use a consistent payload format:

```typescript
interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'STAGE_CHANGE' | 'LOW_STOCK_ALERT'
  table: string
  schema: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}
```

## Security

### Authentication

All webhooks require authentication via the `Authorization` header:

```
Authorization: Bearer <WEBHOOK_SECRET>
```

The secret is configured via the `WEBHOOK_SECRET` environment variable.

### HMAC Signature Verification

For external webhooks (Stripe, etc.), use HMAC signature verification:

```typescript
import { verifyHmacSignature } from './_shared/auth.ts'

const authResult = await verifyHmacSignature(req, secret, 'X-Signature')
if (!authResult.valid) {
  return createErrorResponse(authResult.code, authResult.message, 401)
}
```

### Timestamp Validation

Prevent replay attacks by validating request timestamps:

```typescript
import { validateTimestamp } from './_shared/auth.ts'

const timestampResult = validateTimestamp(req, 'X-Timestamp')
if (!timestampResult.valid) {
  return createErrorResponse(timestampResult.code, timestampResult.message, 400)
}
```

## Shared Utilities

The `_shared` directory contains common utilities:

- `auth.ts` - Authentication and signature verification
- `types.ts` - Shared TypeScript types
- `errors.ts` - Error handling utilities

### Example Usage

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { verifyWebhookRequest, createSuccessResponse, createErrorResponse } from './_shared/auth.ts'
import { withErrorHandling, invalidPayloadError } from './_shared/errors.ts'

serve(withErrorHandling(async (req) => {
  // Verify authentication
  const authResult = await verifyWebhookRequest(req)
  if (!authResult.valid) {
    return createErrorResponse(authResult.code!, authResult.message!, 401)
  }

  // Parse payload
  const payload = await req.json()
  if (!payload.type) {
    throw invalidPayloadError('Missing type field')
  }

  // Process webhook...

  return createSuccessResponse('Webhook processed')
}))
```

## Trigger.dev Integration

Edge Functions queue long-running jobs to Trigger.dev:

```typescript
// In Edge Function
const response = await fetch(`${TRIGGER_DEV_URL}/api/v1/events`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TRIGGER_DEV_API_KEY}`,
  },
  body: JSON.stringify({
    name: 'order.created',
    payload: { orderId: order.id },
  }),
})
```

Jobs are defined in `src/trigger/jobs/`:
- `generate-quote-pdf.ts` - PDF generation
- `send-email.ts` - Email sending
- `sync-xero.ts` - Xero integration

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin access |
| `WEBHOOK_SECRET` | Shared secret for webhook auth |
| `TRIGGER_DEV_API_KEY` | Trigger.dev API key |
| `TRIGGER_DEV_URL` | Trigger.dev API URL |

## Error Handling

All functions use consistent error responses:

```typescript
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Optional details"
}
```

Error codes:
- `UNAUTHORIZED` - Invalid or missing authorization
- `INVALID_PAYLOAD` - Malformed request body
- `INVALID_EVENT` - Unsupported event type
- `PROCESSING_FAILED` - Handler error
- `METHOD_NOT_ALLOWED` - Wrong HTTP method

## Database Webhook Configuration

Webhooks are configured via SQL triggers. See migrations:
- `0003_realtime_broadcast_triggers.sql` - Realtime broadcasts
- `0004_order_webhooks.sql` - Order webhooks
- `0005_inventory_webhooks.sql` - Inventory webhooks
- `0006_pipeline_webhooks.sql` - Pipeline webhooks

Configure webhook URLs via database settings:

```sql
ALTER DATABASE postgres SET app.order_webhook_url = 'https://your-project.supabase.co/functions/v1/order-webhook';
ALTER DATABASE postgres SET app.webhook_secret = 'your-secret';
```
