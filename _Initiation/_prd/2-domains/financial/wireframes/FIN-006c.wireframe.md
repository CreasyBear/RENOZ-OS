# Financial Domain Wireframe: Payment Reminders UI (DOM-FIN-006c)

**Story ID:** DOM-FIN-006c
**Component Type:** DataTable with RichTextEditor
**Aesthetic:** Professional Financial - communication-focused
**Domain Color:** Green-500
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### Reminder Template Selector
- **Pattern**: RE-UI RadioGroup with Card Previews
- **Reference**: `_reference/.reui-reference/registry/default/ui/radio-group.tsx`, `card.tsx`
- **Features**:
  - Template cards with name and message preview
  - Auto-selection based on days overdue
  - Custom message option with textarea
  - Template trigger timing display (7d, 14d, 30d overdue)

### Email Body Editor
- **Pattern**: RE-UI Textarea with Variable Toolbar
- **Reference**: `_reference/.reui-reference/registry/default/ui/textarea.tsx`, `toolbar.tsx`
- **Features**:
  - Rich text input with merge field support
  - Variable insertion toolbar ({{customer_name}}, {{invoice_no}}, etc.)
  - Live preview panel showing merged content
  - Character count and formatting buttons

### Reminder History Timeline
- **Pattern**: RE-UI Timeline with Status Badges
- **Reference**: `_reference/.reui-reference/registry/default/ui/timeline.tsx`, `badge.tsx`
- **Features**:
  - Chronological list of sent reminders
  - Delivery status badges (delivered, opened, bounced, failed)
  - Template name and recipient display
  - View email action to show sent content

### Template Editor Form
- **Pattern**: RE-UI Form with Live Preview
- **Reference**: `_reference/.reui-reference/registry/default/ui/form.tsx`, `input.tsx`, `switch.tsx`
- **Features**:
  - Template name and status toggle (active/inactive)
  - Trigger configuration (days before/after due date)
  - Subject and body inputs with merge fields
  - Side-by-side preview with sample data

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `reminderTemplates`, `reminderHistory` | NOT CREATED |
| **Server Functions Required** | `sendReminder`, `getReminderHistory`, `createReminderTemplate` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-FIN-006a, DOM-FIN-006b | PENDING |

### Existing Schema Available
- `orders` with `invoiceStatus`, `xeroInvoiceId` in `renoz-v2/lib/schema/orders.ts`
- `customers` in `renoz-v2/lib/schema/customers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Financial Truth**: Xero is source of truth
- **Format**: Amounts as "$X,XXX.XX", dates as DD/MM/YYYY

---

## Design Principles for Reminder UI

- **Template Power:** Easy to create and manage reminder templates
- **Variable Support:** Clear indication of available merge fields
- **Preview:** Always see what customer will receive
- **History:** Track all reminders sent per invoice/customer
- **Opt-Out Respect:** Clear visibility of customer preferences

---

## Mobile Wireframe (375px)

### Invoice Detail - Reminder Section

```
+=========================================+
| < Invoices                              |
| INV-2026-0089                           |
+-----------------------------------------+
|                                         |
|  Status: [OVERDUE - 15 days]            |
|  Balance Due: $2,500.00                 |
|                                         |
+-----------------------------------------+
| [Details] [Payments] [Reminders] [...]  |
|                      ===========        |
+-----------------------------------------+
|                                         |
|  PAYMENT REMINDERS                      |
|                                         |
|  +-------------------------------------+|
|  |   [+] SEND REMINDER                 ||
|  +-------------------------------------+|
|                                         |
|  +-- REMINDER HISTORY ------------------+
|  |                                     ||
|  |  [!] No reminders sent yet          ||
|  |                                     ||
|  |  This invoice is overdue. Consider  ||
|  |  sending a payment reminder.        ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Invoice with Reminder History

```
+=========================================+
|                                         |
|  PAYMENT REMINDERS                      |
|                                         |
|  +-------------------------------------+|
|  |   [+] SEND REMINDER                 ||
|  +-------------------------------------+|
|                                         |
|  +-- REMINDER HISTORY ------------------+
|  |                                     ||
|  |  Jan 10, 2026                       ||
|  |  Template: 14 Day Overdue           ||
|  |  Sent to: john@acme.com             ||
|  |  Status: [* Delivered]              ||
|  |  [View Email]                       ||
|  |                                     ||
|  |  ---------------------------------  ||
|  |                                     ||
|  |  Jan 3, 2026                        ||
|  |  Template: 7 Day Overdue            ||
|  |  Sent to: john@acme.com             ||
|  |  Status: [* Opened]                 ||
|  |  [View Email]                       ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  Auto-reminders: [ON]                   |
|  Next scheduled: Jan 17, 2026           |
|                                         |
+-----------------------------------------+
```

