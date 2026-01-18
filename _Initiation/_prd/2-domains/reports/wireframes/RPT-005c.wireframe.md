# DOM-RPT-005c: Schedule Management UI

> **PRD**: reports.prd.json
> **Story**: DOM-RPT-005c - Schedule Management UI
> **Priority**: 4
> **Dependencies**: DOM-RPT-005a (schema), DOM-RPT-005b (server functions)

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | scheduled_reports, schedule_history | NOT CREATED |
| **Server Functions Required** | createSchedule, updateSchedule, deleteSchedule, getSchedules, getScheduleHistory, sendTestReport | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-RPT-005a, DOM-RPT-005b | PENDING |

### Existing Schema Available
- `orders` in `renoz-v2/lib/schema/orders.ts` - provides data for scheduled reports
- `opportunities` in `renoz-v2/lib/schema/opportunities.ts` - provides pipeline data for scheduled reports
- `products`, `inventoryItems` in `renoz-v2/lib/schema/products.ts` - provides inventory data for scheduled reports
- `customers` in `renoz-v2/lib/schema/customers.ts` - provides customer data for scheduled reports

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- **Key Metrics**: kWh deployed, Quote win rate, Installation completion rate, Warranty claim rate
- **Product Categories**: Battery Systems, Inverters, Solar, Services
- **Currency**: AUD with GST (10%)
- **Fiscal Year**: July-June (Australian)
- **Report Users**: Admin, Sales, Installation managers

---

## Overview

UI for creating and managing report schedules. Users can schedule any report to be automatically generated and emailed on a recurring basis. Integrates with existing Trigger.dev emailReport task.

**Design Aesthetic**: Efficient Workflow - focused on quick setup with sensible defaults
**Primary Device**: Desktop (admin/manager setup)
**Secondary**: Tablet (quick schedule management)

---

## UI Patterns (Reference Implementation)

### Dialog
- **Pattern**: RE-UI Dialog
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Schedule creation modal with form sections
  - Edit schedule modal with saved configuration
  - History dialog for delivery records

### Select
- **Pattern**: RE-UI Select
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`
- **Features**:
  - Frequency selector (Daily/Weekly/Monthly)
  - Time picker dropdown
  - Timezone selection
  - Day of month selector

### Switch
- **Pattern**: RE-UI Switch
- **Reference**: `_reference/.reui-reference/registry/default/ui/switch.tsx`
- **Features**:
  - Toggle schedule enabled/disabled
  - Include current filters checkbox
  - Show group subtotals option

### Checkbox
- **Pattern**: RE-UI Checkbox
- **Reference**: `_reference/.reui-reference/registry/default/ui/checkbox.tsx`
- **Features**:
  - Day of week selection (Mon-Sun)
  - Recipient selection from team members
  - Report format options (PDF/CSV/Both)

### RadioGroup
- **Pattern**: RE-UI RadioGroup
- **Reference**: `_reference/.reui-reference/registry/default/ui/radio-group.tsx`
- **Features**:
  - Frequency selection (Daily/Weekly/Monthly)
  - Format selection (PDF/CSV/Both)
  - Monthly schedule pattern (day of month vs day of week)

### DataTable
- **Pattern**: RE-UI DataTable
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Schedule list with columns (Report, Frequency, Recipients, Next Run, Status)
  - History table with delivery status and recipients
  - Sortable and filterable schedule list

### Card
- **Pattern**: RE-UI Card
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`
- **Features**:
  - Schedule cards in hub view showing summary
  - Compact schedule display with next run info
  - Schedule preview section in dialog

---

## Desktop Wireframe (1280px+)

### Schedule Button on Report Pages

```
+================================================================================+
| Renoz CRM                                                    [bell] [Joel v]   |
+-------------+------------------------------------------------------------------+
|             |                                                                  |
| Reports <   |  Reports > Battery Systems Sales Report                                          |
|             |  ================================================================|
|             |                                                                  |
|             |  +-- HEADER ACTIONS ------------------------------------------------+
|             |  |                                                                |
|             |  |  [star] Favorite   [calendar] Schedule   [Export v]  [Print]   |
|             |  |                    ^^^^^^^^^^^^^^^                             |
|             |  |                    Click to open schedule dialog               |
|             |  |                                                                |
|             |  +----------------------------------------------------------------+
|             |                                                                  |
|             |  ... report content ...                                          |
|             |                                                                  |
+-------------+------------------------------------------------------------------+
```

### Schedule Dialog - Create New Schedule

