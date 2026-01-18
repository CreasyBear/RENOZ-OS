# Warranty Claims Workflow Wireframe
## WF-WARRANTY: Claim Submission to Resolution

**Last Updated:** 2026-01-10
**PRD Reference:** workflows/warranty-claims.prd.json
**Priority:** 5 (Quality and customer trust)

---

## Overview

The Warranty Claims workflow manages the complete warranty claim process from initial submission through verification, approval, and resolution. This wireframe covers:
- Claim intake with serial lookup
- Verification checklist
- Approval routing by value
- Resolution options (replace, repair, refund)
- Product return tracking
- Claims analytics

**Workflow Stages:** Claim Submitted -> Verify Warranty -> Assess Claim -> Approve/Deny -> Process Resolution

**Aesthetic:** "Trust and transparency" - Clear status, documented process, fair assessment

---

## Progress Indicator Design

### Claim Lifecycle Status
```
+================================================================================+
|                                                                                 |
|  CLAIM STATUS                                                                  |
|                                                                                 |
|  [SUBMITTED]-->[VERIFYING]-->[VERIFIED]-->[APPROVAL]-->[APPROVED]-->[RESOLVED] |
|                                              *                                  |
|                                           (current)                             |
|                                                                                 |
|  Claim #CLM-2026-0015 | Warranty: WAR-2026-0089 | Customer: Acme Corp          |
|  Product: 10kWh LFP Battery System X (SN: WPX-001) | Estimated Value: $3,200                   |
|                                                                                 |
+================================================================================+

Status Colors:
- Submitted: Gray (new claim)
- Verifying: Blue (under review)
- Verified: Purple (checks passed)
- Pending Approval: Orange (needs manager)
- Approved/Denied: Green/Red (decision made)
- Processing: Teal (resolution in progress)
- Resolved: Green with checkmark (complete)
```

### Verification Progress
```
+================================================================================+
| +-- VERIFICATION CHECKLIST STATUS ------------------------------------------+ |
| |                                                                            | |
| |  [=================================>                       ] 60%          | |
| |                                                                            | |
| |  [*] Warranty Active      [*] Coverage Valid      [ ] No Prior Claims     | |
| |  [ ] Product Unmodified   [ ] Evidence Reviewed                           | |
| +----------------------------------------------------------------------------+ |
+================================================================================+
```

---

## Claim Intake Wizard

### Step 1: Enter Serial Number
```
+================================================================================+
| NEW WARRANTY CLAIM                                                        [x]   |
+================================================================================+
|                                                                                 |
| +-- CLAIM WIZARD ------------------------------------------------------------+ |
| | Step 1 of 5: Enter Serial Number                                           | |
| | [====>                                                          ] 20%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- SERIAL NUMBER LOOKUP ----------------------------------------------------+ |
| |                                                                             | |
| | Enter the product serial number to begin your warranty claim:              | |
| |                                                                             | |
| | Serial Number:                                                             | |
| | +-----------------------------------------------------------------------+ | |
| | | WPX-001                                                    [Lookup]   | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | [Scan Barcode] or [Upload Photo of Serial Tag]                            | |
| |                                                                             | |
| | Where to find the serial number:                                           | |
| | - On the product label (usually on back or bottom)                        | |
| | - In the original packaging                                                | |
| | - On the purchase invoice                                                  | |
| |                                                                             | |
| | +-- SERIAL NUMBER FORMATS -----------------------------------------------+ | |
| | | 10kWh LFP Battery System X: WPX-NNNNNN                                              | | |
| | | Bracket Set: BRK-NNNNNN                                               | | |
| | | Mounting Plate: MNT-NNNNNN                                            | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                                            [Next: Review ->]   |
+================================================================================+
```

### Step 2: Review Warranty Details
```
+================================================================================+
| NEW WARRANTY CLAIM                                                        [x]   |
+================================================================================+
|                                                                                 |
| +-- CLAIM WIZARD ------------------------------------------------------------+ |
| | Step 2 of 5: Review Warranty                                               | |
| | [==========>                                                    ] 40%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- WARRANTY FOUND ----------------------------------------------------------+ |
| |                                                                             | |
| | [*] WARRANTY ACTIVE                                                        | |
| |                                                                             | |
| | +-- PRODUCT DETAILS -----------------------------------------------------+ | |
| | | Product:        10kWh LFP Battery System X                                           | | |
| | | Serial Number:  WPX-001                                                | | |
| | | Purchase Date:  December 8, 2025                                       | | |
| | | Order:          ORD-2025-0892                                          | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-- WARRANTY COVERAGE ---------------------------------------------------+ | |
| | | Warranty ID:    WAR-2026-0089                                          | | |
| | | Type:           Standard Manufacturer Warranty                         | | |
| | | Start Date:     December 8, 2025                                       | | |
| | | Expiry Date:    December 8, 2027 (694 days remaining)                  | | |
| | | Coverage:       Manufacturing defects, component failure               | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-- CUSTOMER DETAILS ----------------------------------------------------+ | |
| | | Customer:       Brisbane Solar Co                                       | | |
| | | Contact:        John Smith                                             | | |
| | | Email:          john@acme.com                                          | | |
| | | Phone:          (555) 123-4567                                         | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-- CLAIM HISTORY -------------------------------------------------------+ | |
| | | [*] No previous claims on this warranty                                | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                  [<- Back]  [Next: Describe Issue ->]          |
+================================================================================+
```

