# Products Wireframes - UI Pattern Application Summary

**Date**: 2026-01-10
**Task**: Apply UI pattern section mappings to Products wireframes
**Status**: IN PROGRESS

---

## Files Updated

### ✅ DOM-PROD-001c.wireframe.md - Price Tiers: UI
**Status**: COMPLETE

**UI Patterns Applied**:
1. **DataGrid** (`_reference/.reui-reference/registry/default/ui/data-grid.tsx`)
   - Usage: Price tier table with sortable columns, inline editing
   - Features: Sort by quantity/price, row actions, empty states, conditional formatting

2. **Dialog** (`_reference/.reui-reference/registry/default/ui/dialog.tsx`)
   - Usage: Add/Edit price tier modal
   - Features: Auto-calculation, real-time preview, validation, keyboard shortcuts

3. **Badge** (`_reference/.reui-reference/registry/default/ui/badge.tsx`)
   - Usage: Price source indicator in quotes/orders
   - Variants: customer (blue), tier (green), base (gray)

4. **ComboBox** (`_reference/.reui-reference/registry/default/ui/command.tsx`)
   - Usage: Customer selector in price preview
   - Features: Search/filter, recent customers, clear selection

**Pattern Section Location**: Lines 39-151 (after Dependencies, before Mobile Wireframe)

---

## Remaining Files

### 🔄 DOM-PROD-002c.wireframe.md - Product Bundles: UI
**Planned Patterns**:
- DataGrid: Bundle components table
- Dialog: Add component modal
- Carousel: Bundle preview in product picker
- Sidebar: Bundle composition navigator

### 🔄 DOM-PROD-003c.wireframe.md - Product Images: UI
**Planned Patterns**:
- Carousel: Image gallery/lightbox
- Dialog: Image upload modal with drag-drop
- DataGrid: Reorderable image list

### 🔄 DOM-PROD-004c.wireframe.md - Product Attributes: UI
**Planned Patterns**:
- DataGrid: Attribute management table
- Dialog: Create/edit attribute modal
- ComboBox: Category selector for attributes

### 🔄 DOM-PROD-006c.wireframe.md - Discontinued Product Handling: UI
**Planned Patterns**:
- Dialog: Discontinue confirmation with replacement selector
- Badge: Discontinued status indicator
- ComboBox: Replacement product search

### 🔄 DOM-PROD-007c.wireframe.md - Related Products: UI
**Planned Patterns**:
- DataGrid: Related products table (grouped by type)
- Dialog: Add relation modal with type selector
- Carousel: "Frequently Bought Together" display

### 🔄 DOM-PROD-008c.wireframe.md - Product Search Optimization: UI
**Planned Patterns**:
- ComboBox: Search with suggestions and recent searches
- DataGrid: Search results with highlighting
- Sidebar: Advanced search filters panel

---

## Pattern Reference Summary

### REUI Components Used
| Component | File Path | Primary Use Cases |
|-----------|-----------|-------------------|
| DataGrid | `_reference/.reui-reference/registry/default/ui/data-grid.tsx` | Tabular data with sorting, filtering, inline editing |
| Dialog | `_reference/.reui-reference/registry/default/ui/dialog.tsx` | Modals for create/edit/confirm actions |
| Badge | `_reference/.reui-reference/registry/default/ui/badge.tsx` | Status indicators, labels, tags |
| Carousel | `_reference/.reui-reference/registry/default/ui/carousel.tsx` | Image galleries, product showcases |
| ComboBox | `_reference/.reui-reference/registry/default/ui/command.tsx` | Search/select with autocomplete |

### Square UI Components Used
| Component | File Path | Primary Use Cases |
|-----------|-----------|-------------------|
| Sidebar | `_reference/.square-ui-reference/templates/dashboard-1/components/ui/sidebar.tsx` | Navigation panels, filter sidebars, multi-level menus |

---

## Implementation Format

Each wireframe now includes a **"UI Patterns (Reference Implementation)"** section with:

1. **Pattern Name** - Component from reference library
2. **Reference Path** - Absolute path to implementation file
3. **Usage** - Specific use case in this wireframe
4. **Features** - Key capabilities being utilized
5. **Implementation Notes** - Code snippets showing typical usage

### Example Format:
```markdown
## UI Patterns (Reference Implementation)

### DataGrid - Price Tier Table
**Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`

**Usage**: Price tier list display with sortable columns and inline editing
- **Columns**: Minimum Quantity, Tier Price, Discount %, Actions
- **Features**:
  - Sortable by quantity/price
  - Inline edit mode with validation
  - Row actions (edit, delete)
  - Empty state with "Add First Tier" CTA

**Implementation Notes**:
```typescript
<DataGrid
  columns={[...]}
  data={priceTiers}
  onSort={handleSort}
  enableInlineEdit
/>
```
```

---

## Next Steps

1. Apply UI pattern sections to remaining 6 wireframes
2. Verify all pattern references point to correct files
3. Ensure consistency in format across all wireframes
4. Update this summary with completion status

---

## Notes

- All pattern references use absolute paths from repository root
- Implementation notes include TypeScript examples where relevant
- Each pattern section is placed after Dependencies, before Mobile Wireframe
- Patterns are selected based on wireframe component requirements

---

**Last Updated**: 2026-01-10
**Updated By**: Scribe Agent
