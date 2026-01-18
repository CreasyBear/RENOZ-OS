# Inventory Domain Wireframes Index

> **Domain**: Inventory Management
> **PRD**: memory-bank/prd/domains/inventory.prd.json
> **Last Updated**: January 10, 2026

---

## Overview

This index summarizes all wireframes created for the Inventory Management domain. The wireframes cover stock tracking, movements, allocations, warehouse operations, reporting, and forecasting capabilities.

---

## Wireframe Files

| Story ID | Name | Wireframe File | Status |
|----------|------|----------------|--------|
| DOM-INV-001c | Reorder Point Alerts: UI | [DOM-INV-001c.wireframe.md](./DOM-INV-001c.wireframe.md) | Complete |
| DOM-INV-002c | Warehouse Locations: UI | [DOM-INV-002c.wireframe.md](./DOM-INV-002c.wireframe.md) | Complete |
| DOM-INV-003c | Stock Count Process: UI | [DOM-INV-003c.wireframe.md](./DOM-INV-003c.wireframe.md) | Complete |
| DOM-INV-004c | Reserved Stock Handling: UI | [DOM-INV-004c.wireframe.md](./DOM-INV-004c.wireframe.md) | Complete |
| DOM-INV-005c | Inventory Valuation: UI | [DOM-INV-005c.wireframe.md](./DOM-INV-005c.wireframe.md) | Complete |
| DOM-INV-006 | Inventory Forecasting | [DOM-INV-006.wireframe.md](./DOM-INV-006.wireframe.md) | Complete |
| DOM-INV-007 | Inventory Aging Report | [DOM-INV-007.wireframe.md](./DOM-INV-007.wireframe.md) | Complete |
| DOM-INV-008a/b | Inventory Dashboard | [DOM-INV-008.wireframe.md](./DOM-INV-008.wireframe.md) | Complete |

---

## Wireframe Summary

### DOM-INV-001c: Reorder Point Alerts UI

**Purpose**: Enhanced low stock widget with "Create PO" quick action, alert banner with reorderQty suggestions, and pre-filled purchase order creation.

**Key Components**:
- Low Stock Widget (dashboard)
- Inventory Alerts Banner
- Create PO Dialog
- Create PO Quick Action Button

**User Flows**:
1. View low stock alerts on dashboard
2. Click "Create PO" to instantly create purchase order
3. Review and confirm pre-filled order details
4. Bulk create POs for all low stock items

---

### DOM-INV-002c: Warehouse Locations UI

**Purpose**: Location management settings page, location selector on goods receipt, location column in inventory list, and inventory transfer between locations.

**Key Components**:
- Location Settings Page (CRUD)
- Location Selector Combobox
- Locations Table
- Move Inventory Dialog

**User Flows**:
1. Create/edit warehouse locations in settings
2. Select put-away location during goods receipt
3. View/filter inventory by location
4. Transfer stock between locations

---

### DOM-INV-003c: Stock Count Process UI

**Purpose**: Stock count entry interface with barcode scanning, variance highlighting, count history, and adjustment preview on completion.

**Key Components**:
- Stock Counts List Page
- Count Entry Interface
- Barcode Scanner
- Quantity Stepper
- Variance Indicator
- Complete Count Dialog

**User Flows**:
1. Start new stock count (full or partial)
2. Scan or manually enter quantities
3. Review variances with color highlighting
4. Complete count and apply adjustments

---

### DOM-INV-004c: Reserved Stock Handling UI

**Purpose**: Inventory list showing On Hand, Allocated, Available columns with release reservation action and reserved stock report.

**Key Components**:
- Enhanced Inventory Columns
- Allocations Tab
- Stock Distribution Bar
- Release Reservation Dialog
- Reserved Stock Report Page

**User Flows**:
1. View allocated vs available stock
2. Review allocations per product
3. Release reservations manually
4. Generate reserved stock reports

---

### DOM-INV-005c: Inventory Valuation UI

**Purpose**: FIFO valuation report showing cost layers per product, COGS calculator, and total inventory value on dashboard.

**Key Components**:
- Valuation Report Page
- Cost Layers Modal
- COGS Calculator
- Category Valuation View
- Inventory Value Widget

**User Flows**:
1. View inventory valuation by product
2. Drill into FIFO cost layers
3. Calculate cost of goods sold
4. Track value trends over time

---

### DOM-INV-006: Inventory Forecasting

**Purpose**: Predict stock needs based on usage history, stockout predictions, reorder recommendations, and projected stock visualization.

**Key Components**:
- Forecast Overview Page
- Forecast Chart (projection)
- Usage Analysis
- Reorder Suggestions
- Expected Receipts View

**User Flows**:
1. View stockout risk predictions
2. Analyze usage patterns
3. Review reorder recommendations
4. Take action (expedite/create PO)

---

### DOM-INV-007: Inventory Aging Report

**Purpose**: Track inventory age, display aging buckets, highlight slow-moving items, and provide clearance/write-off actions.

**Key Components**:
- Aging Report Page
- Aging Bucket Cards
- Aging Items Table
- Mark for Clearance Dialog
- Write-off Dialog
- Bulk Actions

**User Flows**:
1. View aging distribution
2. Identify slow-moving inventory
3. Mark items for clearance sale
4. Write off obsolete stock
5. Export aging report

