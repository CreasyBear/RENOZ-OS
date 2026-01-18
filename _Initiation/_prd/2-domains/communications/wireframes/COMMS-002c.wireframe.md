# Wireframe: DOM-COMMS-002c - Email Scheduling UI

## Story Reference

- **Story ID**: DOM-COMMS-002c
- **Name**: Add Email Scheduling UI
- **PRD**: memory-bank/prd/domains/communications.prd.json
- **Type**: UI Component
- **Component Type**: DateTimePicker with DataTable list

## Overview

UI for scheduling email sends with datetime picker, timezone selection, and scheduled emails management. Includes composer integration, scheduled emails list, and edit/cancel capabilities.

## UI Patterns (Reference Implementation)

### DateTimePicker
- **Pattern**: RE-UI Calendar + TimePicker
- **Reference**: `_reference/.reui-reference/registry/default/ui/calendar.tsx`, `_reference/.reui-reference/registry/default/ui/time-picker.tsx`
- **Features**:
  - Date selection with quick presets (Tomorrow, Next Week)
  - Time selection with suggested business hours
  - Timezone dropdown with UTC offset display
  - Mobile-optimized full-screen modals

### ScheduleSendToggle
- **Pattern**: RE-UI RadioGroup + Collapsible
- **Reference**: `_reference/.reui-reference/registry/default/ui/radio-group.tsx`, `_reference/.reui-reference/registry/default/ui/collapsible.tsx`
- **Features**:
  - "Send Now" vs "Schedule for Later" radio toggle
  - Expandable scheduling panel with smooth height animation
  - Quick options buttons for common scheduling times

### ScheduledEmailsTable
- **Pattern**: RE-UI DataTable + Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`, `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Sortable columns (Date, Recipient, Status)
  - Status badges for "Pending", "Sent", "Cancelled"
  - Inline edit/cancel actions per row
  - Mobile card layout for narrow screens

### EditScheduledEmailDialog
- **Pattern**: RE-UI Dialog + Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `_reference/.reui-reference/registry/default/ui/form.tsx`
- **Features**:
  - Split view: Email details on left, schedule controls on right
  - Quick reschedule buttons (+1 Hour, +1 Day, Tomorrow)
  - Live preview panel showing formatted datetime
  - Confirmation prompt before deletion

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `campaigns` (for scheduled campaign sends) | NOT CREATED |
| **Server Functions Required** | `scheduleEmail`, `getScheduledEmails`, `updateScheduledEmail`, `cancelScheduledEmail` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-COMMS-002a, DOM-COMMS-002b | PENDING |

### Existing Schema Available
- `emailHistory` in `renoz-v2/lib/schema/email-history.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- Schedule battery quote follow-ups during business hours (AEST/AEDT)
- Coordinate scheduled sends with installation team availability
- Time delivery confirmations with installer schedules

---

## Mobile Wireframe (375px)

### Email Composer with Schedule Option

```
+=========================================+
| Compose Email                     [X]   |
+-----------------------------------------+
|                                         |
|  To *                                   |
|  +-------------------------------------+|
|  | john@acme.com                       ||
|  +-------------------------------------+|
|                                         |
|  Subject *                              |
|  +-------------------------------------+|
|  | Your 10kWh Battery System Quote     ||
|  +-------------------------------------+|
|                                         |
|  Template                               |
|  +----------------------------------v--+|
|  | Quote Sent                          ||
|  +-------------------------------------+|
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  SEND OPTIONS                           |
|                                         |
|  (o) Send Now                           |
|  ( ) Schedule for Later                 |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |        [Send Email]                 ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Schedule for Later (Expanded)

