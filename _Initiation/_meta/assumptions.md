# Assumptions

> **Purpose**: Constraints and assumptions Ralph loops MUST respect
> **Last Updated**: 2026-01-09
> **Status**: Active

---

## Business Assumptions

### Market & Customer

| Assumption | Implication |
|------------|-------------|
| **Australian market only** | AUD currency, GST (10%), Australian date formats (DD/MM/YYYY), AEST/AEDT timezone |
| **B2B only** | No consumer portal, customers are businesses with ABN |
| **Single organization** | No multi-tenancy UI, RLS handles data isolation |
| **Team size 5-15** | No complex permission hierarchies, 4 core roles sufficient |
| **Domestic sales** | No international shipping, no currency conversion in orders |
| **Supplier currencies** | USD and RMB for imports, but quoted to customers in AUD |

### Business Model

| Assumption | Implication |
|------------|-------------|
| **Product sales primary** | Inventory management is core, not service scheduling |
| **Installation services secondary** | Jobs domain supports but doesn't drive architecture |
| **Xero is financial truth** | Sync invoices TO Xero, don't replicate accounting logic |
| **Fixed-price projects** | No time & materials billing in MVP |
| **Single warehouse** | No multi-location inventory in MVP |

### Users & Roles

| Role | Access Level | Primary Functions |
|------|--------------|-------------------|
| **Admin** | Full access | All operations, user management |
| **Sales** | Customer + Pipeline | Quotes, orders, customer management |
| **Warehouse** | Inventory + Orders | Fulfillment, receiving, stock counts |
| **Viewer** | Read-only | Reports, dashboards |

---

## Technical Assumptions

### Stack (Non-Negotiable)

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | TanStack Start | Latest |
| **UI** | React | 19.2+ |
| **Routing** | TanStack Router | File-based |
| **State** | TanStack Query | Server state |
| **Forms** | TanStack Form | With Zod |
| **Tables** | TanStack Table | Column factories |
| **Database** | PostgreSQL | Via Supabase |
| **ORM** | Drizzle | Type-safe queries |
| **Auth** | Supabase Auth | JWT + RLS |
| **Storage** | Supabase Storage | File uploads |
| **Email** | Resend | Transactional |
| **AI** | Claude API (Vercel AI SDK) | Workflow automation |
| **Background Jobs** | Trigger.dev | Async processing |
| **Rate Limiting** | Upstash Redis | Mutation throttling |
| **PDF Generation** | React PDF | Invoice/quote PDFs |
| **Notifications** | Midday SDK | In-app notifications |

### Architecture Patterns

| Pattern | Assumption | Violation = Bug |
|---------|------------|-----------------|
| **Clean Architecture** | Presentation → Application → Infrastructure | Direct DB calls from components |
| **Server Functions** | All data access via `createServerFn()` | Client-side Drizzle queries |
| **Validation Injection** | Zod schemas injected at server boundary | Validation in components |
| **RLS Context** | `withRLSContext()` wraps all queries | Raw Drizzle without context |
| **Optimistic Concurrency** | Version-based conflict detection | Updates without version check |
| **Audit Logging** | All mutations logged with user/timestamp | No audit trail |
| **Background Processing** | Long tasks via Trigger.dev jobs | Blocking API calls |

### Data Assumptions

| Entity | Assumption |
|--------|------------|
| **Customers** | < 10,000 records (no pagination needed for dropdowns) |
| **Orders** | < 100,000 records (standard pagination sufficient) |
| **Products** | < 5,000 SKUs (can load full catalog) |
| **Opportunities** | < 50,000 records |
| **Files** | < 10MB per upload, < 100 files per entity |

---

## UX Assumptions

### Device & Browser

| Assumption | Implication |
|------------|-------------|
| **Desktop-first** | 1280px+ primary viewport, responsive down to 768px |
| **Modern browsers** | Chrome, Firefox, Safari, Edge (no IE11) |
| **Keyboard users** | Full keyboard navigation required |
| **Mobile = responsive web** | No native app, PWA for field workers |

