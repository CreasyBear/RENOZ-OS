# Customer Onboarding Workflow Wireframe
## WF-ONBOARDING: New Customer to Active Customer

**Last Updated:** 2026-01-10
**PRD Reference:** workflows/customer-onboarding.prd.json
**Priority:** 8 (Customer success foundation)

---

## Overview

The Customer Onboarding workflow guides new customers through the process from initial creation to becoming active, engaged customers. This wireframe covers:
- Onboarding checklist with auto-detection
- Profile completeness tracking
- Welcome email automation
- First quote milestone
- Account manager handoff
- Onboarding dashboard

**Workflow Stages:** Customer Created -> Profile Complete -> Welcome Email -> First Quote -> Active Customer

**Aesthetic:** "Welcoming journey" - Encouraging progress, clear milestones, celebratory moments

---

## Progress Indicator Design

### Onboarding Status Badge
```
+================================================================================+
|                                                                                 |
|  ONBOARDING STATUS                                                             |
|                                                                                 |
|  [NOT STARTED]-->[IN PROGRESS]-->[COMPLETED]                                   |
|                       *                                                         |
|                    (current)                                                    |
|                                                                                 |
|  Customer: Brisbane Solar Co | Created: Jan 10, 2026                           |
|  Progress: 4 of 6 steps complete (67%)                                         |
|                                                                                 |
+================================================================================+

Status Colors:
- Not Started: Gray (new customer)
- In Progress: Blue/Orange (working through checklist)
- Completed: Green (fully onboarded)
```

### Profile Completeness Gauge
```
+================================================================================+
| +-- PROFILE COMPLETENESS ---------------------------------------------------+ |
| |                                                                            | |
| |         +--------+                                                        | |
| |       /    75%    \        GOOD                                          | |
| |      |     [!]     |                                                      | |
| |       \           /        Missing:                                       | |
| |         +--------+         - ABN (15%)                                    | |
| |                            - Website (optional)                           | |
| |                                                                            | |
| |  Color: Red (<50%) | Yellow (50-80%) | Green (>80%)                       | |
| +----------------------------------------------------------------------------+ |
+================================================================================+
```

---

## Onboarding Checklist

