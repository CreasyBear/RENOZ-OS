# Wireframe: DOM-COMMS-005 - Communication Preferences

## Story Reference

- **Story ID**: DOM-COMMS-005
- **Name**: Add Communication Preferences
- **PRD**: memory-bank/prd/domains/communications.prd.json
- **Type**: UI Component
- **Component Type**: Form with Checkbox preferences

## Overview

Track and manage customer communication preferences (email opt-in, SMS opt-in). Includes preference toggles on contact forms, unsubscribe flow, preference history for compliance, and preference reports for audit.

## UI Patterns (Reference Implementation)

### PreferenceCheckbox
- **Pattern**: RE-UI Checkbox + Label
- **Reference**: `_reference/.reui-reference/registry/default/ui/checkbox.tsx`, `_reference/.reui-reference/registry/default/ui/label.tsx`
- **Features**:
  - Large touch targets for mobile accessibility
  - Description text below checkbox label for context
  - Disabled state for compliance-locked preferences
  - Loading spinner during opt-in/out API calls

### PreferenceDisplay
- **Pattern**: RE-UI Badge + Switch + Separator
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`, `_reference/.reui-reference/registry/default/ui/switch.tsx`, `_reference/.reui-reference/registry/default/ui/separator.tsx`
- **Features**:
  - Toggle switch with "Opted In" / "Opted Out" badge display
  - Timestamp showing "since [date]" for audit trail
  - Changed by user attribution (manual vs system changes)
  - Read-only mode for non-admin users viewing customer preferences

### PreferenceHistoryDialog
- **Pattern**: RE-UI Dialog + Timeline + ScrollArea
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `_reference/.reui-reference/registry/default/ui/scroll-area.tsx`
- **Features**:
  - Chronological timeline of preference changes (newest first)
  - Change indicators showing old → new state transitions
  - Source attribution (Unsubscribe link, Contact form, Admin edit)
  - PDF export button for compliance documentation

### OptOutWarning
- **Pattern**: RE-UI Alert + Collapsible
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`, `_reference/.reui-reference/registry/default/ui/collapsible.tsx`
- **Features**:
  - Warning banner in email composer when recipients opted out
  - Expandable list showing which recipients are excluded
  - Admin override button (permission-gated)
  - Auto-filters recipient list to remove opted-out contacts

---

## Mobile Wireframe (375px)

### Contact Form - Preferences Section

