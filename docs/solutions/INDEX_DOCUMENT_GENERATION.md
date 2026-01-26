---
title: Document Generation System - Complete Learning Index
date: 2026-01-26
category: index
tags: [pdf-generation, institutional-knowledge, implementation-guide]
---

# Document Generation System - Complete Learning Index

> This index aggregates institutional learnings to prevent repeated mistakes and accelerate implementation of PDF generation, document templates, and file storage systems.

## Quick Navigation

1. **Starting here?** → Read [DOCUMENT_GENERATION_RESEARCH.md](./DOCUMENT_GENERATION_RESEARCH.md) - 15 min overview
2. **Ready to code?** → Read [DOCUMENT_GENERATION_QUICK_REFERENCE.md](./DOCUMENT_GENERATION_QUICK_REFERENCE.md) - Code snippets ready to use
3. **Need a specific pattern?** → Use the sections below to jump to relevant content

---

## What You'll Learn

### ✅ What Exists (Don't Rebuild)

- Trigger.dev job infrastructure (23 existing jobs)
- Email template system with Resend
- Organization branding schema (database-backed)
- File upload patterns (with multi-step validation)
- Data export system (with lifecycle management)
- Graceful degradation pattern (documented in Midday reference)

### ❌ What's Missing (You Need to Build)

- PDF library installation and integration
- Actual PDF generation implementation
- Quote/invoice PDF templates
- Document tracking database schema
- Storage path organization in Supabase
- UI for showing document status and download

### ⚠️ Critical Gotchas

1. **No PDF library installed yet** - Must choose and install first
2. **Branding stored in two places** - Normalize to single source
3. **Async job must update DB** - Easy to forget the final step
4. **File naming matters** - Use timestamp + random to prevent collisions
5. **Graceful degradation required** - Never leave user facing entity stuck

---

## Implementation Path

### Phase 1: Foundation (1-2 hours)

```
1. Choose PDF library (recommend @react-pdf/renderer)
2. npm install [library]
3. Create database schema for document tracking
4. Review src/trigger/jobs/generate-quote-pdf.ts skeleton
```

