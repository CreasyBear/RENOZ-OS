---
title: "feat: Trigger.dev v3 Migration & Document Generation Completion"
type: feat
date: 2026-01-26
prd: _Initiation/_prd/3-integrations/document-generation/document-generation.prd.json
---

# Trigger.dev v3 Migration & Document Generation Completion

## Overview

Two interconnected objectives:
1. **Migrate all Trigger.dev jobs from v2 patterns to v3** - The SDK is already v3 but code uses v2 patterns
2. **Complete the Document Generation PRD (INT-DOCGEN)** - 9 document types, UI integration, auto-generation

## Current State

### Trigger.dev
- Package: `@trigger.dev/sdk: ^3.0.0` (v3 installed)
- Code: Using v2 patterns (`TriggerClient`, `client.defineJob()`, `io.runTask()`)
- Jobs: **25 jobs**, **~8,500 lines** of code
- Result: Type errors, runtime incompatibility

### Document Generation
- Foundation: ✅ Complete (src/lib/documents/)
- Quote/Invoice templates: ✅ Complete
- Trigger jobs: ❌ Blocked by v2 patterns
- Remaining templates: ❌ Not started (7 more)
- UI Integration: ❌ Not started
- Migrations: ❌ Not started

## Migration Strategy

### v2 vs v3 Pattern Changes

| v2 Pattern | v3 Pattern |
|------------|------------|
| `import { TriggerClient } from '@trigger.dev/sdk'` | `import { task, logger } from '@trigger.dev/sdk/v3'` |
| `client.defineJob({ id, trigger, run })` | `export const myTask = task({ id, run })` |
| `eventTrigger({ name, schema })` | Trigger via `myTask.trigger(payload)` |
| `io.runTask('name', async () => {})` | Just call the function directly |
| `io.logger.info()` | `logger.info()` |
| `io.wait('key', seconds)` | `await wait.for({ seconds })` |
| Return JSON-serializable only | SuperJSON: Date, Map, Set, Error, URL supported |

### File Structure Changes

```
src/trigger/
├── client.ts          # DELETE - not needed in v3
├── trigger.config.ts  # NEW - v3 config file
└── jobs/
    ├── index.ts       # NEW - barrel export all tasks
    └── *.ts           # MIGRATE - each job file
```

## Implementation Phases

### Phase 1: Trigger.dev v3 Setup (INT-TRIG-001)

**Objective:** Configure v3 infrastructure

**Tasks:**
- [ ] Create `trigger.config.ts` with project settings
- [ ] Update `package.json` scripts for v3 CLI
- [ ] Create `src/trigger/jobs/index.ts` barrel export
- [ ] Test v3 dev server connection

**Files:**
- `trigger.config.ts` (NEW)
- `package.json` (UPDATE scripts)
- `src/trigger/jobs/index.ts` (NEW)

### Phase 2: Migrate Core Jobs (INT-TRIG-002)

**Objective:** Migrate jobs needed for document generation first

**Priority Jobs (Document Generation):**
- [ ] `generate-quote-pdf.tsx` → v3 task pattern
- [ ] `generate-invoice-pdf.tsx` → v3 task pattern
- [ ] `send-email.ts` → v3 task pattern (used by doc generation)

**Pattern for each job:**
```typescript
// BEFORE (v2)
import { eventTrigger } from "@trigger.dev/sdk";
import { client } from "../client";

client.defineJob({
  id: "generate-quote-pdf",
  name: "Generate Quote PDF",
  version: "1.0.0",
  trigger: eventTrigger({ name: "document.generate_quote" }),
  run: async (payload, io) => {
    const data = await io.runTask("fetch-data", async () => {
      return await fetchData();
    });
    // ...
  },
});

// AFTER (v3)
import { task, logger } from "@trigger.dev/sdk/v3";

export const generateQuotePdf = task({
  id: "generate-quote-pdf",
  retry: { maxAttempts: 3 },
  run: async (payload: GenerateQuotePayload) => {
    // No io.runTask needed - just call functions directly
    const data = await fetchData();
    logger.info("Fetched data", { orderId: payload.orderId });
    // ...
  },
});
```