### Warranty Expired Error
```
+================================================================================+
| NEW WARRANTY CLAIM                                                        [x]   |
+================================================================================+
|                                                                                 |
| +-- WARRANTY STATUS ---------------------------------------------------------+ |
| |                                                                             | |
| | [!] WARRANTY EXPIRED                                                       | |
| |                                                                             | |
| | +-- PRODUCT DETAILS -----------------------------------------------------+ | |
| | | Product:        10kWh LFP Battery System X                                           | | |
| | | Serial Number:  WPX-001                                                | | |
| | | Purchase Date:  January 5, 2024                                        | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-- WARRANTY DETAILS ----------------------------------------------------+ | |
| | | Status:         EXPIRED                                                | | |
| | | Expiry Date:    January 5, 2026 (5 days ago)                          | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-- OPTIONS -------------------------------------------------------------+ | |
| | |                                                                         | | |
| | | This product is no longer under warranty. You may:                     | | |
| | |                                                                         | | |
| | | [Request Out-of-Warranty Repair]                                       | | |
| | |   We offer paid repair services for out-of-warranty products           | | |
| | |                                                                         | | |
| | | [Purchase Extended Warranty]                                           | | |
| | |   Extend coverage for eligible products                                | | |
| | |                                                                         | | |
| | | [Contact Support]                                                      | | |
| | |   Speak with our team about your options                               | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                                                    [Close]     |
+================================================================================+
```

### Step 3: Describe Issue
```
+================================================================================+
| NEW WARRANTY CLAIM                                                        [x]   |
+================================================================================+
|                                                                                 |
| +-- CLAIM WIZARD ------------------------------------------------------------+ |
| | Step 3 of 5: Describe Issue                                                | |
| | [===============>                                               ] 60%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- CLAIM TYPE --------------------------------------------------------------+ |
| |                                                                             | |
| | What type of issue are you experiencing?                                   | |
| |                                                                             | |
| | (*) Manufacturing Defect                                                   | |
| |     Product has a flaw from manufacturing                                  | |
| |                                                                             | |
| | ( ) Component Malfunction                                                  | |
| |     A part stopped working under normal use                                | |
| |                                                                             | |
| | ( ) Physical Damage                                                        | |
| |     Product was damaged (may affect coverage)                              | |
| |                                                                             | |
| | ( ) Missing Parts                                                          | |
| |     Product arrived incomplete                                             | |
| |                                                                             | |
| | ( ) Other                                                                  | |
| |     Describe your issue below                                              | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- ISSUE DESCRIPTION -------------------------------------------------------+ |
| |                                                                             | |
| | Please describe the issue in detail (minimum 50 characters):              | |
| |                                                                             | |
| | +-----------------------------------------------------------------------+ | |
| | | The control panel displays error code E-05 when attempting to power   | | |
| | | on the unit. This started happening yesterday after the unit had      | | |
| | | been working normally for about a month. We tried the standard       | | |
| | | troubleshooting steps (power cycle, check connections) but the       | | |
| | | error persists.                                                       | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | Character count: 287 / 50 minimum [*]                                      | |
| |                                                                             | |
| | When did the issue first occur?                                            | |
| | [January 9, 2026          v]                                               | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                  [<- Back]  [Next: Upload Evidence ->]         |
+================================================================================+
```

