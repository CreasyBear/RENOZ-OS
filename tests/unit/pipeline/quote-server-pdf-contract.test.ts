import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline quote server PDF contract', () => {
  it('keeps quote PDF generation out of quote versioning and tenant scoped', () => {
    const quoteVersioning = read('src/server/functions/pipeline/quote-versions.tsx');
    const quotePdf = read('src/server/functions/pipeline/quote-pdf.tsx');
    const mutationHook = read('src/hooks/pipeline/use-quote-mutations.ts');

    expect(quoteVersioning).not.toContain('export const generateQuotePdf');
    expect(quoteVersioning).not.toContain('renderPdfToBuffer');
    expect(quoteVersioning).not.toContain('createAdminSupabase');
    expect(quoteVersioning).not.toContain('generatedDocuments');
    expect(quoteVersioning).not.toContain("import { generateQuotePdf } from './quote-pdf';");

    expect(quotePdf).toContain('export const generateQuotePdf');
    expect(quotePdf).toContain("import { NotFoundError, ServerError } from '@/lib/server/errors'");
    expect(quotePdf).toContain('renderPdfToBuffer(');
    expect(quotePdf).toContain('createAdminSupabase()');
    expect(quotePdf).toContain('.insert(generatedDocuments)');
    expect(quotePdf).toContain(
      "throw new ServerError('Unable to upload quote PDF', 500, 'QUOTE_PDF_UPLOAD_FAILED')"
    );
    expect(quotePdf).toContain('if (signedUrlError || !signedUrl)');
    expect(quotePdf).toContain("'QUOTE_PDF_URL_FAILED'");
    expect(quotePdf).toContain('storageUrl: signedUrl');
    expect(quotePdf).toContain('quotePdfUrl: signedUrl');
    expect(quotePdf).toContain('pdfUrl: signedUrl');
    expect(quotePdf).not.toContain('uploadError.message');
    expect(quotePdf).not.toContain('signedUrlError.message');
    expect(quotePdf).not.toContain('signedUrlData.signedUrl');
    expect(quotePdf).toContain('DEFAULT_QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000');
    expect(quotePdf).toContain('eq(quoteVersions.organizationId, ctx.organizationId)');
    expect(quotePdf).toContain('eq(opportunities.organizationId, ctx.organizationId)');
    expect(quotePdf).toContain('eq(customers.organizationId, ctx.organizationId)');
    expect(quotePdf).toContain('eq(addresses.organizationId, ctx.organizationId)');
    expect(quotePdf).toContain(
      '.where(and(eq(opportunities.id, opp.id), eq(opportunities.organizationId, ctx.organizationId)))'
    );

    expect(mutationHook).toContain("import { generateQuotePdf } from '@/server/functions/pipeline/quote-pdf'");
    expect(mutationHook).toContain('queryKeys.documents.all');
    expect(mutationHook).toContain('queryKeys.pipeline.quoteVersion(quoteVersionId)');
  });
});
