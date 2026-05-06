import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatXeroTenantDisplayName,
  formatXeroTenantType,
} from '@/lib/oauth/xero-tenant-display';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('xero tenant display contract', () => {
  it('uses Xero organization names when the OAuth connection response provides them', () => {
    const label = formatXeroTenantDisplayName(
      {
        tenantId: 'tenant-secret-1',
        tenantName: 'RENOZ Energy Operations',
        tenantType: 'ORGANISATION',
      },
      0
    );

    expect(label).toBe('RENOZ Energy Operations');
    expect(label).not.toContain('tenant-secret-1');
    expect(formatXeroTenantType({ tenantId: 'tenant-secret-1', tenantType: 'ORGANISATION' })).toBe(
      'Xero organization'
    );
  });

  it('falls back to a numbered organization label instead of raw tenant IDs', () => {
    const label = formatXeroTenantDisplayName(
      {
        tenantId: 'tenant-secret-2',
        tenantName: '   ',
        tenantType: 'ORGANISATION',
      },
      1
    );

    expect(label).toBe('Xero organization 2');
    expect(label).not.toContain('tenant-secret-2');
  });

  it('keeps tenant IDs as submitted values, not visible card labels', () => {
    const component = read('src/components/integrations/oauth/oauth-connection-manager.tsx');
    const flow = read('src/lib/oauth/flow.ts');
    const schema = read('src/lib/schemas/oauth/connection.ts');

    expect(flow).toContain('tenantName: connection.tenantName?.trim() || undefined');
    expect(schema).toContain('tenantName?: string');
    expect(component).toContain('formatXeroTenantDisplayName(tenant, index)');
    expect(component).toContain('tenantId: tenant.tenantId');
    expect(component).not.toContain('<div className="font-medium">{tenant.tenantId}</div>');
    expect(component).not.toContain('Select Xero Tenant');
    expect(component).not.toContain('Connect tenant');
    expect(component).not.toContain('Loading Xero tenants');
    expect(component).not.toContain('No selectable Xero tenants');
  });
});