### Step 4: Upload Evidence
```
+================================================================================+
| NEW WARRANTY CLAIM                                                        [x]   |
+================================================================================+
|                                                                                 |
| +-- CLAIM WIZARD ------------------------------------------------------------+ |
| | Step 4 of 5: Upload Evidence                                               | |
| | [====================>                                          ] 80%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- EVIDENCE UPLOAD ---------------------------------------------------------+ |
| |                                                                             | |
| | Supporting evidence helps us process your claim faster.                    | |
| |                                                                             | |
| | +-- PHOTOS/VIDEOS -------------------------------------------------------+ | |
| | |                                                                         | | |
| | | +----------+ +----------+ +----------+ +----------+                    | | |
| | | | [img1]   | | [img2]   | | [video]  | | [+ Add]  |                    | | |
| | | | error.jpg| | unit.jpg | | demo.mp4 | |          |                    | | |
| | | | 2.3 MB   | | 1.8 MB   | | 15.2 MB  | |          |                    | | |
| | | | [x]      | | [x]      | | [x]      | |          |                    | | |
| | | +----------+ +----------+ +----------+ +----------+                    | | |
| | |                                                                         | | |
| | | [Upload Photo] [Take Photo] [Upload Video]                             | | |
| | |                                                                         | | |
| | | Accepted formats: JPG, PNG, MP4, MOV (max 50MB each)                   | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-- RECOMMENDED PHOTOS --------------------------------------------------+ | |
| | |                                                                         | | |
| | | [ ] Photo of the defect/damage                                         | | |
| | | [ ] Photo of error message/code                                        | | |
| | | [ ] Photo of serial number label                                       | | |
| | | [ ] Photo of overall product condition                                 | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-- DOCUMENTS (Optional) ------------------------------------------------+ | |
| | |                                                                         | | |
| | | Attach any relevant documents:                                         | | |
| | |                                                                         | | |
| | | +----------+                                                           | | |
| | | | [+ Add]  |                                                           | | |
| | | | Document |                                                           | | |
| | | +----------+                                                           | | |
| | |                                                                         | | |
| | | Purchase receipt, installation certificate, etc.                       | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                  [<- Back]  [Next: Review & Submit ->]         |
+================================================================================+
```

### Step 5: Review & Submit
```
+================================================================================+
| NEW WARRANTY CLAIM                                                        [x]   |
+================================================================================+
|                                                                                 |
| +-- CLAIM WIZARD ------------------------------------------------------------+ |
| | Step 5 of 5: Review & Submit                                               | |
| | [=========================>                                     ] 95%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- CLAIM SUMMARY -----------------------------------------------------------+ |
| |                                                                             | |
| | Product:          10kWh LFP Battery System X (SN: WPX-001)                               | |
| | Warranty:         WAR-2026-0089 (Active)                                   | |
| | Customer:         Brisbane Solar Co - John Smith                            | |
| |                                                                             | |
| | Claim Type:       Manufacturing Defect                                     | |
| | Issue Reported:   January 9, 2026                                          | |
| |                                                                             | |
| | Description:                                                               | |
| | "The control panel displays error code E-05 when attempting to power on   | |
| |  the unit. This started happening yesterday after the unit had been       | |
| |  working normally for about a month..."                                   | |
| |                                                                             | |
| | Evidence:         3 files attached (error.jpg, unit.jpg, demo.mp4)        | |
| |                                                                             | |
| | Estimated Value:  $3,200.00 (product value)                                  | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- TERMS & CONDITIONS ------------------------------------------------------+ |
| |                                                                             | |
| | [x] I confirm that the information provided is accurate                   | |
| | [x] I understand the product may need to be returned for inspection       | |
| | [x] I agree to the warranty terms and conditions [View Terms]             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- WHAT HAPPENS NEXT -------------------------------------------------------+ |
| |                                                                             | |
| | 1. We'll verify your warranty coverage                                     | |
| | 2. Our team will assess your claim (1-2 business days)                    | |
| | 3. You'll receive a decision via email                                     | |
| | 4. If approved, we'll arrange resolution (replace/repair/refund)          | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                        [<- Back]  [Submit Claim]               |
+================================================================================+
```

### Claim Submitted Success
```
+================================================================================+
|                                                                                 |
|                     +==========================================+               |
|                     |                                          |               |
|                     |         [Checkmark Animation]            |               |
|                     |                                          |               |
|                     |       CLAIM SUBMITTED!                   |               |
|                     |                                          |               |
|                     |   Claim Number: CLM-2026-0015            |               |
|                     |                                          |               |
|                     +==========================================+               |
|                                                                                 |
| +-- CONFIRMATION DETAILS ----------------------------------------------------+ |
| |                                                                             | |
| | A confirmation email has been sent to john@acme.com                        | |
| |                                                                             | |
| | Your claim will be reviewed within 1-2 business days.                      | |
| | You'll receive updates via email at each stage.                            | |
| |                                                                             | |
| | Claim Status:                                                               | |
| | [SUBMITTED] ----> [VERIFYING] ----> [DECISION] ----> [RESOLVED]            | |
| |      *                                                                      | |
| |   (current)                                                                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [View Claim Details]  [Track Claim Status]  [Return to Dashboard]             |
|                                                                                 |
+================================================================================+
```

