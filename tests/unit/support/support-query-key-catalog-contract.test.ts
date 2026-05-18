import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { supportQueryKeys } from '@/lib/query-key-catalog/support';
import { queryKeys } from '@/lib/query-keys';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('support query-key catalog contract', () => {
  it('exposes the support catalog through the public query key adapter', () => {
    expect(queryKeys.support).toBe(supportQueryKeys);
  });

  it('keeps support cache roots in the support-owned catalog', () => {
    const queryKeysSource = read('src/lib/query-keys.ts');
    const supportCatalogSource = read('src/lib/query-key-catalog/support.ts');

    expect(queryKeysSource).toContain("import { supportQueryKeys } from './query-key-catalog/support'");
    expect(queryKeysSource).toContain('support: supportQueryKeys');
    expect(queryKeysSource).not.toContain('queryKeys.support');
    expect(supportCatalogSource).toContain('export interface IssueFilters');
    expect(supportCatalogSource).toContain('export interface RmaFilters');
    expect(supportCatalogSource).toContain('export interface SlaConfigurationFilters');
    expect(supportCatalogSource).not.toContain('queryKeys.support');
  });

  it('preserves support issue, RMA, CSAT, KB, and SLA tuple shapes', () => {
    expect(queryKeys.support.issuesListFiltered({ search: 'battery' })).toEqual([
      'support',
      'issues',
      'list',
      { search: 'battery' },
    ]);
    expect(queryKeys.support.rmaDetail('rma-1')).toEqual([
      'support',
      'rmas',
      'detail',
      'rma-1',
    ]);
    expect(queryKeys.support.csatDetail('issue-1')).toEqual([
      'support',
      'csat',
      'detail',
      'issue-1',
    ]);
    expect(queryKeys.support.kbCategoryList({ includeArticleCount: true })).toEqual([
      'support',
      'kb',
      'categories',
      'list',
      { includeArticleCount: true },
    ]);
    expect(queryKeys.support.slaTrackingState('sla-1')).toEqual([
      'support',
      'sla',
      'tracking',
      'state',
      'sla-1',
    ]);
  });
});
