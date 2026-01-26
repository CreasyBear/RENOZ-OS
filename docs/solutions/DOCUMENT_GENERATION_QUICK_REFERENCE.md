---
title: Document Generation - Quick Reference & Code Snippets
date: 2026-01-26
category: reference
tags: [pdf-generation, quick-reference, code-snippets]
---

# Document Generation - Quick Reference & Code Snippets

## TL;DR

**Missing**: PDF library - install one first
**Pattern**: Trigger.dev job (6 steps) → Supabase Storage → Database update
**Branding**: Fetch from `organizations.branding` JSONB
**Graceful Degradation**: Always allow user access, even if PDF fails

---

## Code Snippets

### 1. Fetch Organization Settings for PDF

```typescript
// For use in Trigger.dev job or server function

import { db } from '@/lib/db';
import { organizations } from 'drizzle/schema';
import { eq } from 'drizzle-orm';

async function getOrganizationForPdf(organizationId: string) {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      email: organizations.email,
      website: organizations.website,
      currency: organizations.currency,
      locale: organizations.locale,
      branding: organizations.branding,
      address: organizations.address,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  if (!org) throw new Error(`Organization ${organizationId} not found`);

  return {
    ...org,
    branding: org.branding || {},
    // Fallback for missing branding data
    logo: org.branding?.logoUrl,
    primaryColor: org.branding?.primaryColor || '#0066cc',
    secondaryColor: org.branding?.secondaryColor || '#666666',
  };
}
```

### 2. Trigger.dev Job Template

```typescript
// src/trigger/jobs/generate-document.ts

import { eventTrigger } from '@trigger.dev/sdk';
import { client } from '../client';

export const generateDocumentJob = client.defineJob({
  id: 'generate-document',
  name: 'Generate Document',
  version: '1.0.0',
  trigger: eventTrigger({
    name: 'document.create.requested',  // Custom event
  }),
  run: async (payload: { documentId: string; organizationId: string }, io) => {
    await io.logger.info('Starting document generation', {
      documentId: payload.documentId,
      organizationId: payload.organizationId,
    });

    // Step 1: Fetch document data
    const docData = await io.runTask('fetch-document', async () => {
      // Your fetch logic
      return { /* document data */ };
    });

    // Step 2: Fetch org settings
    const orgSettings = await io.runTask('fetch-org', async () => {
      return await getOrganizationForPdf(payload.organizationId);
    });

    // Step 3: Generate PDF
    const pdfBuffer = await io.runTask('generate-pdf', async () => {
      return await generatePdfWithTemplate(docData, orgSettings);
    });

    // Step 4: Upload to storage
    const uploadResult = await io.runTask('upload-storage', async () => {
      const filename = `${payload.documentId}_${Date.now()}.pdf`;
      const path = `documents/${payload.organizationId}/generated/${filename}`;

      // Upload to Supabase
      const { data, error } = await supabaseClient.storage
        .from('documents')
        .upload(path, pdfBuffer);

      if (error) throw error;

      return {
        path,
        filename,
        url: supabaseClient.storage.from('documents').getPublicUrl(path).data.publicUrl,
      };
    });

    // Step 5: Update database
    await io.runTask('update-db', async () => {
      await db.update(/* table */).set({
        pdfUrl: uploadResult.url,
        pdfPath: uploadResult.path,
        pdfStatus: 'completed',
        generatedAt: new Date(),
      }).where(eq(/* id */, payload.documentId));
    });

    return {
      success: true,
      documentId: payload.documentId,
      pdfUrl: uploadResult.url,
      generatedAt: new Date().toISOString(),
    };
  },
});
```

### 3. Server Function to Trigger PDF Generation

```typescript
// src/server/functions/documents/generate-pdf.ts

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { withAuth } from '@/lib/server/protected';
import { client } from '@/trigger/client';

const generatePdfSchema = z.object({
  documentId: z.string().uuid(),
});

export const requestPdfGeneration = createServerFn({ method: 'POST' })
  .inputValidator(generatePdfSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Trigger async job
    await client.trigger({
      id: 'generate-document',
      payload: {
        documentId: data.documentId,
        organizationId: ctx.organizationId,
      },
    });

    // Return immediately with tracking info
    return {
      success: true,
      documentId: data.documentId,
      status: 'queued',
      checkStatusUrl: `/api/documents/${data.documentId}/status`,
    };
  });
```

### 4. Template Substitution Helper

