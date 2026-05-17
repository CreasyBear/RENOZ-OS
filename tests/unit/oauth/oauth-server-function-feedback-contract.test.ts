import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockHandleOAuthCallbackLib = vi.fn();
const mockInitiateOAuthFlow = vi.fn();
const mockLogger = {
  error: vi.fn(),
};

vi.mock('@/lib/oauth/flow', () => ({
  handleOAuthCallback: (...args: unknown[]) => mockHandleOAuthCallbackLib(...args),
  initiateOAuthFlow: (...args: unknown[]) => mockInitiateOAuthFlow(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

describe('oauth server function feedback boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not return raw callback exception text to callers', async () => {
    mockHandleOAuthCallbackLib.mockRejectedValueOnce(
      new Error('client_secret access_token leaked through provider stack')
    );

    const { handleOAuthCallback } = await import(
      '@/server/functions/oauth/handle-oauth-callback'
    );

    const result = await handleOAuthCallback({} as never, {
      code: 'oauth-code',
      state: 'state-1',
    });

    expect(result).toEqual({
      success: false,
      error: 'server_error',
      errorDescription: 'Connection was not completed. Please try again.',
    });
    expect(JSON.stringify(result)).not.toContain('client_secret');
    expect(JSON.stringify(result)).not.toContain('access_token');
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[oauth] handleOAuthCallback failed',
      expect.any(Error),
      {}
    );
  });

  it('does not return raw initiate exception text to callers', async () => {
    mockInitiateOAuthFlow.mockRejectedValueOnce(
      new Error('redirect_url client_secret access_token mismatch in provider stack')
    );

    const { initiateOAuth } = await import('@/server/functions/oauth/initiate-oauth');

    const result = await initiateOAuth(
      {} as never,
      {
        organizationId: 'org-1',
        userId: 'user-1',
        provider: 'xero',
        services: ['accounting'],
        redirectUrl: 'https://app.example.com/integrations/oauth',
      },
      'user-1'
    );

    expect(result).toEqual({
      success: false,
      error: 'Connection setup is temporarily unavailable. Please try again.',
    });
    expect(JSON.stringify(result)).not.toContain('client_secret');
    expect(JSON.stringify(result)).not.toContain('access_token');
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[oauth] initiateOAuth failed',
      expect.any(Error),
      {}
    );
  });
});
