# Wireframe: DOM-COMMS-003d - Campaign Management UI

## Story Reference

- **Story ID**: DOM-COMMS-003d
- **Name**: Add Campaign Management UI
- **PRD**: memory-bank/prd/domains/communications.prd.json
- **Type**: UI Component
- **Component Type**: MultiStepWizard with FilterBuilder and DataTable

## Overview

Campaign management interface for bulk email sends. Includes campaign creation wizard with template selection, recipient filtering, preview functionality, campaign list with status badges, and detailed campaign analytics.

## UI Patterns (Reference Implementation)

### MultiStepWizard
- **Pattern**: RE-UI Stepper + Tabs
- **Reference**: `_reference/.reui-reference/registry/default/ui/stepper.tsx`, `_reference/.reui-reference/registry/default/ui/tabs.tsx`
- **Features**:
  - 4-step progression: Details → Template → Recipients → Review
  - Step indicator with progress line animation
  - Forward/backward navigation with validation gating
  - Slide transitions between steps with directional awareness

### FilterBuilder
- **Pattern**: RE-UI Select + Badge + Checkbox
- **Reference**: `_reference/.reui-reference/registry/default/ui/select.tsx`, `_reference/.reui-reference/registry/default/ui/badge.tsx`, `_reference/.reui-reference/registry/default/ui/checkbox.tsx`
- **Features**:
  - Dynamic filter conditions (AND/OR logic)
  - Multi-select with tag chips for Customer Tags
  - Live recipient count updates on filter changes
  - Remove filter condition with confirmation

### RecipientPreviewPanel
- **Pattern**: RE-UI Card + ScrollArea
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `_reference/.reui-reference/registry/default/ui/scroll-area.tsx`
- **Features**:
  - Large recipient count display with user icon
  - Sample recipients list (first 3-5) with "View All" link
  - Real-time count updates when filters change
  - Loading skeleton during count calculation

### CampaignProgress
- **Pattern**: RE-UI Progress + Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/progress.tsx`, `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Animated progress bar with striped fill pattern
  - Batch status list showing completed/pending batches
  - Pause/Resume controls with confirmation dialogs
  - Estimated completion time calculation

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | Enhanced `emailHistory` with campaign tracking fields | EXISTS (needs enhancement) |
| **Server Functions Required** | `createCampaign`, `getCampaigns`, `getCampaignDetail`, `updateCampaign`, `cancelCampaign`, `pauseCampaign`, `resumeCampaign`, `getCampaignRecipients`, `sendTestEmail` | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-COMMS-003a, DOM-COMMS-003b, DOM-COMMS-003c | PENDING |