### Send Reminder Dialog (Bottom Sheet)

```
+=========================================+
| ====================================    |
|                                         |
|  SEND PAYMENT REMINDER          [X]     |
|  INV-2026-0089                          |
|  -----------------------------------    |
|                                         |
|  Select Template *                      |
|  +-------------------------------------+|
|  | ( ) 7 Day Overdue                   ||
|  |     "Friendly reminder about your   ||
|  |     outstanding invoice..."         ||
|  |                                     ||
|  | (*) 14 Day Overdue                  ||
|  |     "Your invoice is now 14 days    ||
|  |     past due..."                    ||
|  |                                     ||
|  | ( ) 30 Day Final Notice             ||
|  |     "Final notice: Your account     ||
|  |     requires immediate attention"   ||
|  |                                     ||
|  | ( ) Custom Message                  ||
|  |     Write your own message          ||
|  +-------------------------------------+|
|                                         |
|  Send To *                              |
|  +-------------------------------------+|
|  | john@acme.com (primary)           v ||
|  +-------------------------------------+|
|  [ ] CC: accounts@acme.com              |
|                                         |
|  +-------------------------------------+|
|  |       [ PREVIEW & SEND ]            ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Reminder Preview

```
+=========================================+
| < Back                   Preview        |
+-----------------------------------------+
|                                         |
|  To: john@acme.com                      |
|  Subject: Payment Reminder - INV-0089   |
|                                         |
|  -----------------------------------    |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  Dear John,                         ||
|  |                                     ||
|  |  This is a friendly reminder that   ||
|  |  invoice INV-2026-0089 for          ||
|  |  $2,500.00 is now 14 days overdue.  ||
|  |                                     ||
|  |  Original due date: Dec 27, 2025    ||
|  |  Amount outstanding: $2,500.00      ||
|  |                                     ||
|  |  Please arrange payment at your     ||
|  |  earliest convenience.              ||
|  |                                     ||
|  |  If you have already sent payment,  ||
|  |  please disregard this message.     ||
|  |                                     ||
|  |  Best regards,                      ||
|  |  Renoz Solutions                    ||
|  |                                     ||
|  |  [Pay Now Button]                   ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |        [ SEND REMINDER ]            ||
|  +-------------------------------------+|
|                                         |
|  ( Edit Message )                       |
|                                         |
+=========================================+
```

### Reminder Templates List (Settings)

```
+=========================================+
| < Settings                              |
| Reminder Templates                      |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  |   [+] NEW TEMPLATE                  ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 7 Day Overdue                       ||
|  | -----------------------------------  ||
|  | Trigger: 7 days after due date      ||
|  | Status: [* Active]                  ||
|  |                                     ||
|  |                      [Edit] [...]   ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 14 Day Overdue                      ||
|  | -----------------------------------  ||
|  | Trigger: 14 days after due date     ||
|  | Status: [* Active]                  ||
|  |                                     ||
|  |                      [Edit] [...]   ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | 30 Day Final Notice                 ||
|  | -----------------------------------  ||
|  | Trigger: 30 days after due date     ||
|  | Status: [* Active]                  ||
|  |                                     ||
|  |                      [Edit] [...]   ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Before Due Reminder                 ||
|  | -----------------------------------  ||
|  | Trigger: 3 days before due date     ||
|  | Status: [- Inactive]                ||
|  |                                     ||
|  |                      [Edit] [...]   ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Edit Template (Full Screen)

```
+=========================================+
| < Cancel    Edit Template     [Save]    |
+-----------------------------------------+
|                                         |
|  Template Name *                        |
|  +-------------------------------------+|
|  | 14 Day Overdue                      ||
|  +-------------------------------------+|
|                                         |
|  Trigger *                              |
|  +-------------------------------------+|
|  | 14  | days | [after v] | due date   ||
|  +-------------------------------------+|
|                                         |
|  Status                                 |
|  [====*] Active                         |
|                                         |
|  -----------------------------------    |
|                                         |
|  Subject *                              |
|  +-------------------------------------+|
|  | Payment Reminder - {{invoice_no}}   ||
|  +-------------------------------------+|
|                                         |
|  Message Body *                         |
|  +-------------------------------------+|
|  | Dear {{customer_name}},             ||
|  |                                     ||
|  | This is a reminder that invoice     ||
|  | {{invoice_no}} for {{amount_due}}   ||
|  | is now {{days_overdue}} days        ||
|  | overdue.                            ||
|  |                                     ||
|  | Original due date: {{due_date}}     ||
|  |                                     ||
|  | Please arrange payment at your      ||
|  | earliest convenience.               ||
|  |                                     ||
|  | Best regards,                       ||
|  | {{company_name}}                    ||
|  +-------------------------------------+|
|                                         |
|  +-- AVAILABLE VARIABLES ---------------+
|  | {{customer_name}} {{invoice_no}}    ||
|  | {{amount_due}} {{due_date}}         ||
|  | {{days_overdue}} {{company_name}}   ||
|  | {{payment_link}}                    ||
|  +-------------------------------------+|
|  Tap to insert at cursor               |
|                                         |
+-----------------------------------------+
```