```
+=========================================+
| Edit Contact                      [X]   |
+-----------------------------------------+
|                                         |
|  First Name *                           |
|  +-------------------------------------+|
|  | John                                ||
|  +-------------------------------------+|
|                                         |
|  Last Name *                            |
|  +-------------------------------------+|
|  | Smith                               ||
|  +-------------------------------------+|
|                                         |
|  Email *                                |
|  +-------------------------------------+|
|  | john@acme.com                       ||
|  +-------------------------------------+|
|                                         |
|  Phone                                  |
|  +-------------------------------------+|
|  | +1 555-0123                         ||
|  +-------------------------------------+|
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  COMMUNICATION PREFERENCES              |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  [x] Email Communications           ||
|  |      Receive marketing emails,      ||
|  |      newsletters, and updates       ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  [ ] SMS Communications             ||
|  |      Receive text messages about    ||
|  |      orders and promotions          ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |           [Save Contact]            ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Contact Detail - Preferences Display

```
+=========================================+
| < Customers                             |
+-----------------------------------------+
|                                         |
|  John Smith                             |
|  Acme Corporation                       |
|  [Primary Contact]                      |
|  ─────────────────────────────────────  |
|                                         |
|  john@acme.com  |  +1 555-0123          |
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  COMMUNICATION PREFERENCES       [Edit] |
|  +-------------------------------------+|
|  |                                     ||
|  |  Email   [=====*] Opted In          ||
|  |          since Jan 5, 2026          ||
|  |                                     ||
|  |  SMS     [*=====] Opted Out         ||
|  |          since Jan 5, 2026          ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  [View Preference History]              |
|                                         |
+=========================================+
```

### Preference History Dialog

```
+=========================================+
| Preference History                [X]   |
+-----------------------------------------+
|                                         |
|  John Smith - john@acme.com             |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | Jan 15, 2026 at 3:45 PM             ||
|  |                                     ||
|  | SMS Opt-In: Off -> On               ||
|  | Changed by: Joel Chan               ||
|  | Source: Contact form edit           ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Jan 10, 2026 at 10:00 AM            ||
|  |                                     ||
|  | Email Opt-In: On -> Off             ||
|  | Changed by: Customer                ||
|  | Source: Unsubscribe link            ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Jan 5, 2026 at 2:30 PM              ||
|  |                                     ||
|  | Email Opt-In: Off -> On             ||
|  | SMS Opt-In: Off -> Off              ||
|  | Changed by: Sarah Kim               ||
|  | Source: Contact creation            ||
|  +-------------------------------------+|
|                                         |
|  [Export History (PDF)]                 |
|                                         |
+=========================================+
```

### Unsubscribe Landing Page (Public)

```
+=========================================+
|                                         |
|         [Renoz Logo]                    |
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  MANAGE YOUR PREFERENCES                |
|                                         |
|  john@acme.com                          |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  [x] Marketing Emails               ||
|  |      Product updates, newsletters,  ||
|  |      and promotional content        ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  [x] Order Updates                  ||
|  |      Order confirmations, shipping  ||
|  |      notifications (recommended)    ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  [ ] SMS Notifications              ||
|  |      Text message updates about     ||
|  |      your orders                    ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  [Unsubscribe from All]                 |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |      [Save Preferences]             ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Unsubscribe Confirmation

```
+=========================================+
|                                         |
|         [Renoz Logo]                    |
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|           [checkmark]                   |
|                                         |
|  PREFERENCES UPDATED                    |
|                                         |
|  You've been unsubscribed from          |
|  marketing emails.                      |
|                                         |
|  You'll still receive:                  |
|  * Order confirmations                  |
|  * Shipping updates                     |
|  * Important account notices            |
|                                         |
|  Changed your mind?                     |
|  [Resubscribe]                          |
|                                         |
+=========================================+
```

### Bulk Send Warning (Email Composer)

```
+=========================================+
| Compose Email                     [X]   |
+-----------------------------------------+
|                                         |
|  To                                     |
|  +-------------------------------------+|
|  | [john@acme.com x] [sarah@beta.io x] ||
|  | [mike@gamma.co x]                   ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [!] PREFERENCE WARNING              ||
|  |                                     ||
|  | 1 of 3 recipients has opted out     ||
|  | of marketing emails:                ||
|  |                                     ||
|  | * mike@gamma.co                     ||
|  |                                     ||
|  | This email will not be sent to      ||
|  | opted-out recipients.               ||
|  |                                     ||
|  | [Send to 2 recipients]              ||
|  | [Override (admin only)]             ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Preference Report (Mobile)

```
+=========================================+
| Communications                          |
+-----------------------------------------+
| [Summary] [Emails] [Preferences]        |
|                     ===========         |
+-----------------------------------------+
|                                         |
|  Preference Report            [Export]  |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  EMAIL OPT-IN                       ||
|  |                                     ||
|  |  [==========......] 67%             ||
|  |  1,234 of 1,850 contacts            ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  SMS OPT-IN                         ||
|  |                                     ||
|  |  [====..............] 23%           ||
|  |  425 of 1,850 contacts              ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  RECENT CHANGES                         |
|  +-------------------------------------+|
|  | mike@gamma.co                       ||
|  | Email: Opted Out                    ||
|  | Jan 14, via Unsubscribe link        ||
|  +-------------------------------------+|
|  +-------------------------------------+|
|  | sarah@beta.io                       ||
|  | SMS: Opted In                       ||
|  | Jan 13, via Contact edit            ||
|  +-------------------------------------+|
|                                         |
|  [View All Changes]                     |
|                                         |
+=========================================+
```

### Loading Skeleton (Mobile)

```
+=========================================+
|                                         |
|  COMMUNICATION PREFERENCES              |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  [...] .......................      ||
|  |        .......................      ||
|  |        ...................          ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  [...] .......................      ||
|  |        .......................      ||
|  |        ...................          ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Contact Form - Preferences Section

