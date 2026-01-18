# Financial Domain Wireframe: Xero Invoice Sync UI (DOM-FIN-005b)

**Story ID:** DOM-FIN-005b
**Component Type:** StatusBadge with ActionButton
**Aesthetic:** Professional Financial - integration-focused, status-driven
**Domain Color:** Green-500 (Xero Brand: #13B5EA)
**Created:** 2026-01-10

---

## UI Patterns (Reference Implementation)

### Xero Sync Status Badge
- **Pattern**: RE-UI Badge with Icon
- **Reference**: `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Color-coded status (green=synced, blue=pending, red=error, gray=not synced)
  - Animated spinner for "syncing" state
  - Icon prefix (checkmark, clock, alert, dash)
  - Hover tooltip with last sync timestamp

### Sync Status Panel
- **Pattern**: RE-UI Card with Action Buttons
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `button.tsx`
- **Features**:
  - Xero logo and connection status display
  - Last synced timestamp with refresh button
  - View in Xero external link button
  - Sync history timeline with event details

### Sync Error Resolution Dialog
- **Pattern**: RE-UI Alert Dialog with Action Cards
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert-dialog.tsx`, `card.tsx`
- **Features**:
  - Error type and message display with icon
  - Suggested action cards (Create Contact, Link Existing, Retry)
  - Xero contact search combobox for linking
  - Retry button with loading state

### Sync Queue Table
- **Pattern**: RE-UI DataTable with Status Column
- **Reference**: `_reference/.reui-reference/registry/default/ui/data-table.tsx`
- **Features**:
  - Real-time status updates (queued, processing, failed)
  - Failed item error messages with fix button
  - Bulk actions (retry all, process queue now)
  - Remove from queue action for individual items

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | Uses existing `xeroInvoiceId`, but needs `syncQueue`, `syncHistory` | NOT CREATED |
| **Server Functions Required** | `syncInvoiceToXero`, `getSyncStatus`, `resolveSyncError` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-FIN-005a | PENDING |

### Existing Schema Available
- `orders` with `invoiceStatus`, `xeroInvoiceId` in `renoz-v2/lib/schema/orders.ts`
- `customers` in `renoz-v2/lib/schema/customers.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Currency**: AUD with GST (10%)
- **Financial Truth**: Xero is source of truth
- **Format**: Amounts as "$X,XXX.XX", dates as DD/MM/YYYY

---

## Design Principles for Integration UI

- **Status Visibility:** Sync status always visible at a glance
- **Transparency:** Clear indication of what's synced and what's pending
- **Error Clarity:** Specific error messages with actionable solutions
- **Non-Blocking:** Sync failures shouldn't block user workflows
- **Audit Trail:** History of all sync activities

---

## Mobile Wireframe (375px)

### Invoice Detail - Sync Status Section

```
+=========================================+
| < Invoices                              |
| INV-2026-0089                           |
+-----------------------------------------+
|                                         |
|  Acme Corporation                       |
|  Kitchen Renovation                     |
|  =======================================|
|                                         |
|  Total: $5,000.00                       |
|  Status: [Sent]                         |
|                                         |
+-----------------------------------------+
|                                         |
|  XERO SYNC                              |
|  +-------------------------------------+|
|  |                                     ||
|  |  [XERO logo]  [* SYNCED]            ||
|  |                                     ||
|  |  Last synced: 5 min ago             ||
|  |  Xero Invoice: INV-00456            ||
|  |                                     ||
|  |  [View in Xero]                [>]  ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  -----------------------------------    |
|                                         |
|  SYNC HISTORY                           |
|  * Created in Xero - Jan 10, 10:30 AM   |
|  * Updated (line items) - Jan 10, 11:15 |
|  * Payment received - Jan 10, 2:00 PM   |
|                                         |
+-----------------------------------------+
```

### Sync Status Variants

```
+-- SYNCED (Green) --------------------------+
|                                           |
|  +---------------------------------------+|
|  |  [XERO]  [* SYNCED]                   ||
|  |  Last synced: 5 min ago               ||
|  |  Xero Invoice: INV-00456         [>]  ||
|  +---------------------------------------+|
|                                           |
+-------------------------------------------+

+-- PENDING (Blue) --------------------------+
|                                           |
|  +---------------------------------------+|
|  |  [XERO]  [~ PENDING]                  ||
|  |  Waiting to sync...                   ||
|  |  Queued 2 min ago                     ||
|  +---------------------------------------+|
|                                           |
+-------------------------------------------+

+-- SYNCING (Blue Animated) -----------------+
|                                           |
|  +---------------------------------------+|
|  |  [XERO]  [[spin] SYNCING]             ||
|  |  Pushing to Xero...                   ||
|  |                                       ||
|  +---------------------------------------+|
|                                           |
+-------------------------------------------+

+-- ERROR (Red) -----------------------------+
|                                           |
|  +---------------------------------------+|
|  |  [XERO]  [! SYNC ERROR]               ||
|  |                                       ||
|  |  Error: Contact not found in Xero     ||
|  |                                       ||
|  |  [Retry Sync]  [View Details]         ||
|  +---------------------------------------+|
|                                           |
+-------------------------------------------+

+-- NOT SYNCED (Gray) -----------------------+
|                                           |
|  +---------------------------------------+|
|  |  [XERO]  [- NOT SYNCED]               ||
|  |                                       ||
|  |  This invoice hasn't been             ||
|  |  synced to Xero yet.                  ||
|  |                                       ||
|  |  [Sync Now]                           ||
|  +---------------------------------------+|
|                                           |
+-------------------------------------------+
```

### Sync Error Detail (Bottom Sheet)

```
+=========================================+
| ====================================    |
|                                         |
|  SYNC ERROR                     [X]     |
|  INV-2026-0089                          |
|  -----------------------------------    |
|                                         |
|  [!] FAILED TO SYNC                     |
|                                         |
|  Error Type: CONTACT_NOT_FOUND          |
|  -----------------------------------    |
|                                         |
|  The customer "Acme Corporation"        |
|  was not found in your Xero account.    |
|                                         |
|  This can happen when:                  |
|  * The contact hasn't been synced       |
|  * The contact was deleted in Xero      |
|  * The names don't match exactly        |
|                                         |
|  -----------------------------------    |
|                                         |
|  SUGGESTED ACTIONS                      |
|                                         |
|  +-------------------------------------+|
|  | [1] Sync Customer to Xero           ||
|  |     Create the contact in Xero      ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [2] Link to Existing Contact        ||
|  |     Match with a Xero contact       ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | [3] Retry Sync                      ||
|  |     Try again (contact may exist)   ||
|  +-------------------------------------+|
|                                         |
|  -----------------------------------    |
|                                         |
|  Error occurred: Jan 10, 2:30 PM        |
|  Attempts: 3                            |
|                                         |
+=========================================+
```

### Invoice List - Sync Status Column (Mobile Card)

```
+=========================================+
| < Financial                             |
| Invoices                      [+ New]   |
+-----------------------------------------+
| [Search...              ] [Filters v]   |
+-----------------------------------------+
|                                         |
|  +-------------------------------------+|
|  | INV-2026-0095         [*] Xero      ||
|  | Acme Corporation                    ||
|  | $2,500.00           [Sent]          ||
|  | Due: Jan 15, 2026                   ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | INV-2026-0089         [!] Xero      ||
|  | Beta Industries      [SYNC ERROR]   ||
|  | $5,000.00           [Sent]          ||
|  | Due: Jan 20, 2026                   ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | INV-2026-0078         [~] Xero      ||
|  | Gamma LLC                           ||
|  | $3,200.00           [Draft]         ||
|  | Not yet sent                        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | INV-2026-0065         [-] Xero      ||
|  | Delta Inc           [NOT SYNCED]    ||
|  | $1,800.00           [Sent]          ||
|  | Due: Jan 10, 2026                   ||
|  +-------------------------------------+|
|                                         |
+-----------------------------------------+
```

### Manual Sync Action

```
+=========================================+
| ====================================    |
|                                         |
|  SYNC TO XERO                   [X]     |
|  INV-2026-0089                          |
|  -----------------------------------    |
|                                         |
|  This will create or update the         |
|  invoice in your Xero account.          |
|                                         |
|  +-------------------------------------+|
|  | Invoice:    INV-2026-0089           ||
|  | Customer:   Acme Corporation        ||
|  | Amount:     $5,000.00               ||
|  | Line Items: 5                       ||
|  +-------------------------------------+|
|                                         |
|  Sync Options:                          |
|  [x] Include line item details          |
|  [x] Include tax information            |
|  [ ] Mark as sent in Xero               |
|                                         |
|  +-------------------------------------+|
|  |         [ SYNC NOW ]                ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Loading/Syncing State

```
+=========================================+
|                                         |
|  XERO SYNC                              |
|  +-------------------------------------+|
|  |                                     ||
|  |  [XERO]  [[spin] SYNCING]           ||
|  |                                     ||
|  |  Pushing invoice to Xero...         ||
|  |  [##########..............] 50%     ||
|  |                                     ||
|  |  Step: Validating line items        ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Empty State - No Xero Connection

```
+=========================================+
|                                         |
|  XERO SYNC                              |
|  +-------------------------------------+|
|  |                                     ||
|  |         +-------------+             ||
|  |         |   [XERO]    |             ||
|  |         |    logo     |             ||
|  |         +-------------+             ||
|  |                                     ||
|  |   XERO NOT CONNECTED                ||
|  |                                     ||
|  |   Connect your Xero account to      ||
|  |   automatically sync invoices       ||
|  |   and payments.                     ||
|  |                                     ||
|  |   +-----------------------------+   ||
|  |   |   [Connect to Xero]         |   ||
|  |   +-----------------------------+   ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Invoice Detail with Sync Panel

```
+=============================================================================+
| < Invoices | INV-2026-0089 - Acme Corporation                               |
+-----------------------------------------------------------------------------+
| [Details] [Line Items] [Payments] [Schedule] [Xero Sync]                    |
|                                              ===========                    |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-- XERO SYNC STATUS --------------------------------------------------+  |
|  |                                                                       |  |
|  |  [XERO Logo]                                                          |  |
|  |                                                                       |  |
|  |  Status: [* SYNCED]                Last synced: 5 minutes ago         |  |
|  |  Xero Invoice: INV-00456           Xero Contact: CON-00123            |  |
|  |                                                                       |  |
|  |  [View in Xero]    [Refresh Sync]    [Unlink]                         |  |
|  |                                                                       |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
|  +-- SYNC MAPPING ------------------------------------------------------+  |
|  |                                                                       |  |
|  |  Renoz Field          Xero Field            Status                    |  |
|  |  ---------------      ---------------       ---------                 |  |
|  |  Invoice Number       Invoice Number        [* Matched]               |  |
|  |  Customer             Contact               [* Linked]                |  |
|  |  Total                Total                 [* Matched]               |  |
|  |  Due Date             Due Date              [* Matched]               |  |
|  |  Line Items (5)       Line Items (5)        [* Synced]                |  |
|  |  Payments (1)         Payments (1)          [* Synced]                |  |
|  |                                                                       |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
|  +-- SYNC HISTORY ------------------------------------------------------+  |
|  |                                                                       |  |
|  |  Jan 10, 2:00 PM    Payment synced from Xero ($2,500.00)              |  |
|  |  Jan 10, 11:15 AM   Line items updated (5 items)                      |  |
|  |  Jan 10, 10:30 AM   Invoice created in Xero (INV-00456)               |  |
|  |                                                                       |  |
|  +----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
```

### Sync Error Resolution Modal

```
+===============================================================+
|                                                               |
|   +-------------------------------------------------------+   |
|   | Resolve Sync Error                               [X]  |   |
|   | INV-2026-0089                                         |   |
|   +-------------------------------------------------------+   |
|   |                                                       |   |
|   |  [!] Contact Not Found in Xero                        |   |
|   |                                                       |   |
|   |  The customer "Acme Corporation" doesn't exist        |   |
|   |  in your Xero organization.                           |   |
|   |                                                       |   |
|   |  +---------------------------------------------------+|   |
|   |  | OPTION 1: Create Contact in Xero                  ||   |
|   |  |                                                   ||   |
|   |  | This will create a new contact in Xero            ||   |
|   |  | with the customer's details.                      ||   |
|   |  |                                                   ||   |
|   |  | [ Create & Sync ]                                 ||   |
|   |  +---------------------------------------------------+|   |
|   |                                                       |   |
|   |  +---------------------------------------------------+|   |
|   |  | OPTION 2: Link to Existing Contact                ||   |
|   |  |                                                   ||   |
|   |  | Search for an existing Xero contact:              ||   |
|   |  | [Search Xero contacts...              ]           ||   |
|   |  |                                                   ||   |
|   |  | Suggestions:                                      ||   |
|   |  | ( ) Acme Corp (CON-00098)                         ||   |
|   |  | ( ) Acme Industries (CON-00145)                   ||   |
|   |  | ( ) ACME PTY LTD (CON-00201)                      ||   |
|   |  |                                                   ||   |
|   |  | [ Link & Sync ]                                   ||   |
|   |  +---------------------------------------------------+|   |
|   |                                                       |   |
|   +-------------------------------------------------------+   |
|                                                               |
+===============================================================+
```

---

## Desktop Wireframe (1280px+)

### Invoice List with Sync Status Column

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Invoices                                                         [+ New Invoice]       |
| Customers   |  --------------------------------------------------------------------------------------|
| Orders      |                                                                                        |
| Products    |  [Search invoices...                    ] [Status v] [Xero Sync v] [Date v]            |
| Jobs        |                                                                                        |
| Pipeline    |  Active Filters: [Sync Errors Only x]                              [Clear]             |
| Financial < |  --------------------------------------------------------------------------------------|
|  > Invoices |                                                                                        |
|  > Payments |  +--------------------------------------------------------------------------------+    |
|  > Credits  |  |                                                                                |    |
|  > Aging    |  | [ ] | Invoice #    | Customer        | Amount     | Status | Xero Sync | Due  |    |
| Settings    |  +-----+-------------+-----------------+------------+--------+-----------+------+    |
|             |  | [ ] | INV-0095    | Acme Corp       | $2,500.00  | Sent   | [* Synced] | Jan 15|    |
|             |  | [ ] | INV-0089    | Beta Industries | $5,000.00  | Sent   | [! Error]  | Jan 20|    |
|             |  | [ ] | INV-0078    | Gamma LLC       | $3,200.00  | Draft  | [~ Pending]| -     |    |
|             |  | [ ] | INV-0065    | Delta Inc       | $1,800.00  | Sent   | [- None]   | Jan 10|    |
|             |  | [ ] | INV-0052    | Epsilon Co      | $4,500.00  | Paid   | [* Synced] | Jan 5 |    |
|             |  +--------------------------------------------------------------------------------+    |
|             |                                                                                        |
|             |  Bulk Actions: [Sync Selected to Xero]  [Retry Failed Syncs]                           |
|             |                                                                                        |
|             |  < 1 2 3 ... 10 >                                    Showing 1-25 of 234 invoices      |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Xero Settings Page

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Settings > Xero Integration                                                           |
| Customers   |  --------------------------------------------------------------------------------------|
| Orders      |                                                                                        |
| Products    |  +-- CONNECTION STATUS ---------------------------------------------------------------+|
| Jobs        |  |                                                                                    ||
| Pipeline    |  |  [XERO Logo]                                   Status: [* CONNECTED]               ||
| Financial   |  |                                                                                    ||
| Settings <  |  |  Organization: Renoz Solutions Pty Ltd                                             ||
|  > General  |  |  Connected since: Dec 1, 2025                                                      ||
|  > Users    |  |  Last activity: 5 minutes ago                                                      ||
|  > Xero   < |  |                                                                                    ||
|  > Email    |  |  [Refresh Connection]    [Disconnect Xero]                                         ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- SYNC SETTINGS -------------------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  |  Invoice Sync                                                                      ||
|             |  |  ==================================================================================||
|             |  |                                                                                    ||
|             |  |  [x] Auto-sync invoices when sent                                                  ||
|             |  |      Automatically push invoices to Xero when marked as sent                       ||
|             |  |                                                                                    ||
|             |  |  [x] Sync invoice updates                                                          ||
|             |  |      Push changes when invoices are modified                                       ||
|             |  |                                                                                    ||
|             |  |  [x] Pull payment updates from Xero                                                ||
|             |  |      Import payments recorded in Xero                                              ||
|             |  |      Sync frequency: [Every 15 minutes v]                                          ||
|             |  |                                                                                    ||
|             |  |  ------------------------------------------------------------------------------------
|             |  |                                                                                    ||
|             |  |  Contact Sync                                                                      ||
|             |  |  ==================================================================================||
|             |  |                                                                                    ||
|             |  |  [x] Auto-create contacts in Xero                                                  ||
|             |  |      Create Xero contacts when syncing invoices for new customers                  ||
|             |  |                                                                                    ||
|             |  |  [ ] Two-way contact sync                                                          ||
|             |  |      Sync contact updates between Renoz and Xero                                   ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
|             |  +-- SYNC QUEUE ----------------------------------------------------------------------+|
|             |  |                                                                                    ||
|             |  |  Pending Syncs: 3          Failed Syncs: 2          [View Queue]                   ||
|             |  |                                                                                    ||
|             |  |  [Process Queue Now]    [Retry All Failed]                                         ||
|             |  |                                                                                    ||
|             |  +------------------------------------------------------------------------------------+|
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Sync Queue Dashboard

```
+======================================================================================================+
| Renoz CRM                                                                     [bell] [Joel v]        |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Settings    |  Xero Sync Queue                                                                       |
|   > Xero    |  Monitor and manage pending synchronizations                                           |
|             |  --------------------------------------------------------------------------------------|
|             |                                                                                        |
|             |  +-- QUEUE SUMMARY ---+  +-- FAILED ---------+  +-- SUCCESS (24h) ---+                 |
|             |  | Pending: 3         |  | Failed: 2         |  | Synced: 45         |                 |
|             |  | Next: 30 seconds   |  | [Retry All]       |  | Last: 2 min ago    |                 |
|             |  +--------------------+  +-------------------+  +--------------------+                 |
|             |                                                                                        |
|             |  +-- PENDING QUEUE ---------------------------------------------------------------+    |
|             |  |                                                                                |    |
|             |  | Type     | Reference       | Customer        | Status      | Queued     | Actions|
|             |  +----------+----------------+-----------------+-------------+------------+--------+
|             |  | Invoice  | INV-2026-0098  | Omega Corp      | Queued      | 2 min ago  | [X]    |
|             |  | Invoice  | INV-2026-0097  | Theta Inc       | Processing  | 5 min ago  | -      |
|             |  | Payment  | PMT-2026-0045  | Acme Corp       | Queued      | 10 min ago | [X]    |
|             |  +--------------------------------------------------------------------------------+    |
|             |                                                                                        |
|             |  +-- FAILED SYNCS ----------------------------------------------------------------+    |
|             |  |                                                                                |    |
|             |  | Type     | Reference       | Customer        | Error           | Actions       |    |
|             |  +----------+----------------+-----------------+-----------------+---------------+    |
|             |  | Invoice  | INV-2026-0089  | Beta Industries | Contact missing | [Fix] [Retry] |    |
|             |  | Contact  | CUS-2026-0045  | Zeta LLC        | Validation fail | [Fix] [Retry] |    |
|             |  +--------------------------------------------------------------------------------+    |
|             |                                                                                        |
|             |  +-- RECENT ACTIVITY -------------------------------------------------------------+    |
|             |  |                                                                                |    |
|             |  |  [*] Jan 10, 2:30 PM  INV-2026-0095 synced to Xero (INV-00456)                 |    |
|             |  |  [*] Jan 10, 2:15 PM  Payment PMT-2026-0044 imported from Xero ($2,500.00)     |    |
|             |  |  [!] Jan 10, 2:00 PM  INV-2026-0089 sync failed: Contact not found            |    |
|             |  |  [*] Jan 10, 1:45 PM  INV-2026-0094 synced to Xero (INV-00455)                 |    |
|             |  |  [*] Jan 10, 1:30 PM  Contact CUS-0098 linked to Xero (CON-00234)              |    |
|             |  |                                                                                |    |
|             |  +--------------------------------------------------------------------------------+    |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
+-- CHECKING SYNC STATUS ---------------------+
|                                            |
|  [XERO]  [[spin] Checking...]              |
|                                            |
|  Verifying sync status with Xero           |
|                                            |
+--------------------------------------------+

+-- SYNCING TO XERO --------------------------+
|                                            |
|  [XERO]  [[spin] SYNCING]                  |
|                                            |
|  Pushing invoice to Xero...                |
|  [=====>                    ] 25%          |
|                                            |
|  Step 2/4: Validating line items           |
|                                            |
+--------------------------------------------+

+-- REFRESHING FROM XERO ---------------------+
|                                            |
|  [XERO]  [[spin] Refreshing...]            |
|                                            |
|  Pulling latest data from Xero             |
|                                            |
+--------------------------------------------+
```

### Error States

```
+-- CONNECTION ERROR -------------------------+
|                                            |
|  [!] Xero Connection Lost                  |
|                                            |
|  We couldn't connect to your Xero          |
|  account. This might be due to:            |
|                                            |
|  * Expired authentication                  |
|  * Network issues                          |
|  * Xero service unavailable                |
|                                            |
|  [Reconnect to Xero]    [Try Again]        |
|                                            |
+--------------------------------------------+

+-- SYNC ERROR -------------------------------+
|                                            |
|  [!] Sync Failed                           |
|                                            |
|  Error: VALIDATION_ERROR                   |
|                                            |
|  "Due date cannot be in the past"          |
|                                            |
|  [Edit Invoice]    [Retry Anyway]          |
|                                            |
+--------------------------------------------+

+-- CONTACT NOT FOUND ------------------------+
|                                            |
|  [!] Contact Not Found in Xero             |
|                                            |
|  The customer "Acme Corporation"           |
|  doesn't exist in your Xero account.       |
|                                            |
|  [Create in Xero]  [Link Existing]         |
|                                            |
+--------------------------------------------+

+-- DUPLICATE DETECTED -----------------------+
|                                            |
|  [!] Possible Duplicate                    |
|                                            |
|  An invoice with similar details           |
|  already exists in Xero:                   |
|                                            |
|  INV-00456 - $5,000.00 - Jan 10            |
|                                            |
|  [Link to Existing]  [Create Anyway]       |
|                                            |
+--------------------------------------------+
```

### Success States

```
+-- SYNC COMPLETE ----------------------------+
|                                            |
|  [check] Synced to Xero                    |
|                                            |
|  Invoice INV-2026-0089 is now              |
|  Xero Invoice INV-00456                    |
|                                            |
|  [View in Xero]                            |
|                                            |
|  <- Toast (5 seconds)                      |
+--------------------------------------------+

+-- PAYMENT IMPORTED -------------------------+
|                                            |
|  [check] Payment imported from Xero        |
|                                            |
|  $2,500.00 payment recorded for            |
|  INV-2026-0089                             |
|                                            |
|  <- Toast (3 seconds)                      |
+--------------------------------------------+

+-- CONTACT LINKED ---------------------------+
|                                            |
|  [check] Contact linked                    |
|                                            |
|  Acme Corporation is now linked to         |
|  Xero contact CON-00123                    |
|                                            |
|  <- Toast (3 seconds)                      |
+--------------------------------------------+
```

---

## Accessibility Requirements

### Focus Order

1. **Sync Status Section**
   - Tab: Status badge -> View in Xero -> Refresh -> Manual Sync
   - Enter: Activate buttons/links
   - Escape: Close any open modals

2. **Error Resolution Modal**
   - Focus trapped within modal
   - Tab: Close -> Option 1 -> Option 2 -> Search (if applicable)
   - Escape: Close modal

3. **Invoice List (Sync Column)**
   - Tab: Navigate between rows
   - Enter on sync status: Open detail/error resolution
   - Space: Select row for bulk actions

### ARIA Requirements

```html
<!-- Sync Status Badge -->
<div
  role="status"
  aria-live="polite"
  aria-label="Xero sync status: Synced. Last synced 5 minutes ago."
>
  <span class="status-badge synced">SYNCED</span>
</div>

<!-- Error Status with Action -->
<div
  role="alert"
  aria-live="assertive"
  aria-label="Xero sync error: Contact not found"
>
  <span class="status-badge error">SYNC ERROR</span>
  <button aria-label="Fix sync error for invoice INV-2026-0089">
    Resolve
  </button>
</div>

<!-- Syncing Indicator -->
<div
  role="status"
  aria-live="polite"
  aria-busy="true"
  aria-label="Syncing invoice to Xero, 50 percent complete"
>
  <span class="spinner" aria-hidden="true"></span>
  <span>Syncing...</span>
  <progress value="50" max="100">50%</progress>
</div>

<!-- Xero Link -->
<a
  href="https://go.xero.com/..."
  target="_blank"
  rel="noopener noreferrer"
  aria-label="View invoice INV-00456 in Xero (opens in new tab)"
>
  View in Xero
</a>

<!-- Error Resolution Dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="error-title"
  aria-describedby="error-description"
>
  <h2 id="error-title">Resolve Sync Error</h2>
  <p id="error-description">
    The customer contact was not found in Xero.
    Choose an option to resolve this issue.
  </p>

  <fieldset>
    <legend>Resolution Options</legend>
    <div role="radiogroup" aria-label="Error resolution options">
      <label>
        <input type="radio" name="resolution" value="create" />
        Create contact in Xero
      </label>
      <label>
        <input type="radio" name="resolution" value="link" />
        Link to existing contact
      </label>
    </div>
  </fieldset>
</div>

<!-- Sync Queue Table -->
<table aria-label="Pending sync queue">
  <thead>
    <tr>
      <th scope="col">Type</th>
      <th scope="col">Reference</th>
      <th scope="col">Status</th>
      <th scope="col">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr aria-label="Invoice INV-2026-0098, queued for sync">
      <!-- Row content -->
    </tr>
  </tbody>
</table>
```

### Screen Reader Announcements

- Sync started: "Syncing invoice INV-2026-0089 to Xero"
- Sync progress: "Sync progress: 50 percent. Validating line items."
- Sync complete: "Invoice successfully synced to Xero as INV-00456"
- Sync error: "Error syncing invoice. Contact not found in Xero. Press Enter to resolve."
- Payment imported: "Payment of $2,500 imported from Xero"
- Connection status: "Xero connection status: Connected to Renoz Solutions Pty Ltd"

---

## Animation Choreography

### Status Badge Transitions

```
NOT_SYNCED -> SYNCING:
- Duration: 200ms
- Badge color: gray -> blue
- Spinner fade in: 100ms
- Text change: "Not Synced" -> "Syncing..."

SYNCING -> SYNCED:
- Duration: 300ms
- Spinner -> Checkmark: morph animation
- Badge color: blue -> green
- Pulse effect: 200ms

SYNCING -> ERROR:
- Duration: 300ms
- Spinner -> X icon: morph animation
- Badge color: blue -> red
- Shake effect: 150ms
```

### Progress Indicator

```
PROGRESS UPDATE:
- Duration: 300ms per step
- Bar fill: smooth left to right
- Percentage: count up
- Step text: fade transition (150ms)
```

### Error Alert Entry

```
ERROR APPEAR:
- Duration: 300ms
- Transform: translateY(-10px) -> translateY(0)
- Opacity: 0 -> 1
- Background: subtle red pulse (200ms)
```

### View in Xero Link

```
HOVER:
- Duration: 150ms
- Underline: grow from center
- Icon: slight translateX (arrow indication)

CLICK:
- Duration: 100ms
- Scale: 1 -> 0.98 -> 1
- New tab opens
```

### Sync Queue Row

```
ITEM COMPLETE:
- Duration: 400ms
- Status icon: spin -> checkmark
- Row background: blue -> green fade
- Row exit: slide up and fade (300ms)

ITEM ERROR:
- Duration: 300ms
- Status icon: spin -> X
- Row background: red flash
- Shake effect: 150ms
```

---

## Component Props Interfaces

```typescript
// Sync Status Types
type XeroSyncStatus = 'not_synced' | 'pending' | 'syncing' | 'synced' | 'error';

interface XeroSyncInfo {
  status: XeroSyncStatus;
  xeroInvoiceId?: string;
  xeroInvoiceNumber?: string;
  xeroContactId?: string;
  lastSyncedAt?: Date;
  error?: XeroSyncError;
  syncHistory: XeroSyncEvent[];
}

interface XeroSyncError {
  code: string;
  message: string;
  details?: string;
  occurredAt: Date;
  attempts: number;
}

interface XeroSyncEvent {
  type: 'created' | 'updated' | 'payment' | 'error';
  timestamp: Date;
  description: string;
  xeroRef?: string;
}

// Sync Status Badge
interface XeroSyncStatusBadgeProps {
  status: XeroSyncStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
}

// Sync Status Panel
interface XeroSyncPanelProps {
  invoiceId: string;
  syncInfo: XeroSyncInfo;
  onSync?: () => void;
  onRefresh?: () => void;
  onResolveError?: () => void;
  variant?: 'compact' | 'detailed';
}

// Sync Error Dialog
interface XeroSyncErrorDialogProps {
  invoice: Invoice;
  error: XeroSyncError;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateContact?: () => void;
  onLinkContact?: (xeroContactId: string) => void;
  onRetry?: () => void;
}

// Xero Contact Search
interface XeroContactSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (contact: XeroContact) => void;
}

interface XeroContact {
  id: string;
  name: string;
  email?: string;
}

// Manual Sync Dialog
interface ManualSyncDialogProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSync?: (options: SyncOptions) => void;
}

interface SyncOptions {
  includeLineItems: boolean;
  includeTax: boolean;
  markAsSent: boolean;
}

// Sync Queue
interface XeroSyncQueueProps {
  onProcessQueue?: () => void;
  onRetryFailed?: () => void;
}

interface SyncQueueItem {
  id: string;
  type: 'invoice' | 'payment' | 'contact' | 'credit_note';
  referenceId: string;
  referenceNumber: string;
  customerName: string;
  status: 'queued' | 'processing' | 'failed';
  error?: string;
  queuedAt: Date;
}

// Sync Activity Log
interface XeroSyncActivityLogProps {
  limit?: number;
  filterType?: SyncQueueItem['type'];
}

interface SyncActivity {
  id: string;
  type: SyncQueueItem['type'];
  action: 'sync' | 'import' | 'error';
  referenceNumber: string;
  xeroRef?: string;
  description: string;
  timestamp: Date;
  success: boolean;
}

// Xero Settings
interface XeroSettingsProps {
  connection: XeroConnection | null;
  settings: XeroSyncSettings;
  onSettingsChange: (settings: XeroSyncSettings) => void;
  onReconnect?: () => void;
  onDisconnect?: () => void;
}

interface XeroConnection {
  organizationName: string;
  connectedAt: Date;
  lastActivityAt: Date;
}

interface XeroSyncSettings {
  autoSyncOnSend: boolean;
  syncUpdates: boolean;
  pullPayments: boolean;
  pullPaymentFrequency: '5min' | '15min' | '30min' | '1hour';
  autoCreateContacts: boolean;
  twoWayContactSync: boolean;
}
```

---

## Component Mapping

| Wireframe Element | React Component | Shadcn/UI Base |
|-------------------|-----------------|----------------|
| Status badge | XeroSyncStatusBadge | Badge |
| Sync panel | XeroSyncPanel | Card |
| Error dialog | XeroSyncErrorDialog | Dialog |
| Contact search | XeroContactSearch | Command, Popover |
| Manual sync | ManualSyncDialog | Dialog |
| Sync queue | XeroSyncQueue | Table |
| Activity log | XeroSyncActivityLog | - |
| Settings page | XeroSettingsPage | - |
| Connection card | XeroConnectionCard | Card |
| Empty state | XeroNotConnected | - |

---

## Files to Create/Modify

### Create
- `src/components/domain/financial/xero/xero-sync-status-badge.tsx`
- `src/components/domain/financial/xero/xero-sync-panel.tsx`
- `src/components/domain/financial/xero/xero-sync-error-dialog.tsx`
- `src/components/domain/financial/xero/xero-contact-search.tsx`
- `src/components/domain/financial/xero/manual-sync-dialog.tsx`
- `src/components/domain/financial/xero/xero-sync-queue.tsx`
- `src/components/domain/financial/xero/xero-sync-activity-log.tsx`
- `src/components/domain/financial/xero/xero-connection-card.tsx`
- `src/routes/_authed/settings/integrations/xero.tsx`

### Modify
- `src/routes/_authed/financial/invoices/$invoiceId.tsx` (add Xero Sync tab)
- `src/components/domain/financial/invoice-columns.tsx` (add Xero status column)
- `src/routes/_authed/financial/invoices/index.tsx` (add sync filter)