```
+================================================================================+
|                                                                                 |
|  +== SCHEDULE REPORT ===========================================+               |
|  |                                                         [X]  |               |
|  +==============================================================+               |
|  |                                                              |               |
|  |  Schedule automated delivery of this report.                 |               |
|  |                                                              |               |
|  |  +-- REPORT INFO -------------------------------------------+|               |
|  |  |                                                          ||               |
|  |  |  Report: Battery Systems Sales Report                                    ||               |
|  |  |  Current filters: This Month, All Products               ||               |
|  |  |                                                          ||               |
|  |  |  [x] Include current filters in scheduled report         ||               |
|  |  |                                                          ||               |
|  |  +----------------------------------------------------------+|               |
|  |                                                              |               |
|  |  +-- SCHEDULE FREQUENCY ------------------------------------+|               |
|  |  |                                                          ||               |
|  |  |  Frequency:                                              ||               |
|  |  |  (o) Daily     ( ) Weekly     ( ) Monthly                ||               |
|  |  |                                                          ||               |
|  |  |  Time: [8:00 AM v]    Timezone: [Australia/Sydney v]     ||               |
|  |  |                                                          ||               |
|  |  |  --- DAILY OPTIONS ---                                   ||               |
|  |  |  Days:                                                   ||               |
|  |  |  [x] Mon [x] Tue [x] Wed [x] Thu [x] Fri [ ] Sat [ ] Sun ||               |
|  |  |                                                          ||               |
|  |  +----------------------------------------------------------+|               |
|  |                                                              |               |
|  |  +-- RECIPIENTS --------------------------------------------+|               |
|  |  |                                                          ||               |
|  |  |  Email to:                                               ||               |
|  |  |  +------------------------------------------------------+||               |
|  |  |  | [x] joel@example.com (me)                [x]         |||               |
|  |  |  | [ ] sarah@example.com                    [ ]         |||               |
|  |  |  | [ ] mike@example.com                     [ ]         |||               |
|  |  |  +------------------------------------------------------+||               |
|  |  |                                                          ||               |
|  |  |  Add external email:                                     ||               |
|  |  |  +----------------------------------+ [Add]              ||               |
|  |  |  | client@company.com               |                    ||               |
|  |  |  +----------------------------------+                    ||               |
|  |  |                                                          ||               |
|  |  +----------------------------------------------------------+|               |
|  |                                                              |               |
|  |  +-- FORMAT -----------------------------------------------+|               |
|  |  |                                                          ||               |
|  |  |  Report format:                                          ||               |
|  |  |  (o) PDF     ( ) CSV     ( ) Both                        ||               |
|  |  |                                                          ||               |
|  |  +----------------------------------------------------------+|               |
|  |                                                              |               |
|  |  +-- PREVIEW -----------------------------------------------+|               |
|  |  |                                                          ||               |
|  |  |  Summary:                                                ||               |
|  |  |  Battery Systems Sales Report will be sent every weekday at 8:00 AM      ||               |
|  |  |  to 1 recipient as PDF.                                  ||               |
|  |  |                                                          ||               |
|  |  |  Next delivery: Monday, January 13, 2026 at 8:00 AM      ||               |
|  |  |                                                          ||               |
|  |  +----------------------------------------------------------+|               |
|  |                                                              |               |
|  +==============================================================+               |
|  |                                                              |               |
|  |            ( Cancel )   [Send Test]   [ Save Schedule ]      |               |
|  |                                                              |               |
|  +==============================================================+               |
|                                                                                 |
+================================================================================+
```

### Weekly Schedule Options

```
+-- SCHEDULE FREQUENCY ------------------------------------+
|                                                          |
|  Frequency:                                              |
|  ( ) Daily     (o) Weekly     ( ) Monthly                |
|                                                          |
|  Time: [8:00 AM v]    Timezone: [Australia/Sydney v]     |
|                                                          |
|  --- WEEKLY OPTIONS ---                                  |
|  Send on:                                                |
|  +-----------------------------------------------------+ |
|  | [ ] Mon  [ ] Tue  [ ] Wed  [ ] Thu  [x] Fri         | |
|  | [ ] Sat  [ ] Sun                                    | |
|  +-----------------------------------------------------+ |
|                                                          |
|  Or select: [Every Friday v]                             |
|                                                          |
+----------------------------------------------------------+
```

### Monthly Schedule Options

```
+-- SCHEDULE FREQUENCY ------------------------------------+
|                                                          |
|  Frequency:                                              |
|  ( ) Daily     ( ) Weekly     (o) Monthly                |
|                                                          |
|  Time: [8:00 AM v]    Timezone: [Australia/Sydney v]     |
|                                                          |
|  --- MONTHLY OPTIONS ---                                 |
|  Send on:                                                |
|  (o) Day of month:  [1st v]                              |
|  ( ) Day of week:   [First Monday v]                     |
|  ( ) Last day of month                                   |
|                                                          |
+----------------------------------------------------------+
```

---

## Schedule List View (Reports Hub)

### Reports Hub with Schedules Section