### Customer Opt-Out Toggle

```
+=========================================+
| < Customer                              |
| Acme Corporation                        |
+-----------------------------------------+
| [Overview] [Orders] [Invoices] [Prefs]  |
|                              ========   |
+-----------------------------------------+
|                                         |
|  COMMUNICATION PREFERENCES              |
|                                         |
|  +-------------------------------------+|
|  | Payment Reminders                   ||
|  |                                     ||
|  | [====*] Receive auto-reminders      ||
|  |                                     ||
|  | When enabled, automatic payment     ||
|  | reminders will be sent for overdue  ||
|  | invoices.                           ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Marketing Emails                    ||
|  |                                     ||
|  | [*====] Opted out                   ||
|  +-------------------------------------+|
|                                         |
|  Last updated: Jan 5, 2026 by Joel      |
|                                         |
+-----------------------------------------+
```

### Loading Skeleton

```
+=========================================+
|                                         |
|  PAYMENT REMINDERS                      |
|                                         |
|  +-------------------------------------+|
|  |   [...................]             ||
|  +-------------------------------------+|
|                                         |
|  +-- REMINDER HISTORY ------------------+
|  |                                     ||
|  |  ..................                 ||
|  |  ............................       ||
|  |  ...............                    ||
|  |  Status: [........]                 ||
|  |                                     ||
|  |  ---------------------------------  ||
|  |                                     ||
|  |  ..................                 ||
|  |  ............................       ||
|  |  ...............                    ||
|  |  Status: [........]                 ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Invoice Detail with Reminder Panel

```
+=============================================================================+
| < Invoices | INV-2026-0089 - Acme Corporation                               |
+-----------------------------------------------------------------------------+
| [Details] [Line Items] [Payments] [Reminders] [Xero]                        |
|                                   ===========                               |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-- REMINDER ACTIONS ------------------+  +-- REMINDER HISTORY -----------+|
|  |                                      |  |                               ||
|  |  Invoice Status:                     |  | Jan 10, 2026                  ||
|  |  [OVERDUE - 15 DAYS]                 |  | Template: 14 Day Overdue      ||
|  |                                      |  | To: john@acme.com             ||
|  |  Balance Due: $2,500.00              |  | Status: [* Delivered]         ||
|  |                                      |  | Opened: Yes (Jan 10, 3:45 PM) ||
|  |  [+ Send Reminder]                   |  | [View Email]                  ||
|  |                                      |  |                               ||
|  |  ----------------------------------  |  | -----------------------------  ||
|  |                                      |  |                               ||
|  |  Auto-Reminders: [ON]                |  | Jan 3, 2026                   ||
|  |  Next scheduled: Jan 17              |  | Template: 7 Day Overdue       ||
|  |  Template: 30 Day Final Notice       |  | To: john@acme.com             ||
|  |                                      |  | Status: [* Opened]            ||
|  |  [Pause Auto-Reminders]              |  | [View Email]                  ||
|  |                                      |  |                               ||
|  +--------------------------------------+  +-------------------------------+|
|                                                                             |
+=============================================================================+
```

### Send Reminder Modal

```
+===============================================================+
|                                                               |
|   +-------------------------------------------------------+   |
|   | Send Payment Reminder                            [X]  |   |
|   | INV-2026-0089 - $2,500.00                             |   |
|   +-------------------------------------------------------+   |
|   |                                                       |   |
|   |  +-- TEMPLATE ---------+  +-- PREVIEW --------------+|   |
|   |  |                     |  |                         ||   |
|   |  | Select Template:    |  | Subject:                ||   |
|   |  |                     |  | Payment Reminder -      ||   |
|   |  | ( ) 7 Day Overdue   |  | INV-2026-0089           ||   |
|   |  | (*) 14 Day Overdue  |  |                         ||   |
|   |  | ( ) 30 Day Final    |  | Dear John,              ||   |
|   |  | ( ) Custom Message  |  |                         ||   |
|   |  |                     |  | This is a reminder that ||   |
|   |  | ------------------- |  | invoice INV-2026-0089   ||   |
|   |  |                     |  | for $2,500.00 is now    ||   |
|   |  | Send To:            |  | 14 days overdue.        ||   |
|   |  | [john@acme.com  v]  |  |                         ||   |
|   |  |                     |  | Original due date:      ||   |
|   |  | [ ] CC accounts@... |  | Dec 27, 2025            ||   |
|   |  |                     |  |                         ||   |
|   |  +---------------------+  | [Edit]                  ||   |
|   |                           +-------------------------+|   |
|   |                                                       |   |
|   |  +---------------------------------------------------+|   |
|   |  |            ( Cancel )      [ Send Reminder ]      ||   |
|   |  +---------------------------------------------------+|   |
|   |                                                       |   |
|   +-------------------------------------------------------+   |
|                                                               |
+===============================================================+
```

### Template Editor (Two Column)

```
+=============================================================================+
| < Settings | Edit Template: 14 Day Overdue                  [Save Changes]   |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-- SETTINGS -------------------------+  +-- PREVIEW ---------------------+|
|  |                                     |  |                                ||
|  | Name:                               |  | Subject:                       ||
|  | [14 Day Overdue                  ]  |  | Payment Reminder - INV-0089    ||
|  |                                     |  |                                ||
|  | Trigger:                            |  | ----------------------------   ||
|  | [14] days [after v] due date        |  |                                ||
|  |                                     |  | Dear Acme Corporation,         ||
|  | Status: [====*] Active              |  |                                ||
|  |                                     |  | This is a reminder that        ||
|  | ---------------------------------   |  | invoice INV-2026-0089 for      ||
|  |                                     |  | $2,500.00 is now 14 days       ||
|  | Subject:                            |  | overdue.                       ||
|  | [Payment Reminder - {{invoice_no}}] |  |                                ||
|  |                                     |  | Original due date: Dec 27      ||
|  | Body:                               |  |                                ||
|  | +-------------------------------+   |  | Please arrange payment at      ||
|  | | Dear {{customer_name}},       |   |  | your earliest convenience.     ||
|  | |                               |   |  |                                ||
|  | | This is a reminder that       |   |  | Best regards,                  ||
|  | | invoice {{invoice_no}} for    |   |  | Renoz Solutions                ||
|  | | {{amount_due}} is now         |   |  |                                ||
|  | | {{days_overdue}} days overdue.|   |  | [PAY NOW]                      ||
|  | |                               |   |  |                                ||
|  | +-------------------------------+   |  +--------------------------------+|
|  |                                     |                                    |
|  | VARIABLES:                          |  Sample data used for preview      |
|  | [customer_name] [invoice_no]        |                                    |
|  | [amount_due] [due_date] [+more]     |                                    |
|  +-------------------------------------+                                    |
|                                                                             |
+=============================================================================+
```

---

## Desktop Wireframe (1280px+)

### Reminder Templates Management

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Settings > Payment Reminder Templates                                                 |
| Customers   |  --------------------------------------------------------------------------------------|
| Orders      |                                                                                        |
| Products    |  Manage automated reminder templates and schedules                                     |
| Jobs        |                                                                                        |
| Pipeline    |  [+ Create Template]                                                                   |
| Financial   |  --------------------------------------------------------------------------------------|
| Settings <  |                                                                                        |
|  > General  |  +-- TEMPLATE LIST ---------------------------------------------------------------+    |
|  > Users    |  |                                                                                |    |
|  > Reminders|  | Name               | Trigger           | Status   | Sent (30d) | Actions       |    |
|  > Xero     |  +--------------------+-------------------+----------+------------+---------------+    |
|  > Email    |  | Before Due         | 3 days before     | Inactive | 0          | [Edit] [...]  |    |
|             |  | 7 Day Overdue      | 7 days after      | Active   | 45         | [Edit] [...]  |    |
|             |  | 14 Day Overdue     | 14 days after     | Active   | 28         | [Edit] [...]  |    |
|             |  | 30 Day Final       | 30 days after     | Active   | 12         | [Edit] [...]  |    |
|             |  | 60 Day Collections | 60 days after     | Active   | 5          | [Edit] [...]  |    |
|             |  +--------------------------------------------------------------------------------+    |
|             |                                                                                        |
|             |  +-- GLOBAL SETTINGS --------------------------------------------------------------+   |
|             |  |                                                                                 |   |
|             |  |  Auto-Reminders                                                                 |   |
|             |  |  [x] Enable automatic payment reminders for overdue invoices                    |   |
|             |  |                                                                                 |   |
|             |  |  Exclusions                                                                     |   |
|             |  |  [x] Don't send reminders on weekends                                           |   |
|             |  |  [x] Respect customer opt-out preferences                                       |   |
|             |  |  [x] Skip invoices with active payment plans                                    |   |
|             |  |                                                                                 |   |
|             |  |  Maximum Reminders per Invoice                                                  |   |
|             |  |  [5 v] reminders before stopping                                                |   |
|             |  |                                                                                 |   |
|             |  +--------------------------------------------------------------------------------+   |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Template Editor Full Page

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Settings    |  < Back to Templates                                                                   |
|   Reminders |                                                                                        |
|             |  Edit Template: 14 Day Overdue                            [Delete]  [Save Changes]     |
|             |  --------------------------------------------------------------------------------------|
|             |                                                                                        |
|             |  +-- TEMPLATE SETTINGS -----------------------------------+                            |
|             |  |                                                        |                            |
|             |  |  Template Name *                                       |                            |
|             |  |  [14 Day Overdue                                    ]  |                            |
|             |  |                                                        |                            |
|             |  |  Trigger Timing *                                      |                            |
|             |  |  Send this reminder [ 14 ] days [ after v ] the invoice due date                   |
|             |  |                                                        |                            |
|             |  |  Status:  [====*] Active                               |                            |
|             |  |                                                        |                            |
|             |  +--------------------------------------------------------+                            |
|             |                                                                                        |
|             |  +-- EMAIL CONTENT -----------------------+  +-- LIVE PREVIEW -------------------+    |
|             |  |                                        |  |                                   |    |
|             |  | Subject *                              |  | To: john@acme.com                 |    |
|             |  | [Payment Reminder - {{invoice_no}}  ]  |  | Subject: Payment Reminder -       |    |
|             |  |                                        |  | INV-2026-0089                     |    |
|             |  | Message Body *                         |  |                                   |    |
|             |  | +------------------------------------+ |  | --------------------------------- |    |
|             |  | | [B] [I] [U] | [Link] | [Variable v]| |  |                                   |    |
|             |  | +------------------------------------+ |  | Dear Acme Corporation,            |    |
|             |  | |                                    | |  |                                   |    |
|             |  | | Dear {{customer_name}},            | |  | This is a reminder that invoice   |    |
|             |  | |                                    | |  | INV-2026-0089 for $2,500.00 is    |    |
|             |  | | This is a reminder that invoice   | |  | now 14 days overdue.              |    |
|             |  | | {{invoice_no}} for {{amount_due}} | |  |                                   |    |
|             |  | | is now {{days_overdue}} days      | |  | Original due date: Dec 27, 2025   |    |
|             |  | | overdue.                          | |  | Amount outstanding: $2,500.00     |    |
|             |  | |                                    | |  |                                   |    |
|             |  | | Original due date: {{due_date}}   | |  | Please arrange payment at your    |    |
|             |  | | Amount outstanding: {{amount_due}}| |  | earliest convenience.             |    |
|             |  | |                                    | |  |                                   |    |
|             |  | | Please arrange payment at your    | |  | If you have already sent payment, |    |
|             |  | | earliest convenience.             | |  | please disregard this message.    |    |
|             |  | |                                    | |  |                                   |    |
|             |  | | If you have already sent payment, | |  | Best regards,                     |    |
|             |  | | please disregard this message.   | |  | Renoz Solutions                   |    |
|             |  | |                                    | |  |                                   |    |
|             |  | | Best regards,                     | |  | [PAY NOW]                         |    |
|             |  | | {{company_name}}                  | |  |                                   |    |
|             |  | |                                    | |  +-----------------------------------+    |
|             |  | +------------------------------------+ |                                          |
|             |  |                                        |  Sample: Acme Corp, INV-0089, $2,500    |
|             |  | AVAILABLE VARIABLES:                   |  [Change Sample Data]                   |
|             |  | +------------------------------------+ |                                          |
|             |  | |{{customer_name}} {{invoice_no}}   | |                                          |
|             |  | |{{amount_due}} {{due_date}}        | |                                          |
|             |  | |{{days_overdue}} {{company_name}}  | |                                          |
|             |  | |{{payment_link}} {{customer_email}}| |                                          |
|             |  | +------------------------------------+ |                                          |
|             |  | Click to insert at cursor             |                                          |
|             |  +----------------------------------------+                                          |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Reminder Activity Dashboard

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Financial   |  Payment Reminder Activity                                                             |
|   Reminders |  --------------------------------------------------------------------------------------|
|             |                                                                                        |
|             |  +-- STATS (Last 30 Days) ---+  +-- SCHEDULED TODAY -----+  +-- DELIVERY STATUS --+   |
|             |  | Sent: 85                  |  | Pending: 12            |  | Delivered: 78       |   |
|             |  | Opened: 62 (73%)          |  | [Process Now]          |  | Bounced: 4          |   |
|             |  | Payments After: 28        |  +------------------------+  | Opted Out: 3        |   |
|             |  +---------------------------+                              +---------------------+   |
|             |                                                                                        |
|             |  +-- RECENT ACTIVITY -----------------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | Time          | Invoice       | Customer        | Template    | Status   | Action ||
|             |  +---------------+--------------+-----------------+-------------+----------+---------+|
|             |  | 2 min ago     | INV-0095     | Acme Corp       | 14 Day      | Delivered| [View]  ||
|             |  | 15 min ago    | INV-0089     | Beta Industries | 7 Day       | Opened   | [View]  ||
|             |  | 1 hour ago    | INV-0078     | Gamma LLC       | 30 Day      | Delivered| [View]  ||
|             |  | 2 hours ago   | INV-0065     | Delta Inc       | 14 Day      | Bounced  | [Fix]   ||
|             |  | Yesterday     | INV-0052     | Epsilon Co      | 7 Day       | Opened   | [View]  ||
|             |  +-----------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- UPCOMING REMINDERS --------------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  | Scheduled     | Invoice       | Customer        | Template    | Actions           ||
|             |  +---------------+--------------+-----------------+-------------+-------------------+||
|             |  | Tomorrow      | INV-0098     | Zeta Corp       | 7 Day       | [Send Now] [Skip] |||
|             |  | Tomorrow      | INV-0097     | Theta Inc       | 14 Day      | [Send Now] [Skip] |||
|             |  | Jan 12        | INV-0095     | Acme Corp       | 30 Day      | [Send Now] [Skip] |||
|             |  +-----------------------------------------------------------------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
+-- SENDING REMINDER -------------------------+
|                                            |
|  [ [spin] Sending reminder... ]            |
|                                            |
|  Delivering to john@acme.com               |
|                                            |
+--------------------------------------------+

+-- LOADING TEMPLATES ------------------------+
|                                            |
|  +----------------------------------------+|
|  | [....................]  [......]       ||
|  | [............................]         ||
|  +----------------------------------------+|
|  +----------------------------------------+|
|  | [....................]  [......]       ||
|  | [............................]         ||
|  +----------------------------------------+|
|                                            |
|  Shimmer animation                         |
|                                            |
+--------------------------------------------+

+-- PREVIEW LOADING --------------------------+
|                                            |
|  +----------------------------------------+|
|  | Subject: ......................        ||
|  |                                        ||
|  | [..................................]   ||
|  | [..................................]   ||
|  | [..................................]   ||
|  | [...................]                  ||
|  +----------------------------------------+|
|                                            |
+--------------------------------------------+
```