---

## Verification Checklist

### Verification UI (Staff View)
```
+================================================================================+
| VERIFY CLAIM - CLM-2026-0015                                             [x]   |
+================================================================================+
|                                                                                 |
| +-- CLAIM OVERVIEW ----------------------------------------------------------+ |
| | Product: 10kWh LFP Battery System X (SN: WPX-001) | Customer: Brisbane Solar Co          | |
| | Type: Manufacturing Defect | Estimated Value: $3,200                         | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- VERIFICATION CHECKLIST --------------------------------------------------+ |
| |                                                                             | |
| | Complete all checks before making a verification decision:                 | |
| |                                                                             | |
| | +-----------------------------------------------------------------------+ | |
| | | [*] WARRANTY ACTIVE                                         PASS      | | |
| | |     Warranty WAR-2026-0089 is currently active                        | | |
| | |     Expires: December 8, 2027 (694 days remaining)                    | | |
| | |                                                     [Auto-verified]   | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-----------------------------------------------------------------------+ | |
| | | [*] COVERAGE VALID                                          PASS      | | |
| | |     Claim type "Manufacturing Defect" is covered under warranty       | | |
| | |     Coverage includes: defects, component failure                     | | |
| | |                                                     [Auto-verified]   | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-----------------------------------------------------------------------+ | |
| | | [*] NO PRIOR CLAIMS                                         PASS      | | |
| | |     No previous claims found on warranty WAR-2026-0089               | | |
| | |                                                     [Auto-verified]   | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-----------------------------------------------------------------------+ | |
| | | [ ] PRODUCT UNMODIFIED                                      PENDING   | | |
| | |     Review evidence to confirm product has not been modified          | | |
| | |                                                                        | | |
| | |     Evidence reviewed:                                                | | |
| | |     - error.jpg [View] - Shows error code on screen                  | | |
| | |     - unit.jpg [View] - Shows overall product condition              | | |
| | |     - demo.mp4 [View] - Video of issue occurring                     | | |
| | |                                                                        | | |
| | |     Assessment:                                                       | | |
| | |     (*) Pass - Product appears unmodified                            | | |
| | |     ( ) Fail - Signs of modification/tampering                       | | |
| | |     ( ) Escalate - Unable to determine                               | | |
| | |                                                                        | | |
| | |     Notes: [Product appears in original condition______________]     | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-----------------------------------------------------------------------+ | |
| | | [ ] EVIDENCE REVIEWED                                       PENDING   | | |
| | |     Confirm evidence supports the reported issue                      | | |
| | |                                                                        | | |
| | |     Assessment:                                                       | | |
| | |     (*) Pass - Evidence supports claim                               | | |
| | |     ( ) Fail - Evidence contradicts claim                            | | |
| | |     ( ) Escalate - Need additional evidence                          | | |
| | |                                                                        | | |
| | |     Notes: [Error code E-05 visible in photo and video___________]   | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- VERIFICATION DECISION ---------------------------------------------------+ |
| |                                                                             | |
| | All checks complete: 3 Pass, 2 Pending                                    | |
| |                                                                             | |
| |                       [Request More Info]  [Verify Claim]                 | |
| +-----------------------------------------------------------------------------+ |
+================================================================================+
```

### Verification Failed
```
+================================================================================+
| VERIFICATION RESULT - CLM-2026-0015                                            |
+================================================================================+
|                                                                                 |
| +-- VERIFICATION FAILED -----------------------------------------------------+ |
| |                                                                             | |
| | [!] Claim Cannot Be Verified                                               | |
| |                                                                             | |
| | Failed Checks:                                                             | |
| |                                                                             | |
| | [x] PRODUCT MODIFIED - FAIL                                               | |
| |     Evidence shows product has been opened/modified.                       | |
| |     This voids the warranty coverage.                                      | |
| |                                                                             | |
| | Verifier Notes:                                                            | |
| | "Photo shows warranty seal broken and internal components rearranged.     | |
| |  This indicates unauthorized modification."                                | |
| |                                                                             | |
| | +-- ACTIONS -------------------------------------------------------------+ | |
| | |                                                                         | | |
| | | (*) Deny Claim                                                         | | |
| | |     Reason: Warranty voided due to product modification               | | |
| | |                                                                         | | |
| | | ( ) Escalate to Manager                                                | | |
| | |     For review of edge cases                                           | | |
| | |                                                                         | | |
| | | Notes to Customer:                                                     | | |
| | | [Upon inspection, we found that the warranty seal has been_____]      | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                              [Cancel]  [Deny Claim]            |
+================================================================================+
```

---

## Approval Queue

