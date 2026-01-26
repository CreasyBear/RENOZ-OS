---
title: "feat: Document Generation System (INT-DOCGEN)"
type: feat
date: 2026-01-26
prd: _Initiation/_prd/3-integrations/document-generation/document-generation.prd.json
---

# Document Generation System

## Overview

Implement a comprehensive PDF generation system using `@react-pdf/renderer` for business documents including quotes, invoices, delivery notes, work orders, and certificates. The system mirrors the existing email template library architecture with shared components and organization branding.

## Problem Statement / Motivation

Currently, the codebase has:
- A 100% placeholder `generate-quote-pdf.ts` Trigger.dev job (all TODOs)
- No PDF generation library installed
- No document templates
- No way to provide professional documents to customers

Customers expect professional, branded quotes and invoices. Field technicians need work orders. Customers need warranty certificates. This is table-stakes functionality for a CRM.

## Proposed Solution

Build `src/lib/documents/` mirroring `src/lib/email/`:
- Shared PDF components (Header, Footer, LineItems, Summary)
- Domain-specific templates (Quote, Invoice, DeliveryNote, WorkOrder, WarrantyCertificate)
- Organization branding context provider
- Trigger.dev jobs for automatic generation
- Supabase Storage for PDF persistence

## Technical Approach

### Architecture

```
src/lib/documents/
├── components/           # Shared PDF components
│   ├── theme.ts          # Colors, fonts, spacing
│   ├── header.tsx        # Logo, doc title, dates
│   ├── footer.tsx        # Terms, page numbers
│   ├── address-block.tsx # From/To formatting
│   ├── line-items.tsx    # Table layout
│   ├── summary.tsx       # Subtotal, tax, total
│   └── qr-code.tsx       # QR code component
├── templates/
│   ├── financial/        # Quote, Invoice, ProForma
│   ├── operational/      # DeliveryNote, PackingSlip, WorkOrder
│   └── certificates/     # Warranty, Completion
├── context.tsx           # OrgDocumentProvider
├── render.tsx            # renderPdfToBuffer
├── fonts.ts              # Font registration
├── types.ts              # Document data types
└── index.ts              # Barrel exports
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Mirror email library structure | Consistency, proven pattern |
| @react-pdf/renderer | React components, matches tech stack |
| Supabase Storage | Already integrated, org-scoped |
| Trigger.dev for generation | Background processing, retries |
| Context provider for branding | Same pattern as email templates |

### Database Schema

```sql
-- Add to orders table
ALTER TABLE orders ADD COLUMN quote_pdf_url TEXT;
ALTER TABLE orders ADD COLUMN invoice_pdf_url TEXT;

-- Add to warranties table
ALTER TABLE warranties ADD COLUMN certificate_pdf_url TEXT;

-- Generated documents audit log
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  document_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  filename TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by_id UUID REFERENCES users(id)
);

CREATE INDEX idx_generated_documents_entity
  ON generated_documents(entity_type, entity_id);
