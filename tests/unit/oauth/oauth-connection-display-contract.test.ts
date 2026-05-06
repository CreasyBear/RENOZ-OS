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
    };

    expect(formatOAuthConnectionAccountLabel(connection)).toBe(
      'Accounting organization connected'
    );
    expect(formatOAuthConnectionAccountDetail(connection)).toBe(
      'Invoices, payments, and journals use this Xero accounting connection.'
    );
  });

  it('keeps the OAuth connection list response free of raw external account identifiers', () => {
    const server = read('src/server/functions/oauth/connections.ts');
    const manager = read('src/components/integrations/oauth/oauth-connection-manager.tsx');

    expect(server).not.toMatch(/externalAccountId:\s*conn\.externalAccountId/);
    expect(server).not.toContain('externalAccountId: oauthConnections.externalAccountId');
    expect(manager).toContain('formatOAuthConnectionAccountLabel(connection)');
    expect(manager).toContain('formatOAuthConnectionAccountDetail(connection)');
    expect(manager).not.toContain('connection.externalAccountId');
    expect(manager).not.toContain('Active tenant');
    expect(manager).not.toContain('Tenant ID unavailable');
  });
});