### Empty States

```
+-- NO TEMPLATES (Settings) ------------------+
|                                            |
|         +-------------+                    |
|         |   [email]   |                    |
|         |  template   |                    |
|         +-------------+                    |
|                                            |
|     NO REMINDER TEMPLATES                  |
|                                            |
|  Create templates to automate payment      |
|  reminder emails for overdue invoices.     |
|                                            |
|     [+ Create First Template]              |
|                                            |
+--------------------------------------------+

+-- NO REMINDERS SENT (Invoice) --------------+
|                                            |
|  [!] No reminders sent yet                 |
|                                            |
|  This invoice is overdue. Send a           |
|  reminder to request payment.              |
|                                            |
|  [Send Reminder]                           |
|                                            |
+--------------------------------------------+

+-- CUSTOMER OPTED OUT -----------------------+
|                                            |
|  [!] Customer opted out                    |
|                                            |
|  Acme Corporation has opted out of         |
|  automatic payment reminders.              |
|                                            |
|  [Send Manual Reminder]  [View Prefs]      |
|                                            |
+--------------------------------------------+
```

### Error States

```
+-- SEND FAILED ------------------------------+
|                                            |
|  [!] Failed to send reminder               |
|                                            |
|  The email couldn't be delivered.          |
|  Error: Invalid email address              |
|                                            |
|  [Update Email]    [Retry]                 |
|                                            |
+--------------------------------------------+

+-- BOUNCED EMAIL ----------------------------+
|                                            |
|  [!] Email bounced                         |
|                                            |
|  The reminder to john@acme.com             |
|  was not delivered.                        |
|                                            |
|  Reason: Mailbox not found                 |
|                                            |
|  [Update Customer Email]                   |
|                                            |
+--------------------------------------------+

+-- TEMPLATE SAVE ERROR ----------------------+
|                                            |
|  [!] Failed to save template               |
|                                            |
|  Please check your template content        |
|  and try again.                            |
|                                            |
|  Validation errors:                        |
|  - Subject is required                     |
|  - Body must contain {{invoice_no}}        |
|                                            |
|  [Fix Errors]                              |
|                                            |
+--------------------------------------------+
```

