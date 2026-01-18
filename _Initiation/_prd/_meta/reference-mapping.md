# Reference Pattern Mapping

> **Generated**: 2026-01-09
> **Purpose**: Map PRD stories to reference codebases for implementation guidance

---

## Reference Codebases Overview

| Codebase | Location | Key Patterns |
|----------|----------|--------------|
| **Midday** | `.midday-reference/` | Xero integration, accounting provider abstraction, rate limiting |
| **REUI** | `.reui-reference/` | UI components, docs site patterns, navigation |
| **Square UI** | `.square-ui-reference/templates/` | Dashboard layouts, Kanban boards, list views |

---

## Pattern Mappings by Domain

### Customers Domain

| Story | Reference | File Path | Pattern to Apply |
|-------|-----------|-----------|------------------|
| DOM-CUST-001c | REUI | `components/ui/badge.tsx` | Tag badge styling |
| DOM-CUST-001c | Square UI | `templates/leads/` | Tag filter pattern |
| DOM-CUST-004a | Square UI | `templates/dashboard-1/` | Metrics dashboard layout |
| DOM-CUST-005c | REUI | `components/analytics.tsx` | Score gauge visualization |
| DOM-CUST-006c | Square UI | `templates/employees/` | Hierarchy tree view |
| DOM-CUST-007b | Square UI | `templates/tasks/` | Activity timeline pattern |

### Orders Domain

| Story | Reference | File Path | Pattern to Apply |
|-------|-----------|-----------|------------------|
| DOM-ORD-001c | Square UI | `templates/tasks/` | Shipment tracking list |
| DOM-ORD-002c | REUI | `components/drawer.tsx` | Delivery confirmation modal |
| DOM-ORD-005c | Square UI | `templates/task-management/` | Template library grid |
| DOM-ORD-006c | Square UI | `templates/projects-timeline/` | Amendment timeline |
| DOM-ORD-007 | **Square UI** | `templates/task-management/` | **Fulfillment Kanban board** |

### Pipeline Domain

| Story | Reference | File Path | Pattern to Apply |
|-------|-----------|-----------|------------------|
| DOM-PIPE-001c | Square UI | `templates/leads/` | Opportunity cards with probability |
| DOM-PIPE-003c | Square UI | `templates/files/` | Version history list |
| DOM-PIPE-006 | **Square UI** | `templates/dashboard-2/` | **Forecasting report charts** |
| DOM-PIPE-007a | **Square UI** | `templates/task-management/` | **Enhanced Kanban with totals** |
| DOM-PIPE-007b | Square UI | `templates/leads/` | Filter chips pattern |

---

## Detailed Reference Analysis

### Square UI: Task Management Template

**Path**: `.square-ui-reference/templates/task-management/`

**Applicable Stories**:
- DOM-ORD-007 (Fulfillment Dashboard)
- DOM-PIPE-007a/b (Enhanced Pipeline Kanban)

**Key Patterns**:
```
- Kanban column layout with header stats
- Drag-drop between columns
- Card components with status badges
- Filter bar with multi-select
- Bulk selection and actions toolbar
- Column totals in headers
```

### Square UI: Leads Template

**Path**: `.square-ui-reference/templates/leads/`

**Applicable Stories**:
- DOM-CUST-001c (Customer Tags)
- DOM-PIPE-001c (Forecasting UI)
- DOM-PIPE-007b (Kanban Filters)

**Key Patterns**:
```
- Tag filtering with chips
- Lead cards with probability indicator
- List/grid view toggle
- Quick filters (My Leads, Hot Leads)
- Status-based column coloring
```

### Square UI: Dashboard Templates

**Path**: `.square-ui-reference/templates/dashboard-1/`, `dashboard-2/`

**Applicable Stories**:
- DOM-CUST-004a (Customer Metrics Dashboard)
- DOM-PIPE-006 (Forecasting Report)

**Key Patterns**:
```
- Metrics cards grid (4-column)
- Mini sparkline charts
- Period selector (This Week, This Month, This Quarter)
- Trend indicators (up/down arrows with percentages)
- Table with inline charts
```

