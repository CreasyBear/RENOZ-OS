# Dashboard Targets & Goals Wireframe

**Story:** DOM-DASH-003a, DOM-DASH-003b, DOM-DASH-003c, DOM-DASH-003d
**Purpose:** Goal/target setting and progress tracking for key metrics
**Design Aesthetic:** Clear progress visualization with actionable insights

---

## UI Patterns (Reference Implementation)

### Progress
- **Pattern**: RE-UI Progress
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`
- **Features**:
  - Target progress bar with percentage completion
  - Color-coded states (red <70%, amber 70-90%, green 90-100%, green+sparkle >100%)
  - Smooth animation on value updates
  - Accessible aria-valuenow/aria-valuemin/aria-valuemax attributes

### Card (Target Widget)
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - KPI card with integrated target display
  - Target indicator in header (e.g., "Target: $85K")
  - Gap indicator showing over/under target amount
  - Time remaining display (days left in period)

### DataTable
- **Pattern**: Midday DataTable
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/tables/`
- **Features**:
  - Target list with inline progress bars
  - Sortable columns (Metric, Period, Target, Current, Progress)
  - Row actions for Edit, Delete, View History
  - Inline editing mode for quick target updates

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Metric type dropdown (Revenue, Orders, Pipeline, etc.)
  - Period selector (Weekly, Monthly, Quarterly, Yearly)
  - Filter controls for target list (Type, Period)

### Alert
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Target achievement notification toast
  - Status messages (Behind, On Track, Ahead, Achieved)
  - Color-coded alert variants based on target status
  - Dismissible with action buttons (View Dashboard)

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | Aggregates from: customers, orders, opportunities, issues, activities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-DASH-003a, DOM-DASH-003b, DOM-DASH-003c, DOM-DASH-003d | N/A |

### Existing Schema Files
- Computed from existing tables (customers, orders, opportunities, issues, activities)

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Target Settings Page Layout

```
+========================================================================+
|  SETTINGS > TARGETS                                                     |
+========================================================================+
|  [Breadcrumb: Settings > Dashboard > Targets]                           |
+========================================================================+
|                                                                         |
|  +----------------------------+  +-----------------------------------+  |
|  | CREATE/EDIT TARGET         |  | EXISTING TARGETS                  |  |
|  | (Form Sidebar)             |  | (Data Table)                      |  |
|  +----------------------------+  +-----------------------------------+  |
|  |                            |  |                                   |  |
|  | Target Type                |  | Type     | Period  | Target  | Prog |  |
|  | [v Revenue          ]     |  |----------|---------|---------|------|  |
|  |                            |  | Revenue  | Monthly | $85K    | 100% |  |
|  | Period                     |  | kWh      | Monthly | 2500kWh | 98%  |  |
|  | ( ) Weekly                 |  | Win Rate | Quarterly| 70%    | 97%  |  |
|  | (x) Monthly                |  | Installs | Monthly | 12      | 100% |  |
|  | ( ) Quarterly              |  |                                   |  |
|  | ( ) Yearly                 |  +-----------------------------------+  |
|  |                            |  |                                   |  |
|  | Target Value               |  | [Edit] [Delete]                   |  |
|  | [$85,000            ]     |  |                                   |  |
|  |                            |  +-----------------------------------+  |
|  | Description (optional)     |                                         |
|  | [Monthly revenue goal  ]  |                                         |
|  |                            |                                         |
|  +----------------------------+                                         |
|  | [Cancel]    [Save Target]  |                                         |
|  +----------------------------+                                         |
|                                                                         |
+========================================================================+
```

## Target Form Component

```
+============================================+
|  CREATE NEW TARGET                         |
+============================================+
|                                            |
|  1. Select Metric Type                     |
|  +--------------------------------------+  |
|  | [v] Select metric type...            |  |
|  +--------------------------------------+  |
|  | [ ] Revenue                          |  |
|  | [ ] Orders                           |  |
|  | [ ] Pipeline Value                   |  |
|  | [ ] Customer Acquisition             |  |
|  +--------------------------------------+  |
|                                            |
|  2. Select Period                          |
|  +--------------------------------------+  |
|  | ( ) Weekly    ( ) Monthly            |  |
|  | ( ) Quarterly ( ) Yearly             |  |
|  +--------------------------------------+  |
|                                            |
|  3. Set Target Value                       |
|  +--------------------------------------+  |
|  | $ [50,000                        ]   |  |
|  +--------------------------------------+  |
|  | Numeric value for the selected period|  |
|                                            |
|  4. Description (Optional)                 |
|  +--------------------------------------+  |
|  | [                                  ] |  |
|  | [                                  ] |  |
|  +--------------------------------------+  |
|                                            |
+============================================+
|  Preview:                                  |
|  "Revenue target of $50,000 per month"     |
+============================================+
|  [Cancel]                  [Save Target]   |
+============================================+
```

## Target List Table

