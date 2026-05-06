import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline quote server import order contract', () => {
  it('keeps quote server dependencies declared before executable code', () => {
    const source = read('src/server/functions/pipeline/quote-versions.tsx');
    const firstSectionIndex = source.indexOf('// ============================================================================');

    expect(firstSectionIndex).toBeGreaterThan(0);
    expect(source.slice(firstSectionIndex)).not.toMatch(/^import\s/m);
    expect(source).toContain("import { Resend } from 'resend';");
    expect(source).toContain("import { generateQuotePdf } from './quote-pdf';");
    expect(source).toContain('emailHistory,');
    expect(source).toContain('type NewEmailHistory,');
    expect(source).not.toContain("import { createAdminSupabase } from '@/lib/supabase/server';");
    expect(source).not.toContain("import { fetchOrganizationForDocument } from '@/server/functions/documents/organization-for-pdf';");
  });
});