```typescript
// lib/server/template-utils.ts

export interface TemplateVariables {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Substitute template variables in format {{variable}}
 * Supports nested objects via dot notation: {{customer.name}}
 */
export function substituteTemplateVariables(
  template: string,
  variables: Record<string, any>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    // Support dot notation for nested objects
    const value = key.split('.').reduce((obj, k) => obj?.[k], variables);

    // Handle null/undefined
    if (value === null || value === undefined) {
      console.warn(`Template variable not found: ${key}`);
      return match;  // Keep original {{variable}}
    }

    return String(value);
  });
}

/**
 * Get sample data for template preview
 */
export function getSampleTemplateData(templateType: string) {
  const samples: Record<string, Record<string, any>> = {
    quote: {
      customer: {
        name: 'John Smith',
        email: 'john@example.com',
        phone: '0412 345 678',
      },
      quote: {
        number: 'Q-2026-001',
        date: new Date().toLocaleDateString('en-AU'),
        amount: '5,280.00',
      },
      company: {
        name: 'Renoz',
        abn: '12 345 678 901',
        website: 'renoz.com.au',
      },
    },
    invoice: {
      invoice: {
        number: 'INV-2026-001',
        date: new Date().toLocaleDateString('en-AU'),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU'),
        amount: '12,500.00',
      },
      customer: {
        name: 'John Smith',
        email: 'john@example.com',
      },
    },
  };

  return samples[templateType] || {};
}
```

### 5. Graceful Degradation Error Handler

```typescript
// Handle PDF generation failure gracefully

try {
  const pdfBuffer = await generatePdf(order);
  const uploadResult = await uploadToStorage(pdfBuffer);

  await db.update(orders).set({
    pdf_url: uploadResult.url,
    pdf_status: 'completed',
    pdf_error: null,
  }).where(eq(orders.id, order.id));

} catch (error) {
  // Log the error for debugging
  console.error(`PDF generation failed for order ${order.id}:`, error);

  // Mark as failed but don't lose the order
  await db.update(orders).set({
    pdf_status: 'failed',
    pdf_error: error instanceof Error ? error.message : 'Unknown error',
    pdf_attempted_at: new Date(),
  }).where(eq(orders.id, order.id));

  // In UI: Show "PDF generation failed" but order remains accessible
  // Provide retry button for user
}
```

### 6. Email Template with React Email

```typescript
// components/emails/quote-email.tsx

import {
  Html,
  Body,
  Container,
  Text,
  Heading,
  Button,
  Img,
  Hr,
} from '@react-email/components';

interface QuoteEmailProps {
  customerName: string;
  quoteNumber: string;
  quoteAmount: string;
  companyLogo?: string;
  companyName: string;
  downloadUrl: string;
}

export function QuoteEmail({
  customerName,
  quoteNumber,
  quoteAmount,
  companyLogo,
  companyName,
  downloadUrl,
}: QuoteEmailProps) {
  return (
    <Html>
      <Body style={{ fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>

          {/* Header with Logo */}
          {companyLogo && (
            <Img
              src={companyLogo}
              alt={companyName}
              style={{ height: '60px', marginBottom: '20px' }}
            />
          )}

          {/* Greeting */}
          <Heading as="h1">Hi {customerName},</Heading>

          {/* Content */}
          <Text>
            Your quote {quoteNumber} is ready for review.
          </Text>

          <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>
            {quoteAmount}
          </Text>

          <Hr />

          {/* CTA */}
          <Button
            href={downloadUrl}
            style={{
              backgroundColor: '#0066cc',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Download Quote
          </Button>

          {/* Footer */}
          <Hr />
          <Text style={{ fontSize: '12px', color: '#666666' }}>
            {companyName} | {new Date().getFullYear()}
          </Text>

        </Container>
      </Body>
    </Html>
  );
}
```

### 7. Storage Path Structure

```typescript
// Recommended Supabase Storage organization

/**
 * Storage structure:
 *
 * documents/
 * ├── {organizationId}/
 * │   ├── quotes/
 * │   │   ├── quote_uuid_timestamp_random.pdf
 * │   ├── invoices/
 * │   │   ├── invoice_uuid_timestamp_random.pdf
 * │   ├── exports/
 * │   │   ├── export_uuid_timestamp.csv
 * │   │   ├── export_uuid_timestamp.json
 * │   ├── generated/
 * │   │   ├── generic_doc_uuid_timestamp_random.pdf
 * │   └── cache/
 * │       ├── preview_uuid.pdf  (Cleanup after 24 hours)
 */

// Helper to build consistent paths
export function buildDocumentPath(
  organizationId: string,
  type: 'quotes' | 'invoices' | 'exports' | 'generated' | 'cache',
  filename: string
): string {
  return `documents/${organizationId}/${type}/${filename}`;
}

// Generate timestamped filename
export function generateDocumentFilename(
  prefix: string,
  ext: string = 'pdf'
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}.${ext}`;
}
```

---

## Database Schema Additions

### Document Tracking Table

```typescript
// drizzle/schema/documents.ts

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

export const generatedDocuments = pgTable(
  'generated_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    relatedEntityId: uuid('related_entity_id'),  // Order ID, Quote ID, etc.
    relatedEntityType: text('related_entity_type'),  // 'order', 'quote', etc.

    // Document info
    type: text('type').notNull(),  // 'quote', 'invoice', 'receipt'
    title: text('title'),

    // Status & URLs
    pdfUrl: text('pdf_url'),
    pdfPath: text('pdf_path'),
    pdfStatus: text('pdf_status').default('pending'),  // pending, completed, failed
    pdfError: text('pdf_error'),  // Error message if failed

    // Tracking
    generatedBy: uuid('generated_by'),  // User ID
    generatedAt: timestamp('generated_at'),
    attemptCount: int('attempt_count').default(0),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    expiresAt: timestamp('expires_at'),  // For cache cleanup
  },
  (table) => ({
    orgIdx: index().on(table.organizationId),
    entityIdx: index().on(table.relatedEntityId),
    statusIdx: index().on(table.pdfStatus),
  })
);
```

---

## Constants to Define

```typescript
// lib/constants/documents.ts