### Desktop View
```
+================================================================================+
| APPROVAL QUEUE                                              [Refresh] [Export]  |
+================================================================================+
|                                                                                 |
| Claims requiring manager approval (Value > $3,200 or escalated):                 |
|                                                                                 |
| +-- QUEUE TABLE -------------------------------------------------------------+ |
| |                                                                             | |
| | Age  | Claim#        | Customer      | Product        | Value   | Act      | |
| |------+---------------+---------------+----------------+---------+----------| |
| | 2d   | CLM-2026-0015 | Acme Corp     | 10kWh LFP Battery System X   | $3,200    | [Review] | |
| |      |               |               | [!] Escalated  |         |          | |
| |------+---------------+---------------+----------------+---------+----------| |
| | 1d   | CLM-2026-0014 | Tech Ind.     | System Bundle  | $2,500  | [Review] | |
| |      |               |               | High value     |         |          | |
| |------+---------------+---------------+----------------+---------+----------| |
| | 4h   | CLM-2026-0013 | GlobalCo      | Premium Kit    | $1,200  | [Review] | |
| |      |               |               | High value     |         |          | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| LEGEND: Age = Time since verification complete                                  |
+================================================================================+
```

### Approval Decision Dialog
```
+================================================================================+
| APPROVE/DENY CLAIM - CLM-2026-0015                                       [x]   |
+================================================================================+
|                                                                                 |
| +-- CLAIM SUMMARY -----------------------------------------------------------+ |
| | Customer: Brisbane Solar Co (Gold Tier)                                     | |
| | Product: 10kWh LFP Battery System X (SN: WPX-001)                                        | |
| | Claim Type: Manufacturing Defect                                           | |
| | Estimated Value: $3,200.00                                                   | |
| | Reason for Approval: Value > $3,200 threshold                                | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- VERIFICATION SUMMARY ----------------------------------------------------+ |
| | All Checks: PASSED                                                         | |
| | Verified By: Sarah Williams on January 11, 2026                           | |
| | Notes: "Error code E-05 visible in evidence. Product unmodified."         | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- CLAIM HISTORY -----------------------------------------------------------+ |
| | - No prior claims on this warranty                                        | |
| | - Customer has 2 other products under warranty (no claims)                | |
| | - Customer relationship: 2 years, $45,000 lifetime value                  | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- DECISION ----------------------------------------------------------------+ |
| |                                                                             | |
| | (*) APPROVE                                                                | |
| |     Proceed to resolution                                                  | |
| |                                                                             | |
| | ( ) DENY                                                                   | |
| |     Rejection reason required                                              | |
| |                                                                             | |
| | ( ) REQUEST MORE INFO                                                      | |
| |     Return to verification with questions                                  | |
| |                                                                             | |
| | Approval Notes:                                                            | |
| | +-----------------------------------------------------------------------+ | |
| | | Approved based on clear evidence and customer's good standing.        | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | Recommended Resolution:                                                    | |
| | [Replace Product                                                        v] | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                             [Cancel]  [Confirm Decision]       |
+================================================================================+
```

---

## Resolution Workflow

### Resolution Type Selection
```
+================================================================================+
| PROCESS RESOLUTION - CLM-2026-0015                                       [x]   |
+================================================================================+
|                                                                                 |
| +-- RESOLUTION WIZARD -------------------------------------------------------+ |
| | Step 1 of 4: Select Resolution Type                                        | |
| | [====>                                                          ] 25%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- SELECT RESOLUTION -------------------------------------------------------+ |
| |                                                                             | |
| | How should this claim be resolved?                                         | |
| |                                                                             | |
| | +-- REPLACE (Recommended) -----------------------------------------------+ | |
| | |                                                                         | | |
| | | (*) Ship Replacement Product                                           | | |
| | |                                                                         | | |
| | |     10kWh LFP Battery System X - $3,200.00                                             | | |
| | |     Current Stock: 15 available                                        | | |
| | |     Est. Ship: January 12, 2026                                        | | |
| | |                                                                         | | |
| | |     [ ] Require return of defective unit                               | | |
| | |         (Return label will be generated)                               | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-- REPAIR --------------------------------------------------------------+ | |
| | |                                                                         | | |
| | | ( ) Schedule Repair                                                    | | |
| | |                                                                         | | |
| | |     Create service job for repair                                      | | |
| | |     Options: On-site repair or return for depot repair                 | | |
| | |     Est. Time: 3-5 business days                                       | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | +-- REFUND --------------------------------------------------------------+ | |
| | |                                                                         | | |
| | | ( ) Issue Refund                                                       | | |
| | |                                                                         | | |
| | |     Credit note will be generated                                      | | |
| | |     Amount: $3,200.00                                                    | | |
| | |     Method: Credit to account / Bank transfer                          | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                              [Cancel]  [Next: Configure ->]   |
+================================================================================+
```

