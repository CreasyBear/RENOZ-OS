# Support CSAT Feedback Wireframe

**Story IDs:** DOM-SUP-005a, DOM-SUP-005b, DOM-SUP-005c
**Domain Color:** Orange-500
**Last Updated:** 2026-01-10
**PRD Reference:** `/memory-bank/prd/domains/support.prd.json`

---

## Dependencies

> **IMPORTANT**: This wireframe requires backend stories to complete first.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **Schema Required** | `csatResponses` | NOT CREATED |
| **Server Functions Required** | CSAT submission, token-based public form, email triggers | NOT CREATED |
| **PRD Stories (Must Complete First)** | DOM-SUP-005a, DOM-SUP-005b | PENDING |

### Existing Schema Available
- `issues` in `renoz-v2/lib/schema/issues.ts`
- `issueAttachments` in `renoz-v2/lib/schema/issues.ts`

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Support Types**: Warranty claims, service requests, product questions
- **Priority**: low, normal, high, urgent

---

## Overview

Customer Satisfaction (CSAT) feedback tracks customer happiness with support interactions. This wireframe covers:
- Internal rating entry on issue detail
- Public rating form (token-based, no auth)
- Email rating request on resolution
- CSAT dashboard metrics and trends
- Low rating follow-up workflow

---

## UI Patterns (Reference Implementation)

### Star Rating Input
- **Pattern**: RE-UI Custom Rating Component
- **Reference**: Build on `_reference/.reui-reference/registry/default/ui/button.tsx` for interactive elements
- **Features**:
  - 5-star interactive rating with hover states
  - Click/keyboard selection with ARIA support
  - Emoji variations for public form (1-5 sentiment faces)
  - Read-only display mode for submitted ratings

### Public CSAT Form
- **Pattern**: RE-UI Card + Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx` and `_reference/.reui-reference/registry/default/ui/input.tsx`
- **Features**:
  - Token-based public access (no authentication)
  - Large clickable rating cards with emoji indicators
  - Optional comment textarea
  - Success state with checkmark animation

### Manual Rating Entry Dialog
- **Pattern**: RE-UI Dialog + Form
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`
- **Features**:
  - Modal dialog for internal rating entry
  - Star rating input with labels (Very Poor to Excellent)
  - Radio group for rating source (phone, email, in-person)
  - Comment field for customer feedback

### CSAT Dashboard Widget
- **Pattern**: RE-UI Card + Progress + Badge
- **Reference**: `_reference/.reui-reference/registry/default/ui/card.tsx`, `_reference/.reui-reference/registry/default/ui/progress.tsx`, `_reference/.reui-reference/registry/default/ui/badge.tsx`
- **Features**:
  - Overall CSAT score with star display
  - Rating distribution bars (1-5 stars)
  - Trend indicator (+12% from last period)
  - Recent feedback list with rating display

### Low Rating Alert
- **Pattern**: RE-UI Alert
- **Reference**: `_reference/.reui-reference/registry/default/ui/alert.tsx`
- **Features**:
  - Warning-level alert for ratings 1-2 stars
  - Customer comment display
  - Action buttons for viewing issue or creating follow-up
  - Dismissible notification