```
+=========================================================================+
| Edit Contact                                                       [X]   |
+-------------------------------------------------------------------------+
|                                                                          |
|  +-- CONTACT INFO ---------------------------+  +-- PREFERENCES -------+ |
|  |                                           |  |                      | |
|  |  First Name *          Last Name *        |  |  COMMUNICATION       | |
|  |  +-----------------+  +-----------------+ |  |  PREFERENCES         | |
|  |  | John            |  | Smith           | |  |                      | |
|  |  +-----------------+  +-----------------+ |  |  +------------------+ | |
|  |                                           |  |  |                  | | |
|  |  Email *                                  |  |  | [x] Email        | | |
|  |  +-------------------------------------+  |  |  |     Receive      | | |
|  |  | john@acme.com                       |  |  |  |     marketing    | | |
|  |  +-------------------------------------+  |  |  |     emails       | | |
|  |                                           |  |  |                  | | |
|  |  Phone                                    |  |  +------------------+ | |
|  |  +-------------------------------------+  |  |                      | |
|  |  | +1 555-0123                         |  |  |  +------------------+ | |
|  |  +-------------------------------------+  |  |  |                  | | |
|  |                                           |  |  | [ ] SMS          | | |
|  |  Company                                  |  |  |     Receive text | | |
|  |  +-------------------------------------+  |  |  |     messages     | | |
|  |  | Acme Corporation                    |  |  |  |                  | | |
|  |  +-------------------------------------+  |  |  +------------------+ | |
|  |                                           |  |                      | |
|  +-------------------------------------------+  +----------------------+ |
|                                                                          |
|                                      ( Cancel )     [ Save Contact ]     |
|                                                                          |
+=========================================================================+
```

### Preference Report

```
+=========================================================================+
| Communications                                                           |
+-------------------------------------------------------------------------+
| [Summary] [Emails] [Scheduled] [Templates] [Preferences]                 |
|                                              ===========                 |
+-------------------------------------------------------------------------+
|                                                                          |
|  Preference Report                      [Date Range v]  [Export CSV]     |
|  ─────────────────────────────────────────────────────────────────────   |
|                                                                          |
|  +-- OVERVIEW -----------------------------------------------------------+
|  |                                                                       |
|  |  +---------------------+  +---------------------+                     |
|  |  | Email Opt-In        |  | SMS Opt-In          |                     |
|  |  |                     |  |                     |                     |
|  |  |   67%               |  |   23%               |                     |
|  |  |   1,234 / 1,850     |  |   425 / 1,850       |                     |
|  |  |   +5% vs last month |  |   +2% vs last month |                     |
|  |  +---------------------+  +---------------------+                     |
|  |                                                                       |
|  +-----------------------------------------------------------------------+
|                                                                          |
|  +-- RECENT PREFERENCE CHANGES -----------------------------------------+ |
|  |                                                                      | |
|  |  +------------------------------------------------------------------+| |
|  |  | Contact            | Change        | Date       | Source        || |
|  |  |--------------------+---------------+------------+---------------|| |
|  |  | mike@gamma.co      | Email: Out    | Jan 14     | Unsubscribe   || |
|  |  | sarah@beta.io      | SMS: In       | Jan 13     | Contact edit  || |
|  |  | alex@delta.com     | Email: Out    | Jan 12     | Unsubscribe   || |
|  |  | pat@epsilon.io     | Email: In     | Jan 10     | Web form      || |
|  |  +------------------------------------------------------------------+| |
|  |                                                                      | |
|  |  < 1 2 3 >                                    Showing 1-10 of 45    | |
|  +----------------------------------------------------------------------+ |
|                                                                          |
+=========================================================================+
```

