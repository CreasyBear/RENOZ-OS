import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatOAuthConnectionError,
  isUnsafeOAuthConnectionMessage,
  toOAuthConnectionErrorCode,
} from '@/lib/oauth/oauth-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('oauth integration feedback', () => {
  it('keeps safe integration guidance and suppresses provider internals', () => {
    expect(toOAuthConnectionErrorCode('INVALID_STATE')).toBe('invalid_state');
    expect(toOAuthConnectionErrorCode('TENANT_SELECTION_REQUIRED')).toBe(
      'tenant_selection_required'
    );

    expect(formatOAuthConnectionError('access_denied', 'callback')).toBe(
      'Connection was cancelled or denied. Please try again when ready.'
    );
    expect(formatOAuthConnectionError('Invalid or expired OAuth state', 'callback')).toBe(
      'This connection session is invalid or expired. Please reconnect and try again.'
    );
    expect(formatOAuthConnectionError('rate limit exceeded', 'initiate')).toBe(
      'Too many connection attempts. Please wait before trying again.'
    );
    expect(formatOAuthConnectionError('No selectable Xero tenants found', 'completeTenantSelection')).toBe(
      'No selectable Xero organizations were found for this login.'
    );

    expect(
      formatOAuthConnectionError(
        'duplicate key violates oauth_connections access_token constraint',
        'completeTenantSelection'
      )
    ).toBe('Xero tenant connection is temporarily unavailable. Please try again.');
    expect(isUnsafeOAuthConnectionMessage('PKCE code verifier with client_secret leaked')).toBe(true);
  });

  it('keeps oauth callback and tenant selection surfaces behind oauth-owned formatter copy', () => {
    const callbackRoute = read('src/routes/api/oauth/callback.ts');
    const pendingRoute = read('src/routes/api/oauth/pending-selection.ts');
    const sidebar = read('src/components/layout/sidebar.tsx');
    const manager = read('src/components/integrations/oauth/oauth-connection-manager.tsx');

    expect(callbackRoute).toContain('toOAuthConnectionErrorCode(result.error)');
    expect(callbackRoute).not.toContain('toAuthErrorCode(result.error)');

    expect(pendingRoute).toContain("formatOAuthConnectionError(error, 'loadTenantSelection')");
    expect(pendingRoute).toContain("formatOAuthConnectionError(error, 'completeTenantSelection')");
    expect(pendingRoute).not.toContain(
      "error instanceof Error ? error.message : 'Failed to load pending Xero tenant selection'"
    );
    expect(pendingRoute).not.toContain(
      "error instanceof Error ? error.message : 'Failed to complete Xero tenant selection'"
    );

    expect(sidebar).toContain("formatOAuthConnectionError(errorParam, 'callback')");
    expect(sidebar).not.toContain('authErrorMessage(toAuthErrorCode(errorParam))');

    expect(manager).toContain("formatOAuthConnectionError(data.error, 'loadTenantSelection')");
    expect(manager).toContain("formatOAuthConnectionError(data.error, 'completeTenantSelection')");
    expect(manager).toContain("formatOAuthConnectionError(error, 'initiate')");
    expect(manager).toContain("formatOAuthConnectionError(error, 'disconnect')");
    expect(manager).toContain("formatOAuthConnectionError(error, 'sync')");
    expect(manager).not.toContain("description: error instanceof Error ? error.message : 'Unknown error'");
  });
});
