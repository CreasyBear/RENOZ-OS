# Warranty PRD UI Pattern Enhancement Review

**Date**: 2026-01-10
**PRD**: `opc/_Initiation/_prd/domains/warranty.prd.json`
**Version**: v2.1 (updated from v2.0)

## Summary

Enhanced the Warranty Domain PRD with comprehensive UI pattern references from both RE-UI (component library) and Midday (reference implementation patterns). Added `uiPatterns` fields to all UI-component stories to provide clear implementation guidance.

## Changes Made

### 1. Version Update
- Updated PRD version from v2.0 to v2.1
- Updated timestamp to 2026-01-10
- Maintained JSON validity throughout

### 2. UI Pattern Additions

Added `uiPatterns` sections to the following UI stories with both RE-UI components and Midday patterns:

#### DOM-WAR-001c: Warranty Policies UI
**RE-UI Components**:
- `data-grid.tsx` - Main table for policy list with sorting and filtering
- `dialog.tsx` - Modal for create/edit policy form
- `form.tsx` - Form component with validation
- `base-select.tsx` - Dropdown for policy type selection
- `base-switch.tsx` - Toggle for default policy
- `base-input.tsx` - Text inputs for policy name
- `base-number-field.tsx` - Number input for duration and cycle limits
- `badge.tsx` - Policy type badges (Battery/Inverter/Installation)
- `button.tsx` - Action buttons (Create, Save, Cancel)
- `skeleton.tsx` - Loading states for table and forms

**Midday Patterns**:
- `tables/customers/data-table.tsx` - Reference for virtualized table implementation
- `forms/customer-form.tsx` - Form pattern with accordion sections
- `forms/product-form.tsx` - Product form integration example

#### DOM-WAR-003b: Dashboard Widget
**RE-UI Components**:
- `card.tsx` - Widget container with header and content
- `badge.tsx` - Count badge in widget header
- `skeleton.tsx` - Loading state for widget data
- `button.tsx` - View all link button

**Midday Patterns**:
- `components/charts/selectable-chart-wrapper.tsx` - Dashboard widget wrapper pattern

#### DOM-WAR-003c: Report Page
**RE-UI Components**:
- `data-grid.tsx` - Main report table with filtering and export
- `filters.tsx` - Filter bar component for report controls
- `base-select.tsx` - Dropdown for expiry range selection
- `base-combobox.tsx` - Searchable customer and product filters
- `button.tsx` - Export CSV action button
- `badge.tsx` - Status and urgency indicators
- `drawer.tsx` - Mobile filter drawer

**Midday Patterns**:
- `tables/transactions/data-table.tsx` - Report table pattern with filters
- `components/filters.tsx` - Advanced filtering component

#### DOM-WAR-003d: Opt-Out Settings
**RE-UI Components**:
- `base-switch.tsx` - Toggle component for opt-out settings

#### DOM-WAR-004c: Certificate UI
**RE-UI Components**:
- `button.tsx` - Action buttons with loading states
- `dialog.tsx` - Email confirmation dialog
- `progress.tsx` - PDF generation progress indicator
- `alert-dialog.tsx` - Regenerate confirmation prompt

**Midday Patterns**:
- `components/invoice/form.tsx` - Reference for document action patterns

#### DOM-WAR-005b: CSV Bulk Upload
**RE-UI Components**:
- `dialog.tsx` - Main modal container for bulk upload
- `data-grid.tsx` - Preview table with validation status
- `badge.tsx` - Validation status badges (valid/invalid/duplicate)
- `progress.tsx` - Upload and processing progress bar
- `card.tsx` - Summary statistics card
- `button.tsx` - Upload, import, and download error actions
- `base-combobox.tsx` - Customer selection dropdown

**Midday Patterns**:
- `components/add-transactions.tsx` - File upload and preview pattern

#### DOM-WAR-006c: Claim Workflow UI
**RE-UI Components**:
- `dialog.tsx` - Claim form and approval dialogs
- `sheet.tsx` - Mobile bottom sheet for claim form
- `form.tsx` - Form with validation for claim submission
- `base-select.tsx` - Claim type dropdown
- `base-radio-group.tsx` - Resolution preference selection
- `base-tabs.tsx` - Claim history tab on warranty detail
- `data-grid.tsx` - Claim history table
- `badge.tsx` - Status and claim type badges with color coding
- `button.tsx` - Action buttons (Submit, Approve, Deny)
- `textarea.tsx` - Description and comment fields
- `base-number-field.tsx` - Cycle count input

**Midday Patterns**:
- `forms/transaction-create-form.tsx` - Form dialog pattern
- `tables/transactions/data-table.tsx` - History table pattern

#### DOM-WAR-007c: Extension UI
**RE-UI Components**:
- `dialog.tsx` - Extension form dialog
- `sheet.tsx` - Mobile bottom sheet
- `form.tsx` - Extension request form with validation
- `base-number-field.tsx` - Months and cycle limit inputs
- `textarea.tsx` - Reason field
- `badge.tsx` - Extension type badges
- `card.tsx` - Extension history card
- `data-grid.tsx` - Extension history table and report table
- `button.tsx` - Extend and submit buttons