### Existing Schema Available
- `emailHistory` in `renoz-v2/lib/schema/email-history.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery manufacturer
- Bulk campaigns for new battery product launches, firmware updates, warranty extension offers
- Recipient filtering by customer tags (Commercial, Residential), system size, location
- Campaign analytics to measure battery product marketing effectiveness

---

## Mobile Wireframe (375px)

### Campaign List View

```
+=========================================+
| Communications                          |
+-----------------------------------------+
| [Summary] [Emails] [Scheduled] [Camps]  |
|                              ========   |
+-----------------------------------------+
|                                         |
|  Campaigns                    [+New]    |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | 15kWh Residential Launch            ||
|  |                                     ||
|  | [Completed]              Jan 5      ||
|  |                                     ||
|  | Sent: 1,245  |  Opened: 68%         ||
|  | Clicked: 34% |  Bounced: 1.2%       ||
|  |                                     ||
|  |             [View Details >]        ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Firmware Update Notice              ||
|  |                                     ||
|  | [In Progress]  [####........] 45%   ||
|  |                                     ||
|  | Sending: 567 of 1,250 recipients    ||
|  |                                     ||
|  |             [View Progress >]       ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Warranty Extension Offer            ||
|  |                                     ||
|  | [Scheduled]             Jan 20      ||
|  |                                     ||
|  | Recipients: 89                      ||
|  |                                     ||
|  |        [Edit]  [View Details >]     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | Holiday Sale                        ||
|  |                                     ||
|  | [Draft]                             ||
|  |                                     ||
|  | Recipients: Not yet selected        ||
|  |                                     ||
|  |       [Continue Setup >]            ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Campaign Wizard - Step 1: Details (Full Screen)

```
+=========================================+
| Create Campaign              Step 1/4   |
+-----------------------------------------+
|  CAMPAIGN DETAILS                       |
|                                         |
|  [1]----[2]----[3]----[4]               |
|   *                                     |
|  ─────────────────────────────────────  |
|                                         |
|  Campaign Name *                        |
|  +-------------------------------------+|
|  | February Newsletter                 ||
|  +-------------------------------------+|
|                                         |
|  Description                            |
|  +-------------------------------------+|
|  | Monthly update for all customers    ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  Category                               |
|  +----------------------------------v--+|
|  | Newsletter                          ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |             [Next: Template]        ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

### Campaign Wizard - Step 2: Template

```
+=========================================+
| Create Campaign              Step 2/4   |
+-----------------------------------------+
|  SELECT TEMPLATE                        |
|                                         |
|  [1]----[2]----[3]----[4]               |
|          *                              |
|  ─────────────────────────────────────  |
|                                         |
|  Template *                             |
|  +----------------------------------v--+|
|  | Select a template...                ||
|  +-------------------------------------+|
|                                         |
|  System Templates:                      |
|  +-------------------------------------+|
|  | ( ) Quote Sent                      ||
|  | ( ) Order Confirmation              ||
|  | ( ) Order Shipped                   ||
|  | (o) Newsletter                      ||
|  | ( ) Promotional                     ||
|  +-------------------------------------+|
|                                         |
|  Custom Templates:                      |
|  +-------------------------------------+|
|  | ( ) Holiday Special                 ||
|  | ( ) VIP Announcement                ||
|  +-------------------------------------+|
|                                         |
|  Subject Line *                         |
|  +-------------------------------------+|
|  | February Updates from Renoz         ||
|  +-------------------------------------+|
|                                         |
|  [Preview Template]                     |
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  ( Back )           [Next: Recipients]  |
|                                         |
+=========================================+
```

### Campaign Wizard - Step 3: Recipients

```
+=========================================+
| Create Campaign              Step 3/4   |
+-----------------------------------------+
|  SELECT RECIPIENTS                      |
|                                         |
|  [1]----[2]----[3]----[4]               |
|                 *                       |
|  ─────────────────────────────────────  |
|                                         |
|  Who should receive this campaign?      |
|                                         |
|  FILTER BY:                             |
|                                         |
|  Customer Tags                          |
|  +-------------------------------------+|
|  | [All Customers v]                   ||
|  +-------------------------------------+|
|  [VIP]  [Enterprise]  [+Add]            |
|                                         |
|  Customer Status                        |
|  +-------------------------------------+|
|  | [Active only v]                     ||
|  +-------------------------------------+|
|                                         |
|  Has Opted In                           |
|  [x] Email marketing opt-in required    |
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  PREVIEW                                |
|  +-------------------------------------+|
|  |                                     ||
|  |   [users]  1,234 recipients         ||
|  |            will receive this        ||
|  |            campaign                 ||
|  |                                     ||
|  |   [View Sample Recipients]          ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  ( Back )                [Next: Review] |
|                                         |
+=========================================+
```

### Campaign Wizard - Step 4: Review & Send

```
+=========================================+
| Create Campaign              Step 4/4   |
+-----------------------------------------+
|  REVIEW & SEND                          |
|                                         |
|  [1]----[2]----[3]----[4]               |
|                         *               |
|  ─────────────────────────────────────  |
|                                         |
|  CAMPAIGN SUMMARY                       |
|  +-------------------------------------+|
|  | Name: February Newsletter           ||
|  | Template: Newsletter                ||
|  | Subject: February Updates...        ||
|  +-------------------------------------+|
|                                         |
|  RECIPIENTS                             |
|  +-------------------------------------+|
|  | 1,234 recipients                    ||
|  | Filtered by: VIP, Enterprise        ||
|  | Active customers only               ||
|  +-------------------------------------+|
|                                         |
|  SEND OPTIONS                           |
|  ( ) Send Now                           |
|  (o) Schedule Send                      |
|                                         |
|      +-------------------------------+ |
|      | [cal] Jan 15, 2026            | |
|      +-------------------------------+ |
|      +-------------------------------+ |
|      | [clock] 9:00 AM EST           | |
|      +-------------------------------+ |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  [Send Test Email]                  ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  ─────────────────────────────────────  |
|                                         |
|  ( Back )         [!Schedule Campaign]  |
|                                         |
+=========================================+
```

### Campaign Detail View (Mobile)

```
+=========================================+
| < Campaigns                             |
+-----------------------------------------+
|                                         |
|  Q1 Product Launch                      |
|  [Completed]                            |
|  ─────────────────────────────────────  |
|                                         |
|  +-- SUMMARY -------------------------+ |
|  |                                     | |
|  |    Sent          Recipients         | |
|  |   1,245             1,250           | |
|  |                   (99.6%)           | |
|  |                                     | |
|  +-------------------------------------+ |
|                                         |
|  +-- ENGAGEMENT ----------------------+ |
|  |                                     | |
|  |   Opened         Clicked            | |
|  |    851             429              | |
|  |   (68.4%)        (34.5%)            | |
|  |                                     | |
|  |   Bounced        Unsubscribed       | |
|  |     15               3              | |
|  |   (1.2%)          (0.2%)            | |
|  |                                     | |
|  +-------------------------------------+ |
|                                         |
|  +-- PERFORMANCE ---------------------+ |
|  |                                     | |
|  |  Open Rate Over Time                | |
|  |      ___                            | |
|  |   __/   \__                         | |
|  |  /         \_____                   | |
|  |  Day 1   Day 3   Day 7              | |
|  |                                     | |
|  +-------------------------------------+ |
|                                         |
|  RECIPIENT LIST                         |
|  +-------------------------------------+|
|  | john@acme.com          * Opened     ||
|  | sarah@beta.io          * Clicked    ||
|  | mike@gamma.co          * Delivered  ||
|  | ...                                 ||
|  |             [View All Recipients]   ||
|  +-------------------------------------+|
|                                         |
|  [ Export Report ]                      |
|                                         |
+=========================================+
```

### Campaign Progress (Sending)

```
+=========================================+
| < Campaigns                             |
+-----------------------------------------+
|                                         |
|  January Newsletter                     |
|  [In Progress]                          |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  |                                     ||
|  |  SENDING IN PROGRESS                ||
|  |                                     ||
|  |  +-------------------------------+  ||
|  |  | ################............. |  ||
|  |  +-------------------------------+  ||
|  |            567 / 1,250              ||
|  |              45.4%                  ||
|  |                                     ||
|  |  Started: 2 minutes ago             ||
|  |  Est. completion: ~5 minutes        ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  BATCH STATUS                           |
|  +-------------------------------------+|
|  | Batch 1: 100/100        * Complete  ||
|  | Batch 2: 100/100        * Complete  ||
|  | Batch 3: 100/100        * Complete  ||
|  | Batch 4: 100/100        * Complete  ||
|  | Batch 5: 100/100        * Complete  ||
|  | Batch 6: 67/100         [progress]  ||
|  | Batch 7-13: Pending                 ||
|  +-------------------------------------+|
|                                         |
|  [!] [Pause Sending]                    |
|                                         |
+=========================================+
```

### Empty State (Mobile)

```
+=========================================+
| Communications                          |
+-----------------------------------------+
| [Summary] [Emails] [Scheduled] [Camps]  |
|                              ========   |
+-----------------------------------------+
|                                         |
|                                         |
|            +---------------+            |
|            |   [megaphone] |            |
|            +---------------+            |
|                                         |
|        No Campaigns Created             |
|                                         |
|   Send bulk emails to groups of         |
|   customers. Great for:                 |
|                                         |
|   * Newsletters and updates             |
|   * Product announcements               |
|   * Promotional offers                  |
|                                         |
|   +-------------------------------+     |
|   |                               |     |
|   |      [Create Campaign]        |     |
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
|                              ========   |
+-----------------------------------------+
|                                         |
|  Campaigns                              |
|  ─────────────────────────────────────  |
|                                         |
|  +-------------------------------------+|
|  | ........................            ||
|  |                                     ||
|  | [............]        .........    ||
|  |                                     ||
|  | ........  |  .........              ||
|  | ........  |  .........              ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
|  +-------------------------------------+|
|  | ........................            ||
|  |                                     ||
|  | [............]        .........    ||
|  |                                     ||
|  | ........  |  .........              ||
|  | ........  |  .........              ||
|  |                                     ||
|  +-------------------------------------+|
|                                         |
+=========================================+
```

---

## Tablet Wireframe (768px)

### Campaign List

```
+=========================================================================+
| Communications                                                           |
+-------------------------------------------------------------------------+
| [Summary] [Emails] [Scheduled] [Templates] [Campaigns] [Calls]           |
|                                             =========                    |
+-------------------------------------------------------------------------+
|                                                                          |
|  Campaigns                                           [+ Create Campaign] |
|  ─────────────────────────────────────────────────────────────────────   |
|                                                                          |
|  +--------------------------------------------------------------------+ |
|  | Name                | Status      | Recipients | Sent     | Open   | |
|  +--------------------------------------------------------------------+ |
|  | Q1 Product Launch   | * Completed | 1,245      | Jan 5    | 68.4%  | |
|  | January Newsletter  | [#####] 45% | 567/1,250  | Sending  | -      | |
|  | VIP Appreciation    | Scheduled   | 89         | Jan 20   | -      | |
|  | Holiday Sale        | Draft       | -          | -        | -      | |
|  +--------------------------------------------------------------------+ |
|                                                                          |
|  < 1 2 3 >                                  Showing 1-4 of 4 campaigns   |
|                                                                          |
+=========================================================================+
```

### Campaign Wizard (Modal)

```
+=========================================================================+
| Create Campaign                                                    [X]   |
+-------------------------------------------------------------------------+
|                                                                          |
|  +------+    +----------+    +------------+    +--------+                |
|  | [1]  |----| [2]      |----| [3]        |----| [4]    |                |
|  |Details    | Template |    | Recipients |    | Review |                |
|  |  *   |    |          |    |            |    |        |                |
|  +------+    +----------+    +------------+    +--------+                |
|                                                                          |
|  +-- LEFT PANEL -----------------------+  +-- RIGHT PANEL -------------+ |
|  |                                     |  |                            | |
|  |  Campaign Name *                    |  |  PREVIEW                   | |
|  |  +-------------------------------+  |  |                            | |
|  |  | February Newsletter           |  |  |  +----------------------+  | |
|  |  +-------------------------------+  |  |  |                      |  | |
|  |                                     |  |  |  [Preview will       |  | |
|  |  Description                        |  |  |   appear here        |  | |
|  |  +-------------------------------+  |  |  |   when template      |  | |
|  |  | Monthly update for all        |  |  |  |   is selected]       |  | |
|  |  | customers with product news   |  |  |  |                      |  | |
|  |  +-------------------------------+  |  |  +----------------------+  | |
|  |                                     |  |                            | |
|  |  Category                           |  |                            | |
|  |  +----------------------------v--+  |  |                            | |
|  |  | Newsletter                    |  |  |                            | |
|  |  +-------------------------------+  |  |                            | |
|  |                                     |  |                            | |
|  +-------------------------------------+  +----------------------------+ |
|                                                                          |
|                                            ( Cancel )  [Next: Template]  |
|                                                                          |
+=========================================================================+
```

---

## Desktop Wireframe (1280px+)

### Campaigns Tab with Detail Panel

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Communications                                        [+ Compose]  [Settings]         |
| Customers   |  ─────────────────────────────────────────────────────────────────────────────────     |
| Orders      |                                                                                        |
| Products    |  [Summary] [Emails] [Scheduled] [Templates] [Campaigns] [Calls]                        |
| Jobs        |                                              =========                                 |
| Pipeline    |                                                                                        |
| Support     |  +-- CAMPAIGN LIST ---------------------------------+  +-- CAMPAIGN DETAIL ----------+ |
| Communi..   |  |                                                  |  |                             | |
|   <         |  |  [+ Create Campaign]      [Filter v] [Search___] |  |  Q1 Product Launch          | |
|             |  |                                                  |  |  [Completed]                | |
|             |  |  +--------------------------------------------+  |  |                             | |
|             |  |  | Name              | Status    | Recipients |  |  |  Sent: Jan 5, 2026          | |
|             |  |  |-------------------+-----------+------------|  |  |  Template: Newsletter       | |
|             |  |  |*Q1 Product Launch | Completed |    1,245   |  |  |                             | |
|             |  |  | January Newsletter| Sending   |   567/1250 |  |  |  ─────────────────────────  | |
|             |  |  | VIP Appreciation  | Scheduled |      89    |  |  |                             | |
|             |  |  | Holiday Sale      | Draft     |      -     |  |  |  STATS                      | |
|             |  |  +--------------------------------------------+  |  |  +-------------------------+ | |
|             |  |                                                  |  |  | Sent    | 1,245 (99.6%) | | |
|             |  |  < 1 2 3 >                  Showing 1-4 of 4    |  |  | Opened  |   851 (68.4%) | | |
|             |  |                                                  |  |  | Clicked |   429 (34.5%) | | |
|             |  +--------------------------------------------------+  |  | Bounced |    15 (1.2%)  | | |
|             |                                                        |  +-------------------------+ | |
|             |                                                        |                             | |
|             |                                                        |  ENGAGEMENT CHART           | |
|             |                                                        |      ___                    | |
|             |                                                        |   __/   \____               | |
|             |                                                        |  /           \____          | |
|             |                                                        |  Day 1  Day 3  Day 7        | |
|             |                                                        |                             | |
|             |                                                        |  [View Full Report]         | |
|             |                                                        |  [Export CSV]               | |
|             |                                                        |                             | |
|             |                                                        +-----------------------------+ |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Campaign Creation Wizard (Full Page)

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  Create Campaign                                                         [X] Cancel    |
| Customers   |  ─────────────────────────────────────────────────────────────────────────────────     |
| Orders      |                                                                                        |
| Products    |  +------+    +----------+    +------------+    +--------+                              |
| Jobs        |  | [1]  |----| [2]      |----| [3]        |----| [4]    |                              |
| Pipeline    |  |Details    | Template |    | Recipients |    | Review |                              |
| Support     |  |  *   |    |          |    |            |    |        |                              |
| Communi..   |  +------+    +----------+    +------------+    +--------+                              |
|             |                                                                                        |
|             |  +-- STEP CONTENT -------------------------------------------------------------------+  |
|             |  |                                                                                   |  |
|             |  |  +-- FORM ------------------------------------+  +-- PREVIEW -------------------+|  |
|             |  |  |                                            |  |                              ||  |
|             |  |  |  Campaign Name *                           |  |  Live Preview                ||  |
|             |  |  |  +--------------------------------------+  |  |                              ||  |
|             |  |  |  | February Newsletter                  |  |  |  +------------------------+  ||  |
|             |  |  |  +--------------------------------------+  |  |  |                        |  ||  |
|             |  |  |                                            |  |  |  [Renoz Logo]          |  ||  |
|             |  |  |  Description                               |  |  |                        |  ||  |
|             |  |  |  +--------------------------------------+  |  |  |  Subject:              |  ||  |
|             |  |  |  | Monthly update for all customers    |  |  |  |  February Updates      |  ||  |
|             |  |  |  | with product news and tips.         |  |  |  |                        |  ||  |
|             |  |  |  +--------------------------------------+  |  |  |  Hi {firstName},       |  ||  |
|             |  |  |                                            |  |  |                        |  ||  |
|             |  |  |  Category                                  |  |  |  Here's what's new...  |  ||  |
|             |  |  |  +-----------------------------------v--+  |  |  |                        |  ||  |
|             |  |  |  | Newsletter                           |  |  |  |  [Read More]          |  ||  |
|             |  |  |  +--------------------------------------+  |  |  |                        |  ||  |
|             |  |  |                                            |  |  +------------------------+  ||  |
|             |  |  +--------------------------------------------+  |                              ||  |
|             |  |                                                  +------------------------------+|  |
|             |  |                                                                                   |  |
|             |  +-----------------------------------------------------------------------------------+  |
|             |                                                                                        |
|             |                                                          ( Back )  [Next: Template]    |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

### Step 3: Recipients Filter Builder

```
+======================================================================================================+
|             |                                                                                        |
|             |  +-- STEP CONTENT -------------------------------------------------------------------+  |
|             |  |                                                                                   |  |
|             |  |  +-- FILTER BUILDER ---------------------------+  +-- RECIPIENT PREVIEW -------+|  |
|             |  |  |                                             |  |                             ||  |
|             |  |  |  BUILD YOUR AUDIENCE                        |  |  PREVIEW                    ||  |
|             |  |  |                                             |  |                             ||  |
|             |  |  |  +-- Filter Group 1 -------------------+    |  |  +-------------------------+||  |
|             |  |  |  |                                     |    |  |  |                         |||  |
|             |  |  |  | Customer Tags                       |    |  |  |   [users]               |||  |
|             |  |  |  | [is any of v]                       |    |  |  |                         |||  |
|             |  |  |  | [VIP x] [Enterprise x] [+Add]       |    |  |  |   1,234                 |||  |
|             |  |  |  |                               [X]   |    |  |  |   Recipients            |||  |
|             |  |  |  +-------------------------------------+    |  |  |                         |||  |
|             |  |  |                                             |  |  +-------------------------+||  |
|             |  |  |  [AND]                                      |  |                             ||  |
|             |  |  |                                             |  |  SAMPLE RECIPIENTS          ||  |
|             |  |  |  +-- Filter Group 2 -------------------+    |  |  +-------------------------+||  |
|             |  |  |  |                                     |    |  |  | john@acme.com          |||  |
|             |  |  |  | Customer Status                     |    |  |  | Acme Corporation       |||  |
|             |  |  |  | [equals v]                          |    |  |  |------------------------|  |
|             |  |  |  | [Active v]                          |    |  |  | sarah@beta.io          |||  |
|             |  |  |  |                               [X]   |    |  |  | Beta Industries        |||  |
|             |  |  |  +-------------------------------------+    |  |  |------------------------|  |
|             |  |  |                                             |  |  | mike@gamma.co          |||  |
|             |  |  |  [+ Add Filter]                             |  |  | Gamma LLC              |||  |
|             |  |  |                                             |  |  +-------------------------+||  |
|             |  |  |  ─────────────────────────────────────────  |  |                             ||  |
|             |  |  |                                             |  |  [View All 1,234]           ||  |
|             |  |  |  OPTIONS                                    |  |                             ||  |
|             |  |  |  [x] Only include opted-in contacts         |  |                             ||  |
|             |  |  |  [ ] Exclude recent recipients (7 days)     |  |                             ||  |
|             |  |  |                                             |  |                             ||  |
|             |  |  +---------------------------------------------+  +-----------------------------+|  |
|             |  |                                                                                   |  |
|             |  +-----------------------------------------------------------------------------------+  |
|             |                                                                                        |
+------------------------------------------------------------------------------------------------------+
```

### Campaign Detail Report (Full Page)

```
+======================================================================================================+
| Renoz CRM                                                                      [bell] [Joel v]       |
+-------------+----------------------------------------------------------------------------------------+
|             |                                                                                        |
| Dashboard   |  < Back to Campaigns                                                                   |
| Customers   |                                                                                        |
| Orders      |  Q1 Product Launch                                        [Export PDF]  [Export CSV]   |
| Products    |  [Completed] Sent on Jan 5, 2026                                                       |
| Jobs        |  ─────────────────────────────────────────────────────────────────────────────────     |
| Pipeline    |                                                                                        |
| Support     |  +-- OVERVIEW STATS ----------------------------------------------------------------+  |
| Communi..   |  |                                                                                  |  |
|             |  |  +----------------+  +----------------+  +----------------+  +----------------+  |  |
|             |  |  | Sent           |  | Delivered      |  | Opened         |  | Clicked        |  |  |
|             |  |  |      1,245     |  |      1,240     |  |       851      |  |       429      |  |  |
|             |  |  |    (100%)      |  |    (99.6%)     |  |    (68.4%)     |  |    (34.5%)     |  |  |
|             |  |  +----------------+  +----------------+  +----------------+  +----------------+  |  |
|             |  |                                                                                  |  |
|             |  |  +----------------+  +----------------+  +----------------+                      |  |
|             |  |  | Bounced        |  | Unsubscribed   |  | Spam Reports   |                      |  |
|             |  |  |        15      |  |         3      |  |         0      |                      |  |
|             |  |  |    (1.2%)      |  |    (0.2%)      |  |    (0.0%)      |                      |  |
|             |  |  +----------------+  +----------------+  +----------------+                      |  |
|             |  |                                                                                  |  |
|             |  +---------------------------------------------------------------------------------+  |
|             |                                                                                        |
|             |  +-- ENGAGEMENT OVER TIME ----------------------+  +-- TOP CLICKED LINKS ---------+   |
|             |  |                                              |  |                              |   |
|             |  |       ^                                      |  |  Link                Clicks  |   |
|             |  |  80%  |      ___                             |  |  ─────────────────────────── |   |
|             |  |       |   __/   \                            |  |  View Products         187   |   |
|             |  |  60%  |  /       \____                       |  |  Learn More            145   |   |
|             |  |       | /             \____                  |  |  Contact Us             56   |   |
|             |  |  40%  |/                   \___              |  |  Unsubscribe            41   |   |
|             |  |       +-------------------------->           |  |                              |   |
|             |  |       Day 1  Day 3  Day 5  Day 7             |  |                              |   |
|             |  |                                              |  |                              |   |
|             |  |  [---] Opens  [---] Clicks                   |  |                              |   |
|             |  +----------------------------------------------+  +------------------------------+   |
|             |                                                                                        |
|             |  +-- RECIPIENT LIST ----------------------------------------------------------------+  |
|             |  |                                                                                  |  |
|             |  |  [Search_________________]  [Status: All v]  [Export Selected]                  |  |
|             |  |                                                                                  |  |
|             |  |  +----------------------------------------------------------------------------+ |  |
|             |  |  | [ ]  Email              | Customer        | Status    | Opened   | Clicked | |  |
|             |  |  |------+------------------+-----------------+-----------+----------+---------|  |
|             |  |  | [ ]  john@acme.com      | Acme Corp       | Clicked   | Jan 5    | Jan 5   | |  |
|             |  |  | [ ]  sarah@beta.io      | Beta Industries | Opened    | Jan 5    | -       | |  |
|             |  |  | [ ]  mike@gamma.co      | Gamma LLC       | Delivered | -        | -       | |  |
|             |  |  | [ ]  contact@delta.com  | Delta Inc       | Bounced   | -        | -       | |  |
|             |  |  +----------------------------------------------------------------------------+ |  |
|             |  |                                                                                  |  |
|             |  |  < 1 2 3 ... 125 >                                      Showing 1-10 of 1,245   |  |
|             |  |                                                                                  |  |
|             |  +---------------------------------------------------------------------------------+  |
|             |                                                                                        |
+-------------+----------------------------------------------------------------------------------------+
```

---

## Interaction States

### Loading States

```
WIZARD STEP LOADING:
+--------------------------------------------------+
|                                                   |
|  Loading recipients...                            |
|                                                   |
|  +---------------------------------------------+ |
|  |              [spinner]                      | |
|  |                                             | |
|  |       Calculating recipient count...        | |
|  +---------------------------------------------+ |
|                                                   |
+--------------------------------------------------+

CAMPAIGN SENDING:
+--------------------------------------------------+
|                                                   |
|  +---------------------------------------------+ |
|  |  SENDING IN PROGRESS                        | |
|  |                                             | |
|  |  +---------------------------------------+  | |
|  |  | ################.....................  |  | |
|  |  +---------------------------------------+  | |
|  |           567 / 1,250 (45.4%)              | |
|  |                                             | |
|  |  * Batch 6 of 13 in progress               | |
|  |  Est. time remaining: ~5 minutes           | |
|  +---------------------------------------------+ |
|                                                   |
|  [Pause Sending]                                  |
+--------------------------------------------------+

RECIPIENT COUNT UPDATING:
+--------------------------------+
|                                |
|   [users]                      |
|                                |
|   [calculating...]             |
|   Counting recipients...       |
|                                |
+--------------------------------+
```

### Empty States

```
NO CAMPAIGNS:
+--------------------------------------------------+
|                                                   |
|            +---------------+                      |
|            |  [megaphone]  |                      |
|            +---------------+                      |
|                                                   |
|        No Campaigns Created                       |
|                                                   |
|   Email campaigns let you send bulk              |
|   messages to groups of customers.               |
|                                                   |
|   Perfect for:                                    |
|   * Newsletters                                   |
|   * Product announcements                         |
|   * Promotional offers                            |
|                                                   |
|           [Create Your First Campaign]            |
|                                                   |
+--------------------------------------------------+

NO RECIPIENTS MATCH FILTER:
+--------------------------------------------------+
|                                                   |
|   +-------------------------------------------+ |
|   |                                           | |
|   |   [users]  0 recipients                   | |
|   |                                           | |
|   |   No contacts match your filters.         | |
|   |                                           | |
|   |   Try adjusting your filter criteria      | |
|   |   or removing some conditions.            | |
|   |                                           | |
|   +-------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

### Error States

```
SENDING FAILED:
+--------------------------------------------------+
|  [!] Campaign Sending Failed                      |
|                                                   |
|  An error occurred while sending batch 7.         |
|  234 emails were not sent.                        |
|                                                   |
|  [View Error Details]                             |
|                                                   |
|  ( Retry Failed )     [Cancel Campaign]           |
+--------------------------------------------------+

FILTER ERROR:
+--------------------------------------------------+
|  [!] Filter Error                                 |
|                                                   |
|  Could not apply the tag filter.                  |
|  The tag "VIP" may have been deleted.             |
|                                                   |
|  [Remove Filter]   [Retry]                        |
+--------------------------------------------------+

VALIDATION ERROR:
+--------------------------------------------------+
|  [!] Cannot proceed                               |
|                                                   |
|  * Campaign name is required                      |
|  * Please select at least 1 recipient             |
|                                                   |
+--------------------------------------------------+
```

### Success States

```
CAMPAIGN SCHEDULED:
+--------------------------------------------------+
|  * Campaign Scheduled Successfully                |
|                                                   |
|  "February Newsletter" will be sent to            |
|  1,234 recipients on Jan 15, 2026 at 9:00 AM.     |
|                                                   |
|  [View Campaign]              [Dismiss]           |
+--------------------------------------------------+

CAMPAIGN COMPLETED:
+--------------------------------------------------+
|  * Campaign Sent Successfully                     |
|                                                   |
|  1,245 emails have been delivered.                |
|  View the campaign report for engagement stats.   |
|                                                   |
|  [View Report]                [Dismiss]           |
+--------------------------------------------------+

TEST EMAIL SENT:
+--------------------------------------------------+
|  * Test Email Sent                                |
|                                                   |
|  Check your inbox at joel@renoz.com               |
|                                                   |
+--------------------------------------------------+
```

---

## Accessibility Notes

### Focus Order

1. **Campaign List**
   - Create Campaign button
   - Filter/search controls
   - Campaign rows (Tab through)
   - Pagination controls

2. **Campaign Wizard**
   - Step indicators (informational, not focusable)
   - Current step form fields (in order)
   - Back button -> Next/Submit button

3. **Filter Builder**
   - Add Filter button
   - Filter type selector -> Operator -> Value inputs
   - Remove filter button
   - Options checkboxes
   - Preview section (informational)

### ARIA Requirements

```html
<!-- Wizard Steps -->
<nav aria-label="Campaign creation progress">
  <ol>
    <li aria-current="step">
      <span aria-label="Step 1 of 4, Details, current step">1. Details</span>
    </li>
    <li>
      <span aria-label="Step 2 of 4, Template">2. Template</span>
    </li>
  </ol>
</nav>

<!-- Campaign Status Badge -->
<span
  role="status"
  aria-label="Campaign status: Completed"
  class="badge-completed"
>
  Completed
</span>

<!-- Progress Bar (Sending) -->
<div
  role="progressbar"
  aria-valuenow="45"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Sending progress: 567 of 1250 emails sent, 45 percent complete"
>
  <div class="progress-fill" style="width: 45%"></div>
</div>

<!-- Filter Builder -->
<fieldset aria-label="Recipient filters">
  <legend>Build your audience</legend>

  <div role="group" aria-label="Filter condition 1">
    <select aria-label="Filter field">
      <option>Customer Tags</option>
    </select>
    <select aria-label="Filter operator">
      <option>is any of</option>
    </select>
    <div aria-label="Selected tags: VIP, Enterprise">
      <button aria-label="Remove VIP tag">VIP x</button>
      <button aria-label="Remove Enterprise tag">Enterprise x</button>
    </div>
    <button aria-label="Remove this filter condition">Remove</button>
  </div>
</fieldset>

<!-- Recipient Count -->
<div
  role="status"
  aria-live="polite"
  aria-label="1,234 recipients match your criteria"
>
  1,234 Recipients
</div>

<!-- Campaign Table Row -->
<tr
  role="row"
  aria-label="Q1 Product Launch campaign, completed, 1245 recipients, 68 percent opened"
>
  <td>Q1 Product Launch</td>
  <td><span role="status">Completed</span></td>
  <td>1,245</td>
  <td>68.4%</td>
</tr>
```

### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | Wizard | Move between form fields |
| Enter | Wizard | Submit current step |
| Escape | Wizard | Cancel (with confirmation) |
| Arrow Keys | Filter chips | Navigate between chips |
| Delete | Filter chip | Remove chip |
| Space | Checkbox | Toggle selection |
| Enter | Table row | Open campaign detail |

### Screen Reader Announcements

- Step change: "Step 2 of 4, Select Template"
- Recipient count update: "1,234 recipients match your criteria"
- Filter added: "Filter added: Customer Tags is any of VIP, Enterprise"
- Campaign scheduled: "Campaign February Newsletter scheduled for January 15 at 9 AM with 1,234 recipients"
- Sending progress: "Sending in progress, 45 percent complete, 567 of 1,250 emails sent"
- Campaign complete: "Campaign completed, 1,245 emails sent successfully"

---

## Animation Choreography

### Wizard Step Transitions

```
STEP FORWARD:
- Duration: 300ms
- Easing: ease-out
- Current step content: slide out left, fade out
- New step content: slide in from right, fade in
- Step indicator: progress line extends

STEP BACKWARD:
- Duration: 250ms
- Easing: ease-out
- Current step content: slide out right, fade out
- New step content: slide in from left, fade in
- Step indicator: progress line contracts
```

### Filter Builder

```
ADD FILTER:
- Duration: 250ms
- Easing: spring
- Height: 0 -> auto
- Opacity: 0 -> 1
- Slide down from top

REMOVE FILTER:
- Duration: 200ms
- Easing: ease-in
- Height: auto -> 0
- Opacity: 1 -> 0
- Other filters slide up

TAG CHIP ADD:
- Duration: 150ms
- Scale: 0 -> 1.1 -> 1
- Background flash

TAG CHIP REMOVE:
- Duration: 150ms
- Scale: 1 -> 0
- Gap closes: 200ms
```

### Recipient Count Update

```
COUNT CHANGE:
- Duration: 400ms
- Number morphs from old to new
- If increase: brief green flash
- If decrease: brief yellow flash

LOADING:
- Skeleton pulse animation
- Duration: 1s loop
```

### Progress Bar

```
SENDING PROGRESS:
- Duration: continuous
- Smooth width transition
- Striped animation moving right
- Speed: 1s per stripe cycle

BATCH COMPLETE:
- Duration: 300ms
- Checkmark appears
- Row background: green flash
```

### Campaign Status Badge

```
STATUS CHANGE:
- Duration: 250ms
- Easing: ease-out
- Scale: 0.8 -> 1.1 -> 1
- Color transition
- Subtle bounce
```

---

## Component Props Interfaces

```typescript
// CampaignListSkeleton
interface CampaignListSkeletonProps {
  /** Number of skeleton rows */
  rows?: number;
  /** Show table or card layout */
  variant?: 'table' | 'cards';
}

// MultiStepWizard
interface MultiStepWizardProps {
  /** Current step (0-indexed) */
  currentStep: number;
  /** Step definitions */
  steps: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  /** Step change handler */
  onStepChange: (step: number) => void;
  /** Can proceed to next step */
  canProceed?: boolean;
  /** Can go back */
  canGoBack?: boolean;
  /** Children for step content */
  children: React.ReactNode;
}

// FilterBuilder
interface FilterBuilderProps {
  /** Filter conditions */
  filters: Array<{
    id: string;
    field: string;
    operator: string;
    value: unknown;
  }>;
  /** Available filter fields */
  filterFields: Array<{
    id: string;
    label: string;
    type: 'select' | 'multiselect' | 'text' | 'number' | 'date';
    operators: Array<{ value: string; label: string }>;
    options?: Array<{ value: string; label: string }>;
  }>;
  /** Filter change handler */
  onChange: (filters: FilterBuilderProps['filters']) => void;
  /** Logical operator between groups */
  logicalOperator?: 'AND' | 'OR';
  /** Maximum number of filters */
  maxFilters?: number;
}

// RecipientPreviewPanel
interface RecipientPreviewPanelProps {
  /** Number of matching recipients */
  count: number;
  /** Sample recipients */
  samples: Array<{
    email: string;
    name: string;
    company?: string;
  }>;
  /** Loading state */
  isLoading?: boolean;
  /** View all handler */
  onViewAll?: () => void;
}

// CampaignCard
interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
    recipientCount: number;
    sentCount?: number;
    scheduledAt?: string;
    completedAt?: string;
    stats?: {
      openRate: number;
      clickRate: number;
      bounceRate: number;
    };
  };
  /** Click handler */
  onClick: () => void;
  /** Edit handler (for draft/scheduled) */
  onEdit?: () => void;
  /** Compact mode */
  compact?: boolean;
}

// CampaignDetailPanel
interface CampaignDetailPanelProps {
  campaign: {
    id: string;
    name: string;
    description?: string;
    templateType: string;
    status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
    recipientCount: number;
    sentCount: number;
    openedCount: number;
    clickedCount: number;
    bouncedCount: number;
    unsubscribedCount: number;
    createdAt: string;
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
  };
  /** Engagement over time data */
  engagementData?: Array<{
    date: string;
    opens: number;
    clicks: number;
  }>;
  /** Top clicked links */
  topLinks?: Array<{
    text: string;
    url: string;
    clicks: number;
  }>;
  /** Loading state */
  isLoading?: boolean;
}

// CampaignProgress
interface CampaignProgressProps {
  /** Campaign ID */
  campaignId: string;
  /** Total recipients */
  total: number;
  /** Sent count */
  sent: number;
  /** Current batch number */
  currentBatch: number;
  /** Total batches */
  totalBatches: number;
  /** Started timestamp */
  startedAt: string;
  /** Pause handler */
  onPause?: () => void;
  /** Resume handler */
  onResume?: () => void;
  /** Is paused */
  isPaused?: boolean;
}

// SendOptionsPanel
interface SendOptionsPanelProps {
  /** Send immediately or schedule */
  sendNow: boolean;
  /** Toggle handler */
  onToggle: (sendNow: boolean) => void;
  /** Scheduled datetime */
  scheduledAt?: Date;
  /** Timezone */
  timezone?: string;
  /** Schedule change handler */
  onScheduleChange: (date: Date, timezone: string) => void;
  /** Send test email handler */
  onSendTest?: () => void;
  /** Test email sending state */
  isSendingTest?: boolean;
}
```

---

## Component Files

| File | Purpose |
|------|---------|
| `src/components/domain/communications/multi-step-wizard.tsx` | Wizard container |
| `src/components/domain/communications/filter-builder.tsx` | Recipient filter UI |
| `src/components/domain/communications/recipient-preview-panel.tsx` | Preview matching recipients |
| `src/components/domain/communications/campaign-card.tsx` | Campaign list card |
| `src/components/domain/communications/campaign-detail-panel.tsx` | Campaign detail sidebar |
| `src/components/domain/communications/campaign-progress.tsx` | Sending progress display |
| `src/components/domain/communications/send-options-panel.tsx` | Send now/schedule options |
| `src/components/domain/communications/campaign-list-skeleton.tsx` | Loading skeleton |
| `src/routes/_authed/communications/campaigns/index.tsx` | Campaign list route |
| `src/routes/_authed/communications/campaigns/new.tsx` | Campaign wizard route |
| `src/routes/_authed/communications/campaigns/$campaignId.tsx` | Campaign detail route |
