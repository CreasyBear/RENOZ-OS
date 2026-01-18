# Orders Domain Wireframes Index

> **Domain**: Order Management (DOM-ORDERS)
> **PRD**: memory-bank/prd/domains/orders.prd.json
> **Created**: 2026-01-10

---

## Overview

This index documents all wireframes for the Orders domain, covering the complete order lifecycle from creation to delivery. The wireframes address shipment tracking, delivery confirmation, partial shipments, backorder management, order templates, amendments workflow, and the fulfillment dashboard.

---

## Wireframe Summary

| Story ID | Name | Component Type | Wireframe File | Status |
|----------|------|----------------|----------------|--------|
| DOM-ORD-001c | Shipment Tracking: UI | DataTable | [DOM-ORD-001c.wireframe.md](./DOM-ORD-001c.wireframe.md) | Complete |
| DOM-ORD-002c | Delivery Confirmation: UI | FormDialog | [DOM-ORD-002c.wireframe.md](./DOM-ORD-002c.wireframe.md) | Complete |
| DOM-ORD-003c | Partial Shipments: UI | FormDialog | [DOM-ORD-003c.wireframe.md](./DOM-ORD-003c.wireframe.md) | Complete |
| DOM-ORD-004c | Backorder Management: UI | ExpandableDataTable | [DOM-ORD-004c.wireframe.md](./DOM-ORD-004c.wireframe.md) | Complete |
| DOM-ORD-005c | Order Templates: UI | GridWithPreview | [DOM-ORD-005c.wireframe.md](./DOM-ORD-005c.wireframe.md) | Complete |
| DOM-ORD-006c | Order Amendments: UI | FormDialogWithHistory | [DOM-ORD-006c.wireframe.md](./DOM-ORD-006c.wireframe.md) | Complete |
| DOM-ORD-007 | Fulfillment Dashboard | KanbanBoard | [DOM-ORD-007.wireframe.md](./DOM-ORD-007.wireframe.md) | Complete |

---

## Component Categories

### Shipment & Delivery

| Component | Purpose | Wireframe |
|-----------|---------|-----------|
| Shipment List | Display all shipments for an order | DOM-ORD-001c |
| Ship Order Dialog | Create shipment with carrier/tracking | DOM-ORD-001c |
| Confirm Delivery Dialog | Capture signature, photo, recipient | DOM-ORD-002c |
| Delivery Proof Viewer | View captured delivery evidence | DOM-ORD-002c |
| Signature Pad | Touch/mouse signature capture | DOM-ORD-002c |

### Partial Shipments

| Component | Purpose | Wireframe |
|-----------|---------|-----------|
| Item Ship Selector | Select items and quantities to ship | DOM-ORD-003c |
| Quantity Stepper | Increment/decrement qty controls | DOM-ORD-003c |
| Item Ship Status | Progress indicators per line item | DOM-ORD-003c |

### Backorder Management

| Component | Purpose | Wireframe |
|-----------|---------|-----------|
| Backorder Report | Products with insufficient stock | DOM-ORD-004c |
| Backorder Table | Expandable product rows with orders | DOM-ORD-004c |
| PO Status Badge | Purchase order status indicator | DOM-ORD-004c |
| Backorder Metrics | Summary cards for backorder stats | DOM-ORD-004c |

### Order Templates

| Component | Purpose | Wireframe |
|-----------|---------|-----------|
| Template Library | Grid/list of saved templates | DOM-ORD-005c |
| Template Card | Individual template display | DOM-ORD-005c |
| Template Editor Dialog | Create/edit template with items | DOM-ORD-005c |
| Template Selector | Choose template when creating order | DOM-ORD-005c |
| Save as Template Dialog | Save existing order as template | DOM-ORD-005c |

### Order Amendments

| Component | Purpose | Wireframe |
|-----------|---------|-----------|
| Amendment History | Timeline of order changes | DOM-ORD-006c |
| Request Amendment Dialog | Multi-step change request form | DOM-ORD-006c |
| Amendment Diff View | Before/after comparison | DOM-ORD-006c |
| Amendment Status Badge | Pending/approved/rejected indicator | DOM-ORD-006c |
| Approval Dialog | Approve/reject with reason | DOM-ORD-006c |

### Fulfillment Operations

| Component | Purpose | Wireframe |
|-----------|---------|-----------|
| Fulfillment Board | Kanban columns for workflow | DOM-ORD-007 |
| Fulfillment Column | Individual stage column | DOM-ORD-007 |
| Fulfillment Card | Order card with actions | DOM-ORD-007 |
| Fulfillment Metrics | Today's operations stats | DOM-ORD-007 |
| Bulk Actions Bar | Multi-select action toolbar | DOM-ORD-007 |

---

## Responsive Breakpoints

All wireframes include layouts for:

| Breakpoint | Width | Focus |
|------------|-------|-------|
| Mobile | 375px | Touch-first, vertical stacking |
| Tablet | 768px | Split views, compact tables |
| Desktop | 1280px+ | Full tables, side panels, hover |

---

## Accessibility Features

Every wireframe documents:

1. **Focus Order** - Tab sequence and keyboard navigation
2. **ARIA Requirements** - Roles, labels, live regions
3. **Screen Reader Announcements** - Key state changes
4. **Keyboard Shortcuts** - For power users (where applicable)

### Common Patterns

