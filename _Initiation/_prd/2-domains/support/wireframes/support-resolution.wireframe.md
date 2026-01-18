# Support Resolution Workflow Wireframe
## WF-SUPPORT: Issue to Resolution

**Last Updated:** 2026-01-10
**PRD Reference:** workflows/support-resolution.prd.json
**Priority:** 4 (Customer satisfaction critical)

---

## Overview

The Support Resolution workflow manages the complete customer support process from issue creation through resolution and feedback collection. This wireframe covers:
- Issue triage queue
- Auto-assignment rules
- Resolution templates
- Communication tracking
- Post-resolution feedback
- Support metrics

**Workflow Stages:** Issue Created -> Triage -> Investigate -> Resolve -> Customer Feedback

**Aesthetic:** "Helpful support" - Quick response, clear status, empathetic communication

---

## Progress Indicator Design

### Issue Resolution Timeline
```
+================================================================================+
|                                                                                 |
|  ISSUE STATUS                                                                  |
|                                                                                 |
|  [CREATED]-->[TRIAGE]-->[ASSIGNED]-->[IN PROGRESS]-->[RESOLVED]-->[CLOSED]     |
|                             *                                                   |
|                          (current)                                              |
|                                                                                 |
|  Issue #ISS-2026-0234 | Customer: Acme Corp | Priority: HIGH                   |
|  Type: Product Defect | Created: Jan 10, 2026 10:30 AM                         |
|                                                                                 |
+================================================================================+

Status Colors:
- Created: Gray (new)
- Triage: Blue (being assessed)
- Assigned: Purple (has owner)
- In Progress: Orange (actively working)
- Resolved: Green (solution provided)
- Closed: Green with checkmark (confirmed complete)
```

### SLA Timer Display
```
+================================================================================+
| +-- SLA STATUS (aria-live="polite") ----------------------------------------+ |
| |                                                                            | |
| |  First Response SLA:     Resolution SLA:                                  | |
| |  [*] MET (45 min)        [!] 4h 15m remaining                            | |
| |      Target: 1 hour           Target: 8 hours                             | |
| |                                                                            | |
| |  Priority: HIGH - Response within 1hr, Resolution within 8hr             | |
| +----------------------------------------------------------------------------+ |
+================================================================================+
```

---

## Triage Queue

### Desktop View
```
+================================================================================+
| TRIAGE QUEUE                                            [Refresh] [Auto-Assign] |
+================================================================================+
|                                                                                 |
| +-- TRIAGE METRICS ----------------------------------------------------------+ |
| | +------------------+ +------------------+ +------------------+              | |
| | | Pending Triage   | | Avg Triage Time  | | Urgent Waiting   |             | |
| | |      12          | |     8 min        | |       3          |             | |
| | | [!] 3 urgent     | | Target: 15 min   | | [!] Action req   |             | |
| | +------------------+ +------------------+ +------------------+              | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- QUEUE TABLE (Sorted by Created, Oldest First) ---------------------------+ |
| |                                                                             | |
| | Created   | Issue#        | Customer      | Subject           | Tier | Act | |
| |-----------+---------------+---------------+-------------------+------+-----| |
| | 10:30 AM  | ISS-2026-0234 | Acme Corp     | Widget not working| Gold | [T] | |
| |           |               |               | [!] 45 min in queue            | |
| |-----------+---------------+---------------+-------------------+------+-----| |
| | 10:45 AM  | ISS-2026-0235 | Tech Ind.     | Delivery inquiry  | Silv | [T] | |
| |           |               |               | 30 min in queue               | |
| |-----------+---------------+---------------+-------------------+------+-----| |
| | 11:00 AM  | ISS-2026-0236 | GlobalCo      | Installation help | Gold | [T] | |
| |           |               |               | 15 min in queue               | |
| |-----------+---------------+---------------+-------------------+------+-----| |
| | 11:10 AM  | ISS-2026-0237 | StartupX      | Billing question  | Brnz | [T] | |
| |           |               |               | 5 min in queue                | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| LEGEND: [T] = Start Triage | Tier = Customer tier (Gold/Silver/Bronze)        |
+================================================================================+
```

