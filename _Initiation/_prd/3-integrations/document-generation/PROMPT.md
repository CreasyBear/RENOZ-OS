# Document Generation System - Implementation Guide

## Overview

This PRD covers PDF generation for business documents using `@react-pdf/renderer`. The architecture mirrors our email template library with shared components and domain-specific templates.

## Reference Implementation

**Primary Reference:** `_reference/.midday-reference/packages/invoice/`

Midday's invoice package demonstrates:
- Font registration for custom fonts
- Component composition (Meta, LineItems, Summary, etc.)
- Template data types
- QR code generation
- PDF rendering patterns

## Directory Structure

```
src/lib/documents/
├── components/          # Shared PDF components
│   ├── theme.ts         # Colors, fonts, spacing tokens
│   ├── header.tsx       # Document header with logo
│   ├── footer.tsx       # Footer with terms, page numbers
│   ├── address-block.tsx # From/To address formatting
│   ├── line-items.tsx   # Table for line items
│   ├── summary.tsx      # Subtotal, tax, discount, total
│   ├── signature.tsx    # Signature capture area
│   ├── qr-code.tsx      # QR code for verification/payment
│   └── index.ts         # Barrel export
├── templates/           # Domain-specific templates
│   ├── financial/       # Quote, Invoice, Pro Forma
│   │   ├── quote.tsx
│   │   ├── invoice.tsx
│   │   ├── pro-forma.tsx
│   │   └── index.ts
│   ├── operational/     # Delivery Note, Packing Slip, Work Order
│   │   ├── delivery-note.tsx
│   │   ├── packing-slip.tsx
│   │   ├── work-order.tsx
│   │   └── index.ts
│   └── certificates/    # Warranty, Completion
│       ├── warranty.tsx
│       ├── completion.tsx
│       └── index.ts
├── types.ts             # Document data types
├── render.ts            # PDF rendering utilities
├── fonts.ts             # Font registration
└── index.ts             # Main exports
```

## Implementation Patterns

### Font Registration

```typescript
// src/lib/documents/fonts.ts
import { Font } from "@react-pdf/renderer";

export function registerFonts() {
  Font.register({
    family: "Inter",
    fonts: [
      { src: "https://fonts.gstatic.com/s/inter/v12/...", fontWeight: 400 },
      { src: "https://fonts.gstatic.com/s/inter/v12/...", fontWeight: 500 },
      { src: "https://fonts.gstatic.com/s/inter/v12/...", fontWeight: 600 },
      { src: "https://fonts.gstatic.com/s/inter/v12/...", fontWeight: 700 },
    ],
  });
}
```

### Theme Tokens

```typescript
// src/lib/documents/components/theme.ts
export const documentTheme = {
  colors: {
    primary: "#0f172a",
    secondary: "#64748b",
    border: "#e2e8f0",
    background: "#ffffff",
    muted: "#94a3b8",
  },
  fonts: {
    body: "Inter",
    heading: "Inter",
  },
  spacing: {
    page: 20,
    section: 16,
    element: 8,
  },
  fontSize: {
    xs: 8,
    sm: 9,
    base: 10,
    lg: 12,
    xl: 14,
    "2xl": 18,
  },
};
```

### Template Component Pattern

```typescript
// src/lib/documents/templates/financial/quote.tsx
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { Header } from "../../components/header";
import { Footer } from "../../components/footer";
import { AddressBlock } from "../../components/address-block";
import { LineItems } from "../../components/line-items";
import { Summary } from "../../components/summary";
import { documentTheme } from "../../components/theme";
import type { QuoteData } from "../../types";

export function QuotePdfTemplate({ data }: { data: QuoteData }) {
  const { theme } = documentTheme;

  return (
    <Document>
      <Page size="A4" style={{ padding: theme.spacing.page }}>
        <Header
          title="Quote"
          number={data.quoteNumber}
          date={data.issueDate}
          logo={data.organization.logoUrl}
        />

        <View style={{ flexDirection: "row", marginTop: 20 }}>
          <AddressBlock label="From" address={data.fromAddress} />
          <AddressBlock label="To" address={data.customerAddress} />
        </View>

        <LineItems items={data.lineItems} currency={data.currency} />

        <Summary
          subtotal={data.subtotal}
          tax={data.tax}
          discount={data.discount}
          total={data.total}
          currency={data.currency}
        />

        <Footer terms={data.terms} />
      </Page>
    </Document>
  );
}
```

### PDF Rendering Utility

```typescript
// src/lib/documents/render.ts
import { renderToBuffer } from "@react-pdf/renderer";
import { registerFonts } from "./fonts";

// Register fonts once on module load
registerFonts();

export async function renderPdfToBuffer(
  template: React.ReactElement
): Promise<Buffer> {
  return await renderToBuffer(template);
}

export async function renderPdfToBase64(
  template: React.ReactElement
): Promise<string> {
  const buffer = await renderToBuffer(template);
  return buffer.toString("base64");
}
```

### Server Function Pattern

