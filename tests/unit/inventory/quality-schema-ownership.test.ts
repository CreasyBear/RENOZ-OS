import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createQualityInspectionSchema,
  listQualityInspectionsSchema,
  qualityInspectionResultValues,
} from '@/lib/schemas/inventory';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('inventory quality schema ownership', () => {
  it('keeps quality inspection schemas owned by the quality schema file', () => {
    const qualitySchema = read('src/lib/schemas/inventory/quality.ts');
    const inventorySchema = read('src/lib/schemas/inventory/inventory.ts');
    const qualityServer = read('src/server/functions/inventory/quality.ts');

    expect(qualitySchema).toContain('export const listQualityInspectionsSchema');
    expect(qualitySchema).toContain('export const createQualityInspectionSchema');
    expect(qualitySchema).toContain('export interface QualityRecord');
    expect(inventorySchema).not.toContain('export interface QualityRecord');
    expect(qualityServer).toContain('listQualityInspectionsSchema');
    expect(qualityServer).toContain('createQualityInspectionSchema');
    expect(qualityServer).not.toContain('const listQualityInspectionsSchema');
    expect(qualityServer).not.toContain('const createQualityInspectionSchema');
  });

  it('preserves the public inventory schema barrel for quality callers', () => {
    expect(qualityInspectionResultValues).toEqual(['pass', 'fail', 'conditional']);
    expect(
      listQualityInspectionsSchema.parse({
        inventoryId: '00000000-0000-4000-8000-000000000001',
      })
    ).toMatchObject({
      inventoryId: '00000000-0000-4000-8000-000000000001',
      page: 1,
      pageSize: 50,
    });
    expect(
      createQualityInspectionSchema.parse({
        inventoryId: '00000000-0000-4000-8000-000000000001',
        productId: '00000000-0000-4000-8000-000000000002',
        inspectorName: 'Alex Inspector',
        result: 'conditional',
        defects: ['terminal mark'],
      })
    ).toMatchObject({
      inspectorName: 'Alex Inspector',
      result: 'conditional',
      defects: ['terminal mark'],
    });
  });
});