### Success States

```
+-- REMINDER SENT ----------------------------+
|                                            |
|  [check] Reminder sent                     |
|                                            |
|  Payment reminder delivered to             |
|  john@acme.com                             |
|                                            |
|  <- Toast (3 seconds)                      |
+--------------------------------------------+

+-- TEMPLATE SAVED ---------------------------+
|                                            |
|  [check] Template saved                    |
|                                            |
|  "14 Day Overdue" updated successfully     |
|                                            |
|  <- Toast (3 seconds)                      |
+--------------------------------------------+

+-- EMAIL OPENED -----------------------------+
|                                            |
|  [eye] Email opened                        |
|                                            |
|  john@acme.com opened your reminder        |
|  for INV-2026-0089                         |
|                                            |
|  <- Notification                           |
+--------------------------------------------+
```

---

## Accessibility Requirements

### Focus Order

1. **Template List**
   - Tab: Create button -> Template rows -> Edit/Action buttons
   - Enter on row: Open template editor
   - Delete: Trigger delete confirmation

2. **Template Editor**
   - Tab: Name -> Trigger inputs -> Status toggle -> Subject -> Body -> Variables -> Save
   - Rich text shortcuts: Ctrl+B (bold), Ctrl+I (italic)
   - Variable insertion: Tab to variable, Enter to insert