```
+=========================================+
| Compose Email                     [X]   |
+-----------------------------------------+
|                                         |
|  To *                                   |
|  +-------------------------------------+|
|  | john@acme.com                       ||
|  +-------------------------------------+|
|                                         |
|  Subject *                              |
|  +-------------------------------------+|
|  | Your 10kWh Battery System Quote     ||
|  +-------------------------------------+|
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  SEND OPTIONS                           |
|                                         |
|  ( ) Send Now                           |
|  (o) Schedule for Later                 |
|                                         |
|      Date *                             |
|      +-------------------------------+ |
|      | [cal] Jan 15, 2026            | |
|      +-------------------------------+ |
|                                         |
|      Time *                             |
|      +-------------------------------+ |
|      | [clock] 9:00 AM               | |
|      +-------------------------------+ |
|                                         |
|      Timezone                           |
|      +----------------------------v--+ |
|      | America/New_York (EST)        | |
|      +-------------------------------+ |
|                                         |
|      Quick Options:                     |
|      [Tomorrow 9 AM]  [Monday 9 AM]     |
|      [In 2 hours]     [Custom...]       |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |     [Schedule Email]                ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Date Picker (Full Screen Modal)

```
+=========================================+
| Select Date                       [X]   |
+-----------------------------------------+
|                                         |
|         < January 2026 >                |
|                                         |
|  Su   Mo   Tu   We   Th   Fr   Sa       |
|  ─────────────────────────────────────  |
|                1    2    3    4         |
|                                         |
|   5    6    7    8    9   10   11       |
|                                         |
|  12   13   14  [15]  16   17   18       |
|                 ^                        |
|                 | Selected               |
|  19   20   21   22   23   24   25       |
|                                         |
|  26   27   28   29   30   31            |
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  Quick Select:                          |
|  [Today]  [Tomorrow]  [Next Week]       |
|                                         |
|  +-------------------------------------+|
|  |         [Confirm: Jan 15]           ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Time Picker (Full Screen Modal)

```
+=========================================+
| Select Time                       [X]   |
+-----------------------------------------+
|                                         |
|            +-----+   +-----+            |
|            |  9  |   | 00  |            |
|            +-----+   +-----+            |
|            |  v  |   |  v  |   [AM/PM]  |
|            +-----+   +-----+            |
|              Hr       Min               |
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  Suggested Times:                       |
|                                         |
|  +----------+  +----------+             |
|  |  8:00 AM |  |  9:00 AM |             |
|  +----------+  +----------+             |
|                                         |
|  +----------+  +----------+             |
|  | 10:00 AM |  | 12:00 PM |             |
|  +----------+  +----------+             |
|                                         |
|  +----------+  +----------+             |
|  |  2:00 PM |  |  5:00 PM |             |
|  +----------+  +----------+             |
|                                         |
|  +-------------------------------------+|
|  |        [Confirm: 9:00 AM]           ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Scheduled Emails List (Mobile)

```
+=========================================+
| Communications                          |
+-----------------------------------------+
| [Summary] [Emails] [Scheduled] [Camps]  |
|                     =========           |
+-----------------------------------------+
|                                         |
|  Scheduled Emails (3)         [+New]    |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | Battery Quote to john@solar.com.au  ||
|  | Subject: Your 10kWh Battery Quote   ||
|  |                                     ||
|  | [clock] Jan 15, 2026 at 9:00 AM     ||
|  |         America/New_York (EST)      ||
|  |                                     ||
|  |         [Edit]  [Cancel]            ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Installation to sarah@energy.com.au ||
|  | Subject: 15kWh System Install Sched ||
|  |                                     ||
|  | [clock] Jan 16, 2026 at 10:00 AM    ||
|  |         America/Los_Angeles (PST)   ||
|  |                                     ||
|  |         [Edit]  [Cancel]            ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Follow-up to mike@gamma.co          ||
|  | Subject: Following up on your order ||
|  |                                     ||
|  | [clock] Jan 20, 2026 at 2:00 PM     ||
|  |         America/New_York (EST)      ||
|  |                                     ||
|  |         [Edit]  [Cancel]            ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State (Mobile)