---

## Desktop Wireframe (1280px+)

### Contact Detail - Preferences Section

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  < Back to Customers                                                                   |
| Customers   |                                                                                        |
| Orders      |  John Smith                                    [Edit Contact]  [Send Email]  [More v]  |
| Products    |  Primary Contact - Acme Corporation                                                    |
| Jobs        |  ─────────────────────────────────────────────────────────────────────────────────     |
| Pipeline    |                                                                                        |
| Support     |  [Overview] [Orders] [Communications] [Activity]                                       |
| Communi..   |  =========                                                                             |
|             |                                                                                        |
|             |  +-- CONTACT INFO ---------------------------------+  +-- PREFERENCES --------------+  |
|             |  |                                                 |  |                             |  |
|             |  |  Email           john@acme.com                  |  |  COMMUNICATION PREFERENCES  |  |
|             |  |  Phone           +1 555-0123                    |  |                             |  |
|             |  |  Mobile          +1 555-0124                    |  |  Email Marketing            |  |
|             |  |  Company         Acme Corporation               |  |  [=========*] Opted In      |  |
|             |  |  Title           VP of Operations               |  |  Since: Jan 5, 2026         |  |
|             |  |                                                 |  |  Changed by: Sarah Kim      |  |
|             |  +--------------------------------------------------  |                             |  |
|             |                                                       |  SMS Notifications          |  |
|             |                                                       |  [*=========] Opted Out     |  |
|             |                                                       |  Since: Jan 5, 2026         |  |
|             |                                                       |  Default (never opted in)   |  |
|             |                                                       |                             |  |
|             |                                                       |  [View History]  [Edit]     |  |
|             |                                                       |                             |  |
|             |                                                       +-----------------------------+  |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Preference Report Dashboard

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Communications > Preferences                                                          |
| Customers   |  ─────────────────────────────────────────────────────────────────────────────────     |
| Orders      |                                                                                        |
| Products    |  +-- PREFERENCE OVERVIEW -----------------------------------------------------------+  |
| Jobs        |  |                                                                                  |  |
| Pipeline    |  |  +---------------------+  +---------------------+  +---------------------+       |  |
| Support     |  |  | Total Contacts      |  | Email Opt-In        |  | SMS Opt-In          |       |  |
| Communi..   |  |  |                     |  |                     |  |                     |       |  |
|   <         |  |  |       1,850         |  |       67%           |  |       23%           |       |  |
|             |  |  |    All contacts     |  |   1,234 contacts    |  |    425 contacts     |       |  |
|             |  |  |                     |  |   +5% vs last mo    |  |   +2% vs last mo    |       |  |
|             |  |  +---------------------+  +---------------------+  +---------------------+       |  |
|             |  |                                                                                  |  |
|             |  +---------------------------------------------------------------------------------+  |
|             |                                                                                        |
|             |  +-- OPT-IN TREND --------------------------------+  +-- BY SOURCE ----------------+   |
|             |  |                                                |  |                             |   |
|             |  |       ^                                        |  |  Source         Email  SMS  |   |
|             |  |  70%  |           ____----                     |  |  ────────────────────────── |   |
|             |  |       |      ____/                             |  |  Contact form     45%   15% |   |
|             |  |  60%  | ____/                                  |  |  Web form         30%    5% |   |
|             |  |       |/                                       |  |  Import           20%    3% |   |
|             |  |  50%  +-------------------------------->       |  |  Manual           5%     0% |   |
|             |  |       Oct    Nov    Dec    Jan                 |  |                             |   |
|             |  |                                                |  |                             |   |
|             |  |  [---] Email  [---] SMS                        |  |                             |   |
|             |  +------------------------------------------------+  +-----------------------------+   |
|             |                                                                                        |
|             |  +-- PREFERENCE CHANGES LOG --------------------------------------------------------+   |
|             |  |                                                                                  |   |
|             |  |  [Search_________________]  [Change Type v]  [Date Range v]  [Export CSV]        |   |
|             |  |                                                                                  |   |
|             |  |  +----------------------------------------------------------------------------+ |   |
|             |  |  | Date       | Contact            | Change          | Source       | User   | |   |
|             |  |  |------------+--------------------+-----------------+--------------+--------| |   |
|             |  |  | Jan 14     | mike@gamma.co      | Email: Opt Out  | Unsubscribe  | -      | |   |
|             |  |  | Jan 13     | sarah@beta.io      | SMS: Opt In     | Contact edit | Joel   | |   |
|             |  |  | Jan 12     | alex@delta.com     | Email: Opt Out  | Unsubscribe  | -      | |   |
|             |  |  | Jan 10     | pat@epsilon.io     | Email: Opt In   | Web form     | -      | |   |
|             |  |  | Jan 9      | chris@zeta.org     | SMS: Opt In     | Contact edit | Sarah  | |   |
|             |  |  +----------------------------------------------------------------------------+ |   |
|             |  |                                                                                  |   |
|             |  |  < 1 2 3 ... 10 >                                       Showing 1-10 of 156     |   |
|             |  |                                                                                  |   |
|             |  +---------------------------------------------------------------------------------+   |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Unsubscribe Page (Desktop)