3. **Send Reminder Dialog**
   - Tab: Template options -> Recipient -> CC checkbox -> Preview -> Send
   - Arrow keys: Navigate template options
   - Escape: Close dialog

### ARIA Requirements

```html
<!-- Template List -->
<section aria-label="Reminder templates">
  <table aria-label="Payment reminder templates">
    <thead>
      <tr>
        <th scope="col">Template Name</th>
        <th scope="col">Trigger</th>
        <th scope="col">Status</th>
        <th scope="col">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr aria-label="14 Day Overdue template, active, triggers 14 days after due date">
        <!-- Row content -->
      </tr>
    </tbody>
  </table>
</section>

<!-- Template Editor -->
<form aria-label="Edit reminder template">
  <label for="template-name">Template Name</label>
  <input id="template-name" type="text" aria-required="true" />

  <fieldset>
    <legend>Trigger Timing</legend>
    <label for="days">Days</label>
    <input id="days" type="number" aria-describedby="trigger-hint" />
    <span id="trigger-hint">Number of days before or after due date</span>
  </fieldset>

  <label for="subject">Email Subject</label>
  <input id="subject" type="text" aria-required="true" />

  <label for="body">Message Body</label>
  <div
    id="body"
    role="textbox"
    aria-multiline="true"
    aria-label="Email message body"
    contenteditable="true"
  >
    <!-- Rich text content -->
  </div>
</form>

<!-- Variable Toolbar -->
<div role="toolbar" aria-label="Insert variables">
  <button
    aria-label="Insert customer name variable"
    aria-describedby="var-desc-name"
  >
    {{customer_name}}
  </button>
  <span id="var-desc-name" hidden>
    Inserts the customer's company name
  </span>
</div>

<!-- Reminder History -->
<section aria-label="Reminder history for invoice INV-2026-0089">
  <ol role="list" aria-label="Sent reminders">
    <li aria-label="Reminder sent January 10, 14 Day Overdue template, delivered">
      <!-- Reminder entry -->
    </li>
  </ol>
</section>

<!-- Customer Opt-Out Toggle -->
<div role="switch" aria-checked="true" aria-label="Receive automatic payment reminders">
  [Toggle control]
</div>
```