```
+=========================================+
| Communications                          |
+-----------------------------------------+
| [Summary] [Emails] [Scheduled] [Camps]  |
|                     =========           |
+-----------------------------------------+
|                                         |
|                                         |
|            +-------------+              |
|            |  [calendar] |              |
|            +-------------+              |
|                                         |
|       No Scheduled Emails               |
|                                         |
|   Schedule emails to be sent at         |
|   the perfect time for your             |
|   recipients.                           |
|                                         |
|   +-------------------------------+     |
|   |                               |     |
|   |      [Compose Email]          |     |
|   |                               |     |
|   +-------------------------------+     |
|                                         |
|                                         |
+=========================================+
```

### Loading Skeleton (Mobile)

```
+=========================================+
| Communications                          |
+-----------------------------------------+
| [Summary] [Emails] [Scheduled] [Camps]  |
|                     =========           |
+-----------------------------------------+
|                                         |
|  Scheduled Emails                       |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | .................................   ||
|  | .............................       ||
|  |                                     ||
|  | [...] ......................        ||
|  |       ................              ||
|  |                                     ||
|  |         [....]  [......]            ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | .................................   ||
|  | .............................       ||
|  |                                     ||
|  | [...] ......................        ||
|  |       ................              ||
|  |                                     ||
|  |         [....]  [......]            ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Email Composer with Schedule Panel

```
+=========================================================================+
| Compose Email                                                      [X]   |
+-------------------------------------------------------------------------+
|                                                                          |
|  +-- COMPOSE --------------------------+  +-- PREVIEW ----------------+ |
|  |                                     |  |                           | |
|  |  To *                               |  |  [Preview of email        | |
|  |  +-------------------------------+  |  |   will appear here        | |
|  |  | john@acme.com              [x]|  |  |   based on selected       | |
|  |  +-------------------------------+  |  |   template]               | |
|  |                                     |  |                           | |
|  |  Subject *                          |  |  +-----------------------+| |
|  |  +-------------------------------+  |  |  |                       || |
|  |  | Your Quote from Renoz         |  |  |  |  Renoz Logo           || |
|  |  +-------------------------------+  |  |  |                       || |
|  |                                     |  |  |  Hi John,             || |
|  |  Template                           |  |  |                       || |
|  |  +----------------------------v--+  |  |  |  Here's your quote... || |
|  |  | Quote Sent                    |  |  |  |                       || |
|  |  +-------------------------------+  |  |  |  [View Quote]         || |
|  |                                     |  |  |                       || |
|  +-------------------------------------+  |  +-----------------------+| |
|                                           +---------------------------+ |
|  +-- SEND OPTIONS ----------------------------------------------------+ |
|  |                                                                    | |
|  |  ( ) Send Now    (o) Schedule for Later                            | |
|  |                                                                    | |
|  |  Date                    Time                    Timezone          | |
|  |  +----------------+     +----------------+     +------------------+| |
|  |  | Jan 15, 2026   |     |    9:00 AM     |     | America/New_York || |
|  |  +----------------+     +----------------+     +------------------+| |
|  |                                                                    | |
|  |  Quick: [Tomorrow 9 AM]  [Monday 9 AM]  [In 2 hours]               | |
|  |                                                                    | |
|  +--------------------------------------------------------------------+ |
|                                                                          |
|                                 ( Cancel )     [ Schedule Email ]        |
|                                                                          |
+=========================================================================+
```

### Scheduled Emails Table

```
+=========================================================================+
| Communications                                                           |
+-------------------------------------------------------------------------+
| [Summary] [Emails] [Scheduled] [Templates] [Campaigns] [Calls]           |
|                     =========                                            |
+-------------------------------------------------------------------------+
|                                                                          |
|  Scheduled Emails                                  [+ Schedule New Email] |
|  ─────────────────────────────────────────────────────────────────────   |
|                                                                          |
|  +--------------------------------------------------------------------+ |
|  | To              | Subject                | Scheduled For  | Actions | |
|  +--------------------------------------------------------------------+ |
|  | john@acme.com   | Your Quote from Renoz  | Jan 15, 9:00   | [E][X]  | |
|  | Acme Corp       |                        | AM EST         |         | |
|  +--------------------------------------------------------------------+ |
|  | sarah@beta.io   | Order #O-5678 Confirm  | Jan 16, 10:00  | [E][X]  | |
|  | Beta Industries |                        | AM PST         |         | |
|  +--------------------------------------------------------------------+ |
|  | mike@gamma.co   | Following up on order  | Jan 20, 2:00   | [E][X]  | |
|  | Gamma LLC       |                        | PM EST         |         | |
|  +--------------------------------------------------------------------+ |
|                                                                          |
|  Showing 1-3 of 3 scheduled emails                                       |
|                                                                          |
+=========================================================================+
```

---

## Desktop Wireframe (1280px+)

### Communications Route - Scheduled Tab

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Communications                                        [+ Compose]  [Settings]         |
| Customers   |  ─────────────────────────────────────────────────────────────────────────────────     |
| Orders      |                                                                                        |
| Products    |  [Summary] [Emails] [Scheduled] [Templates] [Campaigns] [Calls]                        |
| Jobs        |                      =========                                                         |
| Pipeline    |                                                                                        |
| Support     |  +-- SCHEDULED EMAILS ----------------------------------------------------------------+ |
| Communi..   |  |                                                                                    | |
|   <         |  |  Scheduled: 3 emails pending                              [+ Schedule New Email]   | |
|             |  |                                                                                    | |
|             |  |  +--------------------------------------------------------------------------------+| |
|             |  |  |                                                                                || |
|             |  |  |  To              | Subject                    | Template   | Scheduled For    || |
|             |  |  |                  |                            |            |        | Actions || |
|             |  |  |------------------+----------------------------+------------+--------+---------|  |
|             |  |  | john@acme.com   | Your Quote from Renoz      | Quote Sent | Jan 15, 2026     || |
|             |  |  | Acme Corp       |                            |            | 9:00 AM EST      || |
|             |  |  |                 |                            |            |    [Edit][Cancel]|| |
|             |  |  |------------------+----------------------------+------------+------------------|| |
|             |  |  | sarah@beta.io   | Order #O-5678 Confirmed    | Order Conf | Jan 16, 2026     || |
|             |  |  | Beta Industries |                            |            | 10:00 AM PST     || |
|             |  |  |                 |                            |            |    [Edit][Cancel]|| |
|             |  |  |------------------+----------------------------+------------+------------------|| |
|             |  |  | mike@gamma.co   | Following up on your order | Custom     | Jan 20, 2026     || |
|             |  |  | Gamma LLC       |                            |            | 2:00 PM EST      || |
|             |  |  |                 |                            |            |    [Edit][Cancel]|| |
|             |  |  |------------------+----------------------------+------------+------------------|| |
|             |  |  |                                                                                || |
|             |  |  +--------------------------------------------------------------------------------+| |
|             |  |                                                                                    | |
|             |  +------------------------------------------------------------------------------------+ |
|             |                                                                                        |
|             |  +-- RECENTLY SENT (Scheduled) --------------------------------------------------------+|
|             |  |                                                                                     ||
|             |  |  These emails were sent on schedule:                                               ||
|             |  |                                                                                     ||
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |  | To              | Subject                | Sent At          | Status           ||
|             |  |  |-----------------+------------------------+------------------+------------------|  |
|             |  |  | alex@delta.com  | Your order shipped     | Jan 10, 9:00 AM  | * Delivered      ||
|             |  |  | pat@epsilon.io  | Payment reminder       | Jan 9, 10:00 AM  | * Opened         ||
|             |  |  +---------------------------------------------------------------------------------+|
|             |  |                                                                                     ||
|             |  +-------------------------------------------------------------------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Edit Scheduled Email Dialog

```
+============================================================================+
| Edit Scheduled Email                                                  [X]   |
+=============================================================================+
|                                                                             |
|  +-- EMAIL DETAILS -----------------------------------------------------+   |
|  |                                                                       |  |
|  |  To                                                                   |  |
|  |  +-----------------------------------------------+                    |  |
|  |  | john@acme.com (Acme Corporation)              |  [Change]          |  |
|  |  +-----------------------------------------------+                    |  |
|  |                                                                       |  |
|  |  Subject                                                              |  |
|  |  +-----------------------------------------------------------------+ |  |
|  |  | Your Quote from Renoz                                           | |  |
|  |  +-----------------------------------------------------------------+ |  |
|  |                                                                       |  |
|  |  Template: Quote Sent                                    [Change]     |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  +-- SCHEDULE ----------------------------------------------------------+   |
|  |                                                                       |  |
|  |  Currently scheduled for:  Jan 15, 2026 at 9:00 AM (America/New_York) |  |
|  |                                                                       |  |
|  |  New Date             New Time              Timezone                  |  |
|  |  +---------------+   +---------------+     +------------------------+ |  |
|  |  | Jan 15, 2026  |   |    9:00 AM    |     | America/New_York    v | |  |
|  |  +---------------+   +---------------+     +------------------------+ |  |
|  |                                                                       |  |
|  |  Quick reschedule:                                                    |  |
|  |  [+1 Hour] [+1 Day] [Tomorrow same time] [Next Monday 9 AM]          |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  +-- PREVIEW -----------------------------------------------------------+   |
|  |                                                                       |  |
|  |  +---------------------------------------------------------------+   |  |
|  |  |  [Renoz Logo]                                                 |   |  |
|  |  |                                                               |   |  |
|  |  |  Hi John,                                                     |   |  |
|  |  |                                                               |   |  |
|  |  |  Thank you for your interest in Renoz. Please find your       |   |  |
|  |  |  quote attached...                                            |   |  |
|  |  |                                                               |   |  |
|  |  |  [View Quote Button]                                          |   |  |
|  |  +---------------------------------------------------------------+   |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|                            ( Cancel )  [!Delete]     [ Save Changes ]       |
|                                                                             |
+=============================================================================+
```

### Cancel Confirmation Dialog

```
+--------------------------------------------------+
| Cancel Scheduled Email?                     [X]   |
+--------------------------------------------------+
|                                                   |
|  Are you sure you want to cancel this email?      |
|                                                   |
|  +---------------------------------------------+ |
|  | To: john@acme.com                           | |
|  | Subject: Your Quote from Renoz              | |
|  | Scheduled: Jan 15, 2026 at 9:00 AM EST      | |
|  +---------------------------------------------+ |
|                                                   |
|  This action cannot be undone.                    |
|                                                   |
|            ( Keep Scheduled )    [!Cancel Email]  |
|                                                   |
+--------------------------------------------------+
```

---

## Interaction States

### Loading States

```
DATETIME PICKER LOADING:
+-------------------------------+
|  Loading available times...   |
|                               |
|  +-------------------------+  |
|  |   [spinner]             |  |
|  |   Checking calendar...  |  |
|  +-------------------------+  |
+-------------------------------+