```
+================================================================================+
| Renoz CRM                                                    [bell] [Joel v]   |
+-------------+------------------------------------------------------------------+
|             |                                                                  |
| Dashboard   |  Reports Hub                                                     |
| Customers   |  ================================================================|
| Orders      |                                                                  |
| Products    |  +-- SCHEDULED REPORTS (3 active) --------------------------------+
| Jobs        |  |                                                               |
| Reports <   |  |  +-----------------------------------------------------------+|
|             |  |  | [calendar] Battery Systems Sales Report                    [On]  [...]    ||
|             |  |  | Daily at 8:00 AM (weekdays) to 2 recipients               ||
|             |  |  | Next: Mon, Jan 13 at 8:00 AM                              ||
|             |  |  +-----------------------------------------------------------+|
|             |  |  | [calendar] Installation Pipeline Report                  [On]  [...]    ||
|             |  |  | Weekly on Fridays at 5:00 PM to 3 recipients              ||
|             |  |  | Next: Fri, Jan 17 at 5:00 PM                              ||
|             |  |  +-----------------------------------------------------------+|
|             |  |  | [calendar] Warranty Analytics                [Off] [...]    ||
|             |  |  | Monthly on 1st at 9:00 AM to 1 recipient                  ||
|             |  |  | Paused - [Resume]                                         ||
|             |  |  +-----------------------------------------------------------+|
|             |  |                                                               |
|             |  |  [+ Schedule New Report]                    [Manage All]      |
|             |  |                                                               |
|             |  +---------------------------------------------------------------+
|             |                                                                  |
|             |  +-- FAVORITES ------------------------------------------------+
|             |  |  ...                                                        |
|             |  +-------------------------------------------------------------+
|             |                                                                  |
|             |  +-- SALES & REVENUE -----------------------------------------+
|             |  |  [Battery Systems Sales Report]  [Installation Pipeline Report]  [Warranty Analytics]     |
|             |  +-------------------------------------------------------------+
|             |                                                                  |
|             |  +-- INVENTORY & PRODUCTS ------------------------------------+
|             |  |  [Battery Inventory Report]  [Low Stock Alerts]                     |
|             |  +-------------------------------------------------------------+
|             |                                                                  |
+-------------+------------------------------------------------------------------+
```

### Schedule Management Page (Full List)

```
+================================================================================+
| Renoz CRM                                                    [bell] [Joel v]   |
+-------------+------------------------------------------------------------------+
|             |                                                                  |
| Reports <   |  Reports > Scheduled Reports                                     |
|             |  ================================================================|
|             |                                                                  |
|             |  Manage all your scheduled report deliveries.                    |
|             |                                                                  |
|             |  +-- FILTERS --------------------------------------------------+
|             |  |                                                             |
|             |  |  Status: [All v]    Report: [All v]    [Search schedules...]|
|             |  |                                                             |
|             |  +-------------------------------------------------------------+
|             |                                                                  |
|             |  +-- SCHEDULE TABLE -------------------------------------------+
|             |  |                                                             |
|             |  |  +----------------------------------------------------------+|
|             |  |  | Report       | Frequency  | Recipients | Next Run | Status||
|             |  |  +----------------------------------------------------------+|
|             |  |  | Battery Systems Sales Report | Daily 8AM  | 2          | Jan 13   | [On] ||
|             |  |  |              | (weekdays) |            | 8:00 AM  |      ||
|             |  |  |              |            |            |          | [Edit]||
|             |  |  +----------------------------------------------------------+|
|             |  |  | Pipeline     | Weekly Fri | 3          | Jan 17   | [On] ||
|             |  |  | Report       | 5:00 PM    |            | 5:00 PM  |      ||
|             |  |  |              |            |            |          | [Edit]||
|             |  |  +----------------------------------------------------------+|
|             |  |  | Financial    | Monthly 1st| 1          | Feb 1    | [Off]||
|             |  |  | Summary      | 9:00 AM    |            | 9:00 AM  |      ||
|             |  |  |              |            |            |          | [Edit]||
|             |  |  +----------------------------------------------------------+|
|             |  |  | Inventory    | Daily 6AM  | 1          | Jan 13   | [On] ||
|             |  |  | Report       | (daily)    |            | 6:00 AM  |      ||
|             |  |  |              |            |            |          | [Edit]||
|             |  |  +----------------------------------------------------------+|
|             |  |                                                             |
|             |  |  Showing 4 of 4 schedules                                   |
|             |  |                                                             |
|             |  +-------------------------------------------------------------+
|             |                                                                  |
+-------------+------------------------------------------------------------------+
```

### Schedule Edit/Delete Dropdown

```
+-- ACTIONS DROPDOWN -----------------------------------+
|                                                       |
|  [Edit Schedule]                                      |
|  [Send Now]                                           |
|  [View History]                                       |
|  --------------------------------------------------- |
|  [Pause Schedule]  (or [Resume Schedule] if paused)   |
|  --------------------------------------------------- |
|  [Delete Schedule]                                    |
|                                                       |
+-------------------------------------------------------+
```

### Schedule History View