```
+======================================================================================================+
|                                                                                                      |
|                                     [Renoz Logo]                                                     |
|                                                                                                      |
|  +-- MANAGE PREFERENCES ----------------------------------------------------------------------------+|
|  |                                                                                                  ||
|  |                           MANAGE YOUR EMAIL PREFERENCES                                          ||
|  |                                                                                                  ||
|  |                              john@acme.com                                                       ||
|  |                                                                                                  ||
|  |  +-- PREFERENCE OPTIONS -----------------------------------------------+                         ||
|  |  |                                                                     |                         ||
|  |  |  +-------------------------------------------------------------+   |                         ||
|  |  |  |                                                             |   |                         ||
|  |  |  |  [x] Marketing & Promotional Emails                         |   |                         ||
|  |  |  |      Product updates, newsletters, special offers,          |   |                         ||
|  |  |  |      and company news                                       |   |                         ||
|  |  |  |                                                             |   |                         ||
|  |  |  +-------------------------------------------------------------+   |                         ||
|  |  |                                                                     |                         ||
|  |  |  +-------------------------------------------------------------+   |                         ||
|  |  |  |                                                             |   |                         ||
|  |  |  |  [x] Transactional Emails (Recommended)                     |   |                         ||
|  |  |  |      Order confirmations, shipping updates, receipts,       |   |                         ||
|  |  |  |      and account notifications                              |   |                         ||
|  |  |  |                                                             |   |                         ||
|  |  |  +-------------------------------------------------------------+   |                         ||
|  |  |                                                                     |                         ||
|  |  |  +-------------------------------------------------------------+   |                         ||
|  |  |  |                                                             |   |                         ||
|  |  |  |  [ ] SMS Notifications                                      |   |                         ||
|  |  |  |      Text message updates about orders and deliveries       |   |                         ||
|  |  |  |                                                             |   |                         ||
|  |  |  +-------------------------------------------------------------+   |                         ||
|  |  |                                                                     |                         ||
|  |  |  ─────────────────────────────────────────────────────────────────  |                         ||
|  |  |                                                                     |                         ||
|  |  |  (Unsubscribe from All Marketing)                                   |                         ||
|  |  |                                                                     |                         ||
|  |  |                       [ Save Preferences ]                          |                         ||
|  |  |                                                                     |                         ||
|  |  +---------------------------------------------------------------------+                         ||
|  |                                                                                                  ||
|  +--------------------------------------------------------------------------------------------------+|
|                                                                                                      |
|                                                                                                      |
+======================================================================================================+
```

---

## Interaction States

### Loading States

