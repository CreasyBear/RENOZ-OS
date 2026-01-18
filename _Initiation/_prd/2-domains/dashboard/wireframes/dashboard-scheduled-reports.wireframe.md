# Dashboard Scheduled Reports Wireframe

**Story:** DOM-DASH-006a, DOM-DASH-006b, DOM-DASH-006c, DOM-DASH-006d
**Purpose:** Automated report generation and email delivery
**Design Aesthetic:** Clear scheduling interface with report preview

---

## UI Patterns (Reference Implementation)

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Create/Edit report form modal
  - Report preview modal with email content display
  - Multi-step form layout within dialog
  - Focus trap and Escape key handling

### DataTable
- **Pattern**: Midday DataTable
- **Reference**: `_reference/.midday-reference/apps/dashboard/src/components/tables/`
- **Features**:
  - Scheduled reports list with sortable columns
  - Row actions menu (Edit, Preview, Send, Pause, Delete)
  - Status indicator column (Active, Paused)
  - Search and filter controls in header

### Input (Tag Input)
- **Pattern**: RE-UI Input with Tag pattern
- **Reference**: `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Email recipients tag input with removable chips
  - Add/remove recipient functionality
  - Email validation with error states
  - Team member selection dropdown integration

### RadioGroup / Checkbox
- **Pattern**: RE-UI RadioGroup and Checkbox
- **Reference**: `_reference/.reui-reference/registry/default/ui/radio-group.tsx`, `checkbox.tsx`
- **Features**:
  - Frequency selection (Daily, Weekly, Monthly)
  - Metrics selection checklist with grouped categories
  - Format options (HTML Email, PDF Attachment)
  - Clear selected state indicators

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Delivery time picker dropdown
  - Timezone selection
  - Day/date selection for weekly/monthly schedules
  - Accessible keyboard navigation

---

## Dependencies

> **STATUS: READY** - All required schema exists, this wireframe can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Available** | Aggregates from: customers, orders, opportunities, issues, activities | IMPLEMENTED |
| **Server Functions** | Standard CRUD | AVAILABLE |
| **PRD Stories** | DOM-DASH-006a, DOM-DASH-006b, DOM-DASH-006c, DOM-DASH-006d | N/A |

### Existing Schema Files
- Computed from existing tables (customers, orders, opportunities, issues, activities)

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Date Format**: DD/MM/YYYY

---

## Scheduled Reports Settings Page

```
+========================================================================+
|  SETTINGS > SCHEDULED REPORTS                                           |
+========================================================================+
|  [Breadcrumb: Settings > Dashboard > Scheduled Reports]                 |
+========================================================================+
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | SCHEDULED REPORTS                               [+ Create Report]  |  |
|  +-------------------------------------------------------------------+  |
|  |                                                                   |  |
|  | +---------------------------------------------------------------+ |  |
|  | | Name           | Frequency | Recipients | Format | Status     | |  |
|  | |----------------|-----------|------------|--------|------------| |  |
|  | | Weekly Summary | Weekly    | 3 users    | HTML   | [*] Active | |  |
|  | | Monthly Exec   | Monthly   | 5 users    | PDF    | [*] Active | |  |
|  | | Daily Orders   | Daily     | 2 users    | HTML   | [ ] Paused | |  |
|  | +---------------------------------------------------------------+ |  |
|  |                                                                   |  |
|  | Row Actions: [Edit] [Preview] [Send Now] [Pause/Resume] [Delete]  |  |
|  |                                                                   |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
+========================================================================+
```

## Create/Edit Report Dialog

```
+================================================================+
|  CREATE SCHEDULED REPORT                          [X Close]     |
+================================================================+
|                                                                 |
|  1. Report Details                                              |
|  +-----------------------------------------------------------+ |
|  | Report Name *                                              | |
|  | [Weekly Performance Summary                           ]    | |
|  +-----------------------------------------------------------+ |
|                                                                 |
|  2. Schedule                                                    |
|  +-----------------------------------------------------------+ |
|  | Frequency                                                  | |
|  | (x) Daily    ( ) Weekly    ( ) Monthly                    | |
|  |                                                           | |
|  | Delivery Time: [9:00 AM v]  Timezone: [EST v]             | |
|  |                                                           | |
|  | For Weekly:  Send on [Monday v]                           | |
|  | For Monthly: Send on [1st v] of month                     | |
|  +-----------------------------------------------------------+ |
|                                                                 |
|  3. Recipients                                                  |
|  +-----------------------------------------------------------+ |
|  | Email addresses (comma-separated)                          | |
|  | +-------------------------------------------------------+ | |
|  | | [john@company.com] [x]                                | | |
|  | | [jane@company.com] [x]                                | | |
|  | | [Add email...]                                        | | |
|  | +-------------------------------------------------------+ | |
|  +-----------------------------------------------------------+ |
|                                                                 |
|  4. Report Contents                                             |
|  +-----------------------------------------------------------+ |
|  | Select metrics to include:                                 | |
|  | [x] Revenue Summary                                        | |
|  | [x] Orders Summary                                         | |
|  | [x] Pipeline Summary                                       | |
|  | [ ] Inventory Alerts                                       | |
|  | [ ] Issue Summary                                          | |
|  | [x] Top Customers                                          | |
|  | [ ] Team Performance                                       | |
|  +-----------------------------------------------------------+ |
|                                                                 |
|  5. Format                                                      |
|  +-----------------------------------------------------------+ |
|  | (x) HTML Email - Inline styled email                       | |
|  | ( ) PDF Attachment - Formatted PDF document                | |
|  +-----------------------------------------------------------+ |
|                                                                 |
+================================================================+
|  [Cancel]           [Preview Report]     [Save Schedule]        |
+================================================================+
```

## Report Preview Modal

```
+================================================================+
|  REPORT PREVIEW                                    [X Close]    |
+================================================================+
|  +----------------------------------------------------------+  |
|  |  From: reports@yourcompany.com                            |  |
|  |  To: john@company.com, jane@company.com                   |  |
|  |  Subject: Weekly Performance Summary - Dec 9, 2024        |  |
|  +----------------------------------------------------------+  |
|                                                                 |
|  +----------------------------------------------------------+  |
|  |  +------------------------------------------------------+ |  |
|  |  |  [Company Logo]                                      | |  |
|  |  |  Weekly Performance Summary                          | |  |
|  |  |  December 3 - December 9, 2024                       | |  |
|  |  +------------------------------------------------------+ |  |
|  |                                                          |  |
|  |  KEY METRICS                                             |  |
|  |  +------------+ +------------+ +------------+            |  |
|  |  | Revenue    | | Orders     | | Pipeline   |            |  |
|  |  | $45,230    | | 47         | | $456,789   |            |  |
|  |  | +15.3%     | | +12%       | | +8.5%      |            |  |
|  |  +------------+ +------------+ +------------+            |  |
|  |                                                          |  |
|  |  TOP CUSTOMERS THIS WEEK                                 |  |
|  |  1. Acme Corp - $12,450                                  |  |
|  |  2. Beta Inc - $8,920                                    |  |
|  |  3. Gamma LLC - $6,780                                   |  |
|  |                                                          |  |
|  |  [View Full Dashboard]                                   |  |
|  |                                                          |  |
|  +----------------------------------------------------------+  |
|                                                                 |
+================================================================+
|  This is a preview. Actual report will be sent at scheduled time.|
|                                                                 |
|  [Back to Edit]                          [Send Test Email]      |
+================================================================+
```

## Report List Table

```
+====================================================================+
|  SCHEDULED REPORTS                                 [+ Create Report] |
+====================================================================+
|  [Search reports...]  [Status: All v]  [Frequency: All v]           |
+====================================================================+
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Name                | Frequency | Recipients    | Next Run     | |
|  |--------------------|-----------|---------------|---------------| |
|  | Weekly Summary     | Weekly    | john@, jane@  | Mon, 9:00 AM  | |
|  |   [*] Active       | Mondays   | +1 more       | Dec 11, 2024  | |
|  |                    |           |               | [Edit] [...] | |
|  |--------------------|-----------|---------------|---------------| |
|  | Monthly Executive  | Monthly   | exec@, cfo@   | Jan 1, 9:00 AM| |
|  |   [*] Active       | 1st       | +3 more       | Jan 1, 2025   | |
|  |                    |           |               | [Edit] [...] | |
|  |--------------------|-----------|---------------|---------------| |
|  | Daily Orders       | Daily     | ops@, whse@   | (Paused)      | |
|  |   [ ] Paused       | 8:00 AM   |               | --            | |
|  |                    |           |               | [Edit] [...] | |
|  +----------------------------------------------------------------+ |
|                                                                      |
+====================================================================+
```

## Report Row Actions Menu

```
+----------------------------------+
| Actions                    [X]   |
+----------------------------------+
| [Edit] Edit Schedule             |
| [Preview] Preview Report         |
| [Send] Send Now                  |
| [Pause] Pause Schedule           |
| [Copy] Duplicate Report          |
| ---                              |
| [Trash] Delete Report            |
+----------------------------------+
```

## Recipients Tag Input

```
+------------------------------------------------------------+
|  Recipients                                                 |
+------------------------------------------------------------+
|  +--------------------------------------------------------+|
|  | +-------------------+  +-------------------+            ||
|  | | john@company.com [x] | jane@company.com [x] |          ||
|  | +-------------------+  +-------------------+            ||
|  | +-------------------+                                   ||
|  | | ops@company.com [x]  |                                ||
|  | +-------------------+                                   ||
|  |                                                         ||
|  | [Add email address...]                                  ||
|  +--------------------------------------------------------+|
|                                                             |
|  Or select from team:                                       |
|  [v] Select team members...                                 |
|  +--------------------------------------------------------+|
|  | [ ] John Doe (john@company.com)                        ||
|  | [x] Jane Smith (jane@company.com)                      ||
|  | [ ] Bob Wilson (bob@company.com)                       ||
|  +--------------------------------------------------------+|
+------------------------------------------------------------+
```

## Metrics Selection Checklist

```
+------------------------------------------------------------+
|  Select Metrics to Include                                  |
+------------------------------------------------------------+
|                                                             |
|  KEY PERFORMANCE INDICATORS                                 |
|  +--------------------------------------------------------+|
|  | [x] Revenue Summary                                    ||
|  |     Current, trend, comparison to last period          ||
|  | [x] Orders Summary                                     ||
|  |     Count, status breakdown, fulfillment rate          ||
|  | [x] Pipeline Summary                                   ||
|  |     Total value, stage breakdown, conversion rate      ||
|  | [ ] Customer Acquisition                               ||
|  |     New customers, churn, net growth                   ||
|  +--------------------------------------------------------+|
|                                                             |
|  OPERATIONAL METRICS                                        |
|  +--------------------------------------------------------+|
|  | [ ] Inventory Alerts                                   ||
|  |     Low stock items, out of stock, reorder needs       ||
|  | [ ] Issue Summary                                      ||
|  |     Open issues, resolution time, by priority          ||
|  | [ ] Warranty Alerts                                    ||
|  |     Expiring soon, claims, coverage                    ||
|  +--------------------------------------------------------+|
|                                                             |
|  INSIGHTS                                                   |
|  +--------------------------------------------------------+|
|  | [x] Top Customers                                      ||
|  |     Top 5 by revenue this period                       ||
|  | [ ] Team Performance                                   ||
|  |     Sales by rep, activity summary                     ||
|  | [ ] Trend Analysis                                     ||
|  |     Week-over-week, month-over-month                   ||
|  +--------------------------------------------------------+|
|                                                             |
+------------------------------------------------------------+
```

## Report Format Options

```
+------------------------------------------------------------+
|  Report Format                                              |
+------------------------------------------------------------+
|                                                             |
|  +--------------------------------------------------------+|
|  | (x) HTML Email                                         ||
|  |     +------------------------------------------------+ ||
|  |     | Inline styled email                            | ||
|  |     | Best for quick review in email client          | ||
|  |     | Renders charts as images                       | ||
|  |     +------------------------------------------------+ ||
|  +--------------------------------------------------------+|
|                                                             |
|  +--------------------------------------------------------+|
|  | ( ) PDF Attachment                                     ||
|  |     +------------------------------------------------+ ||
|  |     | Formatted PDF document                         | ||
|  |     | Best for printing or archiving                 | ||
|  |     | Higher quality charts and tables               | ||
|  |     +------------------------------------------------+ ||
|  +--------------------------------------------------------+|
|                                                             |
+------------------------------------------------------------+
```

## Empty State

```
+====================================================================+
|  SCHEDULED REPORTS                                                  |
+====================================================================+
|                                                                      |
|                     [Report icon]                                    |
|                                                                      |
|              No scheduled reports yet                                |
|                                                                      |
|    Automate your reporting by scheduling regular                    |
|    email summaries to your team.                                    |
|                                                                      |
|              [+ Create Your First Report]                           |
|                                                                      |
+====================================================================+
```

## Loading States

### Report List Loading

```
+------------------------------------------------------------------+
| [====>                                                       ]    |
+------------------------------------------------------------------+
| +--------------------------------------------------------------+ |
| | [=============] | [========] | [==========] | [============] | |
| | [=============] | [========] | [==========] | [============] | |
| | [=============] | [========] | [==========] | [============] | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

