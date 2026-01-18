# renoz-v3 Application PRD

> **Product Requirements Document**
> **Version**: 3.0
> **Last Updated**: 2026-01-10
> **Status**: Draft

---

## Executive Summary

**renoz-v3** is an AI-powered Customer Relationship Management (CRM) platform for **Renoz Energy**, an Australian B2B battery manufacturer. The platform manages the complete lifecycle from customer relationships and sales quotes through to order fulfillment, inventory, and (future) installation services.

### About Renoz Energy

Renoz Energy is an Australian battery manufacturer specializing in:
- **Residential Systems**: Lithium-ion battery packs paired with inverters and components
- **Commercial BESS**: Battery Energy Storage Systems for commercial/industrial clients
- **Future Services Arm**: Subcontracting installation services for battery systems

### Vision Statement

> Enable Renoz Energy to manage customer relationships, product configuration, quotes, orders, inventory, and (future) installation services from a single intelligent platform that streamlines B2B battery sales operations.

### Core Value Propositions

1. **Unified Business View**: Single source of truth for customers, quotes, orders, products, and inventory
2. **AI-Powered Insights**: Intelligent lead scoring, quote assistance, and demand forecasting
3. **Workflow Automation**: Streamline quote-to-order, fulfillment, and warranty processes
4. **Role-Optimized UX**: Tailored experiences for sales, warehouse, field installers, and management

---

## Target Users

### Primary Personas

| Role | Description | Key Needs |
|------|-------------|-----------|
| **Sales/Account Manager** | Manages B2B customer relationships, creates quotes for battery systems | Fast quote creation (<5min), system configurator, pipeline visibility |
| **Warehouse/Logistics** | Manages battery inventory, fulfills orders, coordinates shipments | Real-time stock levels, pick/pack workflows, shipment tracking |
| **Field Installer** | (Future) On-site battery installation and commissioning | Mobile-first interface, job checklists, commissioning forms |
| **Finance/Admin** | Handles invoicing, payments, reporting | Xero integration, AR aging, customer statements |
| **Owner/Manager** | Business oversight and strategy | KPI dashboard, AI insights, sales forecasting |

### Organization Size

- **Target**: Renoz Energy internal use (5-30 employees initially)
- **Industry**: Battery manufacturing, renewable energy equipment
- **Market**: Australian residential and commercial customers

---

## Business Context

### Product Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Battery Modules** | Core lithium-ion battery units | 5kWh, 10kWh, 15kWh modules |
| **Inverters** | Power conversion equipment | Hybrid inverters, string inverters |
| **Components** | Supporting equipment | Cables, mounting hardware, monitoring |
| **Residential Systems** | Complete home battery packages | Battery + inverter + components |
| **Commercial BESS** | Large-scale storage systems | 50kWh-500kWh+ containerized units |

### Sales Process

1. **Lead** → Inbound inquiry or referral
2. **Site Assessment** → Understand requirements (kWh, peak demand, grid connection)
3. **System Design** → Configure appropriate battery/inverter combination
4. **Quote** → Generate detailed quote with BOM
5. **Order** → Convert accepted quote to sales order
6. **Fulfillment** → Pick, pack, ship from warehouse
7. **Installation** → (Future) Coordinate subcontractor installation
8. **Commissioning** → System activation and handover
9. **Warranty** → Ongoing warranty registration and support

---

## Technical Architecture

### Stack Overview

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | TanStack Start | Full-stack React, file-based routing, SSR |
| **Runtime** | Bun | Fast, native TypeScript, built-in bundler |
| **React** | React 19 | Required for Bun deployment |
| **Database** | PostgreSQL + Drizzle ORM | Type-safe, migrations, Bun-native |
| **Caching** | TanStack Query | Data fetching, caching, optimistic updates |
| **Forms** | TanStack Form + Zod | Validation, server-side support |
| **Tables** | TanStack Table | Sorting, filtering, virtualization |
| **AI** | Vercel AI SDK + Anthropic Agent SDK | Streaming, structured output, agentic workflows |
| **Auth** | Supabase Auth | Session management, RLS integration, OAuth |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first, component library |
| **Testing** | Vitest + Playwright | Unit, integration, E2E |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  TanStack Router (File-based) │ TanStack Query │ React 19      │
│  └── Route Loaders            │ └── Caching    │ └── RSC       │
└─────────────────────────────────────────────────────────────────┘
                               │
                   ┌───────────┴───────────┐
                   │   TanStack Start      │
                   │   (SSR / Server Fns)  │
                   └───────────┬───────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