### Phase 3: Migrate Remaining Jobs (INT-TRIG-003)

**Objective:** Migrate all other trigger jobs

**Jobs to migrate:**
- [ ] `send-campaign.ts`
- [ ] `process-scheduled-emails.ts`
- [ ] `process-scheduled-reports.ts`
- [ ] `process-scheduled-calls.ts`
- [ ] `sync-xero.ts`
- [ ] `ai-agent-task.ts`
- [ ] `cleanup-files.ts`
- [ ] `refresh-analytics.ts`
- [ ] `check-expiring-warranties.ts`
- [ ] `search-index-outbox.ts`
- [ ] `expire-ai-approvals.ts`
- [ ] `dashboard-refresh.ts`
- [ ] `send-invitation-email.tsx`
- [ ] `cache-warming.ts`
- [ ] `check-inventory-alerts.ts`
- [ ] `process-resend-webhook.ts`
- [ ] And remaining jobs...

### Phase 4: Update Trigger Callers (INT-TRIG-004)

**Objective:** Update all places that trigger jobs

**Before (v2):**
```typescript
import { client, documentEvents } from "@/trigger/client";

await client.sendEvent({
  name: documentEvents.generateQuote,
  payload: { orderId, organizationId },
});
```

**After (v3):**
```typescript
import { generateQuotePdf } from "@/trigger/jobs";

await generateQuotePdf.trigger({ orderId, organizationId });
```

**Files to update:**
- All server functions that trigger jobs
- API routes that trigger jobs
- Remove `client.ts` after migration complete

### Phase 5: Complete Document Templates (INT-DOC-003-007)

**Objective:** Build remaining 7 document templates

**Templates:**
- [ ] Pro Forma Invoice (`src/lib/documents/templates/financial/pro-forma.tsx`)
- [ ] Delivery Note (`src/lib/documents/templates/operational/delivery-note.tsx`)
- [ ] Packing Slip (`src/lib/documents/templates/operational/packing-slip.tsx`)
- [ ] Work Order (`src/lib/documents/templates/operational/work-order.tsx`)
- [ ] Warranty Certificate (`src/lib/documents/templates/certificates/warranty.tsx`)
- [ ] Completion Certificate (`src/lib/documents/templates/certificates/completion.tsx`)

**New Components Needed:**
- [ ] `signature-line.tsx` - For delivery note, work order
- [ ] `certificate-border.tsx` - For certificates
- [ ] `checklist.tsx` - For work orders, packing slips

### Phase 6: Database Migrations (INT-DOC-SCHEMA)

**Objective:** Add required schema

**Migrations:**
```sql
-- 1. Add PDF URL columns to orders
ALTER TABLE orders ADD COLUMN quote_pdf_url TEXT;
ALTER TABLE orders ADD COLUMN invoice_pdf_url TEXT;

-- 2. Add certificate URL to warranties
ALTER TABLE warranties ADD COLUMN certificate_pdf_url TEXT;

-- 3. Create document_templates table
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  document_type TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#18181B',
  secondary_color TEXT DEFAULT '#3B82F6',
  font_family TEXT DEFAULT 'Inter',
  paper_size TEXT DEFAULT 'A4',
  include_qr BOOLEAN DEFAULT true,
  footer_text TEXT,
  terms_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, document_type)
);

-- 4. Create generated_documents audit table
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  document_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  page_count INTEGER,
  checksum TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by_id UUID REFERENCES users(id)
);

CREATE INDEX idx_generated_documents_entity ON generated_documents(entity_type, entity_id);
CREATE INDEX idx_generated_documents_org ON generated_documents(organization_id);
```

### Phase 7: Trigger Jobs for New Templates (INT-DOC-TRIG)