### Screen Reader Announcements

- Reminder sent: "Payment reminder sent to john@acme.com"
- Email opened: "Reminder email opened by recipient"
- Template saved: "Template 14 Day Overdue saved successfully"
- Variable inserted: "Variable customer_name inserted"
- Status changed: "Template status changed to active"
- Opt-out toggled: "Automatic reminders disabled for this customer"

---

## Animation Choreography

### Template Selection

```
SELECT TEMPLATE:
- Duration: 200ms
- Border: gray -> green-500
- Background: transparent -> green-50
- Radio indicator: scale 0 -> 1
```

### Variable Insert

```
VARIABLE CLICK:
- Duration: 150ms
- Button: scale 1 -> 0.95 -> 1
- Variable text: fade in at cursor position
- Preview: update with smooth fade (200ms)
```

### Reminder History Entry

```
NEW ENTRY:
- Duration: 300ms
- Transform: translateY(-20px) -> translateY(0)
- Opacity: 0 -> 1
- Other entries: shift down (200ms)
```

### Status Toggle

```
TOGGLE SWITCH:
- Duration: 200ms
- Knob: translateX(0) -> translateX(100%) or reverse
- Track color: cross-fade
- Label: opacity change
```

### Email Sent Success

```
SEND BUTTON:
- Duration: 150ms
- Scale: 1 -> 0.98 -> 1

SUCCESS:
- Duration: 400ms
- Button text: "Send" -> "[check] Sent"
- Color: blue -> green
- Dialog: fade out after 500ms
```

### Preview Update

```
CONTENT CHANGE:
- Duration: 200ms
- Old content: opacity 1 -> 0
- New content: opacity 0 -> 1
- Cross-fade effect
```

---

## Component Props Interfaces