### Triage Form Wizard
```
+================================================================================+
| TRIAGE ISSUE - ISS-2026-0234                                             [x]   |
+================================================================================+
|                                                                                 |
| +-- ISSUE SUMMARY -----------------------------------------------------------+ |
| | Customer: Brisbane Solar Co (Gold Tier)                                     | |
| | Contact: John Smith <john@acme.com>                                        | |
| | Created: January 10, 2026 at 10:30 AM (45 minutes ago)                    | |
| |                                                                             | |
| | Subject: Widget not working after installation                             | |
| | Description:                                                               | |
| | "We installed the 10kWh LFP Battery System X yesterday and it worked fine initially.    | |
| |  Today when we tried to use it, the main control panel shows an error    | |
| |  code E-05 and won't respond to any inputs. We have a client demo        | |
| |  tomorrow and urgently need this resolved."                               | |
| |                                                                             | |
| | Attachments: [photo_error.jpg] [video_issue.mp4]                          | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- TRIAGE WIZARD -----------------------------------------------------------+ |
| | Step 1 of 4: Classify Issue Type                                           | |
| | [====>                                                       ] 25%         | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- STEP 1: ISSUE TYPE ------------------------------------------------------+ |
| |                                                                             | |
| | Select the issue type:                                                     | |
| |                                                                             | |
| | (*) Product Defect                                                         | |
| |     Hardware or software malfunction                                       | |
| |                                                                             | |
| | ( ) Installation Issue                                                     | |
| |     Problems during or after installation                                  | |
| |                                                                             | |
| | ( ) User Question                                                          | |
| |     How-to or feature inquiry                                              | |
| |                                                                             | |
| | ( ) Billing/Account                                                        | |
| |     Invoice, payment, or account issues                                    | |
| |                                                                             | |
| | ( ) Delivery/Shipping                                                      | |
| |     Order status or delivery problems                                      | |
| |                                                                             | |
| | ( ) Feature Request                                                        | |
| |     Customer suggestion for improvement                                    | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                                           [Next: Set Priority] |
+================================================================================+
```

### Step 2: Set Priority (Auto-Suggested)
```
+================================================================================+
| +-- STEP 2: SET PRIORITY ----------------------------------------------------+ |
| |                                                                             | |
| | [!] AUTO-SUGGESTED: HIGH                                                   | |
| |     Reasons:                                                               | |
| |     - Customer tier: Gold (+2)                                             | |
| |     - Issue type: Product Defect (+1)                                      | |
| |     - Contains "urgent" keyword (+1)                                       | |
| |                                                                             | |
| | Accept suggested priority or override:                                     | |
| |                                                                             | |
| | ( ) Critical                                                               | |
| |     System down, major business impact                                     | |
| |     SLA: Response 30min, Resolution 4hr                                    | |
| |                                                                             | |
| | (*) High (Suggested)                                                       | |
| |     Significant impact, customer blocked                                   | |
| |     SLA: Response 1hr, Resolution 8hr                                      | |
| |                                                                             | |
| | ( ) Medium                                                                 | |
| |     Moderate impact, workaround available                                  | |
| |     SLA: Response 4hr, Resolution 24hr                                     | |
| |                                                                             | |
| | ( ) Low                                                                    | |
| |     Minor impact, no urgency                                               | |
| |     SLA: Response 8hr, Resolution 48hr                                     | |
| |                                                                             | |
| | Override Reason (if changing from suggested):                              | |
| | [_______________________________________________]                          | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                            [<- Back]  [Next: Assign Category] |
+================================================================================+
```