### Midday: Xero Provider

**Path**: `.midday-reference/packages/accounting/src/providers/xero.ts`

**Applicable Stories** (Future INT-XERO PRD):
- Invoice sync patterns
- Rate limiting implementation
- OAuth token refresh
- Error handling for API failures

**Key Patterns**:
```typescript
// Provider abstraction pattern
export class XeroProvider implements AccountingProvider {
  async getInvoices(params: GetInvoicesParams): Promise<Invoice[]>
  async createInvoice(data: CreateInvoiceData): Promise<Invoice>
  async syncInvoice(id: string): Promise<SyncResult>
}

// Rate limiting
private rateLimiter = new RateLimiter({
  maxRequests: 60,
  windowMs: 60_000
})

// Token refresh
private async refreshTokenIfNeeded(): Promise<void>
```

### REUI: UI Components

**Path**: `.reui-reference/components/ui/`

**Applicable Stories**:
- All UI stories can reference REUI for component patterns

**Key Components**:
```
- badge.tsx - Tag badges
- drawer.tsx - Slide-over panels
- callout.tsx - Alert banners
- command-menu.tsx - Keyboard navigation
- analytics.tsx - Chart components
```

---

## Implementation Guidelines

### When Using Square UI Templates

1. **Do**: Extract layout patterns and grid structures
2. **Do**: Use their Kanban column/card architecture
3. **Don't**: Copy styling verbatim (use project's design system)
4. **Don't**: Import their components (rebuild with Shadcn)

### When Using Midday Patterns

1. **Do**: Copy provider abstraction pattern for integrations
2. **Do**: Use their rate limiting approach
3. **Do**: Reference their error handling
4. **Don't**: Use their specific Xero field mappings (AU vs US)

### When Using REUI Components

1. **Do**: Reference their component composition patterns
2. **Do**: Use their accessibility implementations
3. **Don't**: Import directly (use Shadcn equivalents)

---

## Story-Specific Reference Notes

### DOM-ORD-007: Fulfillment Dashboard

**Primary Reference**: Square UI `task-management`

```
Key files to study:
- templates/task-management/page.tsx - Overall layout
- templates/task-management/board.tsx - Kanban board
- templates/task-management/column.tsx - Column with header
- templates/task-management/card.tsx - Draggable card
- templates/task-management/filters.tsx - Filter bar
```

**Adaptation Notes**:
- Replace their task statuses with order statuses (To Allocate, Picking, etc.)
- Add order-specific card fields (customer, items count, ship date)
- Integrate with existing bulk-ship-dialog.tsx

### DOM-PIPE-007a/b: Enhanced Kanban

**Primary Reference**: Square UI `task-management` + `leads`

```
Combine patterns:
- task-management: Column totals, drag-drop
- leads: Probability indicators, stale highlighting, quick filters
```

**Adaptation Notes**:
- Existing pipeline-column.tsx has basic structure
- Add weighted totals from task-management pattern
- Add probability visualization from leads pattern
- Use existing opportunity-card.tsx as base

### DOM-PIPE-006: Forecasting Report

**Primary Reference**: Square UI `dashboard-2`

```
Key patterns:
- Period selector with comparison
- Bar/line chart for forecast vs actual
- Drill-down table
- Export button
```

**Adaptation Notes**:
- Use Recharts (already in project) for charts
- Follow existing reports page layout conventions

---

## Cross-Reference Quick Lookup

| Pattern Need | Go To |
|--------------|-------|
| Kanban board | Square UI `task-management` |
| Dashboard metrics | Square UI `dashboard-1` |
| Charts/graphs | Square UI `dashboard-2` |
| Timeline view | Square UI `projects-timeline` |
| File/version list | Square UI `files` |
| Lead cards | Square UI `leads` |
| Tag badges | REUI `badge.tsx` |
| Modal/drawer | REUI `drawer.tsx` |
| Alerts | REUI `callout.tsx` |
| API provider | Midday `providers/xero.ts` |

---

*This mapping should be referenced during story implementation to leverage proven patterns.*