```typescript
// Reminder Types
interface ReminderTemplate {
  id: string;
  name: string;
  triggerDays: number;
  triggerDirection: 'before' | 'after';
  subject: string;
  body: string;
  isActive: boolean;
  sentCount?: number;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReminderHistory {
  id: string;
  invoiceId: string;
  templateId: string;
  templateName: string;
  recipientEmail: string;
  sentAt: Date;
  status: 'delivered' | 'opened' | 'bounced' | 'failed';
  openedAt?: Date;
}

interface ReminderVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

// Template List
interface ReminderTemplateListProps {
  templates: ReminderTemplate[];
  onEdit: (template: ReminderTemplate) => void;
  onDelete: (templateId: string) => void;
  onCreate: () => void;
}

// Template Editor
interface ReminderTemplateEditorProps {
  template?: ReminderTemplate; // undefined for create
  onSave: (template: Partial<ReminderTemplate>) => void;
  onCancel: () => void;
}

// Template Form
interface TemplateFormValues {
  name: string;
  triggerDays: number;
  triggerDirection: 'before' | 'after';
  subject: string;
  body: string;
  isActive: boolean;
}

// Send Reminder Dialog
interface SendReminderDialogProps {
  invoice: Invoice;
  templates: ReminderTemplate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (templateId: string, recipientEmail: string, cc?: string) => void;
}

// Reminder Preview
interface ReminderPreviewProps {
  template: ReminderTemplate;
  invoice: Invoice;
  customer: Customer;
}

// Reminder History
interface ReminderHistoryProps {
  invoiceId: string;
  history: ReminderHistory[];
  onViewEmail: (reminder: ReminderHistory) => void;
}

// Reminder History Entry
interface ReminderHistoryEntryProps {
  reminder: ReminderHistory;
  onView: () => void;
}

// Variable Toolbar
interface VariableToolbarProps {
  variables: ReminderVariable[];
  onInsert: (variable: ReminderVariable) => void;
}

// Customer Opt-Out
interface CustomerReminderPrefsProps {
  customerId: string;
  optedOut: boolean;
  onToggle: (optedOut: boolean) => void;
}

// Reminder Activity Dashboard
interface ReminderActivityDashboardProps {
  dateRange?: { start: Date; end: Date };
}

// Activity Stats
interface ReminderStats {
  sent: number;
  opened: number;
  openRate: number;
  paymentsAfter: number;
  bounced: number;
  optedOut: number;
}

// Upcoming Reminders
interface UpcomingReminder {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  templateName: string;
  scheduledDate: Date;
}

interface UpcomingRemindersProps {
  reminders: UpcomingReminder[];
  onSendNow: (invoiceId: string) => void;
  onSkip: (invoiceId: string) => void;
}

// Global Settings
interface ReminderGlobalSettings {
  autoRemindersEnabled: boolean;
  skipWeekends: boolean;
  respectOptOut: boolean;
  skipPaymentPlans: boolean;
  maxRemindersPerInvoice: number;
}

interface ReminderGlobalSettingsProps {
  settings: ReminderGlobalSettings;
  onSettingsChange: (settings: ReminderGlobalSettings) => void;
}
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Template list | ReminderTemplateList | Table |
| Template editor | ReminderTemplateEditor | Form |
| Rich text editor | ReminderBodyEditor | - (Tiptap/Slate) |
| Variable toolbar | VariableToolbar | Toolbar, Button |
| Send dialog | SendReminderDialog | Dialog |
| Preview panel | ReminderPreview | Card |
| History list | ReminderHistory | - |
| History entry | ReminderHistoryEntry | Card |
| Opt-out toggle | CustomerReminderPrefs | Switch |
| Activity dashboard | ReminderActivityDashboard | - |
| Stats cards | ReminderStatsCards | Card |
| Upcoming list | UpcomingReminders | Table |

---

## Files to Create/Modify

### Create
- `src/routes/_authed/settings/reminders/index.tsx`
- `src/routes/_authed/settings/reminders/$templateId.tsx`
- `src/routes/_authed/financial/reminders/activity.tsx`
- `src/components/domain/financial/reminders/reminder-template-list.tsx`
- `src/components/domain/financial/reminders/reminder-template-editor.tsx`
- `src/components/domain/financial/reminders/reminder-body-editor.tsx`
- `src/components/domain/financial/reminders/variable-toolbar.tsx`
- `src/components/domain/financial/reminders/send-reminder-dialog.tsx`
- `src/components/domain/financial/reminders/reminder-preview.tsx`
- `src/components/domain/financial/reminders/reminder-history.tsx`
- `src/components/domain/financial/reminders/customer-reminder-prefs.tsx`
- `src/components/domain/financial/reminders/reminder-activity-dashboard.tsx`
- `src/components/domain/financial/reminders/upcoming-reminders.tsx`

### Modify
- `src/routes/_authed/financial/invoices/$invoiceId.tsx` (add Reminders tab)
- `src/routes/_authed/customers/$customerId.tsx` (add reminder preferences)