SCHEDULE IN PROGRESS:
+-------------------------------+
|  +-------------------------+  |
|  |   [spinner]             |  |
|  |   Scheduling email...   |  |
|  +-------------------------+  |
|                               |
|  [Button disabled]            |
+-------------------------------+

SCHEDULED EMAILS LIST LOADING:
+----------------------------------------------------+
| To              | Subject        | Scheduled       |
+----------------------------------------------------+
| .............. | .............. | ............... |
| .............. | .............. | ............... |
| .............. | .............. | ............... |
+----------------------------------------------------+
  ^ Shimmer animation
```

### Empty States

```
NO SCHEDULED EMAILS:
+--------------------------------------------------+
|                                                   |
|            +---------------+                      |
|            |  [calendar]   |                      |
|            |   + clock     |                      |
|            +---------------+                      |
|                                                   |
|         No Scheduled Emails                       |
|                                                   |
|   Schedule emails to send at the perfect          |
|   time for your recipients. Great for:            |
|                                                   |
|   * Following up after meetings                   |
|   * Sending during business hours                 |
|   * Respecting recipient timezones                |
|                                                   |
|           [ Compose & Schedule Email ]            |
|                                                   |
+--------------------------------------------------+
```

### Error States

```
SCHEDULING FAILED:
+--------------------------------------------------+
|  [!] Failed to schedule email                     |
|                                                   |
|  The scheduled time has already passed.           |
|  Please select a future date and time.            |
|                                                   |
|              [Try Again]                          |
+--------------------------------------------------+

