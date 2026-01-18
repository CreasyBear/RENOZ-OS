# Implementation Report: Quote-to-Job Conversion Stories
Generated: 2026-01-17

## Task
Add quote-to-job conversion user stories to the lead-to-order workflow PRD.

## Summary

Added 3 new user stories to the existing lead-to-order workflow PRD (`archive/workflows/lead-to-order.prd.json`) to support quote-to-job conversion for service/installation work.

## Stories Added

### WF-LTO-007a: Quote Acceptance Handler (Priority 15)
- **Description:** When quote is marked 'accepted', offer to create job from quote data
- **Layers:** server, ui
- **Dependencies:** WF-LTO-002c
- **Estimated iterations:** 2
- **Acceptance criteria:**
  - Accept Quote button on quote detail page
  - Confirmation dialog: 'Create job from this quote?'
  - Option to just mark won without creating job
  - Customer, products, quantities, pricing copied to new job
  - Site address defaults from customer
  - Job status: 'scheduled' with TBD date
  - TypeScript compiles without errors

### WF-LTO-007b: BOM Transfer (Priority 16)
- **Description:** Copy quote line items to job BOM (Bill of Materials)
- **Layers:** server
- **Dependencies:** WF-LTO-007a, DOM-JOBS-002b
- **Estimated iterations:** 2
- **Acceptance criteria:**
  - Quote line items become job materials
  - Preserve product, quantity, unit price
  - Allow modifications before job start
  - Link job materials back to original quote
  - TypeScript compiles without errors

### WF-LTO-007c: Conversion Status Tracking (Priority 17)
- **Description:** Track quote to job conversion for analytics
- **Layers:** schema, server
- **Dependencies:** WF-LTO-007a
- **Estimated iterations:** 1
- **Acceptance criteria:**
  - Quote record stores: converted_to_job_id, converted_at
  - Job record stores: created_from_quote_id
  - Dashboard metric: 'Quote to Job Conversion Rate'
  - TypeScript compiles without errors

## PRD Updates Made

### File Modified
`/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_Initiation/_prd/archive/workflows/lead-to-order.prd.json`

### Changes Summary

1. **Added 3 stories** (WF-LTO-007a, WF-LTO-007b, WF-LTO-007c) with priorities 15-17

2. **Updated serverFunctionsCreates** - Added:
   - `convertQuoteToJob` (WF-LTO-007a)
   - `transferBOMToJob` (WF-LTO-007b)
   - `getQuoteToJobConversionRate` (WF-LTO-007c)

3. **Updated prdDependencies** - Added:
   - DOM-JOBS (OPTIONAL) - "Quote to job conversion for service/installation work"

4. **Updated domains_involved** - Added:
   - `jobs`

5. **Updated workflow_stages** - Added:
   - "Create Opportunity -> Build Quote -> Send Quote -> Customer Accepts -> Convert to Job (for service/installation)"

6. **Updated gaps** - Added:
   - "No quote-to-job conversion for service/installation work"

7. **Updated success_criteria** - Added:
   - "Quote-to-job conversion streamlines service/installation scheduling"
   - "BOM transfer eliminates manual material re-entry"

8. **Updated references.internal** - Added:
   - `_Initiation/_prd/2-domains/jobs/jobs.prd.json`

## Notes

- The PRD is located in `archive/workflows/` which suggests workflow PRDs may need to be moved to an active location for implementation
- Story WF-LTO-007b depends on DOM-JOBS-002b (Job BOM Tracking: Server Functions) which is not yet implemented
- The stories use WORK-QUOTE-TO-JOB naming in the task description but were normalized to WF-LTO-007 pattern to match existing PRD convention
- No PROMPT.md or progress.txt files exist for workflow PRDs (they are single JSON files in archive)
