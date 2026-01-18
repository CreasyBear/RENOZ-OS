# Dashboard Domain Wireframes Index

**PRD Reference:** `/memory-bank/prd/domains/dashboard.prd.json`
**Design Aesthetic:** Data-rich scannable - information density with clear hierarchy

## Wireframe Files

| File | Description | Related Stories |
|------|-------------|-----------------|
| [dashboard-main.wireframe.md](./dashboard-main.wireframe.md) | Main dashboard layout, grid system, widget structure | All |
| [dashboard-kpi-cards.wireframe.md](./dashboard-kpi-cards.wireframe.md) | KPI widget design with sparklines and trends | DOM-DASH-002b, DOM-DASH-003d, DOM-DASH-004a |
| [dashboard-chart-widgets.wireframe.md](./dashboard-chart-widgets.wireframe.md) | Chart visualizations with drill-down | DOM-DASH-004b, DOM-DASH-005b |
| [dashboard-activity-feed.wireframe.md](./dashboard-activity-feed.wireframe.md) | Activity timeline widget | Related widgets |
| [dashboard-date-range.wireframe.md](./dashboard-date-range.wireframe.md) | Date range selector UI | DOM-DASH-002a, DOM-DASH-002b |
| [dashboard-targets.wireframe.md](./dashboard-targets.wireframe.md) | Target/goal settings and progress | DOM-DASH-003a-d |
| [dashboard-comparison.wireframe.md](./dashboard-comparison.wireframe.md) | Period comparison UI | DOM-DASH-005a, DOM-DASH-005b |
| [dashboard-scheduled-reports.wireframe.md](./dashboard-scheduled-reports.wireframe.md) | Report scheduling interface | DOM-DASH-006a-d |
| [dashboard-mobile.wireframe.md](./dashboard-mobile.wireframe.md) | Mobile-optimized dashboard | DOM-DASH-007 |
| [dashboard-ai-insights.wireframe.md](./dashboard-ai-insights.wireframe.md) | AI insights widget | DOM-DASH-008a, DOM-DASH-008b |
| [dashboard-role-variations.wireframe.md](./dashboard-role-variations.wireframe.md) | Role-specific layouts | All (role defaults) |

## Story-to-Wireframe Mapping

| Story ID | Story Name | Wireframe(s) |
|----------|------------|--------------|
| DOM-DASH-002a | Add Date Range Selector UI | dashboard-date-range.wireframe.md |
| DOM-DASH-002b | Wire Date Range to Widgets | dashboard-date-range.wireframe.md, dashboard-kpi-cards.wireframe.md |
| DOM-DASH-003a | Create Targets Schema | dashboard-targets.wireframe.md |
| DOM-DASH-003b | Add Target Server Functions | dashboard-targets.wireframe.md |
| DOM-DASH-003c | Add Target Settings UI | dashboard-targets.wireframe.md |
| DOM-DASH-003d | Add Target Progress to KPI Widgets | dashboard-kpi-cards.wireframe.md, dashboard-targets.wireframe.md |
| DOM-DASH-004a | Add KPI Widget Click Handlers | dashboard-kpi-cards.wireframe.md |
| DOM-DASH-004b | Add Chart Drill-Down Modal | dashboard-chart-widgets.wireframe.md |
| DOM-DASH-004c | Preserve Context in Drill-Down | dashboard-chart-widgets.wireframe.md |
| DOM-DASH-005a | Add Comparison Periods Server Support | dashboard-comparison.wireframe.md |
| DOM-DASH-005b | Add Comparison Periods UI | dashboard-comparison.wireframe.md, dashboard-chart-widgets.wireframe.md |
| DOM-DASH-006a | Create Scheduled Reports Schema | dashboard-scheduled-reports.wireframe.md |
| DOM-DASH-006b | Add Report Server Functions | dashboard-scheduled-reports.wireframe.md |
| DOM-DASH-006c | Add Report Management UI | dashboard-scheduled-reports.wireframe.md |
| DOM-DASH-006d | Add Trigger.dev Scheduled Job | dashboard-scheduled-reports.wireframe.md |
| DOM-DASH-007 | Create Mobile Dashboard | dashboard-mobile.wireframe.md |
| DOM-DASH-008a | Create AI Insights Server Function | dashboard-ai-insights.wireframe.md |
| DOM-DASH-008b | Create AI Insights Widget Component | dashboard-ai-insights.wireframe.md |

## Design Principles

### Data-Rich Scannable

1. **Information Density:** Maximum relevant data visible without scrolling
2. **Clear Hierarchy:** KPIs > Charts > Tables > Actions
3. **Visual Encoding:** Color, size, position convey meaning
4. **Scannable Patterns:** Consistent card sizes, aligned grids

### Role-Appropriate Defaults

| Role | Focus Areas | Priority Widgets |
|------|-------------|------------------|
| Admin | Full overview | All KPIs, all charts |
| Sales | Pipeline & Revenue | Pipeline funnel, revenue trend |
| Warehouse | Orders & Inventory | Today's shipments, low stock |
| Viewer | Summary | 3 KPIs, single chart |

### Responsive Strategy

| Breakpoint | Layout | Behavior |
|------------|--------|----------|
| Desktop (1200px+) | 12-column grid | Full features |
| Tablet (768-1199px) | 6-column grid | Condensed, scrollable |
| Mobile (<768px) | Single column | Swipeable, collapsible |

### Accessibility Standards

- WCAG 2.1 AA compliance
- Keyboard navigation for all widgets
- Screen reader announcements for data updates
- Color contrast meets 4.5:1 minimum
- Focus management for modals/popovers

## Component Reuse

### From Existing Codebase

- `shared/metrics/MetricsSummary` - KPI row
- `domain/dashboard/widget-grid.tsx` - Grid layout
- `domain/dashboard/widgets/*.tsx` - Widget components
- `ui/card.tsx`, `ui/button.tsx`, etc. - Base components

### New Components Needed

- `DateRangePicker` - Date selection with presets
- `ComparisonToggle` - Period comparison switch
- `TrendIndicator` - Trend arrows with percentages
- `ProgressBar` - Target progress visualization
- `AIInsightsWidget` - AI-generated insights
- `MobileDashboard` - Mobile-specific layout
- `SwipeableCarousel` - Touch-friendly KPI carousel
- `BottomSheet` - Mobile drill-down panel

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial load | < 2 seconds |
| Widget refresh | < 500ms |
| Date range change | < 1 second |
| Chart interaction | < 100ms feedback |
| Mobile render | < 1.5 seconds on 3G |

## Integration Points

- **DashboardContext:** State management for filters/preferences
- **React Query:** Data fetching and caching
- **localStorage:** Layout persistence
- **URL params:** Date range, filters
- **Server functions:** Metrics aggregation
- **Trigger.dev:** Scheduled report jobs
- **AI infrastructure:** Insights generation