```
PREFERENCE TOGGLE LOADING:
+--------------------------------------+
|                                      |
|  Email Marketing                     |
|  [...loading...] Updating...         |
|                                      |
+--------------------------------------+

PREFERENCE HISTORY LOADING:
+--------------------------------------+
|                                      |
|  +----------------------------------+|
|  |  ........                        ||
|  |                                  ||
|  |  ........................        ||
|  |  ..................              ||
|  |  ................                ||
|  +----------------------------------+|
|                                      |
|  +----------------------------------+|
|  |  ........                        ||
|  |                                  ||
|  |  ........................        ||
|  |  ..................              ||
|  +----------------------------------+|
|                                      |
+--------------------------------------+
```

### Empty States

```
NO PREFERENCE HISTORY:
+--------------------------------------+
| Preference History                   |
+--------------------------------------+
|                                      |
|          +------------+              |
|          |  [history] |              |
|          +------------+              |
|                                      |
|    No preference changes             |
|                                      |
|    Preferences have remained         |
|    unchanged since contact           |
|    creation.                         |
|                                      |
+--------------------------------------+

NO OPTED-IN CONTACTS:
+--------------------------------------+
|                                      |
|  Email Opt-In                        |
|                                      |
|  [................] 0%               |
|  0 of 150 contacts                   |
|                                      |
|  No contacts have opted in           |
|  to email communications yet.        |
|                                      |
+--------------------------------------+
```

### Error States

```
PREFERENCE UPDATE FAILED:
+--------------------------------------+
|                                      |
|  [!] Failed to update preference     |
|                                      |
|  Could not save your email           |
|  preference. Please try again.       |
|                                      |
|  [Retry]                             |
|                                      |
+--------------------------------------+

INVALID UNSUBSCRIBE LINK:
+--------------------------------------+
|                                      |
|  [!] Invalid or Expired Link         |
|                                      |
|  This unsubscribe link is no         |
|  longer valid. It may have           |
|  expired or already been used.       |
|                                      |
|  Contact support@renoz.com for       |
|  assistance.                         |
|                                      |
+--------------------------------------+

BLOCKED BY ADMIN:
+--------------------------------------+
|                                      |
|  [!] Cannot Override                 |
|                                      |
|  This contact has opted out.         |
|  Admin approval is required to       |
|  send marketing communications.      |
|                                      |
|  [Request Override]                  |
|                                      |
+--------------------------------------+
```

### Success States

```
PREFERENCE UPDATED:
+--------------------------------------+
|                                      |
|  * Preference Updated                |
|                                      |
|  Email marketing preference          |
|  has been updated.                   |
|                                      |
+--------------------------------------+

UNSUBSCRIBED:
+--------------------------------------+
|                                      |
|         [checkmark]                  |
|                                      |
|  Successfully Unsubscribed           |
|                                      |
|  You won't receive marketing         |
|  emails from us anymore.             |
|                                      |
|  Changed your mind?                  |
|  [Resubscribe]                       |
|                                      |
+--------------------------------------+

RESUBSCRIBED:
+--------------------------------------+
|                                      |
|         [checkmark]                  |
|                                      |
|  Welcome Back!                       |
|                                      |
|  You're now subscribed to our        |
|  email updates.                      |
|                                      |
+--------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Contact Form Preferences**
   - Other form fields in order
   - Email opt-in checkbox -> Label
   - SMS opt-in checkbox -> Label
   - Save button

2. **Preference Report**
   - Overview cards (informational)
   - Tab through change log rows
   - Pagination controls
   - Export button

3. **Unsubscribe Page**
   - Preference checkboxes in order
   - Unsubscribe from All link
   - Save Preferences button

### ARIA Requirements

```html
<!-- Preference Checkbox -->
<fieldset role="group" aria-labelledby="comm-prefs-heading">
  <legend id="comm-prefs-heading">Communication Preferences</legend>

  <label>
    <input
      type="checkbox"
      name="emailOptIn"
      aria-describedby="email-opt-desc"
      checked
    />
    Email Communications
  </label>
  <span id="email-opt-desc" class="sr-only">
    Receive marketing emails, newsletters, and updates
  </span>