```
+== SCHEDULE HISTORY ========================================+
|                                                      [X]   |
+============================================================+
|                                                            |
|  Battery Systems Sales Report - Delivery History                           |
|                                                            |
|  +--------------------------------------------------------+|
|  | Date & Time          | Status    | Recipients | Actions||
|  +--------------------------------------------------------+|
|  | Jan 10, 2026 8:00 AM | Delivered | 2/2        | [View] ||
|  +--------------------------------------------------------+|
|  | Jan 9, 2026 8:00 AM  | Delivered | 2/2        | [View] ||
|  +--------------------------------------------------------+|
|  | Jan 8, 2026 8:00 AM  | Delivered | 2/2        | [View] ||
|  +--------------------------------------------------------+|
|  | Jan 7, 2026 8:00 AM  | Failed    | 0/2        | [Retry]||
|  |                      | Network error          |        ||
|  +--------------------------------------------------------+|
|  | Jan 6, 2026 8:00 AM  | Delivered | 2/2        | [View] ||
|  +--------------------------------------------------------+|
|                                                            |
|  Showing last 30 days                                      |
|                                                            |
+============================================================+
```

---

## Tablet Wireframe (768px)

### Schedule Dialog (Tablet)

```
+================================================================+
| Schedule Report                                           [X]   |
+================================================================+
|                                                                 |
|  Report: Battery Systems Sales Report                                           |
|  Filters: This Month, All Products                              |
|                                                                 |
|  [x] Include current filters                                    |
|                                                                 |
+----------------------------------------------------------------+
|                                                                 |
|  Frequency:                                                     |
|  +---------------------------+                                  |
|  | [Daily v]                 |                                  |
|  +---------------------------+                                  |
|                                                                 |
|  Time:            Timezone:                                     |
|  [8:00 AM v]      [Australia/Sydney v]                          |
|                                                                 |
|  Days: [x]M [x]T [x]W [x]T [x]F [ ]S [ ]S                       |
|                                                                 |
+----------------------------------------------------------------+
|                                                                 |
|  Recipients:                                                    |
|  +----------------------------------------------------------+  |
|  | [x] joel@example.com                                     |  |
|  | [ ] sarah@example.com                                    |  |
|  | [ ] mike@example.com                                     |  |
|  +----------------------------------------------------------+  |
|                                                                 |
|  Add: [email________________] [+]                               |
|                                                                 |
+----------------------------------------------------------------+
|                                                                 |
|  Format: (o) PDF  ( ) CSV  ( ) Both                             |
|                                                                 |
+----------------------------------------------------------------+
|                                                                 |
|  Summary: Daily at 8 AM (weekdays) to 1 recipient               |
|  Next: Mon, Jan 13 at 8:00 AM                                   |
|                                                                 |
+----------------------------------------------------------------+
|                                                                 |
|  ( Cancel )      [Send Test]      [ Save Schedule ]             |
|                                                                 |
+================================================================+
```

### Schedules List (Tablet)

```
+================================================================+
| < Reports                                                        |
+----------------------------------------------------------------+
| Scheduled Reports                                                |
| ================================================================|
+----------------------------------------------------------------+
|                                                                  |
|  Status: [All v]    [Search...]                                  |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | Battery Systems Sales Report                                        [On]   | |
|  | Daily at 8:00 AM (weekdays)                               | |
|  | 2 recipients | Next: Jan 13, 8:00 AM                      | |
|  | [Edit] [Send Now] [...]                                   | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | Installation Pipeline Report                                     [On]   | |
|  | Weekly on Fridays at 5:00 PM                              | |
|  | 3 recipients | Next: Jan 17, 5:00 PM                      | |
|  | [Edit] [Send Now] [...]                                   | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | Warranty Analytics                                   [Off]  | |
|  | Monthly on 1st at 9:00 AM                                 | |
|  | 1 recipient | Paused                                      | |
|  | [Edit] [Resume] [...]                                     | |
|  +------------------------------------------------------------+ |
|                                                                  |
+================================================================+
```

---

## Mobile Wireframe (375px)

### Schedule Button (Mobile Report Page)

```
+========================================+
| < Battery Systems Sales Report                         |
+----------------------------------------+
|                                        |
|  [star]  [clock]  [share]  [...]       |
|          ^^^^^^^                       |
|          Schedule button               |
|                                        |
+----------------------------------------+
```

### Schedule Dialog (Mobile - Bottom Sheet)

```
+========================================+
|                                        |
|    --- drag handle ---                 |
|                                        |
+----------------------------------------+
| Schedule Report                   [X]  |
+----------------------------------------+
|                                        |
|  Battery Systems Sales Report                          |
|  [x] Include current filters           |
|                                        |
+----------------------------------------+
|                                        |
|  FREQUENCY                             |
|  +----------------------------------+  |
|  | [Daily v]                        |  |
|  +----------------------------------+  |
|                                        |
|  TIME                                  |
|  +----------------------------------+  |
|  | [8:00 AM v]                      |  |
|  +----------------------------------+  |
|                                        |
|  DAYS                                  |
|  [x]M [x]T [x]W [x]T [x]F [ ]S [ ]S   |
|                                        |
+----------------------------------------+
|                                        |
|  RECIPIENTS                            |
|  [x] joel@example.com (me)             |
|  [ ] sarah@example.com                 |
|  [ ] mike@example.com                  |
|                                        |
|  [+ Add email]                         |
|                                        |
+----------------------------------------+
|                                        |
|  FORMAT                                |
|  (o) PDF  ( ) CSV  ( ) Both            |
|                                        |
+----------------------------------------+
|                                        |
|  Next: Mon, Jan 13 at 8:00 AM          |
|                                        |
|  [Send Test]  [ Save Schedule ]        |
|                                        |
+========================================+
```