| Pattern | Usage | ARIA Role |
|---------|-------|-----------|
| Data Tables | Shipments, items, backorders | table with scope headers |
| Expandable Rows | Backorder products, amendments | treegrid with aria-expanded |
| Drag-Drop | Fulfillment Kanban | application with aria-grabbed |
| Dialogs | All forms and confirmations | dialog with aria-modal |
| Status Badges | All status indicators | status with aria-label |
| Progress Bars | Ship progress, pick progress | progressbar with aria-valuenow |

---

## Animation Timings

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| Micro | 150ms | ease-out | Button press, toggle |
| Standard | 250ms | ease-out | Dropdown, tab switch |
| Complex | 350ms | ease-out | Modal, sidebar |
| Drag | 200ms | spring | Card movement |
| Success | 400ms | ease-out | Checkmark, confirmation |

---

## Integration Points

### Order Panel Tabs

The order detail panel integrates these wireframe components:

```
[Items] [Fulfillment] [Activity] [Amendments]
   |         |            |           |
   |         |            |           +-- DOM-ORD-006c
   |         |            +-- Existing (activity-log.tsx)
   |         +-- DOM-ORD-001c, 002c, 003c (shipments, delivery)
   +-- DOM-ORD-003c, 004c (ship status, backorder status)
```

### Settings Integration

- **Order Templates** (DOM-ORD-005c) - Settings > Templates route

### Reports Integration

- **Backorder Report** (DOM-ORD-004c) - Reports > Backorders route

### Dedicated Routes

- **Fulfillment Dashboard** (DOM-ORD-007) - /fulfillment route

---

## Files Created

### Wireframe Documents

```
memory-bank/prd/_wireframes/domains/
├── DOM-ORD-001c.wireframe.md   <- Shipment Tracking
├── DOM-ORD-002c.wireframe.md   <- Delivery Confirmation
├── DOM-ORD-003c.wireframe.md   <- Partial Shipments
├── DOM-ORD-004c.wireframe.md   <- Backorder Management
├── DOM-ORD-005c.wireframe.md   <- Order Templates
├── DOM-ORD-006c.wireframe.md   <- Order Amendments
├── DOM-ORD-007.wireframe.md    <- Fulfillment Dashboard
└── orders-index.md             <- This file
```

### Component Files (To Create)

```
src/components/domain/orders/
├── shipment-list.tsx           <- DOM-ORD-001c
├── shipment-card.tsx           <- DOM-ORD-001c
├── ship-order-dialog.tsx       <- DOM-ORD-001c, 003c
├── carrier-config.ts           <- DOM-ORD-001c
├── confirm-delivery-dialog.tsx <- DOM-ORD-002c
├── signature-pad.tsx           <- DOM-ORD-002c
├── delivery-proof-viewer.tsx   <- DOM-ORD-002c
├── item-ship-selector.tsx      <- DOM-ORD-003c
├── quantity-stepper.tsx        <- DOM-ORD-003c
├── item-ship-status.tsx        <- DOM-ORD-003c
├── backorder-table.tsx         <- DOM-ORD-004c
├── backorder-item.tsx          <- DOM-ORD-004c
├── po-status-badge.tsx         <- DOM-ORD-004c
├── template-library.tsx        <- DOM-ORD-005c
├── template-card.tsx           <- DOM-ORD-005c
├── template-editor-dialog.tsx  <- DOM-ORD-005c
├── template-selector.tsx       <- DOM-ORD-005c
├── amendment-history.tsx       <- DOM-ORD-006c
├── request-amendment-dialog.tsx<- DOM-ORD-006c
├── amendment-diff-view.tsx     <- DOM-ORD-006c
├── fulfillment-board.tsx       <- DOM-ORD-007
├── fulfillment-column.tsx      <- DOM-ORD-007
├── fulfillment-card.tsx        <- DOM-ORD-007
├── fulfillment-metrics.tsx     <- DOM-ORD-007
└── fulfillment-filters.tsx     <- DOM-ORD-007

src/routes/_authed/
├── fulfillment/index.tsx       <- DOM-ORD-007
├── reports/backorders.tsx      <- DOM-ORD-004c
└── settings/templates.tsx      <- DOM-ORD-005c
```

---

## Design References

External references from the PRD:

| Reference | Usage |
|-----------|-------|
| `.square-ui-reference/templates/task-management/` | Fulfillment Kanban (DOM-ORD-007) |
| `.square-ui-reference/templates/tasks/` | Shipment tracking list (DOM-ORD-001c) |
| `.square-ui-reference/templates/projects-timeline/` | Amendment timeline (DOM-ORD-006c) |
| `.square-ui-reference/templates/files/` | Template library grid (DOM-ORD-005c) |
| `.reui-reference/components/drawer.tsx` | Delivery confirmation modal (DOM-ORD-002c) |

---

## Performance Targets

| Feature | Target | Wireframe |
|---------|--------|-----------|
| Order list render | < 100ms for 100 rows | All |
| Order detail load | < 2s | DOM-ORD-001c, 003c, 006c |
| Drag start response | < 100ms | DOM-ORD-007 |
| Drop response | < 500ms | DOM-ORD-007 |
| Filter apply | < 500ms | DOM-ORD-004c, 007 |
| Auto-refresh | 30s interval | DOM-ORD-007 |

---

## Next Steps

1. **Implementation Priority**: Follow story dependencies in PRD
   - DOM-ORD-001c requires 001a, 001b (schema, server)
   - DOM-ORD-002c requires 002a, 002b, 001c
   - DOM-ORD-003c requires 003a, 003b
   - etc.

2. **Design Review**: Share wireframes with stakeholders for feedback

3. **Component Development**: Create components following the TypeScript interfaces documented in each wireframe

4. **Testing**: Verify accessibility with screen readers and keyboard-only navigation

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