### Interaction Patterns

| Pattern | Assumed Behavior |
|---------|------------------|
| **Data tables** | Sortable, filterable, bulk-selectable |
| **Forms** | Inline validation, optimistic submit |
| **Navigation** | Sidebar primary, breadcrumbs secondary |
| **Search** | Global search in header, contextual filters in tables |
| **Actions** | Primary action prominent, secondary in menus |

### Performance

| Metric | Target |
|--------|--------|
| **Page load** | < 2s initial, < 500ms subsequent |
| **API response** | < 200ms for reads, < 500ms for writes |
| **Table render** | < 100ms for 100 rows |
| **Search** | < 300ms debounced results |

---

## Integration Assumptions

### Xero

| Assumption | Implication |
|------------|-------------|
| **Xero connected** | OAuth tokens stored, refresh handled |
| **One-way sync for invoices** | Create in Renoz → Push to Xero |
| **Contacts sync** | Bi-directional, Xero ID stored |
| **No payment sync MVP** | Payment status manual until v2 |

### Email (Resend)

| Assumption | Implication |
|------------|-------------|
| **Verified domain** | SPF/DKIM configured |
| **Template-based** | React Email templates |
| **Tracking optional** | Open/click tracking off by default |

### AI (Claude)

| Assumption | Implication |
|------------|-------------|
| **API access** | Anthropic API key via Vercel AI SDK |
| **Haiku for speed** | Use haiku for quick tasks |
| **Sonnet for quality** | Use sonnet for complex analysis |
| **Context limits** | Summarize large datasets before sending |
| **AI Conversations** | Stored in `aiConversations` table |

### Background Jobs (Trigger.dev)

| Assumption | Implication |
|------------|-------------|
| **Non-blocking operations** | Email, sync, reports run async |
| **Job types implemented** | Xero sync, email delivery, warranty checks, notifications |
| **Retry handling** | Failed jobs retry automatically |
| **Rate limiting** | Via Upstash Redis `mutationLimiter` |

---

## Scope Boundaries

### In Scope (v1)

- Customer management (contacts, addresses, communication history)
- Opportunity pipeline (leads, quotes, conversion)
- Order management (creation, fulfillment, invoicing)
- Inventory (products, stock levels, movements)
- Basic jobs (installation tracking, punchlists)
- Issues/support (warranty claims, service requests)
- Xero integration (contacts, invoices)
- Email integration (transactional, templates)
- AI assistance (quote generation, data extraction)

### Out of Scope (Explicit)

| Feature | Reason | Future Phase |
|---------|--------|--------------|
| **Multi-tenancy UI** | Single org assumption | Never |
| **E-commerce** | B2B only | Never |
| **Mobile native apps** | PWA sufficient | v3+ |
| **Complex accounting** | Xero handles this | Never |
| **Multi-warehouse** | Single location | v2 |
| **External customer portal** | Internal tool | v3+ |
| **Advanced analytics** | Basic dashboards first | v2 |
| **Workflow automation** | Basic automation via Trigger.dev | IMPLEMENTED in v1 |

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| **Data scale exceeds assumptions** | Pagination strategy documented, can add |
| **Xero API changes** | Abstraction layer, version pinning |
| **Mobile becomes critical** | PWA foundation, can enhance |
| **Multi-org needed** | RLS already supports, UI would need work |
| **Performance degrades** | Query optimization, caching strategy ready |

---

## Validation Checklist

Before any PRD or implementation, verify:

- [ ] Does this fit B2B Australian market?
- [ ] Does this respect the 4-role model?
- [ ] Does this use the established tech stack?
- [ ] Does this follow Clean Architecture?
- [ ] Does this respect data scale assumptions?
- [ ] Is this in scope for current version?
- [ ] Does Xero remain the financial source of truth?

---

*These assumptions are constraints. Violating them requires explicit ADR approval.*