</fieldset>

<!-- Preference Toggle (read-only display) -->
<div
  role="status"
  aria-label="Email marketing preference: Opted in since January 5, 2026"
>
  <span>Email Marketing</span>
  <span role="img" aria-label="Opted in">ON</span>
  <span>Since: Jan 5, 2026</span>
</div>

<!-- Opt-out Warning -->
<div
  role="alert"
  aria-live="polite"
>
  <p>1 of 3 recipients has opted out of marketing emails</p>
  <ul aria-label="Opted out recipients">
    <li>mike@gamma.co</li>
  </ul>
</div>

<!-- Preference History -->
<section aria-labelledby="pref-history-heading">
  <h2 id="pref-history-heading">Preference History</h2>

  <ol aria-label="Preference change timeline">
    <li aria-label="January 15, 2026: SMS opt-in changed from off to on by Joel Chan">
      <time datetime="2026-01-15T15:45:00">Jan 15, 2026 at 3:45 PM</time>
      <span>SMS Opt-In: Off to On</span>
      <span>Changed by: Joel Chan</span>
    </li>
  </ol>
</section>

<!-- Unsubscribe Confirmation -->
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  <h1>Preferences Updated</h1>
  <p>You've been unsubscribed from marketing emails.</p>
</div>
```

### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | Form | Move between checkboxes |
| Space | Checkbox | Toggle preference |
| Enter | Save button | Submit changes |
| Tab | History table | Navigate rows |
| Escape | Dialog | Close |

### Screen Reader Announcements

- Preference toggled: "Email marketing preference changed to opted out"
- Update saving: "Saving preference changes"
- Update complete: "Preferences saved successfully"
- Warning: "Warning: 1 recipient has opted out of marketing emails"
- Unsubscribed: "Successfully unsubscribed from marketing emails"
- History loaded: "Preference history loaded, 5 changes"

---

## Animation Choreography

### Preference Toggle

```
TOGGLE ON:
- Duration: 200ms
- Easing: ease-out
- Switch slides right
- Background: gray -> primary color
- Checkmark fades in

TOGGLE OFF:
- Duration: 200ms
- Easing: ease-out
- Switch slides left
- Background: primary -> gray

LOADING STATE:
- Duration: 500ms loop
- Opacity pulse on toggle
- Disable interaction
```

### Warning Banner

```
APPEAR:
- Duration: 300ms
- Easing: ease-out
- Height: 0 -> auto
- Background: fade in yellow
- Icon pulse once

DISMISS:
- Duration: 200ms
- Easing: ease-in
- Height: auto -> 0
- Opacity: 1 -> 0
```

### Preference History

```
ENTRY (on load):
- Duration: 200ms per item
- Stagger: 50ms
- Slide in from left
- Opacity: 0 -> 1

NEW ENTRY (real-time):
- Duration: 300ms
- Easing: spring
- Slide down from top
- Background highlight flash
```

### Unsubscribe Confirmation

```
SUCCESS CHECKMARK:
- Duration: 400ms
- Scale: 0 -> 1.2 -> 1
- Draw checkmark stroke: 200ms
- Green circle pulse

PAGE TRANSITION:
- Duration: 300ms
- Cross-fade between states
```

---

## Component Props Interfaces

```typescript
// PreferenceCheckbox
interface PreferenceCheckboxProps {
  /** Preference type */
  type: 'email' | 'sms';
  /** Current value */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Label text */
  label: string;
  /** Description text */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Read-only display mode */
  readOnly?: boolean;
}

// PreferenceDisplay
interface PreferenceDisplayProps {
  /** Preference type */
  type: 'email' | 'sms';
  /** Current opted-in status */
  optedIn: boolean;
  /** Date of last change */
  changedAt?: string;
  /** Who made the change */
  changedBy?: string;
  /** Source of change */
  source?: 'manual' | 'unsubscribe' | 'form' | 'import';
  /** Show edit button */
  onEdit?: () => void;
  /** Show history button */
  onViewHistory?: () => void;
}

