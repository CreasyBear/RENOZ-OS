import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatOAuthConnectionAccountDetail,
  formatOAuthConnectionAccountLabel,
} from '@/lib/oauth/oauth-connection-display';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('oauth connection display contract', () => {
  it('labels Xero accounting connections without raw tenant identifiers', () => {
    const connection = {
      provider: 'xero' as const,
      serviceType: 'accounting' as const,
      isActive: true,
      accountLabel: 'RENOZ Energy Operations',
    };

    expect(formatOAuthConnectionAccountLabel(connection)).toBe('RENOZ Energy Operations');
    expect(formatOAuthConnectionAccountDetail(connection)).toBe(
      'Invoices, payments, and journals use this Xero accounting connection.'
    );
  });

  it('falls back to a generic connected label when no safe account label is stored', () => {
    expect(
      formatOAuthConnectionAccountLabel({
        provider: 'xero',
        serviceType: 'accounting',
        isActive: true,
      })
    ).toBe('Xero accounting organization');
  });

  it('keeps the OAuth connection list response free of raw external account identifiers', () => {
    const server = read('src/server/functions/oauth/connections.ts');
    const manager = read('src/components/integrations/oauth/oauth-connection-manager.tsx');
    const create = read('src/lib/oauth/connections.ts');

    expect(create).toContain('externalAccountLabel: normalizedExternalAccountLabel');
    expect(server).not.toMatch(/externalAccountId:\s*conn\.externalAccountId/);
    expect(server).not.toContain('externalAccountId: oauthConnections.externalAccountId');
    expect(manager).toContain('formatOAuthConnectionAccountLabel(connection)');
    expect(manager).toContain('formatOAuthConnectionAccountDetail(connection)');
    expect(manager).not.toContain('connection.externalAccountId');
    expect(manager).not.toContain('Active tenant');
    expect(manager).not.toContain('Tenant ID unavailable');
  });
});