INVALID TIMEZONE:
+-------------------------------+
|  Timezone                     |
|  +-------------------------+  |
|  | America/New_York      v |  |
|  +-------------------------+  |
|  [!] Could not determine      |
|  recipient's timezone.        |
|  Using your default.          |
+-------------------------------+

LOAD FAILED:
+--------------------------------------------------+
|                                                   |
|  [!] Couldn't load scheduled emails               |
|                                                   |
|  Check your connection and try again.             |
|                                                   |
|              [Retry]                              |
+--------------------------------------------------+
```

### Success States

```
EMAIL SCHEDULED:
+--------------------------------------------------+
|  * Email Scheduled Successfully                   |
|                                                   |
|  Your email to john@acme.com will be sent on      |
|  Jan 15, 2026 at 9:00 AM EST.                     |
|                                                   |
|  [View Scheduled Emails]              [Dismiss]   |
+--------------------------------------------------+

SCHEDULE UPDATED:
+--------------------------------------------------+
|  * Schedule Updated                               |
|                                                   |
|  Email will now be sent on Jan 16, 2026           |
|  at 10:00 AM EST.                                 |
+--------------------------------------------------+

EMAIL CANCELLED:
+--------------------------------------------------+
|  * Scheduled Email Cancelled                      |
|                                                   |
|  The email to john@acme.com has been cancelled.   |
|                                                   |
|  [Undo - 5s]                                      |
+--------------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Email Composer**
   - To field -> Subject -> Template selector
   - Send Now radio -> Schedule for Later radio
   - Date picker -> Time picker -> Timezone selector
   - Quick options buttons
   - Cancel -> Primary action button