### Preview Loading

```
+------------------------------------------+
|  Generating preview...                   |
|                                          |
|  +------------------------------------+  |
|  |                                    |  |
|  |    [Spin] Loading preview...       |  |
|  |                                    |  |
|  |    This may take a few seconds     |  |
|  |    for reports with many metrics.  |  |
|  |                                    |  |
|  +------------------------------------+  |
+------------------------------------------+
```

## Error States

### Invalid Email

```
+--------------------------------------------------------+
|  Recipients                                             |
+--------------------------------------------------------+
|  +----------------------------------------------------+|
|  | [john@company.com] [x]  [invalid-email] [!]        ||
|  +----------------------------------------------------+|
|  [!] "invalid-email" is not a valid email address      |
+--------------------------------------------------------+
```

### Report Send Failed

```
+------------------------------------------+
| [!] Failed to send report                |
|                                          |
| The scheduled report could not be        |
| delivered. Please check recipient        |
| email addresses and try again.           |
|                                          |
| Error: SMTP connection failed            |
|                                          |
| [Retry]  [Edit Recipients]  [Dismiss]    |
+------------------------------------------+
```

## Mobile Layout

### Report List (Mobile)

```
+================================+
|  Scheduled Reports       [+]   |
+================================+
|                                |
|  +----------------------------+|
|  | Weekly Summary             ||
|  | Weekly - 3 recipients      ||
|  | Next: Mon, Dec 11, 9:00 AM ||
|  | [*] Active                 ||
|  | [Edit] [Preview] [...]     ||
|  +----------------------------+|
|                                |
|  +----------------------------+|
|  | Monthly Executive          ||
|  | Monthly - 5 recipients     ||
|  | Next: Jan 1, 2025, 9:00 AM ||
|  | [*] Active                 ||
|  | [Edit] [Preview] [...]     ||
|  +----------------------------+|
|                                |
+================================+
```

