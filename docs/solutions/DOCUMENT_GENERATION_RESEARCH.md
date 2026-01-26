---
title: Document Generation & PDF System - Institutional Learnings
date: 2026-01-26
category: research
tags: [pdf-generation, document-templates, file-storage, trigger.dev, organization-branding]
severity: medium
status: reference
related_features: [order-quotes, email-templates, document-export]
---

# Document Generation & PDF System - Institutional Learnings

## Search Context

**Feature/Task**: Implementing document generation system for:
- PDF quote generation (already sketched in `generate-quote-pdf.ts`)
- Email templates with org branding
- Document export functionality
- File storage integration with Supabase

**Keywords Used**: pdf, document, template, file-storage, trigger.dev, organization-branding, react-pdf, email-templates

**Files Scanned**: 50+ files
**Relevant Matches**: 12 files with documented patterns

---

## Critical Findings

### 1. No PDF Library Installed Yet

**Finding**: The project has NO PDF generation library currently installed.

**Package.json Status**:
- ❌ `@react-pdf/renderer` - NOT installed (commented TODO in generate-quote-pdf.ts)
- ❌ `puppeteer` - NOT installed
- ❌ `pdf-lib` - NOT installed
- ✅ `@react-email/components` - Available for email templates
- ✅ `@react-email/render` - Available for rendering email HTML

**File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/package.json`

**Implication**: You'll need to choose and install a PDF library before proceeding. Options documented in the generate-quote-pdf.ts skeleton.

---

## Existing Patterns & Learnings

### A. Trigger.dev Background Job Pattern

**File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/trigger/jobs/generate-quote-pdf.ts`

**Key Pattern**: The skeleton job shows a 6-step orchestration pattern for document generation:

```typescript
export const generateQuotePdfJob = client.defineJob({
  id: 'generate-quote-pdf',
  name: 'Generate Quote PDF',
  version: '1.0.0',
  trigger: eventTrigger({
    name: orderEvents.created,
  }),
  run: async (payload: OrderCreatedPayload, io) => {
    // Step 1: Log job start
    // Step 2: Fetch order details
    // Step 3: Fetch organization settings (for branding)
    // Step 4: Generate PDF
    // Step 5: Upload to storage
    // Step 6: Update order with PDF URL
  },
})
```

**Best Practices**:
- Use `io.runTask()` wrapper for each step - enables retry and status tracking in Trigger.dev dashboard
- Use `io.logger.info()` for structured logging with context
- Separate concerns: fetch data → generate → upload → persist reference
- Return meaningful result with all relevant paths/URLs

**Gotchas**:
- Each `runTask` must be independently retryable
- Step 3 (org settings) is CRITICAL - document generation requires branding for realistic outputs
- File uploads to storage should return both `path` and `url` for flexibility

**Example from skeleton**:
```typescript
const uploadResult = await io.runTask('upload-pdf', async () => {
  await io.logger.info('Uploading PDF to storage', {
    filename: pdfBuffer.filename,
  })
  // TODO: Upload to Supabase Storage
  return {
    path: `quotes/${organizationId}/${pdfBuffer.filename}`,
    url: `https://storage.example.com/quotes/${organizationId}/${pdfBuffer.filename}`,
  }
})
```

---

### B. Organization Branding Structure

**File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/settings/organizations.ts`

**Structure** (TypeScript interface):

```typescript
export interface OrganizationBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  websiteUrl?: string;
}

export interface OrganizationSettings {
  timezone?: string;
  locale?: string;
  currency?: string;
  dateFormat?: string;
  fiscalYearStart?: number;
  defaultPaymentTerms?: number;
  timeFormat?: "12h" | "24h";
  weekStartDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  defaultTaxRate?: number;
  numberFormat?: "1,234.56" | "1.234,56" | "1 234,56";
  portalBranding?: OrganizationBranding;  // Alternative location
}
```

**Key Insight**: Branding is stored in TWO places in the organizations table:
- `organizations.branding` - Direct JSONB column
- `organizations.settings.portalBranding` - Nested in settings

**Recommendation**: Normalize to single source of truth. Fetch branding for document templates:

```typescript
const org = await db.select().from(organizations)
  .where(eq(organizations.id, organizationId))
  .then(rows => rows[0]);

const branding = org.branding || org.settings?.portalBranding || {};
```

**Available Data**:
- Logo URL (typically stored in Supabase Storage under `branding/{orgId}/logo.png`)
- Colors for styling (CSS hex values)
- Website URL (for contact info in documents)
- Settings (timezone, dateFormat, currency) for formatting document data

---

### C. Email Template & Preview Pattern

