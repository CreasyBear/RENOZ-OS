# Reports Domain Wireframes - UI Pattern Review

**Review Date**: 2026-01-10
**Reviewed By**: Claude Code
**Purpose**: Map wireframe UI requirements to reference implementations

---

## Executive Summary

Reviewed 4 Reports domain wireframes (DOM-RPT-004, DOM-RPT-005c, DOM-RPT-006c, DOM-RPT-007) and mapped all UI components to reference implementations from `.reui-reference` and `.midday-reference`.

**Key Findings**:
- ✓ All core UI patterns have reference implementations available
- ✓ Chart components available in both reui (recharts) and midday (tremor)
- ✓ DataGrid/Table patterns well-documented in reui
- ✓ Dialog/Sheet patterns consistent across mobile/desktop
- ⚠ Custom Report Builder will require composite pattern assembly
- ⚠ AR Aging visualization may need custom styling on Badge component

**Implementation Readiness**: **HIGH** - All wireframes have clear reference patterns.

---

## Wireframe-by-Wireframe Analysis

### DOM-RPT-004: Financial Summary Report

**Priority**: 1
**File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/opc/_Initiation/_prd/_wireframes/domains/DOM-RPT-004.wireframe.md`

#### UI Components Required

| Wireframe Component | Reference Implementation | Location | Notes |
|---------------------|-------------------------|----------|-------|
| **KPI Cards** | Card | `_reference/.reui-reference/registry/default/ui/card.tsx` | Use CardHeader, CardContent for metrics layout |
| **P&L Table** | Table / DataGrid | `_reference/.reui-reference/registry/default/ui/data-grid-table.tsx` | Basic table structure, no sorting needed |
| **AR Aging Table** | Table + Badge | `_reference/.reui-reference/registry/default/ui/badge.tsx` | Status badges for aging buckets |
| **Revenue Trend Chart** | Chart (Recharts) | `_reference/.reui-reference/registry/default/ui/chart.tsx` | Line chart with area fill |
| **Cash Flow Summary** | Card + Progress | `_reference/.reui-reference/registry/default/ui/progress.tsx` | Visual flow indicator |
| **Date Range Picker** | Calendar + Popover | `_reference/.reui-reference/registry/default/ui/calendar.tsx` | With preset buttons (MTD, QTD, YTD) |
| **Export Dropdown** | DropdownMenu | `_reference/.reui-reference/registry/default/ui/dropdown-menu.tsx` | CSV/PDF/Excel options |
| **Loading Skeleton** | Skeleton | `_reference/.reui-reference/registry/default/ui/skeleton.tsx` | Shimmer effect for cards |

#### Midday Reference Patterns

**Relevant Files**:
- `/apps/dashboard/src/components/canvas/base/canvas-chart.tsx` - Chart wrapper with error boundaries
- `/apps/dashboard/src/components/canvas/profit-canvas.tsx` - Similar profit/revenue visualization
- `/apps/dashboard/src/components/average-days-to-payment.tsx` - AR metrics pattern

**Key Patterns to Reuse**:
```tsx
// KPI Card Pattern (from midday)
<Card>
  <CardHeader>
    <div className="flex justify-between">
      <CardTitle>Gross Revenue</CardTitle>
      <TrendIndicator value={12.5} direction="up" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">$125,400</div>
    <p className="text-sm text-muted-foreground">
      vs $111,467 last period
    </p>
  </CardContent>
</Card>