2. **Date Picker Modal**
   - Focus trapped within modal
   - Previous month -> Month/year display -> Next month
   - Date grid (arrow key navigation)
   - Quick select buttons
   - Confirm button
   - Escape to close

3. **Scheduled Emails List**
   - Tab through table rows
   - Tab to Edit/Cancel actions per row
   - Enter to activate focused action

### ARIA Requirements

```html
<!-- Schedule Toggle -->
<fieldset role="radiogroup" aria-label="Send options">
  <legend class="sr-only">When to send</legend>
  <label>
    <input type="radio" name="send-option" value="now" aria-checked="false" />
    Send Now
  </label>
  <label>
    <input type="radio" name="send-option" value="schedule" aria-checked="true" />
    Schedule for Later
  </label>
</fieldset>

<!-- Date Picker Trigger -->
<button
  aria-haspopup="dialog"
  aria-expanded="false"
  aria-label="Select date, currently January 15, 2026"
>
  Jan 15, 2026
</button>

<!-- Date Picker Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="date-picker-title"
>
  <h2 id="date-picker-title">Select Date</h2>

  <div role="application" aria-label="Calendar">
    <button aria-label="Previous month">
    <div aria-live="polite">January 2026</div>
    <button aria-label="Next month">

    <table role="grid" aria-label="January 2026">
      <thead>
        <tr>
          <th abbr="Sunday" scope="col">Su</th>
          <!-- ... -->
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <button
              aria-selected="true"
              aria-label="January 15, 2026, selected"
            >15</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</dialog>

<!-- Timezone Selector -->
<select
  aria-label="Select timezone"
  aria-describedby="timezone-hint"
>
  <option value="America/New_York">America/New_York (EST)</option>
</select>
<span id="timezone-hint" class="sr-only">
  Email will be sent at the selected time in this timezone
</span>

<!-- Scheduled Email Row -->
<tr role="row" aria-label="Scheduled email to john@acme.com">
  <td>john@acme.com</td>
  <td>Your Quote from Renoz</td>
  <td>
    <time datetime="2026-01-15T09:00:00-05:00">
      Jan 15, 2026 at 9:00 AM EST
    </time>
  </td>
  <td>
    <button aria-label="Edit scheduled email to john@acme.com">Edit</button>
    <button aria-label="Cancel scheduled email to john@acme.com">Cancel</button>
  </td>
</tr>
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move between focusable elements |
| Arrow Keys | Navigate calendar grid |
| Enter | Select date/time, activate buttons |
| Space | Toggle radio buttons |
| Escape | Close picker/dialog |
| Home | Go to first day of month |
| End | Go to last day of month |
| Page Up | Previous month |
| Page Down | Next month |

### Screen Reader Announcements

- Date selected: "January 15, 2026 selected"
- Time selected: "9:00 AM selected"
- Schedule created: "Email to john@acme.com scheduled for January 15, 2026 at 9:00 AM Eastern"
- Schedule updated: "Schedule updated to January 16, 2026 at 10:00 AM"
- Schedule cancelled: "Scheduled email cancelled"
- Error: "Failed to schedule email. Please select a future date."

---

## Animation Choreography

### Schedule Option Toggle

```
EXPAND SCHEDULE OPTIONS:
- Duration: 250ms
- Easing: ease-out
- Height: 0 -> auto (animate max-height)
- Opacity: 0 -> 1
- Elements stagger: 50ms between date, time, timezone

