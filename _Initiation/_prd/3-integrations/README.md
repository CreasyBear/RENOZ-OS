# Integration PRDs

> **Purpose**: Third-party service integrations
> **Phase**: Can run parallel to domain/workflow PRDs
> **Total Stories**: 24 (8 stories × 3 integrations)

---

## Integration Summary

| Integration | Stories | Service | Focus |
|-------------|---------|---------|-------|
| [xero.prd.json](./xero.prd.json) | 8 | Xero | Accounting sync |
| [resend.prd.json](./resend.prd.json) | 8 | Resend | Email delivery |
| [claude-ai.prd.json](./claude-ai.prd.json) | 8 | Claude/Anthropic | AI assistant |

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    XERO     │  │   RESEND    │  │   CLAUDE    │              │
│  │             │  │             │  │             │              │
│  │ • Contacts  │  │ • Sending   │  │ • Chat      │              │
│  │ • Invoices  │  │ • Webhooks  │  │ • Tools     │              │
│  │ • Payments  │  │ • Analytics │  │ • Context   │              │
│  │ • Webhooks  │  │ • Templates │  │ • Agents    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ═══════╪════════════════╪════════════════╪═══════════════════  │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    RENOZ APPLICATION                     │    │
│  │                                                          │    │
│  │  Financial ◄──── Xero      Communications ◄──── Resend  │    │
│  │  All Domains ◄──────────────────────────────────► Claude │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Execution Order

Integrations can run **in parallel** with domain PRDs as they are relatively independent.

```
Recommended Sequence:

1. Foundation PRDs → Establishes patterns
         ↓
2. Integration PRDs → Can start immediately after foundation
   └── INT-XERO: Start with contact sync, then invoices
   └── INT-RESEND: Start with webhooks, then analytics
   └── INT-CLAUDE: Depends on REF-AI stories for architecture
         ↓
3. Domain PRDs → Use integrations as they become available
         ↓
4. Workflow PRDs → Full integration usage
```

### Dependencies

| Integration | Depends On |
|-------------|------------|
| INT-XERO | DOM-FINANCIAL (for invoice structures) |
| INT-RESEND | DOM-COMMS (for email features) |
| INT-CLAUDE | REF-AI (for AI architecture) |

---

## Story Completion Tracking

### INT-XERO (Xero Accounting)
- [ ] INT-XERO-001: Add Bi-Directional Contact Sync
- [ ] INT-XERO-002: Add Complete Invoice Sync
- [ ] INT-XERO-003: Add Credit Note Sync
- [ ] INT-XERO-004: Add Xero Webhooks
- [ ] INT-XERO-005: Add Sync Error Handling UI
- [ ] INT-XERO-006: Add Sync History and Logs
- [ ] INT-XERO-007: Add Bulk Sync Operations
- [ ] INT-XERO-008: Add Xero Dashboard Widget

### INT-RESEND (Email)
- [ ] INT-RES-001: Add Resend Webhooks
- [ ] INT-RES-002: Add Bounce/Complaint Handling
- [ ] INT-RES-003: Add Email Analytics Dashboard
- [ ] INT-RES-004: Add Domain Verification Status
- [ ] INT-RES-005: Add Batch Email Support
- [ ] INT-RES-006: Add Email Testing/Preview
- [ ] INT-RES-007: Add Suppression List Management
- [ ] INT-RES-008: Add Email Status Widget

### INT-CLAUDE (AI Assistant)
- [ ] INT-AI-001: Add Conversation Persistence
- [ ] INT-AI-002: Add Page Context Injection
- [ ] INT-AI-003: Add Proactive AI Suggestions
- [ ] INT-AI-004: Add Scheduled AI Reports
- [ ] INT-AI-005: Add AI Usage Analytics
- [ ] INT-AI-006: Add Custom AI Personas
- [ ] INT-AI-007: Add AI Actions Audit
- [ ] INT-AI-008: Add AI Rate Limit Management

---

## Key References

### External Documentation

| Integration | Documentation |
|-------------|---------------|
| Xero | https://developer.xero.com/documentation/ |
| Resend | https://resend.com/docs/ |
| Claude | https://docs.anthropic.com/ |
| AI SDK | https://sdk.vercel.ai/ |

### Internal References

| Integration | Related Domains |
|-------------|-----------------|
| Xero | Financial, Customers, Invoicing workflow |
| Resend | Communications, Support, Lead-to-Order workflow |
| Claude | All domains (query tools), Refactoring AI |

---

## Integration Patterns

### Webhook Handling

All integrations use consistent webhook pattern:

```typescript
// Webhook endpoint
export const handleWebhook = createServerFn({ method: 'POST' })
  .handler(async ({ request }) => {
    // 1. Verify signature
    // 2. Parse event
    // 3. Queue for processing via Trigger.dev
    // 4. Return 200 immediately
  })
```

### Sync Error Pattern

All integrations track sync status consistently:

```typescript
// Sync status tracking
interface SyncLog {
  id: string
  service: 'xero' | 'resend'
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete'
  status: 'success' | 'failed' | 'pending'
  error?: string
  timestamp: Date
}
```

### Rate Limiting

All integrations respect external API limits:

- **Xero**: 60 calls/minute
- **Resend**: Based on plan
- **Claude**: Token-based limiting

---

## Gate Criteria

Before marking integration PRD complete:

- [ ] All 8 stories completed
- [ ] Webhooks receiving and processing
- [ ] Error handling UI functional
- [ ] Sync logs capturing activity
- [ ] Dashboard widget showing status
- [ ] Rate limits respected
- [ ] `npm run typecheck` passes
- [ ] No regressions

---

## Additional Integrations (Future)

Potential future integrations not currently scoped:

- **Stripe/PayPal**: Payment processing
- **Twilio**: SMS notifications
- **Google Calendar**: Schedule sync
- **Slack**: Team notifications
- **Zapier**: Generic integrations

---

*Integrations connect Renoz to the external services that power business operations.*