```
+====================================================================+
|  EXISTING TARGETS                                     [+ Add Target] |
+====================================================================+
|  [Search targets...]  [Filter: All Types v] [Period: All v]         |
+====================================================================+
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Metric        | Period    | Target    | Current  | Progress    | |
|  |---------------|-----------|-----------|----------|-------------| |
|  | Revenue       | Monthly   | $50,000   | $41,500  | 83% [=====>]| |
|  | Orders        | Monthly   | 100       | 67       | 67% [===>  ]| |
|  | Pipeline      | Quarterly | $200,000  | $90,000  | 45% [==>   ]| |
|  | Cust. Acq.    | Monthly   | 15        | 18       | 120% [=====]| |
|  +----------------------------------------------------------------+ |
|                                                                      |
|  Row Actions (on hover):                                             |
|  [...] -> [Edit] [Delete] [View History]                            |
|                                                                      |
+====================================================================+
```

## Inline Target Editing

```
+----------------------------------------------------------------+
| Editing: Revenue Target                                         |
+----------------------------------------------------------------+
| Metric        | Period    | Target    | Current  | Progress    |
|---------------|-----------|-----------|----------|-------------|
| Revenue       | [Monthly v]| [$60,000]| $41,500  | --          |
|               |           |          |          | [Save] [X]  |
+----------------------------------------------------------------+
```

## Target Progress on KPI Widget

```
+============================================+
|  KPI WIDGET WITH TARGET PROGRESS           |
+============================================+
|  +--------------------------------------+  |
|  | [$] Revenue           Target: $85K   |  <- Target indicator
|  +--------------------------------------+  |
|  |                                      |  |
|  |         $85,340                      |  <- Current value (AUD)
|  |                                      |  |
|  |    [^] +15.8% vs last month          |  <- Trend
|  |                                      |  |
|  |    Progress to Target:               |  |
|  |    [=======================>] 100%   |  <- Progress bar
|  |                                      |  |
|  |    $340 over target                  |  <- Gap indicator
|  |    18 days left in period            |  <- Time remaining
|  |                                      |  |
|  +--------------------------------------+  |
|  |  [*] Target achieved! (+0.4%)        |  <- Status message
|  +--------------------------------------+  |
+============================================+
```

## Progress Bar Color States

```
PROGRESS BAR VISUALIZATION:

Below 70% (Behind):
[========>--------------------------] 35%
Color: Red (#ef4444)
Status: "Behind target"
Icon: [!] Warning

70-90% (On Track):
[=======================>-----------] 78%
Color: Amber (#f59e0b)
Status: "On track"
Icon: [~] Trending

90-100% (Close):
[=============================>-----] 92%
Color: Green (#22c55e)
Status: "Almost there!"
Icon: [^] Trending up

100%+ (Exceeded):
[=================================>] 115%
Color: Green with sparkle (#22c55e)
Status: "Target exceeded!"
Icon: [*] Star
```

## Target Status Messages

```
+--------------------------------------------------+
| STATUS MESSAGE VARIANTS                           |
+--------------------------------------------------+

Behind Pace (< 70%):
+----------------------------------------------+
| [!] Behind target pace                       |
| Need $15,000 more in 10 days to catch up     |
+----------------------------------------------+

On Track (70-90%):
+----------------------------------------------+
| [~] On track to meet target                  |
| Maintaining current pace will reach goal     |
+----------------------------------------------+

Ahead (> 90%):
+----------------------------------------------+
| [^] Ahead of target                          |
| Likely to exceed goal by ~$5,000             |
+----------------------------------------------+

Target Achieved (100%):
+----------------------------------------------+
| [*] Target achieved!                         |
| Exceeded goal by $2,500 (+5%)                |
+----------------------------------------------+
```

## Target Achievement Notification

```
+==================================================+
|  TARGET ACHIEVEMENT TOAST                         |
+==================================================+
|  +--------------------------------------------+  |
|  | [*] Revenue Target Achieved!               |  |
|  |                                            |  |
|  | You've reached your monthly revenue        |  |
|  | target of $50,000!                         |  |
|  |                                            |  |
|  | Current: $51,200 (+2.4% over target)       |  |
|  |                                            |  |
|  | [Dismiss]           [View Dashboard]       |  |
|  +--------------------------------------------+  |
+==================================================+
```

## Target History/Trend View