### Step 3: Assign Category
```
+================================================================================+
| +-- STEP 3: ASSIGN CATEGORY -------------------------------------------------+ |
| |                                                                             | |
| | Select the product/service category:                                       | |
| |                                                                             | |
| | Primary Category:                                                          | |
| | [10kWh LFP Battery System X                                                           v] | |
| |                                                                             | |
| | Sub-Category:                                                              | |
| | [Control Panel                                                          v] | |
| |                                                                             | |
| | Related Order (if applicable):                                             | |
| | [ORD-2026-0123 - Jan 8, 2026                                           v] | |
| |                                                                             | |
| | Related Warranty:                                                          | |
| | [*] WAR-2026-0089 - 10kWh LFP Battery System X (SN: WPX-001)                            | |
| |     Status: Active | Expires: Jan 8, 2028                                 | |
| |                                                                             | |
| | Tags:                                                                       | |
| | [error-code] [urgent] [demo-blocker] [+ Add Tag]                          | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                               [<- Back]  [Next: Review & Assign]|
+================================================================================+
```

### Step 4: Review & Complete Triage
```
+================================================================================+
| +-- STEP 4: REVIEW & COMPLETE -----------------------------------------------+ |
| |                                                                             | |
| | Review triage decisions:                                                   | |
| |                                                                             | |
| | Issue Type:    Product Defect                                              | |
| | Priority:      HIGH (auto-suggested, accepted)                             | |
| | Category:      10kWh LFP Battery System X > Control Panel                                | |
| | Related Order: ORD-2026-0123                                               | |
| | Warranty:      Active (WAR-2026-0089)                                      | |
| |                                                                             | |
| | +-- ASSIGNMENT (Auto-Suggested) -----------------------------------------+ | |
| | |                                                                         | | |
| | | Based on rules and workload:                                           | | |
| | |                                                                         | | |
| | | Suggested Assignee: Sarah Williams                                     | | |
| | |   - Skill match: 10kWh LFP Battery System X specialist                               | | |
| | |   - Current workload: 3 open issues (lowest in team)                   | | |
| | |   - Availability: Online                                               | | |
| | |                                                                         | | |
| | | [x] Accept suggested assignment                                        | | |
| | | [ ] Assign to different agent: [Select...                           v] | | |
| | | [ ] Leave unassigned (manual pickup)                                   | | |
| | +-------------------------------------------------------------------------+ | |
| |                                                                             | |
| | Internal Notes (for assigned agent):                                       | |
| | +-----------------------------------------------------------------------+ | |
| | | Customer has demo tomorrow - prioritize. Error code E-05 typically    | | |
| | | indicates power supply issue. Check KB article KB-0045.               | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                            [<- Back]  [Complete Triage]        |
+================================================================================+
```

---

## Assignment Rules Configuration

### Rules Management Page
```
+================================================================================+
| ASSIGNMENT RULES                                              [+ New Rule]      |
+================================================================================+
|                                                                                 |
| Rules are evaluated in priority order. First matching rule wins.               |
|                                                                                 |
| +-- ACTIVE RULES ------------------------------------------------------------+ |
| |                                                                             | |
| | Pri | Rule Name                | Condition              | Assignee  | Act  | |
| |-----+--------------------------+------------------------+-----------+------| |
| |  1  | Gold Tier - Product      | Tier=Gold AND          | Sarah W.  | [E]  | |
| |     |                          | Type=Product Defect    |           | [x]  | |
| |-----+--------------------------+------------------------+-----------+------| |
| |  2  | 10kWh LFP Battery System Specialist    | Category=10kWh LFP Battery System    | Sarah W.  | [E]  | |
| |     |                          |                        |           | [x]  | |
| |-----+--------------------------+------------------------+-----------+------| |
| |  3  | Billing Issues           | Type=Billing           | Mike F.   | [E]  | |
| |     |                          |                        |           | [x]  | |
| |-----+--------------------------+------------------------+-----------+------| |
| |  4  | Round Robin (Default)    | No conditions          | Team Pool | [E]  | |
| |     |                          | (fallback)             |           | [x]  | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [Reorder Rules (Drag)]                                                         |
+================================================================================+
```