// PreferenceHistoryDialog
interface PreferenceHistoryDialogProps {
  /** Contact ID */
  contactId: string;
  /** Contact email for display */
  contactEmail: string;
  /** Contact name for display */
  contactName: string;
  /** Dialog open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Export handler */
  onExport?: () => void;
}

// PreferenceHistoryEntry
interface PreferenceHistoryEntry {
  id: string;
  timestamp: string;
  preferenceType: 'email' | 'sms';
  previousValue: boolean;
  newValue: boolean;
  changedBy?: {
    id: string;
    name: string;
  };
  source: 'manual' | 'unsubscribe' | 'form' | 'import' | 'api';
}

// OptOutWarning
interface OptOutWarningProps {
  /** Opted-out recipients */
  optedOutRecipients: Array<{
    email: string;
    name?: string;
  }>;
  /** Total recipient count */
  totalRecipients: number;
  /** Proceed anyway handler (admin only) */
  onOverride?: () => void;
  /** Can user override */
  canOverride?: boolean;
  /** Dismiss handler */
  onDismiss?: () => void;
}

// PreferenceReport
interface PreferenceReportProps {
  /** Total contact count */
  totalContacts: number;
  /** Email opt-in stats */
  emailOptIn: {
    count: number;
    percentage: number;
    changeFromLastPeriod?: number;
  };
  /** SMS opt-in stats */
  smsOptIn: {
    count: number;
    percentage: number;
    changeFromLastPeriod?: number;
  };
  /** Trend data */
  trendData?: Array<{
    date: string;
    emailOptInRate: number;
    smsOptInRate: number;
  }>;
  /** By source breakdown */
  bySource?: Array<{
    source: string;
    emailOptInRate: number;
    smsOptInRate: number;
  }>;
  /** Date range */
  dateRange: { from: Date; to: Date };
  /** Date range change handler */
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

// UnsubscribePage
interface UnsubscribePageProps {
  /** Token from URL */
  token: string;
  /** Contact email (decoded from token) */
  email: string;
  /** Current preferences */
  preferences: {
    marketingEmail: boolean;
    transactionalEmail: boolean;
    sms: boolean;
  };
  /** Save handler */
  onSave: (preferences: UnsubscribePageProps['preferences']) => void;
  /** Unsubscribe from all handler */
  onUnsubscribeAll: () => void;
  /** Saving state */
  isSaving?: boolean;
  /** Company branding */
  branding?: {
    logo: string;
    companyName: string;
    primaryColor: string;
  };
}

// ReportTable (for preference changes)
interface ReportTableProps {
  /** Change log entries */
  changes: Array<{
    id: string;
    date: string;
    contactEmail: string;
    contactName?: string;
    preferenceType: 'email' | 'sms';
    change: 'opted_in' | 'opted_out';
    source: string;
    changedBy?: string;
  }>;
  /** Loading state */
  isLoading?: boolean;
  /** Sort state */
  sort?: { column: string; direction: 'asc' | 'desc' };
  /** Sort change handler */
  onSortChange?: (column: string) => void;
  /** Pagination */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  /** Page change handler */
  onPageChange?: (page: number) => void;
  /** Export handler */
  onExport?: () => void;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/communications/preference-checkbox.tsx` | Toggle for opt-in |
| `src/components/domain/communications/preference-display.tsx` | Read-only preference view |
| `src/components/domain/communications/preference-history-dialog.tsx` | Change history modal |
| `src/components/domain/communications/opt-out-warning.tsx` | Composer warning banner |
| `src/components/domain/communications/preference-report.tsx` | Report dashboard |
| `src/components/domain/contacts/contact-preferences-section.tsx` | Form integration |
| `src/routes/unsubscribe/$token.tsx` | Public unsubscribe page |
| `src/routes/_authed/communications/preferences.tsx` | Preferences tab route |
