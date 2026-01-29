# Codebase Incomplete Implementations Report

> Generated: 2026-01-29
> Scope: src/routes, src/components/domain, src/server/functions, src/hooks

## Summary

| Category | Count | Files Affected |
|----------|-------|----------------|
| TODO Comments | 45+ | 35 files |
| Mock Data Implementations | 12 | 10 files |
| Placeholder/Stub Functions | 15 | 8 files |
| Unimplemented Features ("Coming Soon") | 18 | 15 files |
| Missing CRUD Operations | 8 | 6 files |
| Disabled/Stubbed Buttons | 5 | 5 files |

---

## 1. MOCK DATA & PLACEHOLDER DATA

### 1.1 Mobile Routes - Mock Fixtures
**File:** `src/routes/_authenticated/mobile/__fixtures__/index.ts`
- **Issue:** Complete mock data file for pick lists
- **Impact:** Mobile picking interface uses fake data
- **Todo Comment:** "TODO: Remove this file when real APIs are integrated"

### 1.2 Dashboard Activity Feed
**File:** `src/routes/_authenticated/dashboard/index.tsx` (line 307)
```typescript
// TODO: Replace with real data hook when org-wide activity feed is available
const { activities, isLoading, error } = useMockUnifiedActivities({
  entityType: 'dashboard',
  entityId: 'org-wide',
});
```

**File:** `src/hooks/use-unified-activities.ts` (lines 104-180)
- Complete mock data helper with fake activities
- Returns hardcoded activities instead of server data

### 1.3 My Tasks - Placeholder User
**File:** `src/routes/_authenticated/my-tasks/index.tsx` (lines 31-53)
```typescript
// import { useAuth } from '@/hooks'; // TODO: Use correct auth hook
// const { user } = useAuth(); // TODO: Enable when auth hook is available
const user = { id: 'current-user', name: 'Technician' }; // Placeholder
```

### 1.4 Document History
**File:** `src/hooks/documents/use-document-history.ts` (lines 65-79)
```typescript
// MOCK DATA (temporary until generated_documents table exists)
async function fetchDocumentHistory(_filters: DocumentHistoryFilters): Promise<DocumentHistoryResult> {
  // TODO: Replace with actual server function once generated_documents table exists
  return { documents: [], total: 0 };
}
```

### 1.5 Dev Mode Mock Auth
**File:** `src/lib/supabase/fetch-user-server-fn.ts` (lines 10-34)
- Bypasses Supabase entirely in development
- Returns hardcoded mock user
- **Risk:** Development doesn't test real auth flow

### 1.6 Customer Communications - Mock Data
**File:** `src/components/domain/customers/communications/communication-timeline.tsx` (lines 108-200+)
- `MOCK_COMMUNICATIONS` array with fake communication data
- Used when real data is not provided

**File:** `src/components/domain/customers/communications/communication-templates.tsx` (lines 85-120)
- `MOCK_TEMPLATES` array with fake template data
- Used for template management UI

**File:** `src/components/domain/customers/bulk/bulk-communications.tsx` (lines 86-110)
- `MOCK_SEGMENTS`, `MOCK_TEMPLATES`, `MOCK_CAMPAIGNS` arrays

### 1.7 Pipeline Product Quick Add
**File:** `src/components/domain/pipeline/product-quick-add.tsx` (lines 82-90)
- Mock data for frequently used products
- Mock data for recent products
- Comments indicate: "mock - in real app would be from usage stats"

---

## 2. SERVER FUNCTION STUBS

### 2.1 Workstreams, Notes, Files - Complete Stub File
**File:** `src/server/functions/workstreams-notes-files.ts` (77 lines)
- Entire file is a stub with TODO comment
- All functions return fake data:
  - `listWorkstreams` → returns `{ success: true, data: [] }`
  - `getWorkstream` → returns `{ success: true, data: null }`
  - `createWorkstream` → returns stub ID
  - `updateWorkstream` → returns `{ success: true, data: null }`
  - `deleteWorkstream` → returns `{ success: true }`
  - Same pattern for Notes and Files

### 2.2 Quote Versions - Not Implemented
**File:** `src/server/functions/pipeline/quote-versions.ts`
- `generateQuotePDF` (lines 461-473): Returns `status: 'not_implemented'`
- `sendQuote` (lines 526-543): Returns `status: 'not_implemented'`
- Comments: "TODO: Implement PDF generation with React-PDF", "TODO: Implement email sending"