### Rule Builder
```
+================================================================================+
| CREATE ASSIGNMENT RULE                                                    [x]   |
+================================================================================+
|                                                                                 |
| +-- STEP 1: DEFINE TRIGGER --------------------------------------------------+ |
| |                                                                             | |
| | Rule Name: [Gold Tier Product Issues______________________]                | |
| |                                                                             | |
| | When an issue matches ALL of these conditions:                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- STEP 2: SET CONDITIONS --------------------------------------------------+ |
| |                                                                             | |
| | +-----------------------------------------------------------------------+  | |
| | | IF [Customer Tier    v] [equals          v] [Gold              v]    |  | |
| | |                                                         [x Remove]   |  | |
| | +-----------------------------------------------------------------------+  | |
| |                                                                             | |
| | +-----------------------------------------------------------------------+  | |
| | | AND [Issue Type     v] [equals          v] [Product Defect    v]     |  | |
| | |                                                         [x Remove]   |  | |
| | +-----------------------------------------------------------------------+  | |
| |                                                                             | |
| | [+ Add Condition]                                                          | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- STEP 3: CHOOSE ASSIGNEE -------------------------------------------------+ |
| |                                                                             | |
| | Assignment Method:                                                         | |
| |                                                                             | |
| | (*) Specific Agent                                                         | |
| |     [Sarah Williams                                                     v] | |
| |                                                                             | |
| | ( ) Round Robin                                                            | |
| |     Distribute evenly among selected agents                                | |
| |     [ ] Sarah Williams                                                     | |
| |     [ ] Mike Franklin                                                      | |
| |     [ ] John Davis                                                         | |
| |                                                                             | |
| | ( ) Least Workload                                                         | |
| |     Assign to agent with fewest open issues                                | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- STEP 4: TEST RULE -------------------------------------------------------+ |
| |                                                                             | |
| | Test with sample issue:                                                    | |
| | Tier: Gold | Type: Product Defect | Category: 10kWh LFP Battery System                  | |
| |                                                                             | |
| | [Test Rule]                                                                | |
| |                                                                             | |
| | Result: [*] Would assign to Sarah Williams                                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                               [Cancel]  [Save Rule]            |
+================================================================================+
```

---

## Resolution Templates

### Template Selection
```
+================================================================================+
| RESOLVE ISSUE - ISS-2026-0234                                            [x]   |
+================================================================================+
|                                                                                 |
| Issue: Widget not working after installation                                   |
| Type: Product Defect | Category: 10kWh LFP Battery System X > Control Panel                 |
|                                                                                 |
| +-- SELECT RESOLUTION TYPE --------------------------------------------------+ |
| |                                                                             | |
| | (*) Issue Resolved                                                         | |
| |     Problem fixed, customer can continue                                   | |
| |                                                                             | |
| | ( ) Replaced Product                                                       | |
| |     Defective item replaced                                                | |
| |                                                                             | |
| | ( ) Refunded                                                               | |
| |     Full or partial refund issued                                          | |
| |                                                                             | |
| | ( ) Repaired                                                               | |
| |     Product repaired and returned                                          | |
| |                                                                             | |
| | ( ) Cannot Resolve                                                         | |
| |     Issue cannot be fixed                                                  | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- SUGGESTED TEMPLATES (Based on Issue Type) -------------------------------+ |
| |                                                                             | |
| | [*] Error Code E-05 Resolution                                             | |
| |     Used 45 times | 92% effectiveness                                      | |
| |     [Preview]                                                              | |
| |                                                                             | |
| | [ ] General Product Troubleshooting                                        | |
| |     Used 128 times | 85% effectiveness                                     | |
| |     [Preview]                                                              | |
| |                                                                             | |
| | [ ] Start from Blank                                                       | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                                             [Use Template]     |
+================================================================================+
```