// Chart Pattern (from reui chart.tsx)
<ChartContainer config={chartConfig}>
  <LineChart data={revenueData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="revenue" stroke="var(--primary)" />
    <Line type="monotone" dataKey="costs" stroke="var(--destructive)" />
  </LineChart>
</ChartContainer>
```

#### Implementation Notes

1. **Chart Library**: Use recharts (already in reui reference)
2. **Responsive Behavior**: Stack cards on tablet, collapse sections on mobile
3. **Animation**: Leverage CountingNumber component for metric animations
4. **Accessibility**: Table has proper aria-labels, chart uses ChartContainer with screen reader support

---

### DOM-RPT-005c: Schedule Management UI

**Priority**: 4
**File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/opc/_Initiation/_prd/_wireframes/domains/DOM-RPT-005c.wireframe.md`

#### UI Components Required

| Wireframe Component | Reference Implementation | Location | Notes |
|---------------------|-------------------------|----------|-------|
| **Schedule Dialog** | Dialog | `_reference/.reui-reference/registry/default/ui/base-dialog.tsx` | Desktop modal |
| **Schedule Bottom Sheet** | Sheet | `_reference/.reui-reference/registry/default/ui/base-sheet.tsx` | Mobile drawer |
| **Frequency Selector** | RadioGroup | `_reference/.reui-reference/registry/default/ui/base-radio-group.tsx` | Daily/Weekly/Monthly |
| **Day Checkboxes** | Checkbox | `_reference/.reui-reference/registry/default/ui/base-checkbox.tsx` | Mon-Sun selection |
| **Time Picker** | Select | `_reference/.reui-reference/registry/default/ui/base-select.tsx` | Hour dropdown |
| **Recipients Selector** | Checkbox Group | `_reference/.reui-reference/registry/default/ui/base-checkbox-group.tsx` | Team members + external |
| **Email Input** | Input + Button | `_reference/.reui-reference/registry/default/ui/base-input.tsx` | Add external email |
| **Toggle Switch** | Switch | `_reference/.reui-reference/registry/default/ui/base-switch.tsx` | Enable/disable schedule |
| **Schedule Cards** | Card | `_reference/.reui-reference/registry/default/ui/card.tsx` | List display on hub |
| **Actions Dropdown** | DropdownMenu | `_reference/.reui-reference/registry/default/ui/dropdown-menu.tsx` | Edit/Delete/Send Now |

#### Midday Reference Patterns

**Relevant Files**:
- `/apps/dashboard/src/components/app-settings.tsx` - Settings dialog pattern
- `/apps/dashboard/src/components/assign-user.tsx` - User selection pattern
- `/apps/dashboard/src/components/base-currency/select-currency.tsx` - Dropdown with preview

**Key Patterns to Reuse**:
```tsx
// Schedule Dialog Pattern
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Schedule Report</DialogTitle>
      <DialogDescription>
        Configure automated delivery of {reportName}
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-6">
      {/* Frequency Selection */}
      <RadioGroup value={frequency} onValueChange={setFrequency}>
        <div className="flex gap-4">
          <RadioGroupItem value="daily" id="daily">
            <Label htmlFor="daily">Daily</Label>
          </RadioGroupItem>
          {/* ... */}
        </div>
      </RadioGroup>

      {/* Day Selection */}
      {frequency === 'daily' && (
        <div className="flex gap-2">
          {DAYS.map(day => (
            <Checkbox
              key={day}
              checked={selectedDays.includes(day)}
              onCheckedChange={(checked) => toggleDay(day, checked)}
            >
              {day}
            </Checkbox>
          ))}
        </div>
      )}

      {/* Schedule Preview */}
      <Alert>
        <AlertDescription>
          Report will be sent {frequencyText} to {recipientCount} recipients.
          Next delivery: {nextDelivery}
        </AlertDescription>
      </Alert>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={onSendTest}>Send Test</Button>
      <Button onClick={onSave}>Save Schedule</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Mobile Sheet Pattern
<Sheet open={isOpen} onOpenChange={onClose}>
  <SheetContent side="bottom">
    <SheetHeader>
      <SheetTitle>Schedule Report</SheetTitle>
    </SheetHeader>
    {/* Same content as dialog, stacked vertically */}
  </SheetContent>
</Sheet>
```

#### Implementation Notes

1. **Responsive Strategy**: Dialog on desktop/tablet, Sheet on mobile
2. **State Management**: Local state for dialog, server actions for persistence
3. **Validation**: Email format validation, required recipient check
4. **Timezone Handling**: IANA timezone selector with user's default
5. **Test Email**: Trigger.dev emailReport task with immediate execution

---

### DOM-RPT-006c: Favorites UI

**Priority**: 7
**File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/opc/_Initiation/_prd/_wireframes/domains/DOM-RPT-006c.wireframe.md`

#### UI Components Required

| Wireframe Component | Reference Implementation | Location | Notes |
|---------------------|-------------------------|----------|-------|
| **Favorite Star Button** | Button | `_reference/.reui-reference/registry/default/ui/button.tsx` | Toggle with animation |
| **Favorites Grid** | Card Grid | `_reference/.reui-reference/registry/default/ui/card.tsx` | Responsive grid layout |
| **Favorite Card** | Card + Badge | `_reference/.reui-reference/registry/default/ui/card.tsx` | With report icon |
| **Report Icon** | Custom SVG | N/A | Chart/table/grid icons |
| **Add Dialog** | Dialog | `_reference/.reui-reference/registry/default/ui/base-dialog.tsx` | Optional name input |
| **Edit Dialog** | Dialog | `_reference/.reui-reference/registry/default/ui/base-dialog.tsx` | Name only |
| **Remove Dialog** | AlertDialog | `_reference/.reui-reference/registry/default/ui/base-alert-dialog.tsx` | Confirmation |
| **Search Input** | Input | `_reference/.reui-reference/registry/default/ui/base-input.tsx` | With search icon |
| **Sort Select** | Select | `_reference/.reui-reference/registry/default/ui/base-select.tsx` | Recent/Name/Type |

#### Midday Reference Patterns

**Relevant Files**:
- `/apps/dashboard/src/components/apps.tsx` - Grid card layout
- `/apps/dashboard/src/components/bank-account-list.tsx` - List/card toggle pattern

**Key Patterns to Reuse**:
```tsx
// Favorite Star Button with Animation
<Button
  variant="ghost"
  size="icon"
  onClick={onToggleFavorite}
  aria-pressed={isFavorited}
  aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
>
  <Star
    className={cn(
      "h-5 w-5 transition-all",
      isFavorited && "fill-yellow-400 text-yellow-400 scale-110"
    )}
  />
</Button>

// Favorites Grid Pattern
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {favorites.map(favorite => (
    <Card key={favorite.id} className="cursor-pointer hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ReportIcon type={favorite.reportType} />
            <CardTitle className="text-sm">{favorite.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onEdit(favorite)}>
                Edit Name
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onRemove(favorite)}
              >
                Remove Favorite
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground space-y-1">
          {Object.entries(favorite.filters).map(([key, value]) => (
            <div key={key}>{key}: {value}</div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Added {formatDate(favorite.createdAt)}
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

#### Implementation Notes

1. **Star Animation**: Use scale transform + color transition (300ms)
2. **Grid Layout**: 1 col mobile, 2 col tablet, 4 col desktop
3. **URL Encoding**: Base64 encode filters in URL for navigation
4. **Undo Support**: 5-second toast with undo action for removals
5. **Empty State**: Illustration + CTA to browse reports

---

### DOM-RPT-007: Simple Report Builder

**Priority**: 8
**File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/opc/_Initiation/_prd/_wireframes/domains/DOM-RPT-007.wireframe.md`

#### UI Components Required

| Wireframe Component | Reference Implementation | Location | Notes |
|---------------------|-------------------------|----------|-------|
| **Builder Layout** | ResizablePanel | `_reference/.reui-reference/registry/default/ui/resizable.tsx` | Split config/preview |
| **Data Source Selector** | RadioGroup | `_reference/.reui-reference/registry/default/ui/base-radio-group.tsx` | Customers/Orders/Products |
| **Column Selector** | Checkbox + DnD | `_reference/.reui-reference/registry/default/ui/data-grid-table-dnd.tsx` | Drag to reorder |
| **Column Item** | Checkbox + Handle | N/A | Custom with drag handle |
| **Column Settings Dialog** | Dialog | `_reference/.reui-reference/registry/default/ui/base-dialog.tsx` | Label/format/alignment |
| **Filter Builder** | Custom Composite | N/A | Field + Operator + Value rows |
| **Filter Row** | Select + Input | `_reference/.reui-reference/registry/default/ui/base-select.tsx` | Dynamic operator options |
| **Sort Selector** | Select | `_reference/.reui-reference/registry/default/ui/base-select.tsx` | Primary + Secondary |
| **Group Selector** | Select + Checkbox | `_reference/.reui-reference/registry/default/ui/base-select.tsx` | With subtotal options |
| **Preview Table** | DataGrid | `_reference/.reui-reference/registry/default/ui/data-grid-table.tsx` | Live preview with sample data |
| **Save Dialog** | Dialog | `_reference/.reui-reference/registry/default/ui/base-dialog.tsx` | Name + Description + Sharing |

#### Midday Reference Patterns

**Relevant Files**:
- `/apps/dashboard/src/components/transactions/page.tsx` - Filter/column pattern
- `/apps/dashboard/src/components/bulk-actions.tsx` - Multi-row actions

**Key Patterns to Reuse**:
```tsx
// Report Builder Layout
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={30} minSize={20}>
    {/* Configuration Panel */}
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Data Source */}
      <section>
        <h3 className="font-medium mb-2">Step 1: Data Source</h3>
        <RadioGroup value={dataSource} onValueChange={setDataSource}>
          {dataSources.map(source => (
            <Card key={source.id} className={cn(dataSource === source.id && "border-primary")}>
              <CardContent className="p-4">
                <RadioGroupItem value={source.id} id={source.id}>
                  <Label htmlFor={source.id} className="cursor-pointer">
                    <div className="font-medium">{source.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {source.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {source.recordCount} records available
                    </div>
                  </Label>
                </RadioGroupItem>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      </section>

      {/* Columns */}
      <section>
        <h3 className="font-medium mb-2">Step 2: Columns</h3>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Selected ({selectedColumns.length} of {availableColumns.length})
          </div>
          <DndContext>
            <SortableContext items={selectedColumns}>
              {selectedColumns.map(col => (
                <SortableColumnItem
                  key={col.id}
                  column={col}
                  onRemove={() => removeColumn(col.id)}
                  onSettings={() => openColumnSettings(col)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Separator />

          <div className="text-sm text-muted-foreground">Available</div>
          {availableColumns.map(col => (
            <div key={col.id} className="flex items-center gap-2">
              <Checkbox
                checked={false}
                onCheckedChange={() => addColumn(col)}
              />
              <Label className="flex-1">{col.name}</Label>
            </div>
          ))}
        </div>
      </section>

      {/* Filters */}
      <section>
        <h3 className="font-medium mb-2">Step 3: Filters</h3>
        <div className="space-y-2">
          {filters.map((filter, idx) => (
            <Card key={filter.id}>
              <CardContent className="p-3">
                <div className="flex gap-2">
                  <Select value={filter.columnId} onValueChange={(val) => updateFilter(idx, 'columnId', val)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filter.operator} onValueChange={(val) => updateFilter(idx, 'operator', val)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperatorsForColumn(filter.columnId).map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={filter.value}
                    onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                    className="flex-1"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFilter(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addFilter}>
            <Plus className="h-4 w-4 mr-2" />
            Add Filter
          </Button>
        </div>
      </section>
    </div>
  </ResizablePanel>

  <ResizableHandle />

  <ResizablePanel defaultSize={70}>
    {/* Preview Panel */}
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <h3 className="font-medium">
          Preview ({previewData?.totalCount ?? 0} results)
        </h3>
        <Button variant="outline" size="sm" onClick={refreshPreview}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoadingPreview ? (
          <div className="p-8">
            <Skeleton className="h-[400px]" />
          </div>
        ) : previewData ? (
          <DataTable
            columns={previewColumns}
            data={previewData.rows}
          />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Select columns to see preview
          </div>
        )}
      </div>
    </div>
  </ResizablePanel>
</ResizablePanelGroup>
```

#### Implementation Notes

1. **Drag-and-Drop**: Use @dnd-kit/core + @dnd-kit/sortable (already in reui)
2. **Dynamic Operators**: Map column type to available operators
3. **Live Preview**: Debounce preview generation (300ms), limit to 10 rows
4. **Mobile Strategy**: View/run only on mobile, builder requires desktop
5. **State Persistence**: Auto-save to localStorage every 30s
6. **Grouping Preview**: Collapsible group rows with subtotals

---

## Common Patterns Across All Wireframes

### Shared Components from reui-reference

| Component | Usage | All Wireframes |
|-----------|-------|----------------|
| **Button** | Primary actions, icon buttons | ✓ |
| **Card** | Content containers | ✓ |
| **Dialog** | Modals (desktop) | ✓ |
| **Sheet** | Bottom drawers (mobile) | ✓ |
| **Skeleton** | Loading states | ✓ |
| **Toast** | Success/error notifications | ✓ |
| **Badge** | Status indicators | ✓ |
| **Select** | Dropdowns | ✓ |
| **Input** | Text fields | ✓ |
| **Checkbox** | Multi-select | ✓ |
| **RadioGroup** | Single select | ✓ |

### Animation Standards (from wireframes)

All wireframes specify consistent animation timing:

```css
/* Button interactions */
button-press: 150ms ease-out

/* Dropdowns/Popovers */
dropdown-open: 200ms ease-out

/* Modals/Dialogs */
modal-open: 300ms cubic-bezier(0.16, 1, 0.3, 1)

/* Toasts */
toast-appear: 250ms ease-out

/* Content transitions */
content-fade: 150-200ms ease-out

/* Staggered lists */
stagger-delay: 30-50ms
```

**Implementation**: Use Tailwind's `transition-*` utilities with custom `cubic-bezier` for modals.

### Responsive Breakpoints

All wireframes follow consistent breakpoints:

- **Mobile**: 375px - 767px
- **Tablet**: 768px - 1279px
- **Desktop**: 1280px+

**Grid Patterns**:
- Mobile: 1 column, full width
- Tablet: 2 columns or stacked sections
- Desktop: 3-4 columns or split panels

### Accessibility Requirements

All wireframes specify:

1. **ARIA Landmarks**: `role="main"`, `role="region"`, `aria-label`
2. **Keyboard Navigation**: Full tab order, arrow keys for tables/grids
3. **Screen Reader**: Live regions (`aria-live="polite"`), announcements
4. **Focus Management**: Trap in dialogs, return on close
5. **Color Independence**: Status uses text labels + icons, not just color
6. **Touch Targets**: Minimum 44px on mobile

**Reference**: Check reui base components - they include proper ARIA attributes.

---

## Reference Implementation Matrix

### Chart Components

| Chart Type | Wireframe | reui Location | Midday Example |
|------------|-----------|---------------|----------------|
| Line Chart | DOM-RPT-004 (Revenue Trend) | `ui/chart.tsx` | `canvas/profit-canvas.tsx` |
| Bar Chart | DOM-RPT-007 (Group preview) | `ui/chart.tsx` | `canvas/category-expenses-canvas.tsx` |
| Progress Bar | DOM-RPT-004 (Cash Flow) | `ui/progress.tsx` | `components/average-days-to-payment.tsx` |

**Recommendation**: Use reui's `chart.tsx` wrapper around recharts. It provides:
- Theme integration
- Responsive container
- Error boundaries
- Tooltip styling

### Table/Grid Components

| Table Type | Wireframe | reui Location | Features |
|------------|-----------|---------------|----------|
| Simple Table | DOM-RPT-004 (P&L) | `ui/data-grid-table.tsx` | Basic rows/columns |
| Sortable Table | DOM-RPT-007 (Preview) | `ui/data-grid-table.tsx` + `ui/data-grid-column-header.tsx` | Click to sort |
| Filterable Table | DOM-RPT-005c (Schedules) | `ui/data-grid-column-filter.tsx` | Per-column filters |
| DnD Table | DOM-RPT-007 (Columns) | `ui/data-grid-table-dnd.tsx` | Drag rows to reorder |

**Recommendation**: Start with `data-grid-table.tsx` and compose with column header/filter components.

### Form Components

| Form Pattern | Wireframe | reui Components |
|--------------|-----------|-----------------|
| Date Range Picker | DOM-RPT-004 | `calendar.tsx` + `popover.tsx` |
| Time Selector | DOM-RPT-005c | `select.tsx` (12/24h options) |
| Multi-Checkbox | DOM-RPT-005c (Days), DOM-RPT-007 (Columns) | `base-checkbox-group.tsx` |
| Radio Cards | DOM-RPT-007 (Data Source) | `base-radio-group.tsx` + `card.tsx` |
| Email Input | DOM-RPT-005c | `base-input.tsx` + validation |

**Recommendation**: Use `base-form.tsx` or `base-form-tanstack.tsx` for full forms with validation.

---

## Implementation Recommendations

### Phase 1: Shared Foundation (Before any wireframe)

1. **Create shared report components**:
   ```
   src/components/domain/reports/shared/
     - report-layout.tsx (wrapper with header/actions)
     - report-export-menu.tsx (CSV/PDF/Excel dropdown)
     - report-skeleton.tsx (loading states)
     - report-empty-state.tsx (no data states)
     - report-error-state.tsx (error handling)
   ```

2. **Set up chart theme**:
   ```typescript
   // src/lib/chart-config.ts
   export const chartConfig = {
     primary: { theme: { light: "hsl(var(--primary))", dark: "hsl(var(--primary))" }},
     revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
     costs: { label: "Costs", color: "hsl(var(--chart-2))" },
     // ...
   }
   ```

3. **Create utility functions**:
   ```typescript
   // src/lib/reports/utils.ts
   export function encodeFilters(filters: ReportFilters): string
   export function decodeFilters(encoded: string): ReportFilters
   export function formatCurrency(amount: number, currency: string): string
   export function formatPercentageChange(current: number, previous: number): string
   ```

### Phase 2: Implementation Order (by wireframe priority)

1. **DOM-RPT-004** (Priority 1) - Financial Summary
   - Standalone report, no dependencies
   - Use reui Card + Chart components
   - Reference: midday `profit-canvas.tsx` for KPI layout

2. **DOM-RPT-006c** (Priority 7) - Favorites UI
   - Add star button to report-layout.tsx
   - Use reui Card grid + Dialog
   - Simple state management (favorites array)

3. **DOM-RPT-005c** (Priority 4) - Schedules
   - Use reui Dialog + Sheet (responsive)
   - Complex form, use TanStack Form
   - Reference: midday `app-settings.tsx` for dialog patterns

4. **DOM-RPT-007** (Priority 8) - Report Builder
   - Most complex, tackle last
   - Use ResizablePanel from reui
   - DnD with @dnd-kit
   - Reference: midday `transactions/page.tsx` for filter patterns

### Phase 3: Mobile Optimization

1. **Responsive Dialogs**: Use Sheet on mobile, Dialog on desktop
   ```tsx
   const isMobile = useIsMobile() // from reui
   return isMobile ? <Sheet>{content}</Sheet> : <Dialog>{content}</Dialog>
   ```

2. **Collapsible Sections**: Use Collapsible component on mobile
   ```tsx
   <Collapsible>
     <CollapsibleTrigger>P&L Details</CollapsibleTrigger>
     <CollapsibleContent>{table}</CollapsibleContent>
   </Collapsible>
   ```

3. **Bottom Sheets**: For quick actions on mobile (schedules, favorites)

---

## Potential Challenges & Solutions

### Challenge 1: AR Aging Status Colors

**Issue**: Badge component has preset variants, aging buckets need custom colors

**Solution**:
```tsx
// Custom badge variant for AR aging
<Badge className={cn(
  "font-medium",
  status === 'current' && "bg-green-100 text-green-800",
  status === 'warning' && "bg-yellow-100 text-yellow-800",
  status === 'overdue' && "bg-orange-100 text-orange-800",
  status === 'critical' && "bg-red-100 text-red-800"
)}>
  {label}
</Badge>
```

### Challenge 2: Report Builder Preview Performance

**Issue**: Live preview with large datasets could lag

**Solution**:
- Debounce preview generation (300ms)
- Limit preview to 10-20 rows
- Use React.memo for preview table
- Show loading spinner during generation
- Implement pagination for full reports

### Challenge 3: Filter Operator Selection

**Issue**: Operators depend on column type (text vs number vs date)

**Solution**:
```typescript
// src/lib/reports/filter-operators.ts
export const OPERATORS_BY_TYPE = {
  text: ['contains', 'equals', 'starts_with', 'ends_with', 'is_empty'],
  number: ['equals', 'greater_than', 'less_than', 'between'],
  date: ['equals', 'before', 'after', 'between', 'in_last_n_days'],
  enum: ['equals', 'is_one_of']
}

export function getOperatorsForColumn(column: ColumnDefinition) {
  return OPERATORS_BY_TYPE[column.type] || []
}
```

### Challenge 4: Export Progress Tracking

**Issue**: PDF generation can take 3-5 seconds, need progress feedback

**Solution**:
- Use Dialog with progress bar
- Stream progress updates via Server-Sent Events
- Show cancellable operation
- Fallback to CSV if PDF fails
- Reference: reui `progress.tsx` component

---

## Testing Checklist

### Per-Wireframe Tests

**DOM-RPT-004**:
- [ ] KPI cards show correct calculations
- [ ] Chart renders with real data
- [ ] Date range picker updates report
- [ ] Export to CSV/PDF works
- [ ] Mobile: sections collapse correctly
- [ ] Loading state shows skeleton
- [ ] Empty state when no data
- [ ] Error state on fetch failure

**DOM-RPT-005c**:
- [ ] Schedule dialog opens/closes
- [ ] Frequency change updates day options
- [ ] Recipient selection works
- [ ] Test email sends
- [ ] Schedule saves correctly
- [ ] Toggle enable/disable works
- [ ] Schedule history loads
- [ ] Mobile: bottom sheet displays

**DOM-RPT-006c**:
- [ ] Star button toggles favorite
- [ ] Favorite card shows correct filters
- [ ] Remove favorite confirmation
- [ ] Edit favorite name
- [ ] Navigation to favorited report preserves filters
- [ ] Search favorites works
- [ ] Sort favorites works

**DOM-RPT-007**:
- [ ] Data source selection populates columns
- [ ] Column drag-and-drop reorders
- [ ] Filter row adds/removes
- [ ] Operator options change with column type
- [ ] Preview updates on config change
- [ ] Grouping shows subtotals
- [ ] Save report works
- [ ] Mobile: shows view-only message

### Cross-Browser Tests

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Accessibility Tests

- [ ] Keyboard navigation works
- [ ] Screen reader announces state changes
- [ ] Focus management in dialogs
- [ ] Color contrast passes WCAG AA
- [ ] Touch targets >= 44px on mobile
- [ ] Reduced motion respected

---

## Next Steps

1. **Create shared components** (report-layout, export-menu, etc.)
2. **Set up chart configuration** (theme integration)
3. **Implement DOM-RPT-004** (highest priority, standalone)
4. **Test responsive behavior** (dialog → sheet on mobile)
5. **Add favorites UI** (DOM-RPT-006c)
6. **Build schedules** (DOM-RPT-005c)
7. **Tackle report builder** (DOM-RPT-007, most complex)

---

## Reference Files Quick Access

### reui Components (Primary)

```
_reference/.reui-reference/registry/default/ui/
  - card.tsx                    # KPI cards, report containers
  - chart.tsx                   # Charts (recharts wrapper)
  - data-grid-table.tsx         # Tables
  - data-grid-table-dnd.tsx     # Drag-and-drop tables
  - base-dialog.tsx             # Desktop modals
  - base-sheet.tsx              # Mobile drawers
  - button.tsx                  # All buttons
  - badge.tsx                   # Status indicators
  - base-select.tsx             # Dropdowns
  - base-input.tsx              # Text inputs
  - base-checkbox.tsx           # Checkboxes
  - base-radio-group.tsx        # Radio buttons
  - calendar.tsx                # Date picker
  - skeleton.tsx                # Loading states
  - base-toast.tsx              # Notifications
  - dropdown-menu.tsx           # Action menus
  - resizable.tsx               # Split panels
  - progress.tsx                # Progress bars
```

### Midday Examples (Secondary)

```
_reference/.midday-reference/apps/dashboard/src/components/
  - canvas/profit-canvas.tsx            # KPI + chart pattern
  - canvas/base/canvas-chart.tsx        # Chart wrapper
  - average-days-to-payment.tsx         # AR metric pattern
  - app-settings.tsx                    # Settings dialog
  - assign-user.tsx                     # User selection
  - transactions/page.tsx               # Filter pattern
  - bulk-actions.tsx                    # Multi-select actions
  - apps.tsx                            # Grid card layout
  - bank-account-list.tsx               # List/card toggle
```

---

**Document Status**: Complete
**Total Wireframes Reviewed**: 4
**Total UI Components Mapped**: 35+
**Implementation Readiness**: HIGH