### Step 2: Configure Replacement
```
+================================================================================+
| +-- RESOLUTION WIZARD -------------------------------------------------------+ |
| | Step 2 of 4: Configure Replacement                                         | |
| | [==========>                                                    ] 50%      | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- REPLACEMENT DETAILS -----------------------------------------------------+ |
| |                                                                             | |
| | Replacement Product:                                                       | |
| | [10kWh LFP Battery System X (same as original)                                       v] | |
| |                                                                             | |
| | Serial Number to Assign:                                                   | |
| | [WPX-156 (FIFO - oldest in stock)                                      v] | |
| |                                                                             | |
| | Ship To:                                                                   | |
| | (*) Original customer address                                             | |
| |     123 Business St, Sydney NSW 2000                                      | |
| |                                                                             | |
| | ( ) Different address                                                      | |
| |     [Enter new address...]                                                | |
| |                                                                             | |
| | Shipping Method:                                                           | |
| | [Express - 1-2 business days                                           v] | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- RETURN OF DEFECTIVE UNIT ------------------------------------------------+ |
| |                                                                             | |
| | [x] Customer must return defective unit                                   | |
| |                                                                             | |
| | Return Instructions:                                                       | |
| | - Return label will be emailed to customer                                | |
| | - Original packaging preferred but not required                           | |
| | - Return must be initiated within 14 days                                 | |
| |                                                                             | |
| | Disposition on receipt:                                                    | |
| | [Inspect and Scrap (default)                                           v] | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                      [<- Back]  [Next: Review ->]              |
+================================================================================+
```

### Step 4: Resolution Complete
```
+================================================================================+
|                                                                                 |
|                     +==========================================+               |
|                     |                                          |               |
|                     |      [Package Shipping Animation]        |               |
|                     |                                          |               |
|                     |       RESOLUTION PROCESSED!              |               |
|                     |                                          |               |
|                     |   Claim CLM-2026-0015 Resolved           |               |
|                     |                                          |               |
|                     +==========================================+               |
|                                                                                 |
| +-- RESOLUTION SUMMARY ------------------------------------------------------+ |
| |                                                                             | |
| | Resolution Type: REPLACEMENT                                               | |
| |                                                                             | |
| | [*] Replacement order created: ORD-2026-0234                              | |
| |     Ship Date: January 12, 2026                                           | |
| |     Tracking: Will be emailed when shipped                                | |
| |                                                                             | |
| | [*] Return label sent to customer                                         | |
| |     Return within: 14 days                                                | |
| |                                                                             | |
| | [*] Customer notified via email                                           | |
| |                                                                             | |
| | [*] Warranty updated                                                      | |
| |     New warranty created for replacement unit                             | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [View Replacement Order]  [View Claim]  [Back to Claims]                      |
+================================================================================+
```

---

## Return Tracking

### Return Status Timeline
```
+================================================================================+
| RETURN TRACKING - CLM-2026-0015                                                 |
+================================================================================+
|                                                                                 |
| Product: 10kWh LFP Battery System X (SN: WPX-001)                                            |
| Return Label: RET-2026-0015                                                    |
|                                                                                 |
| +-- RETURN TIMELINE ---------------------------------------------------------+ |
| |                                                                             | |
| |  [LABEL]---->[SHIPPED]---->[IN TRANSIT]---->[RECEIVED]---->[INSPECTED]    | |
| |  CREATED       *                                                           | |
| |              (current)                                                     | |
| |                                                                             | |
| | +-- TIMELINE DETAILS ----------------------------------------------------+ | |
| | |                                                                         | | |
| | | Jan 12, 2026 - 11:30 AM                                                | | |
| | | [*] SHIPPED                                                            | | |
| | |     Customer handed package to Australia Post                          | | |
| | |     Tracking: AUS987654321                                             | | |
| | |                                                                         | | |
| | | Jan 11, 2026 - 2:00 PM                                                 | | |
| | | [*] LABEL CREATED                                                      | | |
| | |     Return label emailed to john@acme.com                              | | |
| | |     [View Label PDF]                                                   | | |
| | |                                                                         | | |
| | | PENDING:                                                               | | |
| | | [ ] In Transit - Est. arrival: January 14, 2026                        | | |
| | | [ ] Received at warehouse                                              | | |
| | | [ ] Inspected and processed                                            | | |
| | +-----------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| [Track with Carrier]  [Contact Customer]  [Mark as Received]                  |
+================================================================================+
```

