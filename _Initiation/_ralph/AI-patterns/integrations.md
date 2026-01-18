# MCP & Integrations

## Model Context Protocol (MCP)

MCP is the standard for connecting AI to external tools and data sources.

```typescript
// Using @ai-sdk/mcp
import { experimental_createMCPClient } from '@ai-sdk/mcp';

const mcpClient = await experimental_createMCPClient({
  transport: {
    type: 'stdio',
    command: 'npx',
    args: ['@anthropic/mcp-server-hubspot']
  }
});

// Use MCP tools in agent
const agent = new Agent({
  tools: {
    ...localTools,
    ...mcpClient.tools()
  }
});
```

---

## Available MCP Servers for CRM

| Server | Purpose | Stars |
|--------|---------|-------|
| `mcp-hubspot` | HubSpot CRM operations | 113 |
| `mcp-salesforce` | Salesforce integration | - |
| `mcp-google-calendar` | Meeting scheduling | - |
| `mcp-email` | Email operations | - |
| `mcp-slack` | Team notifications | - |

---

## Composio Alternative

Composio provides 100+ pre-built integrations:

```typescript
import { Composio } from 'composio';

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

// Get all available tools for HubSpot
const hubspotTools = await composio.getTools({
  app: 'hubspot',
  actions: ['create_contact', 'get_deals', 'update_deal']
});

// Use in agent
const agent = new Agent({
  tools: hubspotTools
});
```

---

## Internal Integration Pattern

For Renoz's existing integrations (Xero, Resend):

```typescript
// lib/ai/tools/integrations/xero.ts
export const xeroTools = {
  get_xero_invoice: {
    name: 'get_xero_invoice',
    description: 'Get invoice details from Xero',
    parameters: z.object({
      invoiceId: z.string()
    }),
    execute: async ({ invoiceId }) => {
      // Use existing Xero integration
      const invoice = await xeroClient.getInvoice(invoiceId);
      return {
        invoice,
        _meta: {
          isPaid: invoice.status === 'PAID',
          isOverdue: invoice.dueDate < new Date() && invoice.status !== 'PAID',
          xeroUrl: `https://go.xero.com/Invoices/${invoiceId}`
        }
      };
    }
  },

  sync_to_xero: {
    name: 'sync_to_xero',
    description: 'Sync an order to Xero as invoice',
    requiresApproval: true,  // Human approval required
    parameters: z.object({
      orderId: z.string()
    }),
    execute: async ({ orderId }) => {
      const order = await getOrder(orderId);

      return {
        type: 'approval_required',
        action: 'sync_to_xero',
        preview: {
          orderId,
          customerName: order.customer.name,
          total: order.total,
          lineItems: order.items.length
        },
        message: `Ready to sync order to Xero. This will create an invoice for ${order.customer.name}.`
      };
    }
  }
};
```

---

## Email Integration (Resend)

```typescript
// lib/ai/tools/integrations/email.ts
export const emailTools = {
  draft_email: {
    name: 'draft_email',
    description: 'Draft an email to a customer (human must approve send)',
    requiresApproval: true,
    parameters: z.object({
      customerId: z.string(),
      subject: z.string(),
      body: z.string(),
      templateId: z.string().optional()
    }),
    execute: async ({ customerId, subject, body, templateId }) => {
      const customer = await getCustomer(customerId);
      const contact = customer.contacts.find(c => c.isPrimary);

      if (!contact?.email) {
        return { error: 'NO_EMAIL', message: 'Customer has no email on file' };
      }

      // Create draft, don't send
      const draft = await createEmailDraft({
        to: contact.email,
        subject,
        body,
        templateId,
        customerId
      });

      return {
        type: 'approval_required',
        action: 'send_email',
        draft: {
          id: draft.id,
          to: contact.email,
          subject,
          preview: body.substring(0, 200)
        },
        message: `Email draft ready to send to ${contact.email}`,
        approvalActions: [
          { label: 'Send', action: 'send', url: `/emails/drafts/${draft.id}/send` },
          { label: 'Edit', action: 'edit', url: `/emails/drafts/${draft.id}` },
          { label: 'Discard', action: 'discard' }
        ]
      };
    }
  }
};
```

---

## Integration Tool Registry

```typescript
// lib/ai/tools/integrations/index.ts
export const integrationTools = {
  // Accounting
  ...xeroTools,

  // Email
  ...emailTools,

  // Calendar (future)
  // ...calendarTools,

  // Notifications
  ...notificationTools
};

// Conditional loading based on org settings
export async function getEnabledIntegrationTools(orgId: string) {
  const settings = await getOrgIntegrationSettings(orgId);
  const tools: Tool[] = [];

  if (settings.xero.enabled) {
    tools.push(...Object.values(xeroTools));
  }
  if (settings.resend.enabled) {
    tools.push(...Object.values(emailTools));
  }

  return tools;
}
```

---

## Rate Limiting for Integrations

```typescript
// lib/ai/tools/integrations/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';

const rateLimiters = {
  xero: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(55, '60 s'), // Xero: 60/min, we use 55
  }),
  resend: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(90, '1 s'), // Resend: 100/sec
  })
};

export async function withRateLimit<T>(
  integration: keyof typeof rateLimiters,
  orgId: string,
  fn: () => Promise<T>
): Promise<T> {
  const limiter = rateLimiters[integration];
  const { success, remaining } = await limiter.limit(`${integration}:${orgId}`);

  if (!success) {
    throw new Error(`Rate limit exceeded for ${integration}. Try again shortly.`);
  }

  // Warn if approaching limit
  if (remaining < 10) {
    console.warn(`${integration} rate limit warning: ${remaining} remaining`);
  }

  return fn();
}
```