COLLAPSE SCHEDULE OPTIONS:
- Duration: 200ms
- Easing: ease-in
- Height: auto -> 0
- Opacity: 1 -> 0
```

### Date Picker

```
OPEN:
- Duration: 200ms
- Easing: ease-out
- Scale: 0.95 -> 1
- Opacity: 0 -> 1
- Transform origin: top center

MONTH CHANGE:
- Duration: 200ms
- Easing: ease-out
- Slide left/right based on direction
- Old month fades out, new month fades in

DATE SELECTION:
- Duration: 150ms
- Background color: white -> primary
- Text color: dark -> white
- Scale: 1 -> 1.05 -> 1

CLOSE:
- Duration: 150ms
- Easing: ease-in
- Scale: 1 -> 0.95
- Opacity: 1 -> 0
```

### Time Picker

```
SCROLL WHEELS:
- Duration: continuous
- Physics: momentum scrolling with snap points
- Haptic: light feedback on snap

TIME SELECTION:
- Duration: 100ms
- Scale pulse on selected item
- Background highlight
```

### Scheduled Email Actions

```
SCHEDULE SUCCESS:
- Duration: 300ms
- Checkmark icon: scale(0) -> scale(1.2) -> scale(1)
- Card: green border flash
- Toast: slide up from bottom

CANCEL:
- Duration: 200ms
- Row: slide out to left
- Height collapse: 150ms
- Other rows: slide up to fill gap

EDIT DIALOG OPEN:
- Duration: 250ms
- Scale: 0.95 -> 1
- Overlay: fade in
```

---

## Component Props Interfaces

```typescript
// ScheduledEmailsSkeleton
interface ScheduledEmailsSkeletonProps {
  /** Number of skeleton rows to show */
  rows?: number;
  /** Show in table or card layout */
  variant?: 'table' | 'cards';
}

// DateTimePicker
interface DateTimePickerProps {
  /** Selected datetime */
  value?: Date;
  /** Change handler */
  onChange: (date: Date) => void;
  /** Minimum selectable date (defaults to now) */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Timezone for display */
  timezone?: string;
  /** Quick select presets */
  presets?: Array<{
    label: string;
    value: Date | (() => Date);
  }>;
  /** Disabled state */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Mobile-first: use full screen pickers */
  fullscreenOnMobile?: boolean;
}