┌───────┴───────┐       ┌───────┴───────┐       ┌───────┴───────┐
│   Drizzle ORM │       │ Vercel AI SDK │       │ Supabase Auth │
│   (PostgreSQL)│       │ + Agent SDK   │       │   (Sessions)  │
└───────────────┘       └───────────────┘       └───────────────┘
```

### Project Structure

```
renoz-v3/
├── src/
│   ├── routes/                 # File-based routing
│   │   ├── __root.tsx          # Root layout
│   │   ├── index.tsx           # Dashboard
│   │   ├── customers/          # Customer management
│   │   ├── pipeline/           # Sales pipeline & quotes
│   │   ├── orders/             # Order management
│   │   ├── products/           # Product catalog (batteries, inverters, etc.)
│   │   ├── inventory/          # Stock management
│   │   ├── jobs/               # (V1) Installation jobs
│   │   ├── warranty/           # Warranty registration/claims
│   │   ├── settings/           # System settings
│   │   └── api/                # API routes
│   │       └── chat.ts         # AI chat endpoint
│   ├── components/             # Shared components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── shared/             # Business components
│   │   └── ai/                 # AI-specific components
│   ├── lib/
│   │   ├── server/             # Server functions by domain
│   │   ├── supabase/           # Supabase client
│   │   ├── auth/               # Auth utilities
│   │   └── ai/                 # AI utilities
│   └── styles/                 # Global styles
├── drizzle/
│   ├── schema/                 # Table definitions
│   └── migrations/             # Migration files
├── _patterns/                  # Pattern templates
├── tests/
│   ├── unit/                   # Vitest unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # Playwright E2E tests
├── app.config.ts               # TanStack Start config
├── drizzle.config.ts           # Drizzle config
├── package.json
└── bunfig.toml                 # Bun config
```

---

## Feature Scope

### MVP (Core Business)

| Domain | Features | AI Integration |
|--------|----------|----------------|
| **Customers** | CRUD, search, 360 view, tags, import | Lead scoring, churn prediction |
| **Pipeline** | Stages, system configuration, quotes, probability | Quote assistance, follow-up suggestions |
| **Orders** | Creation from quotes, fulfillment, shipments | Fulfillment optimization |
| **Products** | Battery catalog, inverters, components, system packages | - |
| **Inventory** | Stock levels, warehouse locations, alerts | Reorder predictions |

### V1 Additions

| Domain | Features | AI Integration |
|--------|----------|----------------|
| **Jobs** | Installation scheduling, technician assignment, checklists | Scheduling optimization |
| **Financial** | Invoicing, payments, AR aging, Xero sync | Payment reminders |
| **Communications** | Email tracking, templates, scheduling | Email drafting |
| **Warranty** | Registration, claims tracking, certificates | - |

### V2 Additions

| Domain | Features | AI Integration |
|--------|----------|----------------|
| **Support** | Tickets, SLA, escalation, knowledge base | Ticket triage, resolution suggestions |
| **Suppliers** | Component PO management, supplier performance | - |
| **Site Assessments** | Pre-sale site surveys, requirements capture | System sizing recommendations |

### System Features

| Domain | Features | AI Integration |
|--------|----------|----------------|
| **Dashboard** | KPIs, targets, sales metrics, inventory health | AI insights widget |
| **Users** | Roles, teams, permissions, activity | - |
| **Settings** | System config, audit log, custom fields | - |
| **Reports** | Sales reports, inventory reports, builder | - |

---

## AI Capabilities

### Chat Interface

- Global AI chat sidebar available on all pages
- Context-aware responses based on current view
- Actions: Create quotes, lookup inventory, answer product questions

### Domain-Specific AI

| Feature | Implementation | Model |
|---------|----------------|-------|
| Lead Scoring | Server function + batch job | Claude Sonnet |
| Quote Assistance | useChat + streaming | Claude Sonnet |
| System Configurator AI | Recommend battery/inverter combinations | Claude Sonnet |
| Email Drafting | generateText | Claude Haiku |
| Demand Forecasting | Scheduled analysis | Claude Sonnet |
| Dashboard Insights | Scheduled analysis | Claude Sonnet |

### AI Implementation Pattern

```typescript
// Server function for AI features
export const getQuoteAssistance = createServerFn('POST', async (data: QuoteContext) => {
  const { customerId, siteDetails, requirements } = data

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
    with: { orders: true, quotes: true }
  })

  const products = await db.select().from(products).where(eq(products.active, true))

  const result = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    prompt: `You are a battery system configurator for Renoz Energy.

      Site Details: ${JSON.stringify(siteDetails)}
      Requirements: ${JSON.stringify(requirements)}
      Available Products: ${JSON.stringify(products)}
      Customer History: ${JSON.stringify(customer)}

      Recommend:
      1. Appropriate battery system (kWh capacity)
      2. Compatible inverter
      3. Required components
      4. Estimated total price
      5. Key considerations for this installation`,
  })

  return JSON.parse(result.text)
})
```

---

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial page load | < 2s | Lighthouse |
| Subsequent navigation | < 500ms | TanStack devtools |
| API read operations | < 200ms | Server logs |
| API write operations | < 500ms | Server logs |
| AI chat response (first token) | < 1s | Client timing |
| AI analysis (full response) | < 3s | Client timing |
| Table render (100 rows) | < 100ms | React Profiler |
| Search results | < 300ms debounced | Client timing |

### Reliability

- **Uptime**: 99.5% availability
- **Data backup**: Daily automated backups
- **Error handling**: Graceful degradation, user-friendly messages
- **Offline support**: Basic read operations for field installers (PWA)

### Security

- **Authentication**: Email/password, session-based
- **Authorization**: Role-based access control (RBAC)
- **Data protection**: RLS policies on all tables
- **Audit logging**: All create/update/delete operations logged
- **API security**: Rate limiting, input validation

### Accessibility

- **WCAG**: 2.1 AA compliance
- **Keyboard**: Full keyboard navigation
- **Screen readers**: ARIA labels, semantic HTML
- **Focus management**: Visible focus indicators

---

## Integration Points

### Required Integrations

| System | Purpose | Priority |
|--------|---------|----------|
| **Xero** | Accounting sync (invoices, payments) | MVP |
| **Resend** | Transactional email delivery | MVP |
| **Claude API** | AI features | MVP |

### Future Integrations

| System | Purpose | Timeline |
|--------|---------|----------|
| Google Maps | Site location, routing for installers | V1 |
| Twilio | SMS notifications | V1 |
| Stripe | Payment processing | V1 |
| Shipping carriers | Freight tracking (Toll, StarTrack) | V1 |

---

## PRD Structure

This application is documented across multiple PRDs organized by concern:

### Foundation PRDs (`/foundation/`)

| PRD | Purpose |
|-----|---------|
| `schema-foundation.prd.json` | Database schema patterns |
| `auth-foundation.prd.json` | Authentication and authorization |
| `appshell-foundation.prd.json` | Layout and routing |
| `shared-components-foundation.prd.json` | Component library |

### Domain PRDs (`/domains/`)

| PRD | Stories | Priority |
|-----|---------|----------|
| `customers.prd.json` | 8 | MVP |
| `pipeline.prd.json` | 8 | MVP |
| `orders.prd.json` | 8 | MVP |
| `products.prd.json` | 8 | MVP |
| `inventory.prd.json` | 8 | MVP |
| `jobs.prd.json` | 8 | V1 |
| `financial.prd.json` | 8 | V1 |
| `communications.prd.json` | 8 | V1 |
| `warranty.prd.json` | 8 | V1 |
| `support.prd.json` | 8 | V2 |
| `suppliers.prd.json` | 8 | V2 |
| `dashboard.prd.json` | 8 | System |
| `users.prd.json` | 8 | System |
| `settings.prd.json` | 8 | System |
| `reports.prd.json` | 8 | System |

### Workflow PRDs (`/workflows/`)

| PRD | Purpose |
|-----|---------|
| `lead-to-order.prd.json` | Sales process (lead → quote → order) |
| `order-fulfillment.prd.json` | Warehouse pick/pack/ship |
| `invoicing.prd.json` | Order-to-cash |
| `installation.prd.json` | (V1) Job scheduling and completion |

### Cross-Cutting PRDs (`/cross-cutting/`)

| PRD | Purpose |
|-----|---------|
| `error-handling.prd.json` | Error boundaries, toasts |
| `loading-states.prd.json` | Skeletons, pending states |
| `empty-states.prd.json` | First-run experience |
| `notifications.prd.json` | In-app notifications |
| `accessibility.prd.json` | WCAG compliance |

### Wireframes (`/_wireframes/`)

ASCII wireframes for all major screens, organized by domain.

---

## Success Metrics

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Quote creation time | < 5 minutes | Analytics |
| Order processing time | < 2 minutes | Analytics |
| Customer lookup time | < 10 seconds | Analytics |
| User adoption | 80% daily active | Analytics |

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test coverage | > 80% | Vitest |
| Type coverage | 100% | TypeScript |
| Accessibility score | 100 | Lighthouse |
| Performance score | > 90 | Lighthouse |

### AI Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lead score accuracy | > 85% | Validation set |
| Quote assistance satisfaction | > 4/5 | User feedback |
| Chat satisfaction | > 4/5 | User feedback |

---

## Milestones

| Milestone | Scope | Target |
|-----------|-------|--------|
| **M0: Scaffold** | Project setup, patterns established | Week 1 |
| **M1: Foundation** | Auth, schema, components, AI setup | Weeks 2-3 |
| **M2: MVP Core** | Customers, Pipeline, Orders | Weeks 4-8 |
| **M3: MVP Complete** | Products, Inventory, Dashboard | Week 8 |
| **M4: V1** | Jobs, Financial, Warranty | Weeks 9-10 |
| **M5: Workflows** | End-to-end processes | Weeks 11-12 |
| **M6: V2** | Support, Suppliers, Site Assessments | Weeks 13+ |

---

## Open Questions

1. **Installation services scope**: Full job management or just scheduling handoff to subcontractors?
2. **Multi-warehouse**: Single warehouse MVP or multi-location from start?
3. **Mobile app**: PWA sufficient for field installers or native app needed?
4. **System configurator**: Rule-based or AI-driven battery/inverter matching?

---

## Appendix

### Related Documents

- [Implementation Plan](../../../thoughts/shared/plans/renoz-v3-implementation-plan.md)
- [Research Handoff](../../../thoughts/handoffs/research-tanstack-bun-agent-sdk.md)
- [Ralph Patterns](../_ralph/README.md)
- [Wireframes](../_wireframes/README.md)

### Glossary

| Term | Definition |
|------|------------|
| **360 View** | Complete customer profile with all related data |
| **BESS** | Battery Energy Storage System (commercial-scale) |
| **BOM** | Bill of Materials for system configuration |
| **Commissioning** | Final system activation and handover |
| **kWh** | Kilowatt-hour (battery capacity measurement) |
| **Lead Score** | AI-generated metric (0-100) indicating lead quality |
| **Pipeline** | Sales funnel from lead to closed-won |
| **Quote** | Formal price proposal for battery system |
| **RLS** | Row-Level Security (database access control) |
| **System Package** | Complete battery + inverter + components bundle |

---

*This is a living document. Update as requirements evolve.*