### 2.3 Activities Export
**File:** `src/server/functions/activities/activities.ts` (lines 469-497)
```typescript
// @status NOT_IMPLEMENTED - This endpoint is stubbed for API completeness.
export const exportActivities = createServerFn({ method: 'POST' })
  .handler(async () => {
    console.warn('[Activity Export] STUB: Export not implemented');
    return { status: 'not_implemented' as const };
  });
```

### 2.4 Warranty Certificates - Placeholder PDF
**File:** `src/server/functions/warranty/warranty-certificates.ts`
- Line 161: `contentType: 'text/html'` with TODO to change to PDF
- Line 309: "TODO: Implement actual PDF generation using puppeteer or @react-pdf/renderer"
- Currently uploads HTML instead of PDF

### 2.5 Xero Invoice Sync - Placeholder
**File:** `src/server/functions/financial/xero-invoice-sync.ts`
- Line 156-172: TODO comments for Xero API integration
- Line 168: "TODO: Replace with actual Xero API call"
- Returns mock invoice ID

**File:** `src/trigger/jobs/sync-xero.ts`
- Entire file marked as "placeholder implementation"
- Line 9: "This is a placeholder implementation - actual Xero integration"

### 2.6 Revenue Recognition - Mock Journal
**File:** `src/server/functions/financial/revenue-recognition.ts` (lines 354-372)
- Creates mock journal ID: `const mockJournalId = `MJ-${Date.now()}...`
- "TODO: Actual Xero API call to create manual journal"

### 2.7 AI Approvals - Mock Email
**File:** `src/server/functions/ai/approvals/handlers.ts` (lines 179-180)
```typescript
// TODO: Integrate with Resend email service
// For now, return success with a mock result
```

### 2.8 Data Exports - Background Jobs Not Triggered
**File:** `src/server/functions/settings/data-exports.ts`
- Line 210: "TODO: Trigger background job to process export"
- Line 284: "TODO: Delete file from storage if exists"
- Line 315: "TODO: Delete files from storage"
- Line 396: "TODO: Generate signed URL if using cloud storage"

### 2.9 Job Materials - Placeholder Integration
**File:** `src/server/functions/jobs/job-materials.ts`
- Line 376: "TODO: Integrate with inventory domain to create actual reservations"
- Lines 548-549: "TODO: Save serial numbers/photos to dedicated tables"

### 2.10 Notes - AI Transcription Placeholder
**File:** `src/server/functions/notes.ts` (lines 242-255)
- "TODO: Integrate with AI transcription service"
- Currently just updates note with placeholder audio data

### 2.11 Documents - Pending Migration
**File:** `src/server/functions/documents/generate-documents.ts`
- Lines 180-207: Multiple TODOs for after migration
- Returns `status: "pending"` and `url: null`

**File:** `src/server/functions/documents/generate-packing-slip.ts`
- Lines 165-170: TODO for generated_documents table

**File:** `src/server/functions/documents/generate-pro-forma.ts`
- Lines 154-159: TODO for generated_documents table

**File:** `src/server/functions/documents/preview-document.ts`
- Line 375: "TODO: Once @react-pdf/renderer is installed and templates are created"

### 2.12 Approval Delegation - Revoke Not Implemented
**File:** `src/hooks/suppliers/use-approvals.ts` (lines 263-264)
```typescript
// TODO: Implement revokeDelegation server function
throw new Error('Revoke delegation not yet implemented');
```

### 2.13 Receipts - Creation Not Implemented
**File:** `src/components/domain/receipts/receipt-creation-dialog.tsx` (line 229)
```typescript
// TODO: Call createReceipt server function when available
```

---

## 3. UNHOOKED UI FEATURES ("Coming Soon")

### 3.1 Inventory Item Edit
**File:** `src/routes/_authenticated/inventory/$itemId.tsx` (line 250)
```typescript
toast.info("Edit functionality coming soon", { description: "This feature is under development" });
```

### 3.2 Inventory Transfer Dialog
**File:** `src/components/domain/inventory/inventory-browser.tsx` (line 258)
```typescript
toast.info("Transfer", { description: "Transfer dialog coming soon" });
```

### 3.3 Customer Reports Export
**File:** `src/routes/_authenticated/reports/customers/index.tsx` (line 89)
```typescript
toast.info(`${format.toUpperCase()} export coming soon`)
```

### 3.4 Customer Analytics
**File:** `src/components/domain/customers/analytics/value-analysis.tsx` (line 319)
- "Coming soon after financial domain implementation"

**File:** `src/components/domain/customers/analytics/lifecycle-analytics.tsx` (lines 167, 228)
- "Coming soon after orders domain implementation"
- "Coming soon after pipeline domain implementation"

### 3.5 Warranty Claim "Request More Info"
**File:** `src/components/domain/warranty/claim-approval-dialog.tsx` (line 286)
- Button disabled with text: "Request More Info (coming soon)"

### 3.6 Installer Performance Charts
**File:** `src/routes/_authenticated/installers/$installerId.tsx` (lines 376-383)
```typescript
{/* Performance Chart Placeholder */}
<div className="h-48 flex items-center justify-center border rounded-lg">
  <p className="text-muted-foreground">Performance charts coming soon</p>
