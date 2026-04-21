import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const trackerPath = path.resolve('docs/reference/query-normalization-tracker.md');
const closeoutMemoPath = path.resolve('docs/reference/query-normalization-closeout.md');
const baselinePath = path.resolve('docs/reliability/baselines/read-path-query-guards.txt');
const guardScriptPath = path.resolve('scripts/check-read-path-query-guards.mjs');

const simplifiedFiles = [
  'src/hooks/inventory/use-wms-dashboard.ts',
  'src/hooks/inventory/use-valuation.ts',
  'src/hooks/inventory/use-inventory.ts',
  'src/hooks/suppliers/use-suppliers.ts',
  'src/hooks/suppliers/use-purchase-orders.ts',
  'src/components/domain/dashboard/overview/overview-container.tsx',
].map((relativePath) => path.resolve(relativePath));

describe('query normalization closeout', () => {
  it('records the closeout note and memo explicitly', () => {
    const trackerSource = readFileSync(trackerPath, 'utf8');
    const closeoutSource = readFileSync(closeoutMemoPath, 'utf8');

    expect(trackerSource).toContain('## Program Closeout');
    expect(trackerSource).toContain('Closeout memo and disposition map');
    expect(closeoutSource).toContain('## What I Liked');
    expect(closeoutSource).toContain('## What I Did Not Like');
    expect(closeoutSource).toContain('## Cleanup Applied');
  });

  it('keeps the read-path guard baseline empty after reconciliation', () => {
    const baselineSource = readFileSync(baselinePath, 'utf8').trim();
    expect(baselineSource).toBe('');
  });

  it('uses the shared resolveReadResult bridge in the simplified residual files', () => {
    for (const filePath of simplifiedFiles) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('resolveReadResult(');
    }
  });

  it('documents queryFn-body guard coverage in the script itself', () => {
    const guardSource = readFileSync(guardScriptPath, 'utf8');

    expect(guardSource).toContain('queryFnStartPattern');
    expect(guardSource).toContain('fileHasRawReadPathSentinel');
    expect(guardSource).toContain('rawNullSentinelPattern');
  });
});