### Resolution Form with Template
```
+================================================================================+
| RESOLUTION DETAILS                                                              |
+================================================================================+
|                                                                                 |
| Template: Error Code E-05 Resolution                                           |
| (Variables auto-filled from issue context)                                     |
|                                                                                 |
| +-- INTERNAL NOTES (Not visible to customer) --------------------------------+ |
| | +-----------------------------------------------------------------------+ | |
| | | Root Cause: Power supply connection was loose after installation.     | | |
| | | Customer followed steps to reseat the power connector and error       | | |
| | | cleared. Tested operation - all functions working.                    | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- CUSTOMER MESSAGE --------------------------------------------------------+ |
| | +-----------------------------------------------------------------------+ | |
| | | Hi {{customer_name}},                                                 | | |
| | |                                                                       | | |
| | | Thank you for contacting us about the E-05 error on your Widget      | | |
| | | Pro X.                                                                | | |
| | |                                                                       | | |
| | | The E-05 error typically indicates a power connection issue. Based   | | |
| | | on our conversation, we were able to resolve this by reseating the   | | |
| | | power connector at the back of the control panel.                    | | |
| | |                                                                       | | |
| | | Steps taken:                                                          | | |
| | | 1. Powered off the unit                                              | | |
| | | 2. Disconnected and reconnected the power supply                     | | |
| | | 3. Powered on and verified normal operation                          | | |
| | |                                                                       | | |
| | | Your 10kWh LFP Battery System X should now be working normally for your demo       | | |
| | | tomorrow. If you experience any further issues, please don't         | | |
| | | hesitate to contact us.                                              | | |
| | |                                                                       | | |
| | | Best regards,                                                         | | |
| | | {{agent_name}}                                                        | | |
| | | Support Team                                                          | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | Variables: {{customer_name}} = John Smith                                  | |
| |           {{agent_name}} = Sarah Williams                                  | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- FOLLOW-UP OPTIONS -------------------------------------------------------+ |
| |                                                                             | |
| | [x] Send resolution email to customer                                      | |
| | [x] Request feedback (24 hours after resolution)                          | |
| | [ ] Schedule follow-up call                                                | |
| |                                                                             | |
| | Time Spent: [45_] minutes                                                  | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                        [Save Draft]  [Resolve & Send]          |
+================================================================================+
```

---

## Communication Timeline