</div>
```

### 3.7 Installer Schedule Integration
**File:** `src/routes/_authenticated/installers/$installerId.tsx` (line 435)
- "Schedule integration coming soon"

### 3.8 Group Activity Feed
**File:** `src/routes/_authenticated/admin/groups/$groupId.tsx` (line 522)
```typescript
<h3 className="text-lg font-medium">Activity Coming Soon</h3>
```

### 3.9 Project Visit Tasks
**File:** `src/routes/_authenticated/projects/$projectId.visits/$visitId.tsx` (line 192)
```typescript
<p>Tasks coming soon</p>
```

### 3.10 Inventory Forecasting Actions
**File:** `src/routes/_authenticated/inventory/forecasting.tsx` (lines 118, 124)
- "Purchase order creation coming soon"
- "Bulk order creation for all urgent items coming soon"

### 3.11 Inventory Alert History
**File:** `src/routes/_authenticated/inventory/alerts.tsx` (line 225)
- "Alert history view coming soon..."

### 3.12 Customer Pricing Search
**File:** `src/components/domain/products/pricing/customer-pricing.tsx` (line 339)
- "Customer search coming soon - enter customer ID for now"

### 3.13 Order Activity Logging
**File:** `src/components/domain/orders/order-detail.tsx` (line 703)
- "Activity logging coming soon"

### 3.14 Task Dialogs
**File:** `src/components/domain/jobs/projects/task-dialogs.tsx` (line 168)
```typescript
toast.success('Task updated (coming soon)');
// TODO: Implement task update when API supports it
```

### 3.15 Order Draft Saving
**File:** `src/components/domain/orders/creation/order-creation-wizard/enhanced-order-creation-wizard.tsx` (line 124-125)
```typescript
// TODO: Implement draft saving
toast.success('Draft saving coming soon');
```

### 3.16 Dashboard Widgets (Disabled)
**File:** `src/components/domain/dashboard/widget-catalog.tsx`
- Widgets can be marked with `disabled: true`
- Shows "Soon" badge on disabled widgets

**File:** `src/components/domain/dashboard/widget-renderer.tsx` (line 322)
- Renders "Coming soon" for unimplemented widget types

---

## 4. TODO COMMENTS - FEATURE GAPS

### 4.1 Reports
**File:** `src/routes/_authenticated/reports/customers/index.tsx` (line 94)
```typescript
// TODO: Implement scheduled reports
```

### 4.2 Pipeline
**File:** `src/routes/_authenticated/pipeline/$opportunityId.tsx` (line 208)
```typescript
// TODO: Navigate to newly created order when Orders domain integration is complete
```

### 4.3 Products
**File:** `src/routes/_authenticated/products/index.tsx` (line 326)
```typescript
// TODO: Implement bulk delete
```

### 4.4 Customers
**File:** `src/routes/_authenticated/customers/communications.tsx` (line 255)
```typescript
// TODO: Open email compose dialog with template content
```

**File:** `src/routes/_authenticated/customers/segments/index.tsx` (line 85)
```typescript
// TODO: Implement delete mutation
```

**File:** `src/routes/_authenticated/customers/$customerId.tsx` (line 94)
```typescript
// TODO: Pass customerId when pipeline/new supports it
```

**File:** `src/components/domain/customers/customer-directory.tsx` (lines 273, 341)
- TODO: Implement progress tracking for bulk operations
- TODO: Open tag assignment modal

### 4.5 Procurement Dashboard
**File:** `src/routes/_authenticated/procurement/dashboard.tsx` (line 227)
```typescript
// TODO: Implement alert dismissal mutation
```

### 4.6 Pipeline Components
**File:** `src/components/domain/pipeline/pipeline-kanban-container.tsx` (line 408)
```typescript
// TODO: Implement delete with confirmation
```

**File:** `src/components/domain/pipeline/won-lost-dialog.tsx` (line 51)
```typescript
// REASON OPTIONS (TODO: Fetch from winLossReasons table)
```

**File:** `src/components/domain/pipeline/quotes/quick-quote-form.tsx` (line 244)
```typescript
// TODO: Fix route - /pipeline/quotes/$quoteId may not be configured yet
```

### 4.7 Inventory
**File:** `src/components/domain/inventory/counts/variance-report.tsx` (line 80)
```typescript
const unitCost = 0; // TODO: Get from inventory item
```

### 4.8 Jobs/Projects
**File:** `src/components/domain/jobs/projects/project-notes-tab.tsx` (lines 569, 670)
- TODO: Fetch author details when available
- TODO: Implement NoteEditDialog

**File:** `src/components/domain/jobs/projects/project-files-tab.tsx` (lines 228, 279, 690)
- TODO: Use actual file URL when storage is implemented
- TODO: Add share/copy link
- TODO: Fetch uploader details when available

**File:** `src/components/domain/jobs/projects/project-tasks-tab.tsx` (lines 593, 719)
- TODO: Fetch assignee details when available
- TODO: Implement TaskEditDialog

**File:** `src/components/domain/jobs/templates/job-checklist-tab.tsx` (line 152)
```typescript
// TODO: Implement photo upload functionality
```

### 4.9 Site Visits
**File:** `src/components/domain/jobs/site-visits/site-visit-detail.tsx` (line 105)
```typescript
// TODO: Fetch tasks for this visit
```

**File:** `src/routes/_authenticated/installers/$installerId.tsx` (line 345)
```typescript
// TODO: Use performance metrics hook when available
```

### 4.10 Orders/Fulfillment
**File:** `src/components/domain/orders/fulfillment/confirm-delivery-dialog.tsx` (line 227)
```typescript
// TODO: Upload photo to storage if provided
```

**File:** `src/components/domain/orders/fulfillment/fulfillment-dashboard/index.tsx` (line 337)
```typescript
// TODO: Implement import functionality
```

### 4.11 Communications
**File:** `src/components/domain/communications/email-preview.ts` (line 120)
```typescript
// TODO: If sampleCustomerId is provided, fetch real customer data
```

### 4.12 Products
**File:** `src/components/domain/products/images/image-uploader.tsx` (line 197)
```typescript
// For now, we'll create a mock URL since Supabase Storage integration
```

### 4.13 Approvals
**File:** `src/components/domain/approvals/approval-decision-dialog.tsx` (lines 219, 239)
- Comments: "Mock data for now", "will be replaced with real data"

### 4.14 Job Batch Processing
**File:** `src/lib/job-batch-processing.ts` (lines 263-291)
```typescript
// PLACEHOLDER HANDLERS (TO BE INTEGRATED WITH ACTUAL SERVER FUNCTIONS)
// Placeholder - integrate with actual job creation/update/deletion logic
```

---

## 5. MISSING CRUD OPERATIONS

### 5.1 Workstreams/Notes/Files
- **Status:** All operations are stubs
- **Files:** `src/server/functions/workstreams-notes-files.ts`
- **Missing:** Real database integration

### 5.2 Customer Segments
- **Status:** Delete not implemented
- **File:** `src/routes/_authenticated/customers/segments/index.tsx`
- **Line 85-86:** Only has console.log, no actual delete

### 5.3 Products
- **Status:** Bulk delete not implemented
- **File:** `src/routes/_authenticated/products/index.tsx`
- **Line 326:** TODO comment for bulk delete

### 5.4 Pipeline Opportunities
- **Status:** Delete not implemented
- **File:** `src/components/domain/pipeline/pipeline-kanban-container.tsx`
- **Line 408:** TODO comment

### 5.5 Purchase Order Receipts
- **Status:** Receipt creation not hooked up
- **File:** `src/server/functions/suppliers/index.ts` (line 38)
- Comment: "TODO: Add receipts.ts for goods receipt functions"

- **File:** `src/components/domain/receipts/receipt-creation-dialog.tsx`
- Line 229: TODO to call createReceipt server function

### 5.6 Project Notes/Tasks
- **Status:** Edit dialogs not implemented
- **Files:** 
  - `src/components/domain/jobs/projects/project-notes-tab.tsx` (line 670)
  - `src/components/domain/jobs/projects/project-tasks-tab.tsx` (line 719)

### 5.7 Task Updates
- **Status:** Update not implemented
- **File:** `src/components/domain/jobs/projects/task-dialogs.tsx` (line 166)
```typescript
// TODO: Implement task update when API supports it
```

---

## 6. DISABLED FILES

### 6.1 Orders Fulfillment (Disabled)
**File:** `src/routes/_authenticated/orders/fulfillment.tsx.disabled`
- File is completely disabled (renamed with .disabled extension)
- Contains TODO: "Implement order assignment"

---

## 7. INTEGRATION GAPS

### 7.1 Xero Integration
**Files:**
- `src/server/functions/financial/xero-invoice-sync.ts`
- `src/trigger/jobs/sync-xero.ts`

**Status:** Placeholder implementations only
- No actual Xero API calls
- Mock data returned
- Comments indicate full implementation needed

### 7.2 Email/Resend Integration
**File:** `src/server/functions/ai/approvals/handlers.ts`
- Comment: "TODO: Integrate with Resend email service"

**File:** `src/server/functions/pipeline/quote-versions.ts`
- Comment: "TODO: Implement email sending"

### 7.3 PDF Generation
**Files:**
- `src/server/functions/pipeline/quote-versions.ts`
- `src/server/functions/warranty/warranty-certificates.ts`
- `src/server/functions/documents/preview-document.ts`
- `src/trigger/jobs/process-scheduled-reports.ts`

**Status:** Multiple TODOs for PDF generation with React-PDF or Puppeteer

### 7.4 AI/Chat Integration
**File:** `src/components/layout/ai-sidebar.tsx` (line 141)
```typescript
// TODO: Replace with useChat from @ai-sdk/react when INT-AI-001 is complete
```

### 7.5 Notification System
**File:** `src/server/functions/support/escalation.ts` (line 482)
```typescript
// TODO: Integrate with notification system
```

**File:** `src/trigger/jobs/expire-ai-approvals.ts` (line 97)
```typescript
// TODO: Integrate with notification system when available
```

### 7.6 Trigger.dev Scheduled Reports
**File:** `src/server/functions/dashboard/scheduled-reports.ts`
- Lines 300, 408: TODOs for triggering actual report generation

**File:** `src/trigger/jobs/process-scheduled-reports.ts`
- Lines 510, 515, 661: TODOs for uploading to storage and sending emails

---

## 8. ERROR MONITORING PLACEHOLDERS

### 8.1 Sentry Integration
Multiple files have TODOs for Sentry integration:
- `src/components/layout/route-error-fallback.tsx` (line 29)
- `src/components/domain/jobs/jobs-error-boundary.tsx` (lines 53, 227)
- `src/components/domain/jobs/kanban/kanban-error-boundary.tsx` (line 44)

All have variations of:
```typescript
// TODO: Send to Sentry or similar
// TODO: Integrate with Sentry, LogRocket, or similar
```

---

## 9. PRIORITY RECOMMENDATIONS

### High Priority (Blocking Core Functionality)
1. **Workstreams/Notes/Files** - Complete stub file needs real implementation
2. **PDF Generation** - Multiple features blocked (quotes, warranties, invoices)
3. **Xero Integration** - Financial features placeholder only
4. **Document History** - Returns empty data only

### Medium Priority (User Experience Impact)
5. **Dashboard Activity Feed** - Uses mock data
6. **My Tasks Auth** - Hardcoded user instead of real auth
7. **Email Sending** - Quote sending not implemented
8. **Bulk Operations** - Multiple bulk deletes not implemented

### Low Priority (Nice to Have)
9. **Performance Charts** - Installer analytics
10. **Inventory Alert History** - View not implemented
11. **Coming Soon Toasts** - Multiple features show placeholder messages
12. **Widget Catalog** - Some widgets marked as disabled

---

## 10. FILES WITH MOST TECHNICAL DEBT

| File | Issues | Priority |
|------|--------|----------|
| `src/server/functions/workstreams-notes-files.ts` | Complete stub | High |
| `src/server/functions/pipeline/quote-versions.ts` | PDF/Email not implemented | High |
| `src/hooks/use-unified-activities.ts` | Mock data helper | Medium |
| `src/server/functions/warranty/warranty-certificates.ts` | PDF placeholder | High |
| `src/server/functions/financial/xero-invoice-sync.ts` | Xero not integrated | High |
| `src/trigger/jobs/sync-xero.ts` | Complete placeholder | High |
| `src/routes/_authenticated/dashboard/index.tsx` | Mock activities | Medium |
| `src/hooks/documents/use-document-history.ts` | Empty data return | Medium |
| `src/server/functions/settings/data-exports.ts` | Background jobs not triggered | Medium |
| `src/routes/_authenticated/mobile/__fixtures__/index.ts` | Mock pick list data | Medium |