### Inspection & Disposition
```
+================================================================================+
| INSPECT RETURNED ITEM - CLM-2026-0015                                    [x]   |
+================================================================================+
|                                                                                 |
| Product: 10kWh LFP Battery System X (SN: WPX-001)                                            |
| Return Received: January 14, 2026                                              |
|                                                                                 |
| +-- INSPECTION CHECKLIST ----------------------------------------------------+ |
| |                                                                             | |
| | [*] Item received matches claim                                           | |
| | [*] Serial number verified: WPX-001                                       | |
| | [ ] Physical condition assessed                                           | |
| | [ ] Defect/issue confirmed                                                | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- INSPECTION FINDINGS -----------------------------------------------------+ |
| |                                                                             | |
| | Condition:                                                                 | |
| | (*) As Described - Defect confirmed                                       | |
| | ( ) Better than Described - Minor issue only                              | |
| | ( ) Worse than Described - Additional damage found                        | |
| | ( ) Different Issue - Not as claimed                                      | |
| |                                                                             | |
| | Notes:                                                                     | |
| | +-----------------------------------------------------------------------+ | |
| | | Power supply board shows burnt component. Consistent with E-05 error. | | |
| | +-----------------------------------------------------------------------+ | |
| |                                                                             | |
| | Photos:                                                                    | |
| | [Take Inspection Photo]                                                   | |
| | +------+ +------+ +------+                                                 | |
| | |[img1]| |[img2]| |[+Add]|                                                 | |
| | +------+ +------+ +------+                                                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| +-- DISPOSITION -------------------------------------------------------------+ |
| |                                                                             | |
| | What should happen to this item?                                           | |
| |                                                                             | |
| | (*) Scrap - Item is beyond repair                                         | |
| | ( ) Refurbish - Send to repair center                                     | |
| | ( ) Return to Supplier - Supplier warranty claim                          | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
|                                            [Complete Inspection]               |
+================================================================================+
```

---

## Claims Analytics Dashboard

### Desktop View
```
+================================================================================+
| WARRANTY CLAIMS ANALYTICS                               [Export] [Date: 90d v]  |
+================================================================================+
|                                                                                 |
| +-- KPI CARDS (aria-live="polite") -----------------------------------------+  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| | | Total Claims     | | Approval Rate    | | Avg Cost/Claim   | | Proc Time||  |
| | |      45          | |      82%         | |     $420         | |  3.2 days||  |
| | | +12 vs last qtr  | | +5% vs last qtr  | | -$30 vs last qtr | | -0.5 day ||  |
| | +------------------+ +------------------+ +------------------+ +----------+|  |
| +----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- CLAIMS FUNNEL -----------------------------------------------------------+  |
| |                                                                             |  |
| |  SUBMITTED (45)                                                            |  |
| |  +======================================================================+   |  |
| |  |######################################################################|   |  |
| |  +======================================================================+   |  |
| |                                      |                                       |  |
| |                                      v 95% verified                          |  |
| |  VERIFIED (43)                                                             |  |
| |  +================================================================+         |  |
| |  |################################################################|         |  |
| |  +================================================================+         |  |
| |                                      |                                       |  |
| |                                      v 82% approved                          |  |
| |  APPROVED (35)                                                             |  |
| |  +====================================================+                     |  |
| |  |####################################################|                     |  |
| |  +====================================================+                     |  |
| |                                      |                                       |  |
| |                                      v 100% resolved                         |  |
| |  RESOLVED (35)                                                             |  |
| |  +====================================================+                     |  |
| |  |####################################################|                     |  |
| |  +====================================================+                     |  |
| |                                                                             |  |
| |  DENIED: 8 (18%) - Top reasons: Modified product (4), Out of coverage (3)  |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
| +-- CLAIMS BY PRODUCT -------------------------+ +-- RESOLUTION BREAKDOWN ----+ |
| |                                              | |                             | |
| | Product        | Claims | Rate  | Avg Cost  | | Type      | Count | %      | |
| |----------------+--------+-------+-----------| | |----------+-------+-------| |
| | 10kWh LFP Battery System X   |     18 |  2.1% |     $450  | | | Replace  |    22 | 63%   | |
| | System Bundle  |     12 |  1.8% |     $620  | | | Repair   |     8 | 23%   | |
| | Bracket Set    |      8 |  0.5% |     $120  | | | Refund   |     5 | 14%   | |
| | Premium Kit    |      5 |  1.2% |     $380  | | |          |       |       | |
| | Other          |      2 |  0.3% |     $200  | | |          |       |       | |
| +----------------------------------------------+ +-----------------------------+ |
|                                                                                 |
| +-- QUALITY HEATMAP (Claims by Product/Month) -------------------------------+  |
| |                                                                             |  |
| |          Oct    Nov    Dec    Jan                                          |  |
| | Widget    [3]    [4]    [6]   [5]*  <- Increasing trend                    |  |
| | System    [2]    [3]    [4]    [3]                                         |  |
| | Bracket   [1]    [2]    [2]    [3]                                         |  |
| | Premium   [1]    [1]    [2]    [1]                                         |  |
| |                                                                             |  |
| | * Warning: 10kWh LFP Battery System X claims increasing - investigate batch quality      |  |
| +-----------------------------------------------------------------------------+  |
|                                                                                 |
+================================================================================+
```