### Desktop View (On Customer Detail)
```
+================================================================================+
| CUSTOMER: ACME CORPORATION                                        [Edit] [...] |
+================================================================================+
| [Overview | Contacts | Addresses | Opportunities | Orders | Activity]         |
+================================================================================+
|                                                                                 |
| +-- ONBOARDING PROGRESS (Collapsible) ---------------------------------------+ |
| |                                                                             | |
| | [=========================================>                    ] 67%       | |
| | 4 of 6 steps complete                                                      | |
| |                                                                             | |
| | +-- CHECKLIST ----------------------------------------------------------+ | |
| | |                                                                        | | |
| | | [*] Company profile created                                            | | |
| | |     Completed automatically on customer creation                       | | |
| | |     Jan 10, 2026 9:15 AM                                              | | |
| | |                                                                        | | |
| | | [*] Primary contact added                                              | | |
| | |     John Smith (john@acme.com)                                        | | |
| | |     Jan 10, 2026 9:18 AM                                              | | |
| | |                                                                        | | |
| | | [*] Business address configured                                        | | |
| | |     123 Business St, Sydney NSW 2000                                  | | |
| | |     Jan 10, 2026 9:20 AM                                              | | |
| | |                                                                        | | |
| | | [*] Welcome email sent                                                 | | |
| | |     Sent to john@acme.com                                             | | |
| | |     Jan 10, 2026 9:25 AM                                              | | |
| | |                                                                        | | |
| | | [ ] First quote created                                                | | |
| | |     Create an opportunity to complete this step                       | | |
| | |     [Create Quote]                                                    | | |
| | |                                                                        | | |
| | | [ ] Account manager assigned                                           | | |
| | |     Assign an account manager to complete onboarding                  | | |
| | |     [Assign Manager]                                                  | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | Ready to complete? [Complete Onboarding & Handoff]                        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- PROFILE COMPLETENESS ----------------------------------------------------+ |
| |                                                                             | |
| |    +--------+      75% Complete                                            | |
| |  /    75%    \                                                             | |
| | |             |    Missing Data:                                           | |
| |  \           /     [!] ABN not set (15%)                                   | |
| |    +--------+      [i] Website (optional)                                  | |
| |                                                                             | |
| |                    [Complete Profile ->]                                   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

### Mobile Onboarding Card
```
+================================+
| Brisbane Solar Co         [...]|
+================================+
| ONBOARDING: In Progress        |
| [=========>            ] 67%   |
+================================+
|                                |
| [v] Checklist (4/6)            |
|                                |
| [*] Company created            |
| [*] Contact added              |
| [*] Address set                |
| [*] Welcome sent               |
| [ ] First quote                |
|     [Create Quote]             |
| [ ] Manager assigned           |
|     [Assign]                   |
|                                |
+================================+
| [Complete Onboarding]          |
+================================+
```

---

## Profile Completeness

### Completeness Detail View
```
+================================================================================+
| PROFILE COMPLETENESS - ACME CORPORATION                                        |
+================================================================================+
|                                                                                 |
|           +--------+                                                            |
|         /    75%    \        Profile is 75% complete                           |
|        |     [!]     |                                                         |
|         \           /        3 items need attention                            |
|           +--------+                                                            |
|                                                                                 |
| +-- REQUIRED FIELDS ---------------------------------------------------------+ |
| |                                                                             | |
| | Field             | Status    | Weight | Action                            | |
| |-------------------+-----------+--------+-----------------------------------| |
| | Company Name      | [*] Set   |   20%  | Brisbane Solar Co                  | |
| | Primary Contact   | [*] Set   |   20%  | John Smith                        | |
| | Phone Number      | [*] Set   |   15%  | (555) 123-4567                    | |
| | Email Address     | [*] Set   |   15%  | john@acme.com                     | |
| | Business Address  | [*] Set   |   15%  | 123 Business St, Sydney           | |
| | ABN               | [ ] Missing|   15%  | [Add ABN]                        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- OPTIONAL FIELDS (Boost Score) -------------------------------------------+ |
| |                                                                             | |
| | Field             | Status    | Boost  | Action                            | |
| |-------------------+-----------+--------+-----------------------------------| |
| | Website           | [ ] Empty |  +5%   | [Add Website]                     | |
| | Industry          | [ ] Empty |  +5%   | [Set Industry]                    | |
| | Customer Tier     | [*] Set   |  +0%   | Silver                            | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Add ABN to reach 90% completeness!                                             |
|                                                                                 |
+================================================================================+
```

### Quick Complete Missing Data Modal
```
+================================================================================+
| COMPLETE PROFILE                                                         [x]   |
+================================================================================+
|                                                                                 |
| Complete these fields to improve your customer profile:                        |
|                                                                                 |
| +-- REQUIRED ----------------------------------------------------------------+ |
| |                                                                             | |
| | ABN (Australian Business Number):                                          | |
| | [_________________________________]  [Lookup ABN]                          | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- OPTIONAL (Recommended) --------------------------------------------------+ |
| |                                                                             | |
| | Website:                                                                   | |
| | [https://________________________________]                                 | |
| |                                                                             | |
| | Industry:                                                                  | |
| | [Select industry...                                                     v] | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Completing all fields will increase profile score from 75% to 100%            |
|                                                                                 |
|                                              [Skip]  [Save Changes]            |
+================================================================================+
```

---

## Welcome Email Configuration

### Settings Page
```
+================================================================================+
| CUSTOMER ONBOARDING SETTINGS                                                    |
+================================================================================+
|                                                                                 |
| +-- WELCOME EMAIL -----------------------------------------------------------+ |
| |                                                                             | |
| | [x] Send welcome email on customer creation                                | |
| |                                                                             | |
| |     When a new customer is created, automatically send a welcome           | |
| |     email to their primary contact.                                        | |
| |                                                                             | |
| |     Send to: Primary contact email                                         | |
| |     Delay: [Immediately v]                                                 | |
| |                                                                             | |
| |     [Preview Email]  [Edit Template]                                       | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- FIRST QUOTE REMINDER ----------------------------------------------------+ |
| |                                                                             | |
| | [x] Create task if no quote within [7] days                               | |
| |                                                                             | |
| |     Assign to: [Account Owner v]                                          | |
| |     Task: "Follow up with {customer} - no quote created"                  | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- ONBOARDING CHECKLIST ----------------------------------------------------+ |
| |                                                                             | |
| | Required Steps:                                                            | |
| | [x] Company profile created (auto-detect)                                 | |
| | [x] Primary contact added (auto-detect)                                   | |
| | [x] Business address configured (auto-detect)                             | |
| | [x] Welcome email sent (auto-detect)                                      | |
| | [x] First quote created (auto-detect)                                     | |
| | [x] Account manager assigned                                               | |
| |                                                                             | |
| | [+ Add Custom Step]                                                        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                                            [Save Settings]     |
+================================================================================+
```

### Welcome Email Preview
```
+================================================================================+
| WELCOME EMAIL PREVIEW                                                     [x]   |
+================================================================================+
|                                                                                 |
| +-- EMAIL PREVIEW -----------------------------------------------------------+ |
| |                                                                             | |
| | +-----------------------------------------------------------------------+ | |
| | |                                                                       | | |
| | |    [COMPANY LOGO]                                                     | | |
| | |                                                                       | | |
| | |    Welcome to [Company Name]!                                         | | |
| | |                                                                       | | |
| | |    Hi {{contact_first_name}},                                         | | |
| | |                                                                       | | |
| | |    Thank you for choosing us as your partner. We're excited          | | |
| | |    to work with {{company_name}} and help you achieve your           | | |
| | |    goals.                                                             | | |
| | |                                                                       | | |
| | |    Here's what you can expect:                                        | | |
| | |                                                                       | | |
| | |    - A dedicated team ready to assist you                            | | |
| | |    - Quality products backed by comprehensive warranties             | | |
| | |    - Responsive support when you need it                             | | |
| | |                                                                       | | |
| | |    Your Key Contacts:                                                 | | |
| | |    - Sales: {{sales_rep_name}} - {{sales_rep_email}}                  | | |
| | |    - Support: support@company.com                                     | | |
| | |                                                                       | | |
| | |    If you have any questions, don't hesitate to reach out.           | | |
| | |                                                                       | | |
| | |    Best regards,                                                       | | |
| | |    The [Company Name] Team                                            | | |
| | |                                                                       | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Variables: {{contact_first_name}}, {{company_name}}, {{sales_rep_name}}, etc.  |
|                                                                                 |
|                                              [Edit Template]  [Close]          |
+================================================================================+
```

---

## First Quote Milestone

### Milestone Celebration Toast
```
+================================================================+
|                                                                 |
|     [Confetti Animation]                                        |
|                                                                 |
|     MILESTONE: First Quote Created!                             |
|                                                                 |
|     Brisbane Solar Co just received their first quote:           |
|     QT-2026-0042 - $15,000                                      |
|                                                                 |
|     Keep up the momentum!                                       |
|                                                                 |
|     [View Quote]                          [Dismiss] (5s)       |
+================================================================+
  role="status" aria-live="polite"
  Respects prefers-reduced-motion (no animation if set)
```

### Customer Card with Milestone Badge
```
+================================================================================+
| +-- CUSTOMER CARD -----------------------------------------------------------+ |
| |                                                                             | |
| | ACME CORPORATION                                   [FIRST QUOTE]           | |
| |                                                       Jan 10               | |
| | John Smith | john@acme.com                                                 | |
| | (555) 123-4567                                                             | |
| |                                                                             | |
| | Onboarding: [============>        ] 83%                                    | |
| | Profile: 75% | Tier: Silver                                                | |
| |                                                                             | |
| | Milestones:                                                                | |
| | [*] First Quote - Jan 10, 2026 | QT-2026-0042                             | |
| | [ ] First Order - Pending                                                  | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
+================================================================================+
```

### Days Without Quote Warning
```
+================================================================================+
| +-- CUSTOMER CARD -----------------------------------------------------------+ |
| |                                                                             | |
| | SLOW START INC                                     [!] 12 DAYS             | |
| |                                                   NO QUOTE                  | |
| | Jane Doe | jane@slowstart.com                                              | |
| |                                                                             | |
| | Onboarding: [======>              ] 50%                                    | |
| | Profile: 60% | Tier: Bronze                                                | |
| |                                                                             | |
| | [!] No quote created since customer was added                              | |
| |     Customer created: Dec 29, 2025 (12 days ago)                          | |
| |                                                                             | |
| |     [Create Quote Now]  [Schedule Follow-up]                              | |
| +-----------------------------------------------------------------------------+ |
+================================================================================+
```

---

## Account Manager Handoff

### Handoff Wizard
```
+================================================================================+
| COMPLETE ONBOARDING - ACME CORPORATION                                   [x]   |
+================================================================================+
|                                                                                 |
| +-- HANDOFF WIZARD ----------------------------------------------------------+ |
| | Step 1 of 4: Review Checklist                                              | |
| | [====>                                                          ] 25%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- CHECKLIST REVIEW --------------------------------------------------------+ |
| |                                                                             | |
| | All checklist items must be complete before handoff:                       | |
| |                                                                             | |
| | [*] Company profile created                         Jan 10, 9:15 AM       | |
| | [*] Primary contact added                           Jan 10, 9:18 AM       | |
| | [*] Business address configured                     Jan 10, 9:20 AM       | |
| | [*] Welcome email sent                              Jan 10, 9:25 AM       | |
| | [*] First quote created                             Jan 10, 2:30 PM       | |
| | [ ] Account manager assigned                        <- This step          | |
| |                                                                             | |
| | Profile Completeness: 75%                                                  | |
| | [!] Consider completing profile before handoff (ABN missing)              | |
| |                                                                             | |
| | [Complete Profile First]                                                   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                                    [Next: Select Manager ->]   |
+================================================================================+
```

### Step 2: Select Account Manager
```
+================================================================================+
| +-- HANDOFF WIZARD ----------------------------------------------------------+ |
| | Step 2 of 4: Select Account Manager                                        | |
| | [==========>                                                    ] 50%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- SELECT ACCOUNT MANAGER --------------------------------------------------+ |
| |                                                                             | |
| | Who will be the ongoing account manager for Brisbane Solar Co?             | |
| |                                                                             | |
| | +-----------------------------------------------------------------------+ | |
| | | (*) Sarah Williams                                                    | | |
| | |     Current Accounts: 12 | Capacity: Low                             | | |
| | |     Specialties: Enterprise, Manufacturing                            | | |
| | |     [Recommended based on customer profile]                           | | |
| | +-----------------------------------------------------------------------+ | |
| | | ( ) Mike Johnson                                                       | | |
| | |     Current Accounts: 18 | Capacity: Medium                          | | |
| | |     Specialties: SMB, Retail                                          | | |
| | +-----------------------------------------------------------------------+ | |
| | | ( ) John Davis                                                         | | |
| | |     Current Accounts: 8 | Capacity: High                             | | |
| | |     Specialties: Startup, Tech                                        | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | [x] Notify account manager of assignment                                  | |
| | [x] Transfer all open opportunities to new manager                        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                    [<- Back]  [Next: Configure ->]            |
+================================================================================+
```

### Step 3: Configure Handoff
```
+================================================================================+
| +-- HANDOFF WIZARD ----------------------------------------------------------+ |
| | Step 3 of 4: Configure Handoff                                             | |
| | [================>                                              ] 75%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- GRADUATION EMAIL --------------------------------------------------------+ |
| |                                                                             | |
| | [x] Send graduation email to customer                                     | |
| |                                                                             | |
| |     This email introduces the account manager and marks the               | |
| |     transition from onboarding to ongoing support.                        | |
| |                                                                             | |
| |     [Preview Email]                                                        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- HANDOFF NOTES -----------------------------------------------------------+ |
| |                                                                             | |
| | Notes for account manager:                                                 | |
| | +-----------------------------------------------------------------------+ | |
| | | Key contact is John Smith (CEO). Very responsive via email.           | | |
| | | First order expected within 2 weeks - they're evaluating our          | | |
| | | 10kWh LFP Battery System X line for their manufacturing facility.                   | | |
| | | Good upsell opportunity for support packages.                         | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- FOLLOW-UP TASK ----------------------------------------------------------+ |
| |                                                                             | |
| | [x] Create follow-up task for account manager                             | |
| |                                                                             | |
| |     Task: Introduction call with Brisbane Solar Co                         | |
| |     Due: [3 days from now                                              v] | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                    [<- Back]  [Next: Review ->]               |
+================================================================================+
```

### Step 4: Complete Handoff
```
+================================================================================+
| +-- HANDOFF WIZARD ----------------------------------------------------------+ |
| | Step 4 of 4: Complete Handoff                                              | |
| | [======================>                                        ] 95%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- HANDOFF SUMMARY ---------------------------------------------------------+ |
| |                                                                             | |
| | Customer: Brisbane Solar Co                                                 | |
| | Account Manager: Sarah Williams                                            | |
| |                                                                             | |
| | Actions to be taken:                                                       | |
| | [*] Update onboarding status to "Completed"                               | |
| | [*] Assign Sarah Williams as account manager                              | |
| | [*] Transfer 1 open opportunity to Sarah                                  | |
| | [*] Send graduation email to john@acme.com                                | |
| | [*] Notify Sarah of new assignment                                        | |
| | [*] Create follow-up task for Sarah (due Jan 13)                         | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                    [<- Back]  [Complete Onboarding]           |
+================================================================================+
```

### Handoff Complete Success
```
+================================================================================+
|                                                                                 |
|                     +==========================================+               |
|                     |                                          |               |
|                     |      [Graduation Cap Animation]          |               |
|                     |                                          |               |
|                     |      ONBOARDING COMPLETE!                |               |
|                     |                                          |               |
|                     |   Brisbane Solar Co is now an             |               |
|                     |   active customer!                       |               |
|                     |                                          |               |
|                     +==========================================+               |
|                                                                                 |
| +-- SUMMARY -----------------------------------------------------------------+ |
| |                                                                             | |
| | [*] Onboarding status: COMPLETED                                          | |
| | [*] Account manager: Sarah Williams                                       | |
| | [*] Graduation email sent                                                 | |
| | [*] Follow-up task created                                                | |
| |                                                                             | |
| | Onboarding Duration: 5 hours 15 minutes                                   | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [View Customer]  [View Sarah's Tasks]  [Onboard Another Customer]             |
+================================================================================+
```

---

## Onboarding Dashboard

### Dashboard Widget
```
+================================================================================+
| +-- ONBOARDING STATUS WIDGET ------------------------------------------------+ |
| |                                                                             | |
| |  CUSTOMER ONBOARDING                                      [View All ->]    | |
| |                                                                             | |
| |  +------------------+ +------------------+ +------------------+             | |
| |  | In Onboarding    | | Completed (30d)  | | Stuck            |            | |
| |  |       8          | |      15          | |       2          |            | |
| |  | avg 3.2 days     | | avg 2.8 days     | | [!] Needs action |            | |
| |  +------------------+ +------------------+ +------------------+             | |
| |                                                                             | |
| |  STUCK CUSTOMERS:                                                          | |
| |  [!] Slow Start Inc - 12 days, no quote                                   | |
| |  [!] NewCo Ltd - 8 days, profile incomplete                               | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
+================================================================================+
```

### Full Dashboard Page
```
+================================================================================+
| ONBOARDING DASHBOARD                                    [Export] [Date: 30d v]  |
+================================================================================+
|                                                                                 |
| +-- KPI CARDS ---------------------------------------------------------------+  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| | | In Onboarding    | | Completed (30d)  | | Avg Time         | | Stuck    ||  |
| | |       8          | |      15          | |    2.8 days      | |    2     ||  |
| | | +3 this week     | | +5 vs last mo    | | -0.5 vs last mo  | | [!]     ||  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- ONBOARDING FUNNEL -------------------------------------------------------+  |
| |                                                                             |  |
| |  NOT STARTED (2)                                                           |  |
| |  +==============+                                                           |  |
| |  |##############|                                                           |  |
| |  +==============+                                                           |  |
| |         |                                                                    |  |
| |         v                                                                    |  |
| |  IN PROGRESS (8)                                                           |  |
| |  +========================================+                                 |  |
| |  |########################################|                                 |  |
| |  +========================================+                                 |  |
| |         |                                                                    |  |
| |         v                                                                    |  |
| |  COMPLETED (15)                                                            |  |
| |  +======================================================+                   |  |
| |  |######################################################|                   |  |
| |  +======================================================+                   |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- CUSTOMERS IN ONBOARDING -------------------------------------------------+  |
| |                                                                             |  |
| | Customer        | Created   | Progress | Last Activity | Assigned | Actions|  |
| |-----------------+-----------+----------+---------------+----------+--------|  |
| | [!] Slow Start  | Dec 29    |    50%   | 8 days ago    | Mike J.  | [View] |  |
| | [!] NewCo Ltd   | Jan 2     |    33%   | 5 days ago    | Sarah W. | [View] |  |
| | Acme Corp       | Jan 10    |    83%   | 2 hours ago   | -        | [View] |  |
| | Tech Industries | Jan 9     |    67%   | 1 day ago     | John D.  | [View] |  |
| | GlobalCo        | Jan 8     |   100%   | Just now      | -        | [Hand] |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- COMPLETION TREND --------------------------------------------------------+  |
| |                                                                             |  |
| |    15|                                    *                                |  |
| |    12|                          *    *  *                                  |  |
| |     9|               *    *  *                                             |  |
| |     6|          *  *                                                       |  |
| |     3|     *  *                                                            |  |
| |     0|__|__|__|__|__|__|__|__|                                             |  |
| |       Week1 Week2 Week3 Week4                                              |  |
| |                                                                             |  |
| |  [---] Started  [***] Completed                                            |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

---

## Customer List Integration

### Onboarding Status Column
```
+================================================================================+
| CUSTOMERS                                           [+ New] [Filter v] [Export] |
+================================================================================+
|                                                                                 |
| [Search customers..._________________________________]                          |
|                                                                                 |
| Filters: [All v] [Onboarding: In Progress v] [Tier: All v]                     |
|                                                                                 |
| +-- CUSTOMER TABLE ----------------------------------------------------------+ |
| |                                                                             | |
| | Customer        | Contact      | Onboarding    | Profile | Tier   | Actions| |
| |-----------------+--------------+---------------+---------+--------+--------| |
| | Acme Corp       | John Smith   | [=====>   ] 83%|   75%  | Silver | [View] | |
| | Tech Industries | Jane Doe     | [===>     ] 67%|   90%  | Gold   | [View] | |
| | [!] Slow Start  | Bob Wilson   | [=>       ] 50%|   60%  | Bronze | [View] | |
| |                 |              | 12 days stuck  |         |        |        | |
| | GlobalCo        | Sarah Lee    | [COMPLETE]     |  100%  | Gold   | [View] | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| LEGEND: [!] = Stuck (no progress 7+ days)                                      |
+================================================================================+
```

---

## Mobile Views

### Mobile Customer with Onboarding
```
+================================+
| Brisbane Solar Co         [...]|
+================================+
| John Smith                     |
| john@acme.com                  |
+================================+
|                                |
| ONBOARDING                     |
| [============>         ] 83%   |
| In Progress | 4 of 6 steps     |
|                                |
| [v] View Checklist             |
| [*] Company created            |
| [*] Contact added              |
| [*] Address set                |
| [*] Welcome sent               |
| [ ] First quote                |
| [ ] Manager assigned           |
|                                |
+================================+
| PROFILE: 75%                   |
| [!] Add ABN to complete        |
+================================+
| [Complete Onboarding]          |
+================================+
```

### Mobile Onboarding Dashboard
```
+================================+
| Onboarding            [Filter] |
+================================+
| In Progress: 8 | Stuck: 2      |
+================================+
|                                |
| STUCK (Needs Action)           |
|                                |
| +----------------------------+ |
| | [!] Slow Start Inc         | |
| | 50% | 12 days stuck        | |
| | No quote created           | |
| | [Create Quote] [Contact]   | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | [!] NewCo Ltd              | |
| | 33% | 8 days stuck         | |
| | Profile incomplete         | |
| | [Complete] [Contact]       | |
| +----------------------------+ |
|                                |
| IN PROGRESS                    |
|                                |
| +----------------------------+ |
| | Brisbane Solar Co           | |
| | 83% | Active today         | |
| | Ready for handoff          | |
| | [Complete Onboarding]      | |
| +----------------------------+ |
|                                |
+================================+
```

---

## Error States

### Incomplete Checklist Warning
```
+================================================================+
| [!] Cannot Complete Onboarding                            [x]   |
+================================================================+
|                                                                 |
| The following checklist items are incomplete:                   |
|                                                                 |
| [ ] First quote created                                         |
|     Create an opportunity with a quote to complete this step    |
|                                                                 |
| [ ] Account manager assigned                                    |
|     This will be completed during the handoff process           |
|                                                                 |
| Complete all required steps before marking onboarding complete. |
|                                                                 |
| [Create Quote Now]  [Close]                                     |
+================================================================+
```

### Welcome Email Failed
```
+================================================================+
| [!] Welcome Email Not Sent                                [x]   |
+================================================================+
|                                                                 |
| Could not send welcome email to john@acme.com                   |
|                                                                 |
| Reason: Invalid email address                                   |
|                                                                 |
| Options:                                                         |
| [Update Email Address]  [Skip Welcome Email]  [Retry]           |
+================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels
```html
<main role="main" aria-label="Customer onboarding">
  <!-- Checklist -->
  <section role="region" aria-label="Onboarding checklist">
    <div role="progressbar"
         aria-valuenow="67"
         aria-valuemin="0"
         aria-valuemax="100"
         aria-label="Onboarding 67 percent complete">
    </div>
    <ul role="list" aria-label="Checklist items">
      <li role="listitem" aria-label="Company profile created, completed">
        <!-- Item content -->
      </li>
    </ul>
  </section>

  <!-- Profile Completeness -->
  <section role="region" aria-label="Profile completeness">
    <div role="meter"
         aria-valuenow="75"
         aria-valuemin="0"
         aria-valuemax="100"
         aria-label="Profile 75 percent complete">
    </div>
  </section>
</main>
```

### Keyboard Navigation
```
Tab Order:
1. Checklist items (expandable)
2. Action buttons within items
3. Complete Profile button
4. Complete Onboarding button

Checklist:
- Enter to expand/collapse item details
- Tab to action buttons
- Space to trigger actions

Celebrations:
- Respects prefers-reduced-motion
- Focus moves to dismiss button
- Auto-dismiss with screen reader announcement
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Accordion checklist, stacked cards |
| Tablet | 640px - 1024px | Two-column layout, side-by-side gauge |
| Desktop | > 1024px | Full dashboard, expanded checklist |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Checklist load | < 500ms | Initial render |
| Auto-detection | < 1s | Check completion status |
| Welcome email send | < 5s | From trigger to sent |
| Profile calculation | < 200ms | Completeness score |
| Handoff process | < 3s | Full handoff completion |

---

## Related Wireframes

- [Lead to Order](./lead-to-order.wireframe.md)
- [Customer Detail](../domains/customer-detail.wireframe.md)
- [Dashboard](../domains/dashboard-main.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
