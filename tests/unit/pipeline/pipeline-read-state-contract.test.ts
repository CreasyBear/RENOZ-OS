import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline read state contract', () => {
  it('keeps quote version history read state behind the pipeline read formatter', () => {
    const formatter = read('src/lib/pipeline/read-error-messages.ts');
    const barrel = read('src/lib/pipeline/index.ts');
    const quoteVersionHistory = read(
      'src/components/domain/pipeline/quotes/quote-version-history.tsx'
    );

    expect(formatter).toContain('PIPELINE_READ_MESSAGES');
    expect(formatter).toContain('formatPipelineReadError');
    expect(formatter).toContain('quoteVersionHistory:');
    expect(barrel).toContain('formatPipelineReadError');
    expect(quoteVersionHistory).toContain('formatPipelineReadError');
    expect(quoteVersionHistory).toContain('PIPELINE_READ_MESSAGES.quoteVersionHistory');
    expect(quoteVersionHistory).not.toContain('Failed to load version history.');
  });
});