### Schedules List (Mobile)

```
+========================================+
| < Reports                              |
+----------------------------------------+
| Scheduled Reports                      |
| ====================================== |
+----------------------------------------+
|                                        |
|  [All v]   [Search...]                 |
|                                        |
|  +----------------------------------+  |
|  | Battery Systems Sales Report              [On]   |  |
|  | Daily 8AM (weekdays)             |  |
|  | 2 recipients                     |  |
|  | Next: Jan 13, 8:00 AM            |  |
|  | [Edit]  [...]                    |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Installation Pipeline Report           [On]   |  |
|  | Weekly Fri 5PM                   |  |
|  | 3 recipients                     |  |
|  | Next: Jan 17, 5:00 PM            |  |
|  | [Edit]  [...]                    |  |
|  +----------------------------------+  |
|                                        |
|  +----------------------------------+  |
|  | Warranty Analytics         [Off]  |  |
|  | Monthly 1st 9AM                  |  |
|  | 1 recipient | Paused             |  |
|  | [Resume]  [...]                  |  |
|  +----------------------------------+  |
|                                        |
+========================================+
```

---

## Loading States

### Schedule Dialog Loading

```
+== SCHEDULE REPORT ========================================+
|                                                     [X]   |
+===========================================================+
|                                                           |
|  Loading schedule configuration...                        |
|                                                           |
|  [shimmer================================]                |
|  [shimmer====================]                            |
|                                                           |
|  [shimmer================================]                |
|  [shimmer==========]  [shimmer==========]                 |
|                                                           |
+===========================================================+

aria-busy="true"
aria-label="Loading schedule options"
```

### Saving Schedule

```
+== SCHEDULE REPORT ========================================+
|                                                     [X]   |
+===========================================================+
|                                                           |
|  ... form content with reduced opacity ...                |
|                                                           |
+===========================================================+
|                                                           |
|            ( Cancel )   [Send Test]   [ Saving... ]       |
|                                       [spinner]           |
|                                                           |
+===========================================================+

- Form fields disabled during save
- Spinner in save button
```

### Sending Test Report

```
+== SCHEDULE REPORT ========================================+
|                                                     [X]   |
+===========================================================+
|                                                           |
|  +-------------------------------------------------------+|
|  |  [spinner] Sending test report to joel@example.com... ||
|  +-------------------------------------------------------+|
|                                                           |
|  ... form content ...                                     |
|                                                           |
+===========================================================+
```

---

## Empty States

### No Schedules Yet

```
+-- SCHEDULED REPORTS --------------------------------------+
|                                                           |
|       [calendar illustration]                             |
|                                                           |
|     No scheduled reports yet                              |
|                                                           |
|  Automate your reporting by scheduling                    |
|  reports to be delivered to your inbox.                   |
|                                                           |
|  [+ Schedule Your First Report]                           |
|                                                           |
+-----------------------------------------------------------+
```

### No Recipients Selected

```
+-- RECIPIENTS ---------------------------------------------+
|                                                           |
|  Email to:                                                |
|  +-------------------------------------------------------+|
|  |  [!] Select at least one recipient                    ||
|  |                                                       ||
|  |  [x] joel@example.com (me)                            ||
|  |  [ ] sarah@example.com                                ||
|  +-------------------------------------------------------+|
|                                                           |
+-----------------------------------------------------------+

Validation error when trying to save with no recipients
```

---

## Error States

### Failed to Save Schedule

```
+-- ERROR DIALOG -------------------------------------------+
|                                                           |
|  [!] Couldn't save schedule                      [X]      |
|                                                           |
|  The schedule could not be saved. Please check            |
|  your connection and try again.                           |
|                                                           |
|  Error: Network request failed                            |
|                                                           |
|  [Dismiss]    [Retry]                                     |
|                                                           |
+-----------------------------------------------------------+

role="alert"
```

### Failed to Send Test

```
+-- INLINE ERROR -------------------------------------------+
|                                                           |
|  +-------------------------------------------------------+|
|  |  [!] Test email failed                                ||
|  |                                                       ||
|  |  Could not send test to joel@example.com.             ||
|  |  Please verify the email address.                     ||
|  |                                                       ||
|  |  [Retry]                                              ||
|  +-------------------------------------------------------+|
|                                                           |
+-----------------------------------------------------------+
```

### Invalid Email Format