// TimezoneSelect
interface TimezoneSelectProps {
  /** Selected timezone (IANA format) */
  value?: string;
  /** Change handler */
  onChange: (timezone: string) => void;
  /** Show UTC offset */
  showOffset?: boolean;
  /** Filter to common timezones */
  commonOnly?: boolean;
  /** Detect user's timezone */
  detectUserTimezone?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
}

// ScheduleSendToggle
interface ScheduleSendToggleProps {
  /** Whether scheduling is enabled */
  scheduled: boolean;
  /** Toggle handler */
  onToggle: (scheduled: boolean) => void;
  /** Scheduled datetime (if scheduled=true) */
  scheduledAt?: Date;
  /** Scheduled timezone */
  timezone?: string;
  /** Change datetime handler */
  onScheduleChange?: (date: Date, timezone: string) => void;
  /** Disable the toggle */
  disabled?: boolean;
}

// ScheduledEmailCard
interface ScheduledEmailCardProps {
  /** Scheduled email data */
  email: {
    id: string;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    templateType: string;
    scheduledAt: string;
    timezone: string;
    status: 'pending' | 'sent' | 'cancelled';
  };
  /** Edit handler */
  onEdit: () => void;
  /** Cancel handler */
  onCancel: () => void;
  /** View handler */
  onView?: () => void;
  /** Compact mode for list display */
  compact?: boolean;
}

// ScheduledEmailsTable
interface ScheduledEmailsTableProps {
  /** Scheduled emails */
  emails: Array<{
    id: string;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    templateType: string;
    scheduledAt: string;
    timezone: string;
    status: 'pending' | 'sent' | 'cancelled';
  }>;
  /** Loading state */
  isLoading?: boolean;
  /** Edit handler */
  onEdit: (id: string) => void;
  /** Cancel handler */
  onCancel: (id: string) => void;
  /** Sort state */
  sort?: { column: string; direction: 'asc' | 'desc' };
  /** Sort change handler */
  onSortChange?: (column: string) => void;
}

// EditScheduledEmailDialog
interface EditScheduledEmailDialogProps {
  /** Scheduled email to edit */
  email: {
    id: string;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    templateType: string;
    templateData: Record<string, unknown>;
    scheduledAt: string;
    timezone: string;
  };
  /** Dialog open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Save handler */
  onSave: (updates: {
    scheduledAt?: string;
    timezone?: string;
    subject?: string;
  }) => void;
  /** Delete handler */
  onDelete: () => void;
  /** Saving state */
  isSaving?: boolean;
}

// CancelScheduledEmailDialog
interface CancelScheduledEmailDialogProps {
  /** Email details */
  email: {
    recipientEmail: string;
    subject: string;
    scheduledAt: string;
    timezone: string;
  };
  /** Dialog open state */
  open: boolean;
  /** Close handler (keep scheduled) */
  onClose: () => void;
  /** Confirm cancel handler */
  onConfirm: () => void;
  /** Cancelling state */
  isCancelling?: boolean;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/communications/schedule-send-toggle.tsx` | Send now/schedule toggle |
| `src/components/domain/communications/datetime-picker.tsx` | Date and time selection |
| `src/components/domain/communications/timezone-select.tsx` | Timezone dropdown |
| `src/components/domain/communications/scheduled-emails-table.tsx` | Scheduled emails list |
| `src/components/domain/communications/scheduled-email-card.tsx` | Card for mobile list |
| `src/components/domain/communications/edit-scheduled-email-dialog.tsx` | Edit dialog |
| `src/components/domain/communications/cancel-scheduled-email-dialog.tsx` | Cancel confirmation |
| `src/components/domain/communications/scheduled-emails-skeleton.tsx` | Loading skeleton |
| `src/routes/_authed/communications/scheduled.tsx` | Scheduled tab route |