**Objective:** Create v3 trigger tasks for new document types

**Tasks:**
- [ ] `generateProFormaPdf` task
- [ ] `generateDeliveryNotePdf` task
- [ ] `generatePackingSlipPdf` task
- [ ] `generateWorkOrderPdf` task
- [ ] `generateWarrantyCertificatePdf` task
- [ ] `generateCompletionCertificatePdf` task

### Phase 8: Server Functions (INT-DOC-SERVER)

**Objective:** Create server functions for document operations

**Functions:**
- [ ] `generateDocument(type, entityId)` - Trigger document generation
- [ ] `getDocumentTemplate(orgId, type)` - Get template settings
- [ ] `updateDocumentTemplate(orgId, type, settings)` - Update settings
- [ ] `previewDocument(type, sampleData)` - Preview with sample data
- [ ] `getGeneratedDocuments(entityType, entityId)` - List documents for entity
- [ ] `regenerateDocument(documentId)` - Regenerate existing document

### Phase 9: UI Integration (INT-DOC-UI)

**Objective:** Add document UI to existing pages

**Components:**
- [ ] `DownloadPdfButton` - Download or regenerate PDF
- [ ] `DocumentHistoryList` - List generated documents
- [ ] `DocumentPreviewModal` - Preview before generation
- [ ] `DocumentSettingsForm` - Template customization

**Page Integrations:**
- [ ] Order detail page - Quote/Invoice download buttons
- [ ] Order detail page - Documents tab with history
- [ ] Job detail page - Work order download
- [ ] Warranty detail page - Certificate download
- [ ] Settings page - `/settings/documents` for customization

### Phase 10: Auto-Generation Triggers (INT-DOC-AUTO)

**Objective:** Auto-generate documents on events

**Triggers:**
- [ ] Order created → Generate Quote PDF
- [ ] Order status = 'invoiced' → Generate Invoice PDF
- [ ] Order status = 'shipped' → Generate Delivery Note PDF
- [ ] Job completed → Generate Completion Certificate
- [ ] Warranty registered → Generate Warranty Certificate

## Acceptance Criteria

### Trigger.dev v3
- [ ] All 25 jobs migrated to v3 patterns
- [ ] `npm run typecheck` passes
- [ ] Jobs execute successfully in dev/staging
- [ ] No v2 patterns remain (`TriggerClient`, `io.runTask`, etc.)

### Document Generation
- [ ] All 9 document types implemented
- [ ] PDFs generate with organization branding
- [ ] Documents upload to Supabase Storage
- [ ] Document history tracked in database
- [ ] UI buttons for download/regenerate
- [ ] Auto-generation on status changes

## Estimated Effort

| Phase | Effort | Dependency |
|-------|--------|------------|
| Phase 1: v3 Setup | Small | - |
| Phase 2: Core Jobs | Medium | Phase 1 |
| Phase 3: Remaining Jobs | Large | Phase 1 |
| Phase 4: Update Callers | Medium | Phase 2-3 |
| Phase 5: Templates | Medium | Phase 1 library done |
| Phase 6: Migrations | Small | - |
| Phase 7: Template Jobs | Medium | Phase 5, Phase 2 |
| Phase 8: Server Functions | Medium | Phase 6 |
| Phase 9: UI Integration | Medium | Phase 8 |
| Phase 10: Auto-Generation | Small | Phase 7 |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| v3 migration breaks production | Migrate in feature branch, test thoroughly |
| Job failures during migration | Keep v2 jobs running until v3 verified |
| Missing document types | Prioritize Quote/Invoice first (most used) |
| Large migration scope | Batch jobs by priority, ship incrementally |

## References

- Trigger.dev v3 Docs: https://trigger.dev/docs
- v2→v3 Migration Guide: https://trigger.dev/docs/guides/use-cases/upgrading-from-v2
- React PDF: https://react-pdf.org/
- Current jobs: `src/trigger/jobs/`
- Document library: `src/lib/documents/`