```
+-- RECIPIENTS ---------------------------------------------+
|                                                           |
|  Add external email:                                      |
|  +----------------------------------+ [Add]               |
|  | invalid-email                    |                     |
|  +----------------------------------+                     |
|  [!] Please enter a valid email address                   |
|                                                           |
+-----------------------------------------------------------+
```

### Schedule Delivery Failed (In History)

```
+-- HISTORY ROW --------------------------------------------+
|                                                           |
|  | Jan 7, 2026 8:00 AM  | Failed    | 0/2        | [Retry]|
|  |                      |                        |        |
|  |  +---------------------------------------------------+|
|  |  |  [!] Delivery failed                              ||
|  |  |                                                   ||
|  |  |  Recipients: joel@example.com, sarah@example.com  ||
|  |  |  Error: SMTP connection timeout                   ||
|  |  |                                                   ||
|  |  |  [Retry Delivery]  [View Details]                 ||
|  |  +---------------------------------------------------+|
|                                                           |
+-----------------------------------------------------------+
```

---

## Success States

### Schedule Created

```
+-- TOAST NOTIFICATION -------------------------------------+
|                                                           |
|  [check] Schedule created                                 |
|                                                           |
|  Battery Systems Sales Report scheduled daily at 8:00 AM (weekdays)       |
|  First delivery: Monday, January 13, 2026                 |
|                                                           |
|  [View Schedules]  [x]                                    |
|                                                           |
+-----------------------------------------------------------+

role="status"
aria-live="polite"
```

### Test Email Sent

```
+-- INLINE SUCCESS -----------------------------------------+
|                                                           |
|  +-------------------------------------------------------+|
|  |  [check] Test email sent!                             ||
|  |                                                       ||
|  |  Check joel@example.com for the test report.          ||
|  |  (May take a few minutes to arrive)                   ||
|  +-------------------------------------------------------+|
|                                                           |
+-----------------------------------------------------------+
```

### Schedule Updated

```
+-- TOAST NOTIFICATION -------------------------------------+
|                                                           |
|  [check] Schedule updated                                 |
|                                                           |
|  Changes saved. Next delivery: Jan 13 at 8:00 AM          |
|                                                           |
|  [x]                                                      |
|                                                           |
+-----------------------------------------------------------+
```

### Schedule Paused/Resumed

```
+-- TOAST NOTIFICATION -------------------------------------+
|                                                           |
|  [pause] Schedule paused                                  |
|                                                           |
|  Warranty Analytics schedule is now paused.                |
|  No reports will be sent until resumed.                   |
|                                                           |
|  [Undo]  [x]                                              |
|                                                           |
+-----------------------------------------------------------+
```

---

## Accessibility Specification

### ARIA Landmarks and Roles

```html
<!-- Schedule Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="schedule-dialog-title"
  aria-describedby="schedule-dialog-description"
>
  <h2 id="schedule-dialog-title">Schedule Report</h2>
  <p id="schedule-dialog-description">
    Configure automated delivery of Battery Systems Sales Report
  </p>

  <!-- Frequency Selection -->
  <fieldset>
    <legend>Frequency</legend>
    <div role="radiogroup" aria-label="Schedule frequency">
      <label>
        <input type="radio" name="frequency" value="daily" />
        Daily
      </label>
      ...
    </div>
  </fieldset>

  <!-- Day Selection -->
  <fieldset aria-label="Days to send report">
    <legend>Days</legend>
    <label><input type="checkbox" /> Monday</label>
    ...
  </fieldset>

  <!-- Recipients -->
  <fieldset>
    <legend>Recipients</legend>
    <div role="group" aria-label="Select email recipients">
      ...
    </div>
  </fieldset>
</dialog>

<!-- Schedule List -->
<section aria-label="Scheduled reports">
  <table role="table" aria-label="Report schedules">
    <thead>...</thead>
    <tbody>
      <tr aria-label="Battery Systems Sales Report, daily at 8 AM, 2 recipients, enabled">
        ...
      </tr>
    </tbody>
  </table>
</section>
```

### Keyboard Navigation

```
Schedule Dialog:
Tab Order:
1. Close button (X)
2. Include filters checkbox
3. Frequency radio group (Daily/Weekly/Monthly)
4. Time dropdown
5. Timezone dropdown
6. Day checkboxes (if daily/weekly)
7. Recipient checkboxes
8. Add email input
9. Add email button
10. Format radio group
11. Cancel button
12. Send Test button
13. Save Schedule button

Shortcuts:
- Escape: Close dialog
- Enter: Submit form (when focused on Save)

Schedule List:
- Tab: Navigate between schedule cards
- Enter: Open edit dialog
- Space: Toggle enabled/disabled
- Arrow keys: Navigate within table
```

### Screen Reader Announcements