**Files**:
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/functions/communications/email-preview.ts`
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/trigger/jobs/process-scheduled-emails.ts`

**Pattern**: Template variables with substitution

```typescript
// From process-scheduled-emails.ts - Example template:
{
  subject: "Your Quote {{quote_number}} is Ready",
  body: `<html><body>
    <p>Hi {{first_name}},</p>
    <p>Your quote {{quote_number}} is ready for review.</p>
  </body></html>`,
}

// Substitution utility
import { substituteTemplateVariables } from "@/lib/email/sanitize";
const rendered = substituteTemplateVariables(template, variables);
```

**Key Insight**: Use double-brace `{{variable}}` syntax for template substitution. This pattern is consistent across email templates.

**Best Practices**:
- Store template subject and body separately (same as emails)
- Support sample data rendering for previews
- Convert HTML to plain text for email fallback

---

### D. Document Processing & File Upload Pattern

**File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/functions/jobs/job-documents.ts`

**Pattern**: File validation → Database record → Background processing

```typescript
// Validation
function validateDocumentFile(mimeType: string, fileSize: number) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Invalid file type` };
  }
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File too large` };
  }
  return { valid: true };
}

// Upload flow
const [newPhoto] = await db
  .insert(jobPhotos)
  .values({
    organizationId,
    jobAssignmentId,
    type,
    photoUrl,         // Placeholder or actual URL
    createdBy: ctx.user.id,
  })
  .returning();

// Async processing
await processJobDocument({
  photoId: newPhoto.id,
  jobAssignmentId,
  fileData: Uint8Array,
  mimeType,
  filename,
});
```

**Key Insights**:
1. **Immediate DB record creation** - Allows UI to show result immediately
2. **Async background processing** - Trigger.dev job for heavy lifting
3. **Filename generation strategy**:
   ```typescript
   const filename = `${jobAssignmentId}_${timestamp}_${randomId}.${ext}`;
   // Prevents collisions, enables tracing
   ```
4. **Graceful failure handling** - If background job fails, document still accessible
5. **File size limits** - Store as constants for consistency

**Constants from schema**:
```typescript
// src/lib/schemas/files/files.ts (referenced but check for actual values)
ALLOWED_MIME_TYPES: ['application/pdf', 'image/jpeg', ...]
MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024  // 15MB typical
```

---

### E. Scheduled Job Pattern with Error Handling

**File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/trigger/jobs/process-scheduled-emails.ts`

**Pattern**: Cron trigger → Process records → Send → Track

```typescript
export const processScheduledEmailsJob = task.cron({
  id: 'process-scheduled-emails',
  cron: '* * * * *',  // Every minute
  run: async (payload, io) => {
    // Get due emails
    const dueEmails = await getDueScheduledEmails();

    for (const email of dueEmails) {
      try {
        // Check suppression
        const isSuppressed = await isEmailSuppressedDirect(email.to);
        if (isSuppressed) continue;

        // Prepare for tracking
        const emailWithTracking = await prepareEmailForTracking(email);

        // Send
        await resend.emails.send(emailWithTracking);

        // Mark as sent
        await markScheduledEmailAsSent(email.id);

        // Create activity record
        await createEmailSentActivity(email);
      } catch (error) {
        console.error(`Failed to send email ${email.id}:`, error);
        // Don't fail entire job - continue with next email
      }
    }
  },
});
```

**Key Patterns**:
1. **Batch processing with per-item error handling** - One failure doesn't stop others
2. **Business logic checks** (suppression) before expensive operations
3. **Multi-step recording** - Send → Mark status → Create activity (for audit trail)
4. **Privacy-safe logging**:
   ```typescript
   function hashEmail(email: string): string {
     return createHash("sha256")
       .update(email.toLowerCase().trim())
       .digest("hex")
       .slice(0, 8);
   }
   // Log hashed email, never the real address
   ```

---

### F. Graceful Degradation Pattern (Midday Reference)

**File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/_reference/.midday-reference/docs/document-processing.md`

**Pattern**: Always allow user access, even if processing fails

**State Machine**:
```
pending → completed (with metadata)  ← Success path
pending → completed (title=null)     ← AI failure (graceful)
pending → failed                     ← Hard failure (retryable)
```

**Key Principle**:
> "A document should never be stuck. Even if AI fails: 1) Status → completed, 2) Title → null, 3) User can download file, 4) User can retry"

**Application to PDF generation**:
- If PDF generation fails → Still update order with `pdf_status: "failed"`
- Store error message in `pdf_generation_error` for debugging
- Provide retry button in UI for user-initiated recovery
- Never mark order as failed just because PDF generation failed

**Example**:
```typescript
try {
  const pdfBuffer = await generatePdfWithTimeout(order);
  await uploadAndLink(pdfBuffer, order.id);
} catch (error) {
  // Graceful fallback
  await db.update(orders).set({
    pdf_status: 'failed',
    pdf_generation_error: error.message,
    // Order itself remains usable
  });
  // Don't throw - return success with partial data
}
```

---

### G. Data Export Pattern

**File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/server/functions/settings/data-exports.ts`