```typescript
// src/server/functions/documents/generate-quote.ts
import { createServerFn } from "@tanstack/react-start";
import { withAuth } from "@/lib/server/protected";
import { QuotePdfTemplate } from "@/lib/documents/templates/financial/quote";
import { renderPdfToBuffer } from "@/lib/documents/render";
import { uploadFile } from "@/lib/storage";
import { db } from "@/lib/db";
import { orders, generatedDocuments } from "drizzle/schema";
import { eq } from "drizzle-orm";

export const generateQuotePdf = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.order.read });

    // Fetch order with line items and customer
    const order = await getOrderWithDetails(data.orderId, ctx.organizationId);

    // Fetch organization for branding
    const org = await getOrganization(ctx.organizationId);

    // Prepare template data
    const templateData = mapOrderToQuoteData(order, org);

    // Render PDF
    const pdfBuffer = await renderPdfToBuffer(
      <QuotePdfTemplate data={templateData} />
    );

    // Upload to storage
    const filename = `quote-${order.orderNumber}.pdf`;
    const storagePath = `documents/quotes/${ctx.organizationId}/${filename}`;
    const { url } = await uploadFile(pdfBuffer, storagePath, "application/pdf");

    // Update order with PDF URL
    await db
      .update(orders)
      .set({ quotePdfUrl: url })
      .where(eq(orders.id, data.orderId));

    // Log generated document
    await db.insert(generatedDocuments).values({
      organizationId: ctx.organizationId,
      documentType: "quote",
      entityType: "order",
      entityId: data.orderId,
      filename,
      storageUrl: url,
      fileSize: pdfBuffer.length,
      generatedById: ctx.userId,
    });

    return { url, filename };
  });
```

### Trigger.dev Job Pattern

```typescript
// src/trigger/jobs/generate-quote-pdf.ts
import { eventTrigger } from "@trigger.dev/sdk";
import { client, orderEvents } from "../client";
import { generateQuotePdf } from "@/server/functions/documents/generate-quote";

export const generateQuotePdfJob = client.defineJob({
  id: "generate-quote-pdf",
  name: "Generate Quote PDF",
  version: "2.0.0",
  trigger: eventTrigger({ name: orderEvents.created }),
  run: async (payload, io) => {
    const { orderId, orderNumber } = payload;

    await io.logger.info(`Generating quote PDF for ${orderNumber}`);

    const result = await io.runTask("generate-pdf", async () => {
      return await generateQuotePdf({ data: { orderId } });
    });

    await io.logger.info(`Quote PDF generated: ${result.url}`);

    return result;
  },
});
```

## Document Types Summary

| Type | Domain | Trigger Event | Storage Path |
|------|--------|---------------|--------------|
| Quote | Financial | order.created | documents/quotes/{orgId}/ |
| Invoice | Financial | order.invoiced | documents/invoices/{orgId}/ |
| Pro Forma | Financial | Manual | documents/invoices/{orgId}/ |
| Delivery Note | Operational | order.shipped | documents/delivery-notes/{orgId}/ |
| Packing Slip | Operational | order.fulfilling | documents/packing-slips/{orgId}/ |
| Work Order | Operational | job.scheduled | documents/work-orders/{orgId}/ |
| Warranty Cert | Certificate | warranty.created | documents/certificates/{orgId}/ |
| Completion Cert | Certificate | job.completed | documents/certificates/{orgId}/ |

## Schema Additions

### document_templates

```sql
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  document_type TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0f172a',
  secondary_color TEXT DEFAULT '#64748b',
  font_family TEXT DEFAULT 'Inter',
  paper_size TEXT DEFAULT 'A4',
  include_qr BOOLEAN DEFAULT false,
  footer_text TEXT,
  terms_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, document_type)
);
```

### generated_documents

```sql
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

CREATE INDEX idx_generated_documents_entity ON generated_documents(entity_type, entity_id);
```

## Testing Strategy

1. **Unit Tests**: Test individual components render without errors
2. **Snapshot Tests**: Visual regression for template output
3. **Integration Tests**: Full flow from order to PDF URL
4. **Manual Testing**: Visual inspection of generated PDFs

## Dependencies to Install

```bash
npm install @react-pdf/renderer qrcode --save
npm install @types/qrcode --save-dev
```

## Key Differences from Email Templates

| Aspect | Email Templates | PDF Templates |
|--------|-----------------|---------------|
| Renderer | @react-email/render | @react-pdf/renderer |
| Components | HTML-like (Section, Text) | PDF-specific (Document, Page, View) |
| Styling | CSS-in-JS objects | StyleSheet.create |
| Output | HTML string | Buffer/Stream |
| Fonts | Web fonts via CSS | Must be registered |
| Images | URL references | Must be fetched/embedded |

## Implementation Order

1. **INT-DOC-001-A**: Foundation - Install library, create structure, schema
2. **INT-DOC-002-A**: Quote PDF - First real template, proves the pattern
3. **INT-DOC-002-B**: Invoice PDF - Extends quote, adds payment details
4. **INT-DOC-003-A**: Delivery Note - Operational template
5. **INT-DOC-003-C**: Work Order - Job domain template
6. **INT-DOC-004-A**: Warranty Certificate - Certificate style
7. **Remaining stories**: In priority order