---

### DOM-INV-008a/b: Inventory Dashboard

**Purpose**: Dedicated inventory dashboard with KPI cards, widgets for low stock, pending receipts, movements timeline, top products, and stock health.

**Key Components**:
- Dashboard Page
- KPI Cards
- Low Stock Widget
- Pending Receipts Widget
- Recent Movements Widget
- Top Products Widget
- Stock Health Widget
- Value Trend Chart

**User Flows**:
1. View inventory health at a glance
2. Monitor low stock alerts
3. Track incoming shipments
4. Review recent activity
5. Analyze stock health indicators

---

## Responsive Breakpoints

All wireframes include layouts for:

| Breakpoint | Width | Primary Use |
|------------|-------|-------------|
| Mobile | 375px | Field staff, warehouse floor |
| Tablet | 768px | Office use, quick reference |
| Desktop | 1280px+ | Full management, reporting |

---

## Interaction States

Each wireframe documents:

- **Loading States**: Skeleton screens with shimmer animations
- **Empty States**: Helpful messaging with call-to-action
- **Error States**: Clear error messages with recovery actions
- **Success States**: Confirmation feedback with next steps

---

## Accessibility Standards

All wireframes include:

- **Focus Order**: Tab sequence for keyboard navigation
- **ARIA Requirements**: Labels, roles, and live regions
- **Screen Reader Announcements**: Key state changes
- **Touch Targets**: Minimum 44px (48px for primary actions)

---

## Animation Timings

Consistent animation choreography across wireframes:

| Animation Type | Duration | Easing |
|----------------|----------|--------|
| Micro (button, toggle) | 150ms | ease-out |
| Standard (dropdown, tab) | 250ms | ease-out |
| Complex (modal, sidebar) | 350ms | ease-out |
| Chart draw | 600-1000ms | ease-out |
| Count animation | 800ms | ease-out |

---

## Component Dependencies

### Shared Components

| Component | Used In |
|-----------|---------|
| Skeleton | All loading states |
| Toast | All success/error feedback |
| Dialog | All modal actions |
| Table | Lists, reports |
| Chart | Valuation, forecasting, dashboard |
| Badge | Status indicators throughout |

### Domain-Specific Components

| Component | File Path |
|-----------|-----------|
| Low Stock Widget | `widgets/low-stock-widget.tsx` |
| Location Selector | `warehouse/location-selector.tsx` |
| Barcode Scanner | `inventory/barcode-scanner.tsx` |
| Variance Indicator | `inventory/variance-indicator.tsx` |
| Cost Layers Modal | `inventory/cost-layers-modal.tsx` |
| Forecast Chart | `inventory/forecast-chart.tsx` |
| Aging Buckets | `inventory/aging-buckets.tsx` |
| Stock Health Widget | `widgets/stock-health-widget.tsx` |

---

## Routes Structure

```
/inventory
  /dashboard        <- DOM-INV-008a/b
  /items            <- Existing inventory list
  /items/:id        <- Item detail with allocations tab (DOM-INV-004c)
  /stock-counts     <- DOM-INV-003c
  /stock-counts/:id <- Count entry
  /forecast         <- DOM-INV-006
/settings
  /locations        <- DOM-INV-002c
/reports
  /inventory-valuation  <- DOM-INV-005c
  /inventory-aging      <- DOM-INV-007
  /reserved-stock       <- DOM-INV-004c
```

---

## Design Tokens

### Colors

| Purpose | Token | Value |
|---------|-------|-------|
| Healthy/Success | green-500 | #22C55E |
| Warning/At Risk | orange-500 | #F97316 |
| Critical/Error | red-500 | #EF4444 |
| Info/Allocated | blue-500 | #3B82F6 |
| Neutral/Pending | gray-500 | #6B7280 |

### Status Indicators

| Status | Icon | Color |
|--------|------|-------|
| Active/OK | Checkmark | Green |
| Warning | Triangle | Orange |
| Critical | Alert | Red |
| Pending | Question | Gray |
| Info | Circle | Blue |

---

## Implementation Priority

Based on PRD story priorities:

1. **Priority 1**: DOM-INV-001c (Reorder Alerts)
2. **Priority 2**: DOM-INV-002c (Locations)
3. **Priority 3**: DOM-INV-003c (Stock Counts)
4. **Priority 4**: DOM-INV-004c (Reserved Stock)
5. **Priority 5**: DOM-INV-005c (Valuation)
6. **Priority 6**: DOM-INV-006 (Forecasting)
7. **Priority 7**: DOM-INV-007 (Aging)
8. **Priority 8**: DOM-INV-008 (Dashboard)

---

## Notes for Implementation

1. **Mobile-First**: All wireframes prioritize mobile usability for warehouse floor use
2. **Offline Support**: Stock counts and movements should work offline with sync
3. **Barcode Scanning**: Use device camera with web barcode scanning library
4. **Real-Time Updates**: Dashboard and movement widgets should use live subscriptions
5. **Export**: All reports support CSV export; PDF optional
6. **Performance**: Target < 100ms list render, < 200ms stock lookups per assumptions.md

---

*Wireframes provide visual clarity for PRD stories, reducing ambiguity and accelerating implementation.*
