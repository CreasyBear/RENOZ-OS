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

describe('document preview contract', () => {
  it('scopes real-order preview line item reads by tenant', () => {
    const source = compact(read('src/server/functions/documents/preview-document.tsx'));

    expect(source).toContain(
      '.where(and(eq(orderLineItems.orderId,entityId),eq(orderLineItems.organizationId,ctx.organizationId)))'
    );
    expect(source).not.toContain('.where(eq(orderLineItems.orderId,entityId))');
  });

  it('uses RENOZ battery OEM sample data instead of renovation placeholders', () => {
    const source = read('src/server/functions/documents/preview-document.tsx');

    expect(source).toContain("name: 'RENOZ Energy'");
    expect(source).toContain('RENOZ 5.12 kWh LiFePO4 Battery Module');
    expect(source).toContain('RZB-5120-2026-000123');
    expect(source).toContain('Battery Bank Commissioning Support');
    expect(source).not.toContain('Acme Renovations');
    expect(source).not.toContain('Kitchen Cabinet Installation');
    expect(source).not.toContain('Kitchen Renovation');
    expect(source).not.toContain('Premium Kitchen Cabinets');
  });
});