### Create Report (Mobile - Full Screen)

```
+================================+
|  Create Report         [X]     |
+================================+
|                                |
|  Report Name                   |
|  +----------------------------+|
|  | [Weekly Summary       ]    ||
|  +----------------------------+|
|                                |
|  Frequency                     |
|  +----------------------------+|
|  | ( ) Daily                  ||
|  | (x) Weekly                 ||
|  | ( ) Monthly                ||
|  +----------------------------+|
|                                |
|  Day: [Monday v]               |
|  Time: [9:00 AM v]             |
|                                |
|  Recipients                    |
|  [+ Add recipient]             |
|                                |
|  Metrics                       |
|  [Select metrics...]           |
|                                |
+================================+
|  [Cancel]      [Save Schedule] |
+================================+
```

## Accessibility Requirements

### ARIA Labels

```tsx
<form aria-label="Create scheduled report">
  <fieldset>
    <legend>Report Frequency</legend>
    <input
      type="radio"
      id="freq-daily"
      name="frequency"
      aria-describedby="freq-daily-desc"
    />
    <label htmlFor="freq-daily">Daily</label>
    <span id="freq-daily-desc" className="sr-only">
      Report will be sent every day at the specified time
    </span>
  </fieldset>

  <div role="group" aria-label="Email recipients">
    <div role="list" aria-label="Added recipients">
      <div role="listitem">john@company.com</div>
    </div>
  </div>
</form>
```