export const DOCUMENT_CONFIG = {
  // PDF generation
  PDF_TIMEOUT_MS: 30_000,  // 30 seconds
  MAX_PDF_SIZE_MB: 10,

  // Storage
  MAX_STORAGE_SIZE_MB: 100,  // Per document
  STORAGE_BUCKET: 'documents',

  // Exports
  MAX_CONCURRENT_EXPORTS: 5,
  EXPORT_EXPIRATION_DAYS: 7,
  MAX_EXPORT_ROWS: 100_000,

  // Cleanup
  CACHE_CLEANUP_INTERVAL_HOURS: 24,

  // Supported formats
  EXPORT_FORMATS: ['csv', 'json', 'xlsx'] as const,
  DOCUMENT_TYPES: ['quote', 'invoice', 'receipt', 'estimate'] as const,
};

// File naming
export const FILENAME_PATTERNS = {
  quote: 'quote',
  invoice: 'invoice',
  receipt: 'receipt',
  export: 'export',
};
```

---

## Environment Variables

```env
# .env.local

# Supabase Storage
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key

# Trigger.dev
TRIGGER_API_KEY=your-trigger-key
TRIGGER_API_URL=https://api.trigger.dev

# PDF Generation (if using external service)
PDF_SERVICE_API_KEY=optional

# Email (Resend)
RESEND_API_KEY=your-resend-key
```

---

## Testing Patterns

```typescript
// tests/documents.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { substituteTemplateVariables } from '@/lib/server/template-utils';

describe('Document Generation', () => {
  describe('Template Variable Substitution', () => {
    it('replaces simple variables', () => {
      const template = 'Hello {{name}}, your quote is {{amount}}';
      const variables = { name: 'John', amount: '1,000' };

      expect(substituteTemplateVariables(template, variables))
        .toBe('Hello John, your quote is 1,000');
    });

    it('handles nested variables with dot notation', () => {
      const template = 'Contact {{customer.email}}';
      const variables = { customer: { email: 'john@example.com' } };

      expect(substituteTemplateVariables(template, variables))
        .toBe('Contact john@example.com');
    });

    it('preserves unmatched variables', () => {
      const template = 'Hello {{name}}, {{missing}}';
      const variables = { name: 'John' };

      const result = substituteTemplateVariables(template, variables);
      expect(result).toContain('Hello John');
      expect(result).toContain('{{missing}}');  // Preserved
    });
  });

  describe('Document Status Flow', () => {
    it('should transition from pending to completed', async () => {
      // Test graceful degradation
      // 1. Create document with status: pending
      // 2. Simulate PDF generation
      // 3. Verify status updates to completed
      // 4. Verify error message is null
    });

    it('should handle PDF generation failure', async () => {
      // Test failure path
      // 1. Trigger PDF generation with invalid data
      // 2. Verify status becomes failed
      // 3. Verify error message is populated
      // 4. Verify order remains accessible
    });
  });
});
```

---

## Debugging Tips

### Check Storage Path

```typescript
// Verify file was uploaded to correct location
const { data: files } = await supabaseClient.storage
  .from('documents')
  .list(`documents/${organizationId}/quotes/`, {
    limit: 10,
    sortBy: { column: 'created_at', order: 'desc' },
  });

console.log('Stored files:', files);
```

### Check Job Status

```typescript
// Monitor Trigger.dev job in dashboard
// Trigger.dev console shows:
// - Job ID
// - Status (queued, running, completed, failed)
// - Logs from each runTask step
// - Execution time
```

### Check Database State

```typescript
// Verify document record was created
const doc = await db.select().from(generatedDocuments)
  .where(eq(generatedDocuments.id, documentId))
  .then(rows => rows[0]);

console.log({
  id: doc.id,
  status: doc.pdfStatus,
  url: doc.pdfUrl,
  error: doc.pdfError,
  createdAt: doc.createdAt,
});
```

---

## PDF Library Comparison

| Library | Pros | Cons | Best For |
|---------|------|------|----------|
| `@react-pdf/renderer` | React-native, styled-components, no server | Limited layout control | React components, simple layouts |
| `puppeteer` | HTML/CSS support, full control | Headless browser overhead, memory | Complex layouts, screenshots |
| `pdf-lib` | Lightweight, pure JS | Manual positioning, low-level | Programmatic PDF creation, forms |
| `html-to-pdf` | HTML conversion | Less mature ecosystem | HTML templates |

**Recommendation**: Start with `@react-pdf/renderer` to match your email component patterns.