### Follow-up Task Dialog
- **Pattern**: RE-UI Dialog + Form + Textarea
- **Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`, `_reference/.reui-reference/registry/default/ui/textarea.tsx`
- **Features**:
  - Pre-filled title and description based on low rating
  - Assignee select dropdown
  - Due date picker with calendar
  - Priority button group (Low, Medium, High, Urgent)

---

## Desktop View (1280px+)

### Issue Detail - CSAT Rating Display

```
+================================================================================+
| < Back to Issues                                                                |
+================================================================================+
| +----------------------------------------------------------------------------+ |
| | ISS-1234: Defective product - handle replacement       Status: [*] RESOLVED| |
| |     Customer: Brisbane Solar Cooration  |  Type: Claim  |  Resolved: Jan 12        | |
| +----------------------------------------------------------------------------+ |
+================================================================================+
|                                                                                 |
| +-- CUSTOMER SATISFACTION ----------------------------------------------------+ |
| |                                                                             | |
| |  +== CSAT RATING (Collected Jan 13) =====================================+  | |
| |  |                                                                       |  | |
| |  |     Rating:  [*] [*] [*] [*] [ ]   4 out of 5                         |  | |
| |  |                                                                       |  | |
| |  |     "Quick response and the replacement arrived faster than           |  | |
| |  |      expected. Would have been 5 stars if we didn't have to           |  | |
| |  |      follow up once about shipping."                                  |  | |
| |  |                                                                       |  | |
| |  |     Submitted: Jan 13, 2026, 2:45 PM                                  |  | |
| |  |     Submitted by: John Smith (Contact at Brisbane Solar Cooration)            |  | |
| |  |                                                                       |  | |
| |  +-----------------------------------------------------------------------+  | |
| |                                                                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [Overview] [Activity] [Attachments] [Related]                                   |
|                                                                                 |
+=================================================================================+
```

### Issue Detail - No Rating Yet

```
+-- CUSTOMER SATISFACTION (Pending) --------------------------------------------+
|                                                                               |
|  +== CSAT RATING =========================================================+  |
|  |                                                                         |  |
|  |     Rating:  [ ] [ ] [ ] [ ] [ ]   Not yet received                     |  |
|  |                                                                         |  |
|  |     Rating request sent: Jan 12, 2026, 4:30 PM                          |  |
|  |     Sent to: john.smith@acmecorp.com                                    |  |
|  |                                                                         |  |
|  |     [ Resend Rating Request ]   [ Enter Rating Manually ]               |  |
|  |                                                                         |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
+-------------------------------------------------------------------------------+
```

### Manual Rating Entry Dialog (Internal)

```
+================================================================+
| Enter Customer Rating                                     [X]  |
+================================================================+
|                                                                |
|  Issue: ISS-1234 - Defective product                           |
|  Customer: Brisbane Solar Cooration                                    |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  How would you rate the customer's satisfaction?               |
|                                                                |
|  +----------------------------------------------------------+  |
|  |                                                          |  |
|  |     [ 1 ]    [ 2 ]    [ 3 ]    [ 4 ]    [ 5 ]            |  |
|  |                                                          |  |
|  |     Very      Poor    Neutral   Good   Excellent         |  |
|  |     Poor                                                 |  |
|  |                                                          |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Customer Comment (if provided)                                |
|  +----------------------------------------------------------+  |
|  | Customer mentioned they were happy with the resolution   |  |
|  | but wished it had been faster.                           |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Rating Source *                                               |
|  +----------------------------------------------------------+  |
|  | ( ) Phone call                                            |  |
|  | (o) Email response                                        |  |
|  | ( ) In-person                                             |  |
|  | ( ) Other                                                 |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Note: This will be recorded as a manual entry                 |
|                                                                |
|                        ( Cancel )  [ Save Rating ]             |
+================================================================+
```

### Public CSAT Form (Customer-Facing - No Auth)

```
+================================================================================+
|                                                                                 |
|                           [Company Logo]                                        |
|                                                                                 |
|                    How did we do?                                               |
|                                                                                 |
+================================================================================+
|                                                                                 |
|  Issue: Defective product - handle replacement needed                           |
|  Resolved: January 12, 2026                                                     |
|                                                                                 |
|  ----------------------------------------------------------                     |
|                                                                                 |
|  Please rate your experience:                                                   |
|                                                                                 |
|  +------------------------------------------------------------------------+     |
|  |                                                                        |     |
|  |    +--------+   +--------+   +--------+   +--------+   +--------+      |     |
|  |    |        |   |        |   |        |   |        |   |        |      |     |
|  |    |   1    |   |   2    |   |   3    |   |   4    |   |   5    |      |     |
|  |    |  [:(]  |   |  [:|]  |   |  [:|]  |   |  [:)]  |   |  [:D]  |      |     |
|  |    |        |   |        |   |        |   |        |   |        |      |     |
|  |    +--------+   +--------+   +--------+   +--------+   +--------+      |     |
|  |                                                                        |     |
|  |    Very Poor    Poor       Neutral      Good       Excellent          |     |
|  |                                                                        |     |
|  +------------------------------------------------------------------------+     |
|                                                                                 |
|  Tell us more (optional):                                                       |
|  +------------------------------------------------------------------------+     |
|  |                                                                        |     |
|  | What went well? What could we improve?                                 |     |
|  |                                                                        |     |
|  |                                                                        |     |
|  +------------------------------------------------------------------------+     |
|                                                                                 |
|  +------------------------------------------------------------------------+     |
|  |                                                                        |     |
|  |                     [ Submit Feedback ]                                |     |
|  |                                                                        |     |
|  +------------------------------------------------------------------------+     |
|                                                                                 |
|  Your feedback helps us improve. Thank you!                                     |
|                                                                                 |
+================================================================================+
```

### Public CSAT Form - Rating Selected State

```
+================================================================================+
|                                                                                 |
|                           [Company Logo]                                        |
|                                                                                 |
|                    How did we do?                                               |
|                                                                                 |
+================================================================================+
|                                                                                 |
|  Issue: Defective product - handle replacement needed                           |
|  Resolved: January 12, 2026                                                     |
|                                                                                 |
|  ----------------------------------------------------------                     |
|                                                                                 |
|  Please rate your experience:                                                   |
|                                                                                 |
|  +------------------------------------------------------------------------+     |
|  |                                                                        |     |
|  |    +--------+   +--------+   +--------+   +========+   +--------+      |     |
|  |    |        |   |        |   |        |   ||      ||   |        |      |     |
|  |    |   1    |   |   2    |   |   3    |   ||  4   ||   |   5    |      |     |
|  |    |  [:(]  |   |  [:|]  |   |  [:|]  |   || [:)] ||   |  [:D]  |      |     |
|  |    |        |   |        |   |        |   ||      ||   |        |      |     |
|  |    +--------+   +--------+   +--------+   +========+   +--------+      |     |
|  |                                            ^selected                   |     |
|  |    Very Poor    Poor       Neutral      Good       Excellent          |     |
|  |                                                                        |     |
|  +------------------------------------------------------------------------+     |
|                                                                                 |
|  Tell us more (optional):                                                       |
|  +------------------------------------------------------------------------+     |
|  | Quick response and the replacement arrived faster than expected.       |     |
|  | Would have been 5 stars if we didn't have to follow up once about     |     |
|  | shipping.                                                              |     |
|  +------------------------------------------------------------------------+     |
|                                                                                 |
|  +------------------------------------------------------------------------+     |
|  |                                                                        |     |
|  |                     [ Submit Feedback ]                                |     |
|  |                                                                        |     |
|  +------------------------------------------------------------------------+     |
|                                                                                 |
+================================================================================+
```

### Public CSAT Form - Success State

```
+================================================================================+
|                                                                                 |
|                           [Company Logo]                                        |
|                                                                                 |
+================================================================================+
|                                                                                 |
|                                                                                 |
|                    +--------------------------------+                           |
|                    |                                |                           |
|                    |      [checkmark icon]          |                           |
|                    |                                |                           |
|                    |    Thank you for your          |                           |
|                    |       feedback!                |                           |
|                    |                                |                           |
|                    +--------------------------------+                           |
|                                                                                 |
|                                                                                 |
|           Your rating of 4/5 has been recorded.                                 |
|                                                                                 |
|           We appreciate you taking the time to                                  |
|           help us improve our service.                                          |
|                                                                                 |
|                                                                                 |
+================================================================================+
```

### CSAT Dashboard Widget

```
+-- CUSTOMER SATISFACTION (Last 30 Days) --------------------------------------+
|                                                                               |
|  +== CSAT SCORE ==========================================================+  |
|  |                                                                         |  |
|  |     Overall CSAT:  4.2 / 5.0                                            |  |
|  |                                                                         |  |
|  |     [*] [*] [*] [*] [.] (84%)                                           |  |
|  |                                                                         |  |
|  |     +12% from last period                                               |  |
|  |                                                                         |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
|  +== RATING DISTRIBUTION =================================================+  |
|  |                                                                         |  |
|  |  5 stars  [########################################] 45 (38%)           |  |
|  |  4 stars  [################################] 36 (31%)                   |  |
|  |  3 stars  [####################] 24 (21%)                               |  |
|  |  2 stars  [######] 8 (7%)                                               |  |
|  |  1 star   [###] 4 (3%)                                                  |  |
|  |                                                                         |  |
|  |  Total: 117 ratings                                                     |  |
|  |                                                                         |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
|  +== RECENT FEEDBACK =====================================================+  |
|  |                                                                         |  |
|  |  ISS-1234 - [*][*][*][*][ ] - "Quick response..."         Jan 13       |  |
|  |  ISS-1230 - [*][*][*][*][*] - "Excellent support!"        Jan 12       |  |
|  |  ISS-1228 - [*][*][ ][ ][ ] - "Took too long to..."       Jan 11       |  |
|  |                                                                         |  |
|  |  [ View All Feedback ]                                                  |  |
|  |                                                                         |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
+-------------------------------------------------------------------------------+
```

### Low Rating Alert & Follow-up

```
+================================================================================+
| NOTIFICATIONS                                                                   |
+================================================================================+
|                                                                                 |
| +-- NEW ALERT (2 minutes ago) -----------------------------------------------+ |
| |                                                                            | |
| | [!] Low CSAT Rating Received                                               | |
| |                                                                            | |
| | ISS-1228 received a 2-star rating from Beta Inc.                           | |
| |                                                                            | |
| | Customer comment: "Took too long to resolve and I had to follow up         | |
| | multiple times. Not happy with the experience."                            | |
| |                                                                            | |
| | Assigned: John Doe                                                         | |
| |                                                                            | |
| | [ View Issue ]  [ Create Follow-up Task ]  [ Dismiss ]                     | |
| |                                                                            | |
| +----------------------------------------------------------------------------+ |
|                                                                                 |
+=================================================================================+
```

### Follow-up Task Creation

```
+================================================================+
| Create Follow-up Task                                     [X]  |
+================================================================+
|                                                                |
|  Low Rating Follow-up                                          |
|                                                                |
|  Issue: ISS-1228 - Warranty claim - BMS fault                              |
|  Customer: Beta Inc                                            |
|  Rating: 2/5 stars                                             |
|  Comment: "Took too long to resolve..."                        |
|                                                                |
|  ----------------------------------------------------------    |
|                                                                |
|  Task Details                                                  |
|                                                                |
|  Title *                                                       |
|  +----------------------------------------------------------+  |
|  | Follow up on low CSAT rating for ISS-1228                 |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Description                                                   |
|  +----------------------------------------------------------+  |
|  | Customer rated 2/5 stars. Complaint: Resolution time     |  |
|  | and required multiple follow-ups.                        |  |
|  |                                                           |  |
|  | Action items:                                             |  |
|  | - Review issue timeline                                   |  |
|  | - Contact customer to apologize and understand better     |  |
|  | - Document learnings for team                             |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Assign To *                                                   |
|  +---------------------------------------------- v-----------+  |
|  | Sarah Manager (Support Lead)                              |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Due Date *                                                    |
|  +----------------------------------------------------------+  |
|  | Tomorrow                                         [calendar]|  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Priority                                                      |
|  +----------+ +----------+ +----------+ +----------+           |
|  |   Low    | | Medium   | |  [High]  | |  Urgent  |           |
|  +----------+ +----------+ +----------+ +----------+           |
|                                                                |
|                       ( Cancel )  [ Create Task ]              |
+================================================================+
```

---

## Tablet View (768px)

### CSAT Section (Tablet)

```
+================================================================+
| ISS-1234 - Defective product             Status: [*] RESOLVED   |
+================================================================+
|                                                                 |
| CUSTOMER SATISFACTION                                           |
| +-------------------------------------------------------------+ |
| |                                                             | |
| | Rating:  [*] [*] [*] [*] [ ]   4/5                          | |
| |                                                             | |
| | "Quick response and the replacement arrived faster than     | |
| | expected. Would have been 5 stars if we didn't have to      | |
| | follow up once about shipping."                             | |
| |                                                             | |
| | Submitted: Jan 13, 2026                                     | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
+================================================================+
```

### Public Form (Tablet)

```
+================================================================+
|                                                                 |
|                    [Company Logo]                               |
|                                                                 |
|               How did we do?                                    |
|                                                                 |
| Issue: Defective product - handle replacement                   |
| Resolved: January 12, 2026                                      |
|                                                                 |
| +-------------------------------------------------------------+ |
| |                                                             | |
| |  +------+ +------+ +------+ +------+ +------+               | |
| |  |  1   | |  2   | |  3   | |  4   | |  5   |               | |
| |  | [:(] | | [:|] | | [:|] | | [:)] | | [:D] |               | |
| |  +------+ +------+ +------+ +------+ +------+               | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
| Tell us more (optional):                                        |
| +-------------------------------------------------------------+ |
| |                                                             | |
| |                                                             | |
| +-------------------------------------------------------------+ |
|                                                                 |
| +-------------------------------------------------------------+ |
| |                [ Submit Feedback ]                          | |
| +-------------------------------------------------------------+ |
|                                                                 |
+================================================================+
```

---

## Mobile View (375px)

### CSAT Rating Display (Mobile)

```
+================================+
| < Back          ISS-1234       |
+================================+
|                                |
| Defective product              |
| Status: [*] RESOLVED           |
|                                |
+================================+
|                                |
| CUSTOMER SATISFACTION          |
| =============================== |
|                                |
| Rating:                        |
| [*] [*] [*] [*] [ ]            |
| 4 out of 5                     |
|                                |
| +----------------------------+ |
| | "Quick response and the    | |
| | replacement arrived        | |
| | faster than expected..."   | |
| +----------------------------+ |
|                                |
| Submitted: Jan 13, 2026        |
| By: John Smith                 |
|                                |
+================================+
```

### Public CSAT Form (Mobile)

```
+================================+
|                                |
|       [Company Logo]           |
|                                |
|     How did we do?             |
|                                |
+================================+
|                                |
| Issue:                         |
| Defective product - handle     |
| replacement needed             |
|                                |
| Resolved: January 12, 2026     |
|                                |
| =============================== |
|                                |
| Rate your experience:          |
|                                |
| +----------------------------+ |
| |                            | |
| | +----+ +----+ +----+       | |
| | | 1  | | 2  | | 3  |       | |
| | |[:(]| |[:|]| |[:|]|       | |
| | +----+ +----+ +----+       | |
| |                            | |
| | +----+ +----+              | |
| | | 4  | | 5  |              | |
| | |[:)]| |[:D]|              | |
| | +----+ +----+              | |
| |                            | |
| +----------------------------+ |
|                                |
| Tell us more:                  |
| +----------------------------+ |
| |                            | |
| |                            | |
| |                            | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| |                            | |
| |   [ Submit Feedback ]      | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

### Low Rating Alert (Mobile)

```
+================================+
| Notifications                  |
+================================+
|                                |
| +----------------------------+ |
| | [!] LOW RATING             | |
| |                     2m ago | |
| |                            | |
| | ISS-1228 received 2 stars  | |
| | from Beta Inc.             | |
| |                            | |
| | "Took too long to          | |
| | resolve..."                | |
| |                            | |
| | [View]     [Follow-up]     | |
| +----------------------------+ |
|                                |
+================================+
```

### Manual Rating Entry (Mobile)

```
+================================+
| ============================== |
|                                |
| ENTER RATING             [X]   |
| =============================== |
|                                |
| Issue: ISS-1234                |
| Customer: Brisbane Solar Co            |
|                                |
| How satisfied was the          |
| customer?                      |
|                                |
| +----------------------------+ |
| |                            | |
| | +----+ +----+ +----+       | |
| | | 1  | | 2  | | 3  |       | |
| | +----+ +----+ +----+       | |
| |                            | |
| | +----+ +----+              | |
| | [[4]] | 5  |               | |
| | +----+ +----+              | |
| |                            | |
| +----------------------------+ |
|                                |
| Customer Comment               |
| +----------------------------+ |
| | Customer said they were    | |
| | happy but wished it was    | |
| | faster...                  | |
| +----------------------------+ |
|                                |
| Source                         |
| +----------------------------+ |
| | ( ) Phone                  | |
| | (o) Email                  | |
| | ( ) In-person              | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| |                            | |
| |     [ Save Rating ]        | |
| |                            | |
| +----------------------------+ |
|                                |
+================================+
```

---

## Rating Star States

```
+-- EMPTY STAR ---------------------------------+
|  [ ]  or  [star-outline]                      |
|  Color: gray-300                              |
|  Background: transparent                      |
+-----------------------------------------------+

+-- FILLED STAR --------------------------------+
|  [*]  or  [star-filled]                       |
|  Color: yellow-400 (or orange-500 for brand)  |
|  Background: yellow-400                       |
+-----------------------------------------------+

+-- HOVER STATE (Interactive) ------------------+
|  All stars up to hovered position fill        |
|  Color: yellow-300 (lighter)                  |
|  Scale: 1.1                                   |
+-----------------------------------------------+

+-- SELECTED STATE -----------------------------+
|  All stars up to selected position filled     |
|  Border ring around selected star             |
|  Subtle pulse animation on selection          |
+-----------------------------------------------+

+-- EMOJI VARIATIONS (Public Form) -------------+
|                                               |
|  1: [:(]  Very Poor     - red-500             |
|  2: [:|]  Poor          - orange-500          |
|  3: [:|]  Neutral       - yellow-500          |
|  4: [:)]  Good          - lime-500            |
|  5: [:D]  Excellent     - green-500           |
|                                               |
+-----------------------------------------------+
```

---

## Loading States

### Rating Section Loading

```
+-- CUSTOMER SATISFACTION (Loading) ------------------------------------+
|                                                                       |
|  +== CSAT RATING ===================================================+|
|  |                                                                   ||
|  |     Rating:  [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~]                 ||
|  |                                                                   ||
|  |     [shimmer~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~]             ||
|  |     [shimmer~~~~~~~~~~~~~~~~~~~~~~]                               ||
|  |                                                                   ||
|  +-------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

### Public Form Submitting

```
+================================================================================+
|                                                                                 |
|                           [Company Logo]                                        |
|                                                                                 |
+================================================================================+
|                                                                                 |
|  +------------------------------------------------------------------------+     |
|  |                                                                        |     |
|  |                      [spinner]                                         |     |
|  |                                                                        |     |
|  |              Submitting your feedback...                               |     |
|  |                                                                        |     |
|  +------------------------------------------------------------------------+     |
|                                                                                 |
+================================================================================+
```

---

## Empty States

### No Rating Collected

```
+-- CUSTOMER SATISFACTION (No Rating) ----------------------------------+
|                                                                       |
|  +== CSAT RATING ===================================================+|
|  |                                                                   ||
|  |     Rating:  [ ] [ ] [ ] [ ] [ ]   Not yet received               ||
|  |                                                                   ||
|  |     Rating request will be sent when issue is resolved.           ||
|  |                                                                   ||
|  +-------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

### No Recent Feedback

```
+-- RECENT FEEDBACK (Empty) --------------------------------------------+
|                                                                       |
|                    [illustration]                                     |
|                                                                       |
|           No feedback received yet                                    |
|                                                                       |
|    Customer feedback will appear here after                           |
|    issues are resolved and rated.                                     |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Error States

### Failed to Load Rating

```
+-- CUSTOMER SATISFACTION (Error) --------------------------------------+
|                                                                       |
|  [!] Unable to load rating                                            |
|                                                                       |
|  There was a problem loading the customer feedback.                   |
|                                                                       |
|  [Retry]                                                              |
|                                                                       |
+-----------------------------------------------------------------------+
```

### Invalid Token (Public Form)

```
+================================================================================+
|                                                                                 |
|                           [Company Logo]                                        |
|                                                                                 |
+================================================================================+
|                                                                                 |
|  +------------------------------------------------------------------------+     |
|  |                                                                        |     |
|  |     [warning icon]                                                     |     |
|  |                                                                        |     |
|  |     Invalid or Expired Link                                            |     |
|  |                                                                        |     |
|  |     This feedback link is no longer valid. It may have                 |     |
|  |     expired or already been used.                                      |     |
|  |                                                                        |     |
|  |     If you need to provide feedback, please contact                    |     |
|  |     our support team.                                                  |     |
|  |                                                                        |     |
|  +------------------------------------------------------------------------+     |
|                                                                                 |
+================================================================================+
```

### Rate Limit Exceeded

```
+================================================================================+
|                                                                                 |
|                           [Company Logo]                                        |
|                                                                                 |
+================================================================================+
|                                                                                 |
|  +------------------------------------------------------------------------+     |
|  |                                                                        |     |
|  |     [info icon]                                                        |     |
|  |                                                                        |     |
|  |     Feedback Already Submitted                                         |     |
|  |                                                                        |     |
|  |     You have already submitted feedback for this issue.                |     |
|  |     Thank you for your response!                                       |     |
|  |                                                                        |     |
|  +------------------------------------------------------------------------+     |
|                                                                                 |
+================================================================================+
```

---

## Success States

### Rating Submitted (Internal)

```
+================================================================+
| [success] Rating Saved                                          |
|                                                                |
| Customer rating of 4/5 has been recorded for ISS-1234.         |
|                                                                |
| [ Dismiss ]                                                    |
+================================================================+
```

### Rating Submitted (Public Form - Already Shown Above)

### Email Sent Confirmation

```
+================================================================+
| [success] Rating Request Sent                                   |
|                                                                |
| An email has been sent to john.smith@acmecorp.com              |
| requesting feedback for ISS-1234.                              |
|                                                                |
| [ Dismiss ]                                                    |
+================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels

```tsx
// Star Rating (Interactive)
<div
  role="radiogroup"
  aria-label="Customer satisfaction rating"
>
  {[1, 2, 3, 4, 5].map((value) => (
    <button
      key={value}
      role="radio"
      aria-checked={rating === value}
      aria-label={`${value} star${value > 1 ? 's' : ''}, ${getLabel(value)}`}
      onClick={() => setRating(value)}
    >
      <Star filled={value <= rating} />
    </button>
  ))}
</div>

// Star Rating (Display Only)
<div
  role="img"
  aria-label={`Customer rating: ${rating} out of 5 stars`}
>
  {[1, 2, 3, 4, 5].map((value) => (
    <Star key={value} filled={value <= rating} aria-hidden="true" />
  ))}
</div>

// Emoji Rating (Public Form)
<fieldset>
  <legend>Please rate your experience</legend>
  <div role="radiogroup" aria-label="Satisfaction rating">
    <label>
      <input
        type="radio"
        name="rating"
        value="1"
        aria-describedby="rating-1-desc"
      />
      <span aria-hidden="true">[:(]</span>
      <span id="rating-1-desc">1 star - Very Poor</span>
    </label>
    <!-- ... more options -->
  </div>
</fieldset>

// CSAT Dashboard Widget
<section
  role="region"
  aria-label="Customer satisfaction metrics for last 30 days"
>
  <h2>Customer Satisfaction</h2>
  <div aria-live="polite">
    Overall CSAT: 4.2 out of 5.0, 84 percent satisfaction
  </div>
</section>
```

### Keyboard Navigation

```
Star Rating (Internal Entry):
1. Tab to rating group
2. Arrow Left/Right to change rating
3. Enter/Space to confirm selection
4. Tab to comment field
5. Tab to source radio buttons
6. Tab to Save button

Public Form:
1. Tab to first rating option (1 star)
2. Arrow keys to navigate between options
3. Enter/Space to select
4. Tab to comment textarea
5. Tab to Submit button
6. Enter to submit

Dashboard Widget:
1. Tab to CSAT score (read-only)
2. Tab to each feedback entry
3. Enter on entry to view issue
4. Tab to View All button
```

### Screen Reader Announcements

```
On rating selection (interactive):
  "Selected 4 stars, Good. Use arrow keys to change rating."

On rating display (read-only):
  "Customer rating: 4 out of 5 stars. Comment: Quick response
   and the replacement arrived faster than expected."

On form submission:
  "Feedback submitted successfully. Thank you for rating
   your experience 4 out of 5 stars."

On low rating alert:
  "Alert: Low customer satisfaction rating received.
   Issue ISS-1228 received 2 stars from Beta Inc.
   Comment: Took too long to resolve."

On dashboard load:
  "Customer satisfaction dashboard. Overall score: 4.2 out of 5,
   84 percent satisfaction. 117 total ratings in last 30 days."
```

---

## Animation Choreography

### Star Selection Animation

```
Star Fill Animation:

FRAME 1 (0ms):
  Stars 1-3 filled, 4-5 empty
  User clicks star 4

FRAME 2 (50ms):
  Star 4 scales up (1.2)
  Begins fill animation

FRAME 3 (100ms):
  Star 4 fills with color (left to right)
  Stars 1-4 all filled

FRAME 4 (150ms):
  Star 4 scales back to 1.0
  Subtle glow pulse

Duration: 150ms
Easing: spring
Haptic: light (mobile)
```

### Emoji Selection Animation

```
Emoji Selection Animation:

FRAME 1: All emojis at rest (gray)
FRAME 2 (0-100ms): Selected emoji scales up (1.15)
FRAME 3 (100-200ms): Color fills in (emoji-specific color)
FRAME 4 (200-300ms): Ring border appears
FRAME 5 (300-400ms): Other emojis fade slightly

Duration: 400ms total
Selected emoji: bounce effect
```

### Thank You Reveal

```
Success State Animation:

FRAME 1 (0ms): Form content visible
FRAME 2 (0-200ms): Form fades out, slides up
FRAME 3 (200-400ms): Checkmark draws in (path animation)
FRAME 4 (400-600ms): "Thank you" text fades in
FRAME 5 (600-800ms): Rating summary fades in below

Duration: 800ms
Checkmark: green with subtle pulse
```

### Low Rating Alert Entry

```
Alert Notification Animation:

FRAME 1: Notification slides in from right
FRAME 2 (0-150ms): Attention pulse (red glow)
FRAME 3 (150-300ms): Content fades in
FRAME 4 (300ms+): Idle with subtle warning indicator

Duration: 300ms entry
Sound: (optional) alert chime
Haptic: medium warning (mobile)
```

---

## Component Props Interface

```typescript
// CSAT Rating Value
type CSATRating = 1 | 2 | 3 | 4 | 5;

// Rating Source
type RatingSource = 'email' | 'phone' | 'in_person' | 'form' | 'manual';

// CSAT Feedback
interface CSATFeedback {
  id: string;
  issueId: string;
  rating: CSATRating;
  comment?: string;
  submittedAt: Date;
  submittedBy?: string; // Contact name
  source: RatingSource;
  token?: string;
}

// Star Rating Input
interface StarRatingInputProps {
  value?: CSATRating;
  onChange: (rating: CSATRating) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  showLabels?: boolean;
}

// Star Rating Display
interface StarRatingDisplayProps {
  rating: CSATRating;
  size?: 'sm' | 'md' | 'lg';
  showNumeric?: boolean;
  className?: string;
}

// Emoji Rating Input (Public Form)
interface EmojiRatingInputProps {
  value?: CSATRating;
  onChange: (rating: CSATRating) => void;
  disabled?: boolean;
}

// CSAT Section on Issue Detail
interface CSATSectionProps {
  issueId: string;
  issueStatus: 'open' | 'resolved' | 'closed';
  feedback?: CSATFeedback;
  ratingRequestSentAt?: Date;
  ratingRequestEmail?: string;
  onResendRequest: () => Promise<void>;
  onManualEntry: () => void;
  isLoading?: boolean;
}

// Manual Rating Entry Dialog
interface ManualRatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  issueSummary: string;
  customerName: string;
  onSubmit: (data: ManualRatingData) => Promise<void>;
  isSubmitting?: boolean;
}

interface ManualRatingData {
  rating: CSATRating;
  comment?: string;
  source: RatingSource;
}

// Public CSAT Form
interface PublicCSATFormProps {
  token: string;
  issueTitle: string;
  resolvedDate: Date;
  companyLogo?: string;
  companyName: string;
  onSubmit: (data: PublicRatingData) => Promise<void>;
  isSubmitting?: boolean;
  isAlreadySubmitted?: boolean;
  isInvalidToken?: boolean;
}

interface PublicRatingData {
  rating: CSATRating;
  comment?: string;
}

// CSAT Dashboard Widget
interface CSATDashboardWidgetProps {
  period: 'week' | 'month' | 'quarter' | 'year';
  averageRating: number;
  percentSatisfied: number; // Ratings 4-5
  totalRatings: number;
  ratingDistribution: Record<CSATRating, number>;
  trend: number; // +/- percentage vs previous period
  recentFeedback: Array<{
    issueId: string;
    issueSummary: string;
    rating: CSATRating;
    comment?: string;
    submittedAt: Date;
  }>;
  onViewAll: () => void;
  isLoading?: boolean;
}

// Low Rating Alert
interface LowRatingAlertProps {
  issueId: string;
  issueSummary: string;
  rating: CSATRating;
  comment?: string;
  customerName: string;
  assignedTo?: string;
  receivedAt: Date;
  onViewIssue: () => void;
  onCreateFollowUp: () => void;
  onDismiss: () => void;
}

// Follow-up Task Dialog
interface CSATFollowUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  issueSummary: string;
  rating: CSATRating;
  comment?: string;
  customerName: string;
  onSubmit: (data: FollowUpTaskData) => Promise<void>;
  assignees: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
}

interface FollowUpTaskData {
  title: string;
  description: string;
  assigneeId: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Rating section load | < 200ms | Issue detail page |
| Public form load | < 1s | Full page including branding |
| Rating submission | < 2s | From click to success |
| Dashboard widget load | < 500ms | With calculations |
| Email send | < 3s | Background, non-blocking |

---

## Related Wireframes

- [Support Dashboard](./support-dashboard.wireframe.md) - CSAT metrics display
- [Issue Detail](./support-issue-detail.wireframe.md) - CSAT section location
- [Notifications](./support-notifications.wireframe.md) - Low rating alerts

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