```
+====================================================================+
|  TARGET HISTORY: Revenue (Monthly)                    [X Close]     |
+====================================================================+
|                                                                      |
|  +----------------------------------------------------------------+ |
|  |  Target vs Actual - Last 6 Months                              | |
|  |                                                                | |
|  |  $60K |     [T]          [T]           [T]                     | |
|  |       |      |            |             |                      | |
|  |  $50K | [T]  [A]    [T]  [A]   [T]     [A]                     | |
|  |       |  |    |      |    |     |       |                      | |
|  |  $40K | [A]   |     [A]   |    [A]      |                      | |
|  |       |  |    |      |    |     |       |                      | |
|  |  $30K |  |    |      |    |     |       |                      | |
|  |       +--+----+------+----+-----+-------+----                  | |
|  |        Jul   Aug    Sep   Oct   Nov    Dec                     | |
|  |                                                                | |
|  |  [T] Target  [A] Actual                                        | |
|  +----------------------------------------------------------------+ |
|                                                                      |
|  Summary:                                                            |
|  - Targets met: 4/6 months (67%)                                    |
|  - Average achievement: 94%                                         |
|  - Best month: October (108%)                                       |
|  - Missed by most: July (-18%)                                      |
|                                                                      |
+====================================================================+
```

## Empty States

### No Targets Set

```
+====================================================================+
|  TARGETS                                                            |
+====================================================================+
|                                                                      |
|                   [Target icon]                                      |
|                                                                      |
|               No targets configured                                  |
|                                                                      |
|    Set goals for your key metrics to track                          |
|    progress and drive performance.                                  |
|                                                                      |
|              [+ Create Your First Target]                           |
|                                                                      |
+====================================================================+
```

### Target Without Data

```
+--------------------------------------+
| [$] Revenue           Target: $50K   |
+--------------------------------------+
|                                      |
|         --                           |
|                                      |
|    No data for current period        |
|                                      |
|    Progress will appear once         |
|    revenue data is available.        |
|                                      |
+--------------------------------------+
```

## Mobile Layout

### Target Settings (Mobile)

```
+================================+
|  Settings > Targets    [+]     |
+================================+
|                                |
|  +----------------------------+|
|  | Revenue                    ||
|  | Monthly: $50,000           ||
|  | Progress: 83% [========>]  ||
|  | [Edit] [Delete]            ||
|  +----------------------------+|
|                                |
|  +----------------------------+|
|  | Orders                     ||
|  | Monthly: 100               ||
|  | Progress: 67% [=====>]     ||
|  | [Edit] [Delete]            ||
|  +----------------------------+|
|                                |
+================================+
|  [+ Add New Target]            |
+================================+
```

### Target Form (Mobile - Full Screen)

```
+================================+
|  Create Target        [X]      |
+================================+
|                                |
|  Metric Type                   |
|  +----------------------------+|
|  | [v] Revenue                ||
|  +----------------------------+|
|                                |
|  Period                        |
|  +----------------------------+|
|  | ( ) Weekly  (x) Monthly    ||
|  | ( ) Quarterly ( ) Yearly   ||
|  +----------------------------+|
|                                |
|  Target Value                  |
|  +----------------------------+|
|  | $ [50,000             ]    ||
|  +----------------------------+|
|                                |
|  Description                   |
|  +----------------------------+|
|  | [                      ]   ||
|  +----------------------------+|
|                                |
+================================+
|  [Cancel]      [Save Target]   |
+================================+
```

## Accessibility Requirements

### ARIA Labels

```tsx
<section aria-label="Target Progress">
  <div
    role="progressbar"
    aria-valuenow={83}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label="Revenue target progress: 83% of $50,000 goal"
  >
    <span className="sr-only">
      Revenue: $41,500 of $50,000 target (83%). On track to meet goal.
    </span>
  </div>
</section>
```

### Keyboard Navigation

```
Tab: Move between form fields
Enter: Submit form / Select option
Arrow keys: Navigate radio buttons
Escape: Cancel edit / Close modal
```

### Screen Reader Announcements

```
On progress update:
"Revenue target progress updated to 85%. You're on track to meet your monthly goal."

On target achieved:
"Congratulations! You've achieved your monthly revenue target of $50,000."

On target created:
"Revenue target of $50,000 per month has been created."
```

## Component Props Interface

```typescript
interface TargetSettingsProps {
  targets: Target[];
  onCreateTarget: (target: CreateTargetInput) => Promise<void>;
  onUpdateTarget: (id: string, target: UpdateTargetInput) => Promise<void>;
  onDeleteTarget: (id: string) => Promise<void>;
  isLoading?: boolean;
  error?: Error | null;
}

interface Target {
  id: string;
  metric: 'revenue' | 'orders' | 'pipeline' | 'customer_acquisition';
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  targetValue: number;
  actualValue: number;
  progress: number; // 0-100+
  description?: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface KPIWidgetWithTargetProps extends KPIWidgetProps {
  target?: {
    value: number;
    progress: number;
    status: 'behind' | 'on-track' | 'ahead' | 'achieved';
    remaining: number;
    daysLeft: number;
  };
  showTargetProgress?: boolean;
  onTargetClick?: () => void;
}
```

## Success Metrics

- Target creation completes in < 3 clicks
- Progress bar updates within 500ms of data change
- Users understand target status at a glance
- Target achievement notifications appear within 5 seconds
- All target management operations accessible via keyboard
- Screen readers announce progress changes clearly
