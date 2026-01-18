# Role-Specific PRDs

Role PRDs optimize the experience for each persona defined in VISION.md. These are built AFTER foundation, domain, workflow, and cross-cutting features are in place.

## Personas (from VISION.md)

| Role | Focus | PRD |
|------|-------|-----|
| Sales / Account Manager | Fast quotes, customer context, pipeline | sales.prd.json |
| Operations / Warehouse | Stock visibility, picking, receiving | operations.prd.json |
| Field Technician | Mobile-first, offline, job completion | field-tech.prd.json |
| Finance / Admin | Invoice workflows, Xero, AR | finance.prd.json |
| Owner / Manager | Business health, exceptions, approvals | admin.prd.json |

## Execution Order

Role PRDs are Phase 5 in the master execution sequence:

```
1. Refactoring (technical debt)
2. Foundation (core infra)
3. Domain (entity CRUD)
4. Workflows (processes)
5. Cross-Cutting (UX polish)
6. Roles (persona optimization) ← HERE
7. Integrations (external systems)
```

## Story Counts

| PRD | Stories | Priority Focus |
|-----|---------|----------------|
| sales.prd.json | 8 | Quote wizard, search, pipeline |
| operations.prd.json | 8 | Warehouse dashboard, picking, alerts |
| field-tech.prd.json | 8 | Mobile PWA, offline sync, time entry |
| finance.prd.json | 8 | Invoice generation, Xero reconciliation |
| admin.prd.json | 8 | Business health, exceptions, approvals |
| **Total** | **40** | |

## Key Dependencies

Role PRDs depend on completion of:

- **Foundation PRDs**: Server functions, auth, validation
- **Domain PRDs**: Customers, orders, inventory, jobs, quotes, invoices
- **Workflow PRDs**: Lead-to-order, fulfillment, procurement
- **Cross-Cutting PRDs**: Loading states, empty states, error handling

## Design Principles

1. **Role = Landing Page**: Each role has an optimized dashboard as their default view
2. **Context in View**: Show what each persona needs without navigation
3. **Quick Actions**: Common tasks accessible in 1-2 clicks
4. **Mobile Consideration**: Field tech is mobile-first; others are desktop-first with mobile support
5. **Performance Targets**: Role dashboards must load < 2s (per assumptions.md)

## Success Criteria (The Gasp Test)

- Sales rep creates quote in < 5 minutes
- Warehouse staff sees full operational picture at a glance
- Field tech completes job from mobile < 2 minutes
- Finance person generates invoices without switching contexts
- Admin spots exceptions before they become problems
