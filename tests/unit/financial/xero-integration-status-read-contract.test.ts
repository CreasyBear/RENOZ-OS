import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildXeroIntegrationStatus } from '@/server/functions/financial/_shared/xero-integration-status-read';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('xero integration status read contract', () => {
  it('returns connected status without raw connection or tenant identifiers', () => {
    const result = buildXeroIntegrationStatus(
      {
        available: true,
        connectionId: 'connection-secret-1',
        message: 'Connected to tenant tenant-secret-1',
      },
      { isActive: true, hasTenant: true }
    );

    expect(result).toEqual({
      available: true,
      provider: 'xero',
      isActive: true,
      status: 'connected',
      message: 'Xero accounting connection is active.',
      nextAction: null,
      nextActionLabel: null,
    });
    expect(JSON.stringify(result)).not.toContain('connection-secret-1');
    expect(JSON.stringify(result)).not.toContain('tenant-secret-1');
  });

  it('returns reconnect guidance without echoing provider readiness text', () => {
    const result = buildXeroIntegrationStatus(
      {
        available: false,
        message: 'refresh_token failed for tenant-secret-2 in provider stack',
      },
      { isActive: false, hasTenant: true }
    );

    expect(result).toEqual({
      available: false,
      provider: 'xero',
      isActive: false,
      status: 'reconnect_required',
      message: 'Xero accounting connection needs to be reconnected before invoices and journals can sync.',
      nextAction: 'reconnect_xero',
      nextActionLabel: 'Reconnect Xero',
    });
    expect(JSON.stringify(result)).not.toContain('refresh_token');
    expect(JSON.stringify(result)).not.toContain('tenant-secret-2');
    expect(JSON.stringify(result)).not.toContain('provider stack');
  });

  it('reports incomplete tenant selection without returning the stored tenant value', () => {
    const result = buildXeroIntegrationStatus(
      {
        available: true,
        connectionId: 'connection-secret-3',
      },
      { isActive: true, hasTenant: false }
    );

    expect(result).toEqual({
      available: false,
      provider: 'xero',
      isActive: true,
      status: 'configuration_unavailable',
      message: 'Xero accounting organization selection is incomplete. Reconnect Xero before syncing.',
      nextAction: 'reconnect_xero',
      nextActionLabel: 'Reconnect Xero',
    });
    expect(JSON.stringify(result)).not.toContain('connection-secret-3');
  });

  it('classifies setup and connection gaps with operator-owned copy', () => {
    expect(
      buildXeroIntegrationStatus({
        available: false,
        message: 'Xero OAuth is not configured for this environment.',
      })
    ).toMatchObject({
      status: 'configuration_unavailable',
      message: 'Xero setup is incomplete. Review integration settings before syncing.',
      nextAction: 'open_org_settings',
      nextActionLabel: 'Review Settings',
    });

    expect(
      buildXeroIntegrationStatus({
        available: false,
        message: 'No active Xero accounting connection is configured for this organization.',
      })
    ).toMatchObject({
      status: 'not_connected',
      message: 'Connect Xero before syncing invoices and journals.',
      nextAction: 'connect_xero',
      nextActionLabel: 'Connect Xero',
    });
  });

  it('keeps the integration status server read and UI free of raw tenant display fields', () => {
    const operations = read('src/server/functions/financial/xero-operations.ts');
    const statusUi = read('src/components/domain/financial/xero-sync-status.tsx');
    const schema = read('src/lib/schemas/settings/xero-sync.ts');

    expect(operations).toContain('buildXeroIntegrationStatus(readiness, connection)');
    expect(operations).not.toContain('externalAccountId: oauthConnections.externalAccountId');
    expect(operations).not.toContain('tenantLabel');
    expect(operations).not.toContain('tenantId: connection');
    expect(statusUi).not.toContain('Active tenant:');
    expect(schema).not.toContain('tenantLabel?:');
    expect(schema).not.toContain('tenantId?:');
  });
});