**Key File**: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/trigger/jobs/generate-quote-pdf.ts`

### Phase 2: Core Job (2-3 hours)

```
1. Implement generateQuotePdfJob with 6-step pattern
2. Add org settings fetch (for branding)
3. Implement PDF generation with template
4. Add Supabase storage upload
5. Update order record with PDF URL
```

**Template to Follow**: See DOCUMENT_GENERATION_QUICK_REFERENCE.md section "Trigger.dev Job Template"

### Phase 3: Error Handling (1 hour)

```
1. Implement graceful degradation
2. Add retry logic for failed PDFs
3. Store error messages for debugging
```

**Pattern**: See DOCUMENT_GENERATION_RESEARCH.md section "Graceful Degradation Pattern"

### Phase 4: UI Integration (2-3 hours)

```
1. Show PDF generation status (queued → processing → ready)
2. Add download button with fallback
3. Show branding preview before generation
4. Add manual retry button
```

### Phase 5: Email Templates (1-2 hours)

```
1. Create email template components (React Email)
2. Add variable substitution
3. Implement preview endpoint
```

**Pattern**: See DOCUMENT_GENERATION_QUICK_REFERENCE.md section "Email Template with React Email"

---

## Key Patterns Reference

### Pattern 1: Trigger.dev Job Structure

**Location**: `src/trigger/jobs/generate-quote-pdf.ts` (skeleton)

**6-Step Flow**:
1. Fetch document data
2. Fetch organization settings
3. Generate PDF
4. Upload to storage
5. Update database
6. Return result

**Why this works**:
- Each step independently retryable
- Status tracked in Trigger.dev dashboard
- Clear logging at each stage
- Final DB update ensures consistency

---

### Pattern 2: Organization Branding

**Location**: `drizzle/schema/settings/organizations.ts`

**Available Data**:
```typescript
{
  logoUrl: "https://...",
  primaryColor: "#0066cc",
  secondaryColor: "#666666",
  websiteUrl: "https://..."
}
```

**How to Use**:
```typescript
const org = await getOrganizationForPdf(organizationId);
const branding = org.branding || {};
// Use in PDF template generation
```

---

### Pattern 3: Template Substitution

**Location**: `src/lib/server/email-templates.ts`

**Syntax**: `{{variable}}` for simple, `{{customer.name}}` for nested

**Example**:
```typescript
const template = "Hello {{customer.name}}, your quote is {{amount}}";
const result = substituteTemplateVariables(template, variables);
```

---

### Pattern 4: Graceful Degradation

**Location**: `_reference/.midday-reference/docs/document-processing.md`

**Principle**: Documents/orders should NEVER be stuck

**Implementation**:
```typescript
try {
  await generateAndUploadPdf();
} catch (error) {
  // Mark as failed but keep accessible
  await db.update(orders).set({
    pdf_status: 'failed',
    pdf_error: error.message,
  });
  // Order remains usable - user can retry
}
```

---

### Pattern 5: Storage Organization

**Location**: Recommendation based on Supabase best practices

**Structure**:
```
documents/
├── {organizationId}/
│   ├── quotes/
│   │   └── quote_timestamp_random.pdf
│   ├── invoices/
│   │   └── invoice_timestamp_random.pdf
│   └── exports/
│       └── export_timestamp.csv
```

**Benefits**:
- Org-scoped (easy to list/delete by org)
- Type-scoped (easy to find specific docs)
- Collision-free (timestamp + random)

---

## File Reference

### Core Patterns in Codebase

| File | Pattern | Status |
|------|---------|--------|
| `src/trigger/jobs/generate-quote-pdf.ts` | Trigger.dev 6-step job | ⏳ Skeleton - needs implementation |
| `src/trigger/jobs/process-scheduled-emails.ts` | Email template substitution | ✅ Reference implementation |
| `src/server/functions/jobs/job-documents.ts` | File upload with validation | ✅ Reference implementation |
| `src/server/functions/communications/email-preview.ts` | Email rendering | ✅ Reference implementation |
| `src/server/functions/settings/data-exports.ts` | Export lifecycle management | ✅ Reference implementation |
| `drizzle/schema/settings/organizations.ts` | Organization branding schema | ✅ Already in database |

### Documentation Files Created

| File | Purpose | Read Time |
|------|---------|-----------|
| `DOCUMENT_GENERATION_RESEARCH.md` | Complete reference with all patterns | 15 min |
| `DOCUMENT_GENERATION_QUICK_REFERENCE.md` | Code snippets and templates | 10 min |
| `INDEX_DOCUMENT_GENERATION.md` | This file - navigation | 5 min |

---

## Testing Checklist

- [ ] PDF generates with correct organization branding
- [ ] Document file saved to correct Supabase path
- [ ] Order record updated with PDF URL
- [ ] PDF generation failure doesn't break order
- [ ] User can see document status in UI
- [ ] User can download PDF once ready
- [ ] User can retry failed PDF generation
- [ ] Email template variables substitute correctly
- [ ] Email templates render as both HTML and plain text
- [ ] Organization logo loads in PDF
- [ ] Currency format respects org settings
- [ ] Date format respects org locale

---

## Debugging Guide

### "PDF not generating"

1. Check Trigger.dev dashboard for job status
2. Look for errors in `generate-pdf` task
3. Verify PDF library is installed and imported
4. Check organization has branding data

### "PDF URL not saving to database"

1. Verify final `update-db` task in Trigger.dev job
2. Check database for pending/failed status
3. Look for `pdf_error` message in database
4. Verify Supabase storage upload succeeded

### "Organization branding not appearing"

1. Fetch org settings and inspect `branding` object
2. Verify `logoUrl` is a valid HTTP URL
3. Check Supabase Storage bucket permissions
4. Verify PDF template is reading org data correctly

---

## Decision Points

### PDF Library Choice

| Option | Best For |
|--------|----------|
| `@react-pdf/renderer` | React components, styled-components, simple layouts |
| `puppeteer` | Complex HTML layouts, screenshots |
| `pdf-lib` | Programmatic PDF creation, low-level control |

**Recommendation**: `@react-pdf/renderer` (aligns with email component patterns)

### Storage Strategy

| Option | Best For |
|--------|----------|
| Supabase Storage (recommended) | Multi-tenant, org-scoped paths, built-in |
| AWS S3 | High scale, existing AWS setup |
| Vercel Blob | Simple, serverless-friendly |

**Recommendation**: Supabase Storage (already set up for file uploads)

### Export Format Support

| Format | Implementation |
|--------|-----------------|
| CSV | Use `fast-csv` library |
| JSON | Built-in JSON.stringify |
| XLSX | Use `xlsx` library |

**Recommendation**: Start with CSV and JSON, add XLSX if needed

---

## Common Mistakes & Prevention

### ❌ Mistake 1: Skipping org settings fetch

**Problem**: PDF generates with placeholder logo/colors

**Prevention**:
```typescript
// First task in job
const org = await getOrganizationForPdf(organizationId);
// Always do this, even if org is optional
```

### ❌ Mistake 2: Simple filename

**Problem**: Second PDF overwrites first (collision)

**Prevention**:
```typescript
const filename = `${orderId}_${Date.now()}_${randomId}.pdf`;
// Never just: `${orderId}.pdf`
```

### ❌ Mistake 3: Forgetting DB update

**Problem**: PDF generated but order.pdf_url stays NULL

**Prevention**:
```typescript
// Last step in job - ALWAYS do this
await db.update(orders).set({
  pdf_url: uploadResult.url,
  pdf_status: 'completed',
}).where(eq(orders.id, orderId));
```

### ❌ Mistake 4: No error handling

**Problem**: PDF generation fails → Order stuck in "pending"

**Prevention**:
```typescript
try {
  // Generate PDF
} catch (error) {
  await db.update(orders).set({
    pdf_status: 'failed',
    pdf_error: error.message,
  });
}
```

### ❌ Mistake 5: Two branding sources

**Problem**: Inconsistent branding between updates

**Prevention**:
```typescript
// Use only organizations.branding
// Ignore organizations.settings.portalBranding
const branding = org.branding || {};
```

---

## Next Steps

1. **Review DOCUMENT_GENERATION_RESEARCH.md** for complete context
2. **Skim DOCUMENT_GENERATION_QUICK_REFERENCE.md** for code examples
3. **Choose PDF library** and update package.json
4. **Create database schema** for document tracking
5. **Implement generate-quote-pdf.ts** job following the 6-step pattern
6. **Add UI** to show PDF status and download

---

## Questions to Ask Yourself

Before starting implementation:

1. Which PDF library should we use? (Recommend: `@react-pdf/renderer`)
2. Do we need WYSIWYG editor for document templates? (Recommend: Start with hardcoded)
3. Should exports be async or synchronous? (Recommend: Async with Trigger.dev)
4. Do we need version history for generated documents? (Recommend: Phase 2)
5. Should documents expire/auto-delete? (Recommend: Configure based on storage costs)

---

## Success Criteria

You've successfully implemented document generation when:

- ✅ Quote PDF generates with organization branding
- ✅ PDF saves to Supabase Storage with org-scoped path
- ✅ Order record updates with PDF URL
- ✅ UI shows PDF status and download button
- ✅ Failed PDF generation doesn't break order
- ✅ User can manually retry failed PDFs
- ✅ Email templates use variable substitution
- ✅ Export functionality works for CSV and JSON

---

## Related Documentation

- [CLAUDE.md - Data Fetching Rules](../../../CLAUDE.md)
- [STANDARDS.md - Codebase Conventions](../../../STANDARDS.md)
- [Hook Architecture Rules](../../../.claude/rules/hook-architecture.md)
- [Midday Document Processing](../../../_reference/.midday-reference/docs/document-processing.md)

---

**Created**: 2026-01-26
**Last Updated**: 2026-01-26
**Status**: Complete reference ready for implementation