### Keyboard Navigation

```
Tab: Move between form fields
Enter: Add recipient / Submit form
Space: Toggle checkbox / Select radio
Backspace: Remove last recipient tag (when in tag input)
Escape: Close dialog / Cancel action
Arrow keys: Navigate within radio groups
```

### Screen Reader Announcements

```
On report created:
"Weekly Summary report scheduled. Will be sent every Monday at 9:00 AM to 3 recipients."

On preview generated:
"Report preview loaded. Review the email content before scheduling."

On report sent:
"Test email sent to john@company.com, jane@company.com"
```

## Component Props Interface

```typescript
interface ScheduledReportFormProps {
  report?: ScheduledReport; // For editing
  onSave: (report: CreateReportInput) => Promise<void>;
  onCancel: () => void;
  onPreview: (report: CreateReportInput) => Promise<ReportPreview>;
  isLoading?: boolean;
  error?: Error | null;
}

interface ScheduledReport {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  metrics: string[];
  format: 'html' | 'pdf';
  isActive: boolean;
  deliveryTime: string; // "09:00"
  deliveryDay?: number; // For weekly (0-6) or monthly (1-31)
  timezone: string;
  lastRunAt?: Date;
  nextRunAt?: Date;
  orgId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportPreview {
  subject: string;
  htmlContent: string;
  pdfUrl?: string;
}
```

## Success Metrics

- Report creation completes in < 1 minute
- Preview generates within 3 seconds
- Test email delivers within 30 seconds
- Users can understand report schedule at a glance
- All form fields accessible via keyboard
- Screen readers announce all status changes