```
On dialog open:
  "Schedule Report dialog. Configure automated delivery
   of Battery Systems Sales Report."

On frequency change:
  "Frequency changed to Weekly. Select days to send."

On recipient toggle:
  "sarah@example.com added to recipients. 2 recipients selected."

On test email sent:
  "Test email sent to joel@example.com. Check your inbox."

On schedule saved:
  "Schedule created. Battery Systems Sales Report will be sent daily at
   8:00 AM on weekdays to 2 recipients. First delivery
   Monday, January 13."

On schedule toggled:
  "Warranty Analytics schedule paused. No reports will be
   sent until resumed."
```

---

## Animation Choreography

### Dialog Open/Close

```
Open sequence (300ms total):

0ms   - Backdrop fade in
        opacity: 0 -> 0.5
        duration: 150ms

0ms   - Dialog scale up from center
        transform: scale(0.95) -> scale(1)
        opacity: 0 -> 1
        duration: 250ms
        easing: cubic-bezier(0.16, 1, 0.3, 1)

150ms - Content sections cascade in
        opacity: 0 -> 1
        stagger: 30ms each section
        duration: 150ms

Close sequence (200ms):

0ms   - Dialog scale down and fade
        transform: scale(1) -> scale(0.95)
        opacity: 1 -> 0
        duration: 150ms

100ms - Backdrop fade out
        opacity: 0.5 -> 0
        duration: 100ms
```

### Toggle Switch Animation

```
Enabled -> Disabled:
- Thumb slides left (150ms)
- Track color transitions (green -> gray, 200ms)
- Subtle scale pulse on complete (100ms)

Disabled -> Enabled:
- Thumb slides right (150ms)
- Track color transitions (gray -> green, 200ms)
- Subtle scale pulse on complete (100ms)

prefers-reduced-motion:
- Skip slide animation
- Instant state change
- Keep color transition at 100ms
```

### Test Email Feedback

```
Send button clicked:
0ms   - Button shows spinner
        width transitions to accommodate spinner
        duration: 150ms

Progress:
        Spinner rotates continuously
        duration: infinite

Complete (success):
0ms   - Spinner transitions to checkmark
        scale: 0 -> 1
        duration: 200ms

200ms - Success message slides in below button
        transform: translateY(-8px) -> translateY(0)
        opacity: 0 -> 1
        duration: 200ms

Complete (error):
0ms   - Spinner transitions to X icon
        duration: 200ms

200ms - Error message slides in
        Same animation as success
```

---

## Component Props Interfaces (TypeScript)

```typescript
// Schedule Dialog Component
interface ScheduleDialogProps {
  /** Report type being scheduled */
  reportType: ReportType;
  /** Report display name */
  reportName: string;
  /** Current report filters to optionally include */
  currentFilters?: ReportFilters;
  /** Existing schedule to edit (null for new) */
  existingSchedule?: ScheduledReport | null;
  /** Whether dialog is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Save handler */
  onSave: (schedule: ScheduleConfig) => Promise<void>;
  /** Test send handler */
  onSendTest: (config: ScheduleConfig) => Promise<void>;
}

// Schedule Configuration
interface ScheduleConfig {
  /** Report type identifier */
  reportType: ReportType;
  /** Schedule frequency */
  frequency: 'daily' | 'weekly' | 'monthly';
  /** Time of day (24h format) */
  time: string;
  /** IANA timezone */
  timezone: string;
  /** Days to send (for daily/weekly) */
  days?: DayOfWeek[];
  /** Day of month (for monthly) */
  dayOfMonth?: number;
  /** Week occurrence (for monthly - first, second, etc.) */
  weekOccurrence?: 'first' | 'second' | 'third' | 'fourth' | 'last';
  /** Email recipients */
  recipients: string[];
  /** Export format */
  format: 'pdf' | 'csv' | 'both';
  /** Include current filters */
  includeFilters: boolean;
  /** Saved filters (if includeFilters is true) */
  filters?: ReportFilters;
  /** Whether schedule is enabled */
  enabled: boolean;
}

type ReportType =
  | 'sales'
  | 'pipeline'
  | 'inventory'
  | 'financial'
  | 'customer'
  | 'warranty';

type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// Scheduled Report (from database)
interface ScheduledReport {
  id: string;
  organizationId: string;
  userId: string;
  reportType: ReportType;
  frequency: ScheduleConfig['frequency'];
  time: string;
  timezone: string;
  days?: DayOfWeek[];
  dayOfMonth?: number;
  weekOccurrence?: ScheduleConfig['weekOccurrence'];
  recipients: string[];
  format: ScheduleConfig['format'];
  filters?: ReportFilters;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Schedule List Component
interface ScheduleListProps {
  /** List of scheduled reports */
  schedules: ScheduledReport[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string;
  /** Toggle enabled/disabled handler */
  onToggle: (scheduleId: string, enabled: boolean) => Promise<void>;
  /** Edit handler */
  onEdit: (schedule: ScheduledReport) => void;
  /** Delete handler */
  onDelete: (scheduleId: string) => Promise<void>;
  /** Send now handler */
  onSendNow: (scheduleId: string) => Promise<void>;
  /** View history handler */
  onViewHistory: (scheduleId: string) => void;
}

// Schedule Card Component (for hub display)
interface ScheduleCardProps {
  /** Schedule data */
  schedule: ScheduledReport;
  /** Compact display mode */
  compact?: boolean;
  /** Toggle handler */
  onToggle: (enabled: boolean) => void;
  /** Actions menu items */
  actions: ScheduleAction[];
}

interface ScheduleAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

// Frequency Selector Component
interface FrequencySelectorProps {
  /** Selected frequency */
  value: ScheduleConfig['frequency'];
  /** Change handler */
  onChange: (frequency: ScheduleConfig['frequency']) => void;
  /** Time value */
  time: string;
  /** Time change handler */
  onTimeChange: (time: string) => void;
  /** Timezone value */
  timezone: string;
  /** Timezone change handler */
  onTimezoneChange: (timezone: string) => void;
  /** Selected days (for daily/weekly) */
  days?: DayOfWeek[];
  /** Days change handler */
  onDaysChange?: (days: DayOfWeek[]) => void;
  /** Day of month (for monthly) */
  dayOfMonth?: number;
  /** Day of month change handler */
  onDayOfMonthChange?: (day: number) => void;
}

// Recipients Selector Component
interface RecipientsSelectorProps {
  /** Organization team members */
  teamMembers: TeamMember[];
  /** Selected recipient emails */
  selectedRecipients: string[];
  /** Selection change handler */
  onChange: (recipients: string[]) => void;
  /** Current user email */
  currentUserEmail: string;
  /** Allow external emails */
  allowExternal?: boolean;
  /** Validation error */
  error?: string;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
}

// Schedule History Component
interface ScheduleHistoryProps {
  /** Schedule ID */
  scheduleId: string;
  /** History entries */
  history: ScheduleHistoryEntry[];
  /** Loading state */
  isLoading?: boolean;
  /** Retry failed delivery handler */
  onRetry: (entryId: string) => Promise<void>;
  /** Is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
}

interface ScheduleHistoryEntry {
  id: string;
  scheduleId: string;
  runAt: string;
  status: 'delivered' | 'failed' | 'pending';
  recipientsCount: number;
  successCount: number;
  errorMessage?: string;
}
```