**Pattern**: Export job lifecycle with status tracking

```typescript
// Schema for export configuration
const createExportSchema = z.object({
  entities: z.array(z.enum(EXPORTABLE_ENTITIES)).min(1).max(10),
  format: z.enum(['csv', 'json', 'xlsx']),
  filters: z.record(z.string(), z.unknown()).optional(),
  dateRange: z.object({
    start: z.coerce.date().optional(),
    end: z.coerce.date().optional(),
  }).optional(),
  anonymized: z.boolean().optional().default(false),
  includedFields: z.array(z.string()).optional(),
});

// Status enum
const exportStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'expired',  // Auto-delete after EXPORT_EXPIRATION_DAYS
]);
```

**Key Insights**:
1. **Multi-entity support** - Export multiple entity types in one job
2. **Format flexibility** - Support CSV, JSON, XLSX
3. **Access control** - Exports scoped to `organizationId` and `requestedBy`
4. **Expiration strategy** - Auto-delete exports after X days (constant `EXPORT_EXPIRATION_DAYS`)
5. **Rate limiting** - Max concurrent exports enforced (`MAX_CONCURRENT_EXPORTS`)
6. **Field filtering** - Optional `includedFields` to exclude sensitive data

**Database schema references**:
```typescript
dataExports: {
  organizationId,
  requestedBy,        // User ID who requested
  status,
  format,
  filters,
  dateRange,
  anonymized,
  includedFields,
  filePath,           // Storage location when complete
  fileUrl,            // Download URL when complete
  expiresAt,          // Calculated as createdAt + EXPORT_EXPIRATION_DAYS
  errorMessage,       // Populated if status === 'failed'
  createdAt,
  updatedAt,
}
```

---

## Architectural Patterns to Follow

### 1. Server Function Pattern (TanStack Start)

**Always use** for document operations:

```typescript
import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';

export const generateQuotePdf = createServerFn({ method: 'POST' })
  .inputValidator(generateQuotePdfSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });

    // Your logic here - has access to ctx.organizationId, ctx.user.id
  });
```

**Benefits**:
- Automatic auth middleware via `withAuth()`
- Org-scoped queries enforced
- Type-safe input validation

### 2. Trigger.dev for Async Work

**Use** for:
- ✅ PDF generation (CPU-intensive)
- ✅ Document uploads to storage
- ✅ Email sending
- ✅ Batch processing

**Never use** for:
- ❌ User-initiated operations expecting immediate response
- ❌ Operations under 100ms (overhead not worth it)

**Pattern**:
```typescript
// In server function - trigger the job
await client.trigger({
  id: 'generate-quote-pdf',
  payload: { orderId, organizationId },
});

// Return immediately with status URL
return { status: 'queued', trackingUrl: `/orders/${orderId}/pdf-status` };
```

### 3. Database for State Tracking

**Always create a record** before async work:

```typescript
// 1. Create export record (status=pending)
const [exportJob] = await db.insert(dataExports).values({
  organizationId,
  requestedBy: ctx.user.id,
  status: 'pending',
  format: 'csv',
  // ...
}).returning();

// 2. Trigger job
await triggerExportJob(exportJob.id);

// 3. Return immediately
return { exportId: exportJob.id, status: 'pending' };

// 4. Later: Job updates status to 'processing' → 'completed'
```

**UI benefits**:
- Can poll for status immediately
- Shows progress in real-time
- User can navigate away and come back

---

## Gotchas & Prevention

### Gotcha 1: Missing Organization Data

**Problem**: Generating PDF without fetching org settings → Missing branding, wrong currency format

**Prevention**:
```typescript
// ✅ CORRECT - Always fetch org settings early
const org = await db.select().from(organizations)
  .where(eq(organizations.id, organizationId));
const branding = org.branding || {};
const currency = org.currency || 'AUD';  // Fallback

// ❌ WRONG - Hardcoding format
const total = amount.toFixed(2);  // Doesn't respect currency format
```

### Gotcha 2: File Naming Collisions

**Problem**: Two PDFs generated simultaneously with same name → Second overwrites first

