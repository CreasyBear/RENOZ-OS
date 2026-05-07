import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('serial availability location scope contract', () => {
  it('keeps serial picker location labels inside the organization boundary', () => {
    const source = read('src/server/functions/inventory/serial-availability.ts');
    const compactSource = compact(source);

    expect(compactSource).toContain('functionserialLocationJoinCondition(organizationId:string)');
    expect(compactSource).toContain(
      'eq(inventory.locationId,locations.id),eq(locations.organizationId,organizationId)'
    );
    expect(compactSource).toContain(
      'leftJoin(locations,serialLocationJoinCondition(ctx.organizationId))'
    );
    expect(compactSource).not.toContain(
      'leftJoin(locations,eq(inventory.locationId,locations.id))'
    );
  });
});