**Midday Patterns**:
- `forms/tracker-project-form.tsx` - Form dialog pattern

#### DOM-WAR-008: Analytics Dashboard
**RE-UI Components**:
- `chart.tsx` - Recharts wrapper for bar, pie, and line charts
- `card.tsx` - Metric cards for SLA compliance stats
- `base-select.tsx` - Filter dropdowns for warranty and claim types
- `datefield.tsx` - Date range picker for trend analysis
- `button.tsx` - Export data button
- `skeleton.tsx` - Loading states for charts

**Midday Patterns**:
- `components/canvas/metrics-breakdown-summary-canvas.tsx` - Dashboard layout pattern
- `components/charts/selectable-chart-wrapper.tsx` - Interactive chart wrapper

## Component Reference Mapping

### Core UI Patterns from RE-UI

| Component | Primary Use Cases in Warranty Domain |
|-----------|-------------------------------------|
| `data-grid.tsx` | Policy lists, claim history, extension history, reports |
| `dialog.tsx` | Create/edit forms, confirmations, email actions |
| `sheet.tsx` | Mobile-optimized forms (bottom sheet) |
| `form.tsx` | All data entry forms with validation |
| `card.tsx` | Widgets, metric displays, history sections |
| `badge.tsx` | Status indicators, type labels, counts |
| `button.tsx` | All actions and CTAs |
| `base-select.tsx` | Dropdowns for types, filters |
| `base-combobox.tsx` | Searchable selectors (customers, products) |
| `base-switch.tsx` | Toggle settings (default policy, opt-out) |
| `base-tabs.tsx` | History sections, multi-view details |
| `base-number-field.tsx` | Duration, cycle limits, cost inputs |
| `base-radio-group.tsx` | Resolution preference selection |
| `progress.tsx` | Upload progress, PDF generation status |
| `skeleton.tsx` | Loading states for all async content |
| `drawer.tsx` | Mobile filter panels |
| `alert-dialog.tsx` | Destructive action confirmations |
| `chart.tsx` | Analytics visualizations |
| `datefield.tsx` | Date range selections |
| `filters.tsx` | Report and list filtering |
| `textarea.tsx` | Multi-line text inputs (notes, reasons) |

### Implementation Patterns from Midday

| Pattern File | Lessons Applied |
|--------------|----------------|
| `forms/customer-form.tsx` | Accordion sections, field validation, nested forms |
| `tables/customers/data-table.tsx` | Virtualization, infinite scroll, column management |
| `tables/transactions/data-table.tsx` | Filtering, sorting, history tables |
| `forms/transaction-create-form.tsx` | Dialog forms with validation |
| `forms/product-form.tsx` | Product integration patterns |
| `forms/tracker-project-form.tsx` | Time-based form patterns |
| `components/add-transactions.tsx` | File upload with preview and validation |
| `components/invoice/form.tsx` | Document generation patterns |
| `components/filters.tsx` | Advanced multi-filter UI |
| `components/charts/selectable-chart-wrapper.tsx` | Interactive chart patterns |
| `components/canvas/metrics-breakdown-summary-canvas.tsx` | Dashboard layout and metrics |

## Accessibility Patterns Applied

All UI stories now include detailed accessibility specifications:

1. **ARIA Labels**: Descriptive labels for all interactive elements
2. **Keyboard Navigation**: Tab order, arrow keys, Enter/Space activation
3. **Focus Management**: Logical focus flow on open/close/submit
4. **Screen Reader Support**: Announcements for state changes and results
5. **Responsive Layouts**: Mobile-first with progressive enhancement

## Responsive Design Strategy

Consistent pattern across stories:

- **Mobile**: Bottom sheets, stacked cards, simplified views
- **Tablet**: Side panels, 2-column grids, compact tables
- **Desktop**: Modal dialogs, full tables, multi-column layouts

## Implementation Benefits

1. **Clear Component Mapping**: Developers know exactly which components to use
2. **Pattern Consistency**: Midday examples show proven implementation patterns
3. **Reduced Decision Fatigue**: Pre-selected components for each use case
4. **Accessibility First**: All patterns include a11y considerations
5. **Responsive by Default**: Mobile/tablet/desktop patterns specified upfront

## Next Steps

1. Use this enhanced PRD to generate detailed wireframes
2. Create component composition diagrams for complex stories (DOM-WAR-006c, DOM-WAR-008)
3. Develop a component palette document for quick reference
4. Consider creating Storybook stories based on the uiPatterns mappings

## Files Modified

- `/opc/_Initiation/_prd/domains/warranty.prd.json` - Enhanced with uiPatterns
- `/opc/_Initiation/_prd/_wireframes/domains/_review-notes/warranty-prd-review.md` - This review

## Validation

- JSON validity confirmed (valid JSON structure)
- All existing fields preserved
- New uiPatterns fields follow consistent structure
- Component references map to actual files in `_reference/` directories