**Prevention**:
```typescript
// ✅ CORRECT - Include timestamp + random
const filename = `${orderId}_${Date.now()}_${randomId}.pdf`;

// ❌ WRONG - Just order ID
const filename = `${orderId}.pdf`;  // Collision risk
```

### Gotcha 3: Supabase Storage Path Structure

**Problem**: Files scattered across bucket with no organization isolation → Hard to list/cleanup

**Prevention**:
```typescript
// ✅ CORRECT - Org → Type → File
const path = `documents/${organizationId}/quotes/${filename}`;

// Also enables easy cleanup:
// DELETE FROM storage WHERE path LIKE 'documents/{orgId}/%'
```

### Gotcha 4: Async Job Doesn't Update Order

**Problem**: PDF generated successfully but order.pdf_url stays NULL

**Prevention**:
```typescript
// In Trigger.dev job - final step
await db.update(orders).set({
  pdf_url: uploadResult.url,
  pdf_status: 'completed',
  pdf_generated_at: new Date(),
}).where(eq(orders.id, orderId));
```

### Gotcha 5: No Fallback for Failed PDF Generation

**Problem**: Order stuck in "pending" state forever if PDF fails

**Prevention** (graceful degradation):
```typescript
try {
  const pdf = await generatePdf(order);
  await uploadAndLink(pdf, order.id);
} catch (error) {
  // Mark as failed but don't lose order
  await db.update(orders).set({
    pdf_status: 'failed',
    pdf_error: error.message,
  });
  // Order remains usable - user can download without PDF
  // Provide manual "Retry" button in UI
}
```

---

## Implementation Checklist

### Phase 1: Setup

- [ ] Install PDF library (`@react-pdf/renderer` OR `puppeteer` OR `pdf-lib`)
- [ ] Create database table for document tracking (if not exists)
- [ ] Add organization branding fetch to PDF generation context
- [ ] Create Supabase Storage bucket for documents with org-scoped paths

### Phase 2: PDF Generation Job

- [ ] Create `generate-pdf.ts` in `src/trigger/jobs/`
- [ ] Implement 6-step pattern (fetch → fetch org → generate → upload → update → return)
- [ ] Add error handling with graceful degradation
- [ ] Add structured logging with `io.logger`

### Phase 3: Email Template Generation

- [ ] Create template rendering utility using `@react-email`
- [ ] Implement variable substitution (`{{variable}}` syntax)
- [ ] Support both HTML and plain text rendering
- [ ] Add preview endpoint for template testing

### Phase 4: Document Export

- [ ] Extend `data-exports.ts` with format handlers (CSV/JSON/XLSX)
- [ ] Implement expiration cleanup job (daily cron)
- [ ] Add rate limiting for concurrent exports
- [ ] Support anonymization for sensitive data

### Phase 5: UI Integration

- [ ] Show document generation status (queued → processing → ready)
- [ ] Add download button with fallback if PDF failed
- [ ] Show branding preview before generation
- [ ] Add retry button for failed documents

---

## File References

**Key Files in Codebase**:

| File | Purpose | Status |
|------|---------|--------|
| `src/trigger/jobs/generate-quote-pdf.ts` | PDF job skeleton | ⏳ TODO: Implement |
| `drizzle/schema/settings/organizations.ts` | Org branding structure | ✅ Exists |
| `src/server/functions/communications/email-preview.ts` | Email template preview | ✅ Exists |
| `src/trigger/jobs/process-scheduled-emails.ts` | Email sending pattern | ✅ Reference |
| `src/server/functions/jobs/job-documents.ts` | File upload pattern | ✅ Reference |
| `src/server/functions/settings/data-exports.ts` | Export lifecycle | ✅ Reference |

**Reference Documentation**:

| Reference | Location | Relevance |
|-----------|----------|-----------|
| Midday Document Processing | `_reference/.midday-reference/docs/document-processing.md` | Graceful degradation pattern |
| Email Rendering Pattern | `src/trigger/jobs/process-scheduled-emails.ts` | Template substitution |
| Container/Presenter Pattern | `docs/solutions/architecture/container-presenter-standardization.md` | Hook architecture rules |

---

## Next Steps

1. **Choose PDF library** - Recommend `@react-pdf/renderer` for React-native approach, matches email component style
2. **Create document schema** - Track pdf_url, pdf_status, pdf_error, generated_at for orders
3. **Implement quote PDF template** - Use organization branding (logo, colors) + order data
4. **Build export functionality** - Follow data-exports.ts pattern for CSV/JSON formats
5. **Add email template system** - Use variable substitution pattern from process-scheduled-emails.ts