### Issue Detail with Communication History
```
+================================================================================+
| ISSUE ISS-2026-0234                                          [Actions v] [x]   |
+================================================================================+
|                                                                                 |
| Widget not working after installation                                          |
| Customer: Brisbane Solar Co | John Smith <john@acme.com>                        |
| Status: IN PROGRESS | Priority: HIGH | Assigned: Sarah Williams               |
|                                                                                 |
| +-- SLA STATUS --------------------------------------------------------------+ |
| | First Response: [*] MET (45 min) | Resolution: [!] 2h 15m remaining        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- COMMUNICATION TIMELINE --------------------------------------------------+ |
| |                                                                             | |
| | +-- TODAY, January 10, 2026 ----------------------------------------------+| |
| | |                                                                          || |
| | | 11:15 AM - INTERNAL NOTE                                    Sarah W.    || |
| | | +--------------------------------------------------------------------+  || |
| | | | Spoke with customer. Guided through power connector check. Issue   |  || |
| | | | appears to be resolved. Customer will confirm after demo.          |  || |
| | | +--------------------------------------------------------------------+  || |
| | |                                                                          || |
| | | 10:55 AM - OUTGOING CALL                                   Sarah W.    || |
| | | +--------------------------------------------------------------------+  || |
| | | | Called John Smith at (555) 123-4567                                |  || |
| | | | Duration: 12 minutes                                               |  || |
| | | | Status: Connected                                                  |  || |
| | | +--------------------------------------------------------------------+  || |
| | |                                                                          || |
| | | 10:45 AM - EMAIL SENT (auto)                                System     || |
| | | +--------------------------------------------------------------------+  || |
| | | | Subject: RE: Your support request #ISS-2026-0234                   |  || |
| | | | "Hi John, Thank you for contacting support. Your request has      |  || |
| | | |  been received and assigned to Sarah Williams..."                  |  || |
| | | | Status: Delivered, Opened at 10:48 AM                             |  || |
| | | +--------------------------------------------------------------------+  || |
| | |                                                                          || |
| | | 10:42 AM - ASSIGNED                                        System      || |
| | | +--------------------------------------------------------------------+  || |
| | | | Auto-assigned to Sarah Williams                                    |  || |
| | | | Rule: "Gold Tier - Product" matched                               |  || |
| | | +--------------------------------------------------------------------+  || |
| | |                                                                          || |
| | | 10:38 AM - TRIAGE COMPLETE                                 Mike F.     || |
| | | +--------------------------------------------------------------------+  || |
| | | | Type: Product Defect | Priority: HIGH (auto-suggested)            |  || |
| | | | Category: 10kWh LFP Battery System X > Control Panel                            |  || |
| | | +--------------------------------------------------------------------+  || |
| | |                                                                          || |
| | | 10:30 AM - ISSUE CREATED                                   Customer    || |
| | | +--------------------------------------------------------------------+  || |
| | | | "We installed the 10kWh LFP Battery System X yesterday and it worked fine..."   |  || |
| | | | Attachments: photo_error.jpg, video_issue.mp4                     |  || |
| | | +--------------------------------------------------------------------+  || |
| | +--------------------------------------------------------------------------+| |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- ADD TO TIMELINE ---------------------------------------------------------+ |
| | [Reply to Customer] [Add Note] [Log Call] [Log Email]                      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
+================================================================================+
```

---

## Post-Resolution Feedback

### Public Feedback Page
```
+================================================================================+
|                                                                                 |
|                         [COMPANY LOGO]                                          |
|                                                                                 |
|                    HOW DID WE DO?                                               |
|                                                                                 |
+================================================================================+
|                                                                                 |
| Hi John,                                                                        |
|                                                                                 |
| We recently helped you with:                                                    |
| "Widget not working after installation"                                         |
|                                                                                 |
| We'd love to hear about your experience.                                        |
|                                                                                 |
| +-- RATE YOUR EXPERIENCE ----------------------------------------------------+ |
| |                                                                             | |
| |                  How satisfied are you?                                    | |
| |                                                                             | |
| |        [*]      [*]      [*]      [ ]      [ ]                             | |
| |         1        2        3        4        5                              | |
| |      Very                              Very                                | |
| |      Poor                              Good                                | |
| |                                                                             | |
| |                      Selected: 3 - Neutral                                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- ADDITIONAL FEEDBACK (Optional) ------------------------------------------+ |
| |                                                                             | |
| | What could we have done better?                                            | |
| | +-----------------------------------------------------------------------+ | |
| | |                                                                       | | |
| | |                                                                       | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | Would you recommend us to others?                                          | |
| | ( ) Definitely     ( ) Probably     (*) Maybe     ( ) Probably not        | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                                        [Submit Feedback]       |
|                                                                                 |
+================================================================================+
```

### Feedback Received - Low Rating Alert
```
+================================================================+
| [!] LOW RATING RECEIVED                                    [x]   |
+================================================================+
|                                                                 |
| Issue: ISS-2026-0234 - Widget not working                       |
| Customer: John Smith (Brisbane Solar Co)                          |
|                                                                 |
| Rating: 2 out of 5 (Poor)                                       |
|                                                                 |
| Feedback:                                                        |
| "Resolution took too long and I had to miss some of my demo."   |
|                                                                 |
| Recommendation: Probably Not                                     |
|                                                                 |
| +-- SUGGESTED ACTIONS --------------------------------------+   |
| |                                                            |   |
| | [ ] Create follow-up task for account manager              |   |
| | [ ] Schedule courtesy call from manager                    |   |
| | [ ] Review for process improvement                         |   |
| +------------------------------------------------------------+   |
|                                                                 |
| [View Issue]  [Contact Customer]  [Create Follow-up Task]       |
+================================================================+
  role="alert" aria-live="assertive"
```