```

## Implementation Phases

### Phase 1: Foundation (INT-DOC-001-A)

**Objective:** Install library, create structure, register fonts

**Tasks:**
- [x] Install `@react-pdf/renderer` and `qrcode`
- [x] Create `src/lib/documents/` directory structure
- [x] Create `fonts.ts` with Inter font registration
- [x] Create `theme.ts` with color/spacing tokens
- [x] Create `context.tsx` with `OrgDocumentProvider`
- [x] Create `render.tsx` with `renderPdfToBuffer`
- [x] Create `types.ts` with document data interfaces
- [x] Create barrel exports in `index.ts`

**Files to create:**
- `src/lib/documents/fonts.ts`
- `src/lib/documents/components/theme.ts`
- `src/lib/documents/context.tsx`
- `src/lib/documents/render.tsx`
- `src/lib/documents/types.ts`
- `src/lib/documents/index.ts`

**Success criteria:**
- `npm run typecheck` passes
- Font registration works (no errors on import)

**Known Issues (FIXED):**
- [x] context.tsx: Type mismatches with DocumentOrganization.settings (websiteUrl, locale, currency properties)
- [x] context.tsx: formatOrgAddress uses street1/street2 but DocumentAddress has addressLine1/addressLine2
- [x] header.tsx: Needs optional chaining for organization.branding
- [x] render.tsx: React element type compatibility with @react-pdf/renderer
- [x] schemas.ts: Zod schema argument mismatch
- [x] line-items.tsx: Style array conditional null handling

### Phase 2: Shared Components

**Objective:** Build reusable PDF components

**Tasks:**
- [x] Create `header.tsx` - Logo, document title, date, number
- [x] Create `footer.tsx` - Terms text, page numbers
- [x] Create `address-block.tsx` - From/To address formatting
- [x] Create `line-items.tsx` - Table with columns
- [x] Create `summary.tsx` - Subtotal, tax, discount, total
- [x] Create `qr-code.tsx` - QR code wrapper
- [x] Create `components/index.ts` barrel export

**Files to create:**
- `src/lib/documents/components/header.tsx`
- `src/lib/documents/components/footer.tsx`
- `src/lib/documents/components/address-block.tsx`
- `src/lib/documents/components/line-items.tsx`
- `src/lib/documents/components/summary.tsx`
- `src/lib/documents/components/qr-code.tsx`
- `src/lib/documents/components/index.ts`

**Reference:** `_reference/.midday-reference/packages/invoice/src/templates/pdf/components/`

### Phase 3: Quote PDF Template (INT-DOC-002-A)

**Objective:** First complete template proving the pattern

**Tasks:**
- [x] Create `QuotePdfTemplate` component
- [x] Add `render-org.tsx` for org-aware rendering (removed - templates handle their own provider)
- [x] Implement `generate-quote-pdf.tsx` job (replace placeholder)
- [x] Add storage upload logic
- [x] Create schema migration for `orders.quote_pdf_url`
- [x] Create `generateQuotePdf` server function
- [x] All Trigger.dev jobs migrated to v3 pattern

**Files to create/modify:**
- `src/lib/documents/templates/financial/quote.tsx`
- `src/lib/documents/templates/financial/index.ts`
- `src/lib/documents/render-org.tsx`
- `src/trigger/jobs/generate-quote-pdf.ts` (UPDATE)
- `src/server/functions/documents/generate-quote.ts`
- `drizzle/schema/_documents.ts` (schema additions)

**Template structure:**
```
┌─────────────────────────────────────────┐
│ [Logo]                    QUOTE         │
│                     Quote #: Q-2024-001 │
│                     Date: 26 Jan 2026   │
│                     Valid Until: 26 Feb │
├─────────────────────────────────────────┤
│ From:              │ To:                │
│ Renoz Pty Ltd      │ John Smith         │
│ 123 Main St        │ 456 Customer Ave   │
│ Sydney NSW 2000    │ Melbourne VIC 3000 │
├─────────────────────────────────────────┤
│ Description    Qty   Unit Price   Total │
├─────────────────────────────────────────┤
│ Product A       2     $150.00   $300.00 │
│ Product B       1     $200.00   $200.00 │
│ Installation    1     $100.00   $100.00 │
├─────────────────────────────────────────┤
│                         Subtotal $600.00│
│                         GST (10%) $60.00│
│                         TOTAL   $660.00 │
├─────────────────────────────────────────┤
│ Terms: Payment due within 14 days       │
│ [QR Code]                               │
└─────────────────────────────────────────┘
```

### Phase 4: Invoice PDF Template (INT-DOC-002-B)

**Objective:** Extend quote with payment details

**Tasks:**
- [x] Create `InvoicePdfTemplate` extending quote patterns
- [x] Add payment details section
- [x] Add PAID watermark component for paid invoices
- [x] Add `generate-invoice-pdf.tsx` Trigger.dev job
- [x] Add schema for `orders.invoice_pdf_url`
- [x] Create `generateInvoicePdf` server function
- [x] All Trigger.dev jobs migrated to v3 pattern

**Files to create:**
- `src/lib/documents/templates/financial/invoice.tsx`
- `src/lib/documents/components/paid-watermark.tsx`
- `src/trigger/jobs/generate-invoice-pdf.ts`
- `src/server/functions/documents/generate-invoice.ts`

### Phase 5: Operational Documents (INT-DOC-003)

**Objective:** Delivery note and work order templates

**Tasks:**
- [x] Create `DeliveryNotePdfTemplate` (items only, no prices)
- [x] Create `WorkOrderPdfTemplate` (job details, checklist)
- [x] Add signature line component
- [x] Create Trigger.dev v3 jobs for each
- [x] Create `PackingSlipPdfTemplate` (INT-DOC-003-B)

**Files created:**
- `src/lib/documents/templates/operational/delivery-note.tsx`
- `src/lib/documents/templates/operational/work-order.tsx`
- `src/lib/documents/templates/operational/packing-slip.tsx`
- `src/lib/documents/components/signature-line.tsx`
- `src/trigger/jobs/generate-delivery-note-pdf.tsx`
- `src/trigger/jobs/generate-work-order-pdf.tsx`
- `src/trigger/jobs/generate-packing-slip-pdf.tsx`

### Phase 6: Certificate Documents (INT-DOC-004)

**Objective:** Warranty and completion certificates

**Tasks:**
- [x] Create `WarrantyCertificatePdfTemplate` (certificate style)
- [x] Create `CompletionCertificatePdfTemplate`
- [x] Add decorative border component
- [x] Schema already has `certificateUrl` column

**Files created:**
- `src/lib/documents/templates/certificates/warranty.tsx`
- `src/lib/documents/templates/certificates/completion.tsx`
- `src/lib/documents/components/certificate-border.tsx`
- `src/trigger/jobs/generate-warranty-certificate-pdf.tsx`
- `src/trigger/jobs/generate-completion-certificate-pdf.tsx`

### Phase 7: UI Integration

**Objective:** Download buttons and document history

**Tasks:**
- [x] Create `DownloadPdfButton` component
- [x] Create `DocumentHistoryList` component
- [x] Create document generation hooks
- [x] Create `document_templates` schema for customization
- [x] Create server functions for document management

**Files created:**
- `src/components/domain/documents/download-pdf-button.tsx`
- `src/components/domain/documents/document-history-list.tsx`
- `src/hooks/documents/use-generate-document.ts`
- `src/hooks/documents/use-document-history.ts`
- `drizzle/schema/document-templates.ts`
- `drizzle/schema/generated-documents.ts`
- `src/server/functions/documents/document-templates.ts`
- `src/server/functions/documents/get-generated-documents.ts`
- `src/server/functions/documents/preview-document.ts`

### Phase 8: Automatic PDF Generation (INT-DOC-007)

**Objective:** Auto-generate PDFs on order events

**Tasks:**
- [x] Trigger quote PDF on order creation
- [x] Trigger invoice PDF on order status → 'confirmed'
- [x] Trigger delivery note on order status → 'shipped'

**Files modified:**
- `src/server/functions/orders/orders.ts` - Added PDF triggers

## Acceptance Criteria

### Functional Requirements
- [ ] Quote PDF generates with organization logo and colors
- [ ] Invoice PDF includes payment details and PAID watermark option
- [ ] All PDFs upload to Supabase Storage
- [ ] URLs stored on parent entity (order, warranty, etc.)
- [ ] PDFs downloadable from entity detail pages
- [ ] Regenerate option available for each document

### Non-Functional Requirements
- [ ] PDF generation completes in < 10 seconds
- [ ] Generated PDFs are < 1MB for typical documents
- [ ] TypeScript compiles without errors
- [ ] No console errors during generation

### Quality Gates
- [ ] Unit tests for shared components
- [ ] Integration test for quote PDF generation
- [ ] Visual verification of generated PDFs

## Dependencies & Prerequisites

**Must be installed:**
```bash
npm install @react-pdf/renderer qrcode --save
npm install @types/qrcode --save-dev
```

**Existing dependencies:**
- Supabase Storage (EXISTS)
- Trigger.dev (EXISTS)
- Organization branding schema (EXISTS)

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Font loading failures | PDF generation fails | Use CDN fonts, add fallback |
| Large documents timeout | Jobs fail | Implement pagination |
| Storage upload fails | PDF lost | Retry logic, error handling |
| Currency formatting issues | Display errors | Use Midday's formatCurrencyForPDF pattern |

## References & Research

### Internal References
- Email library: `src/lib/email/` (pattern to mirror)
- Placeholder job: `src/trigger/jobs/generate-quote-pdf.ts`
- Organization branding: `drizzle/schema/settings/organizations.ts`
- PRD: `_Initiation/_prd/3-integrations/document-generation/`

### External References
- React PDF: https://react-pdf.org/
- Midday invoice: `_reference/.midday-reference/packages/invoice/`
- Font registration: https://react-pdf.org/fonts

### Related Work
- Email template library (completed)
- Resend integration (in progress)