---

## Mobile Views

### Mobile Claim List
```
+================================+
| Claims               [+] [=]   |
+================================+
| [All|Pending|Resolved]         |
|      ^active                   |
+================================+
| Open: 8 | Pending Approval: 3  |
+================================+
|                                |
| +----------------------------+ |
| | CLM-2026-0015              | |
| | 10kWh LFP Battery System X               | |
| | Acme Corp                  | |
| | [PENDING APPROVAL]         | |
| | Value: $3,200 | 2 days       | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | CLM-2026-0014              | |
| | System Bundle              | |
| | Tech Industries            | |
| | [VERIFYING]                | |
| | Value: $2,500 | 1 day      | |
| +----------------------------+ |
|                                |
| +----------------------------+ |
| | CLM-2026-0013              | |
| | Premium Kit                | |
| | GlobalCo                   | |
| | [RESOLVED - Replaced]      | |
| | Value: $1,200 | Closed     | |
| +----------------------------+ |
|                                |
+================================+
```

---

## Error States

### Serial Number Not Found
```
+================================================================+
| [!] Serial Number Not Found                               [x]   |
+================================================================+
|                                                                 |
| We couldn't find a warranty for serial number: XYZ-123         |
|                                                                 |
| This could mean:                                                 |
| - The serial number was entered incorrectly                     |
| - The product was not purchased through us                      |
| - The warranty was not registered                               |
|                                                                 |
| Please check:                                                    |
| - Serial number is typed correctly                              |
| - You're using the right serial number format                   |
|                                                                 |
| [Try Again]  [Upload Photo for Help]  [Contact Support]        |
+================================================================+
```

### Duplicate Claim Warning
```
+================================================================+
| [!] Existing Claim Found                                  [x]   |
+================================================================+
|                                                                 |
| There is already an active claim for this warranty:             |
|                                                                 |
| Claim: CLM-2026-0012                                            |
| Status: VERIFYING                                                |
| Created: January 8, 2026                                        |
|                                                                 |
| You cannot submit a new claim while another is in progress.     |
|                                                                 |
| [View Existing Claim]  [Contact Support]                        |
+================================================================+
```

---

## Accessibility Specification

### ARIA Roles and Labels
```html
<main role="main" aria-label="Warranty claim workflow">
  <!-- Claim Wizard -->
  <form role="form" aria-label="New warranty claim wizard">
    <nav aria-label="Claim progress">
      <ol role="list">
        <li role="listitem" aria-current="step">
          Step 1: Enter Serial Number
        </li>
      </ol>
      <div role="progressbar"
           aria-valuenow="20"
           aria-valuemin="0"
           aria-valuemax="100">
      </div>
    </nav>
  </form>

  <!-- Verification Checklist -->
  <section role="region" aria-label="Verification checklist">
    <div role="list" aria-label="Verification checks">
      <article role="listitem"
               aria-label="Warranty active check, passed">
        <!-- Check content -->
      </article>
    </div>
  </section>
</main>
```

### Keyboard Navigation
```
Tab Order (Wizard):
1. Serial number input
2. Lookup button
3. Help links
4. Back button
5. Next button

Checklist:
- Tab through check items
- Space to expand/collapse details
- Radio buttons for pass/fail/escalate

Screen Reader:
- Wizard step and progress announced
- Verification status announced
- Approval decision announced
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column wizard, bottom sheet details |
| Tablet | 640px - 1024px | Two-column claim detail, compact wizard |
| Desktop | > 1024px | Full wizard, side-by-side evidence review |

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Serial lookup | < 1s | From submit to result |
| Evidence upload | < 10s | Per file (up to 50MB) |
| Claim submission | < 3s | Total processing time |
| Verification check | < 500ms | Auto-check response |
| Resolution process | < 5s | Order/job creation |

---

## Related Wireframes

- [Support Resolution](./support-resolution.wireframe.md)
- [Order Fulfillment](./order-fulfillment.wireframe.md)
- [Warranty Management](../domains/warranty-management.wireframe.md)

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Author:** UI Skill