---

## Support Metrics Dashboard

### Desktop View
```
+================================================================================+
| SUPPORT DASHBOARD                                       [Export] [Date: 7d v]   |
+================================================================================+
|                                                                                 |
| +-- KPI CARDS (aria-live="polite") -----------------------------------------+  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| | | Open Issues      | | Avg Response     | | Avg Resolution   | | CSAT     ||  |
| | |      23          | |     42 min       | |     4.2 hrs      | |  4.3/5   ||  |
| | | -5 vs last week  | | Target: 1hr [*]  | | Target: 8hr [*]  | | +0.2    ||  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- ISSUE FUNNEL ------------------------------------------------------------+  |
| |                                                                             |  |
| |  CREATED (45)                                                              |  |
| |  +======================================================================+   |  |
| |  |######################################################################|   |  |
| |  +======================================================================+   |  |
| |                                      |                                       |  |
| |                                      v 95% triaged                           |  |
| |  TRIAGED (43)                                                              |  |
| |  +================================================================+         |  |
| |  |################################################################|         |  |
| |  +================================================================+         |  |
| |                                      |                                       |  |
| |                                      v 100% assigned                         |  |
| |  ASSIGNED (43)                                                             |  |
| |  +================================================================+         |  |
| |  +================================================================+         |  |
| |                                      |                                       |  |
| |                                      v 65% resolved                          |  |
| |  RESOLVED (28)                                                             |  |
| |  +=========================================+                                |  |
| |  |#########################################|                                |  |
| |  +=========================================+                                |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- TEAM PERFORMANCE -------------------------+ +-- BY TYPE ------------------+ |
| |                                              | |                             | |
| | Agent        | Open | Resolved | Avg Time   | | Type           | Count | %  | |
| |-------------+------+----------+------------| | |--------------+-------+----| |
| | Sarah W.    |    4 |       12 |    3.5 hrs | | | Product      |    18 | 40%| |
| | Mike F.     |    6 |        8 |    5.2 hrs | | | Installation |    12 | 27%| |
| | John D.     |    3 |        8 |    4.1 hrs | | | Billing      |     8 | 18%| |
| +----------------------------------------------+ | | Delivery     |     5 | 11%| |
|                                                  | | Other        |     2 |  4%| |
|                                                  | +-----------------------------+ |
|                                                                                 |
| +-- SLA PERFORMANCE ---------------------------------------------------------+  |
| |                                                                             |  |
| | Response SLA Met:  92% (Target: 95%)  [!] Below target                     |  |
| | Resolution SLA Met: 88% (Target: 90%) [!] Below target                     |  |
| |                                                                             |  |
| | Breached Issues This Period: 4                                             |  |
| | [View Breached Issues]                                                     |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

---

## Mobile Views

### Mobile Issue List
```
+================================+
| Support              [+] [=]   |
+================================+
| [My Issues|All|Triage]         |
|     ^active                    |
+================================+
| Open: 4 | Urgent: 1            |
+================================+
|                                |
| +----------------------------+ |
| | ISS-2026-0234              | |
| | Widget not working         | |
| | Acme Corp | John Smith     | |
| | [!] HIGH | 2h remaining    | |
| | Status: IN PROGRESS        | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | ISS-2026-0235              | |
| | Delivery inquiry           | |
| | Tech Industries            | |
| | MEDIUM | On track          | |
| | Status: ASSIGNED           | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | ISS-2026-0236              | |
| | Installation help          | |
| | GlobalCo                   | |
| | LOW | On track             | |
| | Status: ASSIGNED           | |
| +----------------------------+ |
|                                |
+================================+
```

### Mobile Issue Detail
```
+================================+
| ISS-2026-0234            [...]|
+================================+
| Widget not working             |
|                                |
| Acme Corp - John Smith         |
| john@acme.com                  |
|                                |
| [!] HIGH - 2h 15m remaining    |
+================================+
|                                |
| STATUS: IN PROGRESS            |
| Assigned: Sarah Williams       |
|                                |
| [Update Status v]              |
|                                |
+================================+
| TIMELINE                       |
+================================+
|                                |
| 11:15 AM - Note added          |
| Spoke with customer...         |
|                                |
| 10:55 AM - Call made           |
| 12 min call with John          |
|                                |
| 10:45 AM - Email sent          |
| Auto-acknowledgment            |
|                                |
| [Load Earlier...]              |
|                                |
+================================+
| [Reply] [Note] [Call] [Resolve]|
+================================+
```

---

## Error States

### Assignment Rule Conflict
```
+================================================================+
| [!] Assignment Rule Conflict                              [x]   |
+================================================================+
|                                                                 |
| Multiple rules match this issue:                                 |
|                                                                 |
| Rule 1: "Gold Tier - Product" -> Sarah Williams                 |
| Rule 2: "10kWh LFP Battery System Specialist" -> Sarah Williams               |
|                                                                 |
| Resolution: Assigned via Rule 1 (higher priority)               |
|                                                                 |
| Suggestion: Consider consolidating these rules to avoid         |
| future conflicts.                                                |
|                                                                 |
| [View Rules]  [Dismiss]                                         |
+================================================================+
```

### Email Send Failure
```
+================================================================+
| [!] Email Not Sent                                        [x]   |
+================================================================+
|                                                                 |
| Could not send email to john@acme.com                           |
|                                                                 |
| Error: Temporary delivery failure                               |
|                                                                 |
| The message has been queued and will be retried                 |
| automatically in 5 minutes.                                      |
|                                                                 |
| [Retry Now]  [Use Different Email]  [Mark as Sent Manually]    |
+================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels
```html
<main role="main" aria-label="Support issue management">
  <!-- Issue Timeline -->
  <section role="feed" aria-label="Issue communication timeline">
    <article role="article"
             aria-label="Internal note from Sarah Williams at 11:15 AM">
      <!-- Timeline entry content -->
    </article>
  </section>

  <!-- Triage Wizard -->
  <form role="form" aria-label="Issue triage wizard">
    <div role="group" aria-label="Step 1 of 4: Classify issue type">
      <fieldset>
        <legend>Select the issue type</legend>
        <input type="radio" name="type" id="product-defect"
               aria-describedby="product-defect-desc">
        <label for="product-defect">Product Defect</label>
        <span id="product-defect-desc">Hardware or software malfunction</span>
      </fieldset>
    </div>
  </form>
</main>
```

### Keyboard Navigation
```
Tab Order:
1. Status update dropdown
2. Action buttons (Reply, Note, Call, Resolve)
3. Timeline entries (newest first)
4. Load more button

Timeline:
- Arrow up/down to navigate entries
- Enter to expand entry details
- Tab to access entry actions

Screen Reader:
- SLA status announced on page load
- New timeline entries announced as they're added
- Priority and status changes announced
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, tab navigation, bottom action bar |
| Tablet | 640px - 1024px | Two-column layout, side panel for details |
| Desktop | > 1024px | Full timeline, expanded metrics, split views |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Triage complete | < 3s | From submit to assignment |
| Timeline load | < 1s | Initial timeline render |
| Real-time updates | < 500ms | New entries appear |
| Email send | < 5s | From click to confirmation |
| Search results | < 500ms | Issue search response |

---

## Related Wireframes

- [Warranty Claims](./warranty-claims.wireframe.md)
- [Customer Onboarding](./customer-onboarding.wireframe.md)
- [Support Dashboard](../domains/support-dashboard.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
