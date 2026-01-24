/**
 * OAuth Token Encryption Tests
 *
 * Tests for AES-256-GCM encryption/decryption and OAuth state management.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  encryptOAuthToken,
  decryptOAuthToken,
  encryptOAuthState,
  decryptOAuthState,
  generateOAuthNonce,
  isValidEncryptedToken,
  type OAuthStatePayload,
} from './token-encryption';

// Mock environment variable
const mockEncryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const testOrganizationId = 'test-org-123';

beforeAll(() => {
  // Set test encryption key
  process.env.OAUTH_ENCRYPTION_KEY = mockEncryptionKey;
});

describe('OAuth Token Encryption', () => {
  const testToken = 'ya29.abc123xyz789';
  const testOrgId = 'org-12345';

  it('should encrypt and decrypt tokens correctly', () => {
    const encrypted = encryptOAuthToken(testToken, testOrgId);
    const decrypted = decryptOAuthToken(encrypted, testOrgId);

    expect(decrypted).toBe(testToken);
    expect(encrypted).not.toBe(testToken);
    expect(isValidEncryptedToken(encrypted)).toBe(true);
  });

  it('should produce different encrypted outputs for same input', () => {
    const encrypted1 = encryptOAuthToken(testToken, testOrgId);
    const encrypted2 = encryptOAuthToken(testToken, testOrgId);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should use different keys for different organizations', () => {
    const encrypted1 = encryptOAuthToken(testToken, 'org-1');
    const encrypted2 = encryptOAuthToken(testToken, 'org-2');

    expect(encrypted1).not.toBe(encrypted2);

    // Should decrypt correctly with correct org key
    expect(decryptOAuthToken(encrypted1, 'org-1')).toBe(testToken);
    expect(decryptOAuthToken(encrypted2, 'org-2')).toBe(testToken);
  });

  it('should reject decryption with wrong organization key', () => {
    const encrypted = encryptOAuthToken(testToken, testOrgId);

    expect(() => {
      decryptOAuthToken(encrypted, 'wrong-org');
    }).toThrow();
  });

  it('should validate encrypted token format', () => {
    expect(isValidEncryptedToken('invalid')).toBe(false);
    expect(isValidEncryptedToken('')).toBe(false);

    const valid = encryptOAuthToken(testToken, testOrgId);
    expect(isValidEncryptedToken(valid)).toBe(true);
  });

  it('should handle edge cases', () => {
    expect(() => encryptOAuthToken('', testOrgId)).not.toThrow();
    expect(() => encryptOAuthToken('short', testOrgId)).not.toThrow();

    expect(() => decryptOAuthToken('', testOrgId)).toThrow();
    expect(() => decryptOAuthToken('invalid-base64', testOrgId)).toThrow();
  });
});

describe('OAuth State Encryption', () => {
  const testState: OAuthStatePayload = {
    organizationId: testOrganizationId,
    userId: 'user-123',
    provider: 'google_workspace',
    services: ['calendar', 'email'],
    redirectUrl: 'https://app.example.com/oauth/callback',
    timestamp: Date.now(),
    nonce: 'test-nonce-123',
  };

  it('should encrypt and decrypt OAuth state correctly', () => {
    const encrypted = encryptOAuthState(testState);
    const decrypted = decryptOAuthState(encrypted, testOrganizationId);

    expect(decrypted).toEqual(testState);
    expect(encrypted).not.toContain(testState.userId);
  });

  it('should reject expired state', () => {
    const expiredState: OAuthStatePayload = {
      ...testState,
      timestamp: Date.now() - 20 * 60 * 1000, // 20 minutes ago
    };

    const encrypted = encryptOAuthState(expiredState);
    const decrypted = decryptOAuthState(encrypted, testOrganizationId);

    expect(decrypted).toBeNull();
  });

  it('should validate state structure', () => {
    const encrypted = encryptOAuthState(testState);

    // Should reject with wrong organization
    expect(decryptOAuthState(encrypted, 'wrong-org')).toBeNull();

    // Should reject tampered state
    const tampered = encrypted.slice(0, -5) + 'xxxxx'; // Corrupt last 5 characters
    expect(decryptOAuthState(tampered, testOrganizationId)).toBeNull();
  });

  it('should handle invalid state payloads', () => {
    const invalidStates = [
      { ...testState, organizationId: 123 }, // wrong type
      { ...testState, provider: 'invalid' }, // invalid enum
      { ...testState, services: 'not-array' }, // wrong type
      { ...testState, timestamp: 'not-number' }, // wrong type
    ];

    for (const invalidState of invalidStates) {
      const encrypted = encryptOAuthState(invalidState as any);
      const decrypted = decryptOAuthState(encrypted, testOrganizationId);
      expect(decrypted).toBeNull();
    }
  });
});

describe('OAuth Utilities', () => {
  it('should generate secure nonces', () => {
    const nonce1 = generateOAuthNonce();
    const nonce2 = generateOAuthNonce();

    expect(nonce1).toMatch(/^[a-f0-9]{32}$/);
    expect(nonce2).toMatch(/^[a-f0-9]{32}$/);
    expect(nonce1).not.toBe(nonce2);
  });

  it('should validate encrypted token format', () => {
    expect(isValidEncryptedToken('')).toBe(false);
    expect(isValidEncryptedToken('short')).toBe(false);
    expect(isValidEncryptedToken('not-base64!!!')).toBe(false);

    const valid = encryptOAuthToken('test', testOrganizationId);
    expect(isValidEncryptedToken(valid)).toBe(true);
  });
});

describe('Environment Configuration', () => {
  it('should require OAUTH_ENCRYPTION_KEY', () => {
    const originalKey = process.env.OAUTH_ENCRYPTION_KEY;
    delete process.env.OAUTH_ENCRYPTION_KEY;

    expect(() => encryptOAuthToken('test', testOrganizationId)).toThrow(
      'OAUTH_ENCRYPTION_KEY environment variable is not set.'
    );

    process.env.OAUTH_ENCRYPTION_KEY = originalKey;
  });

  it('should validate key format', () => {
    const originalKey = process.env.OAUTH_ENCRYPTION_KEY;
    process.env.OAUTH_ENCRYPTION_KEY = 'invalid-length';

    expect(() => encryptOAuthToken('test', testOrganizationId)).toThrow(
      'OAUTH_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).'
    );

    process.env.OAUTH_ENCRYPTION_KEY = originalKey;
  });
});