---

## Component Mapping

| Wireframe Element | React Component | shadcn/ui Base |
|-------------------|-----------------|----------------|
| Schedule dialog | ScheduleDialog | Dialog |
| Frequency selector | FrequencySelector | RadioGroup, Select |
| Day checkboxes | DaySelector | Checkbox |
| Time picker | TimePicker | Select |
| Timezone selector | TimezoneSelect | Select |
| Recipients list | RecipientsSelector | Checkbox |
| Email input | EmailInput | Input, Button |
| Format selector | FormatSelector | RadioGroup |
| Schedule preview | SchedulePreview | - |
| Schedule list | ScheduleList | Table |
| Schedule card | ScheduleCard | Card |
| Toggle switch | ScheduleToggle | Switch |
| Actions dropdown | ScheduleActions | DropdownMenu |
| History dialog | ScheduleHistoryDialog | Dialog, Table |
| Empty state | ScheduleEmptyState | - |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dialog open | < 200ms | From click to visible |
| Team members load | < 300ms | Recipients list populated |
| Schedule save | < 1s | Confirmation shown |
| Test email send | < 3s | Queued confirmation |
| Schedule toggle | < 500ms | Status updated |
| History load | < 500ms | History entries displayed |

---

## Integration with Trigger.dev

```
Schedule Save Flow:
1. User saves schedule via UI
2. Server function creates/updates scheduled_reports record
3. Trigger.dev cron task reads schedule configurations
4. At scheduled time, emailReport task executes
5. Report generated and sent to recipients
6. Schedule history updated with result

Immediate Send Flow:
1. User clicks "Send Now"
2. Server function triggers emailReport task immediately
3. Report generated and sent
4. Toast notification confirms delivery
```

---

## Files to Create/Modify

```
src/routes/_authed/reports/schedules.tsx (create)
src/components/domain/reports/scheduling/
  - schedule-dialog.tsx (create)
  - frequency-selector.tsx (create)
  - day-selector.tsx (create)
  - recipients-selector.tsx (create)
  - schedule-preview.tsx (create)
  - schedule-list.tsx (create)
  - schedule-card.tsx (create)
  - schedule-history-dialog.tsx (create)
src/components/domain/reports/report-layout.tsx (modify - add schedule button)
src/routes/_authed/reports/index.tsx (modify - add schedules section)
src/server/functions/scheduled-reports.ts (from DOM-RPT-005b)
```

---

## Related Wireframes

- [Warranty Analytics Report](./DOM-RPT-004.wireframe.md)
- [Report Favorites](./DOM-RPT-006c.wireframe.md)
- [Dashboard Scheduled Reports](./dashboard-scheduled-reports.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** Claude Code
