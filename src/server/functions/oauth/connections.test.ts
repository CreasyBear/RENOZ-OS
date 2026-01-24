/**
 * OAuth Connections CRUD Tests
 *
 * Tests for OAuth connection management with full CRUD operations,
 * organization-scoped access, and audit logging.
 */

import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import {
  createOAuthConnection,
  getOAuthConnection,
  listOAuthConnections,
  updateOAuthConnection,
  deleteOAuthConnection,
} from './connections';

// Mock environment variables
const mockEncryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Mock database
const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Mock the token-encryption module
vi.mock('../../../lib/oauth/token-encryption', () => ({
  encryptOAuthToken: vi.fn((token) => `encrypted_${token}`),
  decryptOAuthToken: vi.fn((token) => token.replace('encrypted_', '')),
}));

beforeAll(() => {
  // Set test environment variables
  process.env.OAUTH_ENCRYPTION_KEY = mockEncryptionKey;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('OAuth Connection CRUD Operations', () => {
  const testOrgId = 'org-12345';
  const testUserId = 'user-67890';
  const testConnectionId = 'conn-abcdef';

  describe('createOAuthConnection', () => {
    it('should create a new OAuth connection successfully', async () => {
      // Mock no existing connection
      mockDb.select.mockResolvedValue([]);

      // Mock successful insertion
      mockDb.insert
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: testConnectionId,
                services: 'calendar,email',
              },
            ]),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        });

      const result = await createOAuthConnection(mockDb as any, {
        organizationId: testOrgId,
        userId: testUserId,
        provider: 'google_workspace',
        services: ['calendar', 'email'],
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: new Date(Date.now() + 3600000),
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/gmail.readonly',
        ],
        externalAccountId: 'external-123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.connectionIds).toEqual([testConnectionId]);
      }
    });

    it('should reject duplicate active connections', async () => {
      // Mock existing active connection
      mockDb.select.mockResolvedValue([
        {
          id: 'existing-conn',
          status: 'active',
        },
      ]);

      const result = await createOAuthConnection(mockDb as any, {
        organizationId: testOrgId,
        userId: testUserId,
        provider: 'google_workspace',
        services: ['calendar'],
        accessToken: 'access-token-123',
        expiresAt: new Date(Date.now() + 3600000),
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Active connection already exists');
      }
    });

    it('should validate input parameters', async () => {
      const result = await createOAuthConnection(mockDb as any, {
        organizationId: 'invalid-uuid',
        userId: testUserId,
        provider: 'google_workspace',
        services: [],
        accessToken: '',
        expiresAt: new Date(),
        scopes: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Validation');
      }
    });
  });

  describe('getOAuthConnection', () => {
    it('should retrieve an OAuth connection successfully', async () => {
      const mockConnection = {
        id: testConnectionId,
        organizationId: testOrgId,
        provider: 'google_workspace',
        serviceType: 'calendar',
        externalAccountId: 'external-123',
        scopes: ['calendar', 'gmail'],
        isActive: true,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce([mockConnection]).mockReturnValueOnce([]);

      const result = await getOAuthConnection(mockDb as any, {
        connectionId: testConnectionId,
        organizationId: testOrgId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.connection.id).toBe(testConnectionId);
        expect(result.connection.serviceType).toBe('calendar');
      }
    });

    it('should return error for non-existent connection', async () => {
      mockDb.select.mockResolvedValue([]);

      const result = await getOAuthConnection(mockDb as any, {
        connectionId: 'non-existent',
        organizationId: testOrgId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('listOAuthConnections', () => {
    it('should list OAuth connections with filtering', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          organizationId: testOrgId,
          provider: 'google_workspace',
          serviceType: 'calendar',
          externalAccountId: null,
          scopes: ['calendar'],
          isActive: true,
          lastSyncedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'conn-2',
          organizationId: testOrgId,
          provider: 'microsoft_365',
          serviceType: 'email',
          externalAccountId: 'ms-123',
          scopes: ['Mail.Read'],
          isActive: true,
          lastSyncedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce(mockConnections).mockReturnValueOnce([{ count: 2 }]);

      const result = await listOAuthConnections(mockDb as any, {
        organizationId: testOrgId,
        limit: 10,
        offset: 0,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.connections).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.connections[0].serviceType).toBe('calendar');
        expect(result.connections[1].serviceType).toBe('email');
      }
    });

    it('should apply filters correctly', async () => {
      mockDb.select.mockReturnValueOnce([]).mockReturnValueOnce([{ count: 0 }]);

      const result = await listOAuthConnections(mockDb as any, {
        organizationId: testOrgId,
        provider: 'google_workspace',
        serviceType: 'calendar',
        isActive: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.connections).toHaveLength(0);
        expect(result.total).toBe(0);
      }
    });
  });

  describe('updateOAuthConnection', () => {
    it('should update an OAuth connection successfully', async () => {
      const mockConnection = {
        id: testConnectionId,
        organizationId: testOrgId,
        userId: testUserId,
        provider: 'google_workspace',
        serviceType: 'calendar',
        accessToken: 'encrypted_token',
        refreshToken: null,
        scopes: ['calendar'],
        externalAccountId: null,
        isActive: true,
      };

      mockDb.select.mockResolvedValue([mockConnection]);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockConnection]),
        }),
      });
      mockDb.delete.mockResolvedValue([]);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await updateOAuthConnection(mockDb as any, {
        connectionId: testConnectionId,
        organizationId: testOrgId,
        updates: {
          scopes: ['calendar', 'email'],
          externalAccountId: 'updated-external-id',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should return error for non-existent connection', async () => {
      mockDb.select.mockResolvedValue([]);

      const result = await updateOAuthConnection(mockDb as any, {
        connectionId: 'non-existent',
        organizationId: testOrgId,
        updates: { scopes: ['calendar'] },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('deleteOAuthConnection', () => {
    it('should delete an OAuth connection and clean up related data', async () => {
      const mockConnection = {
        id: testConnectionId,
        userId: testUserId,
        provider: 'google_workspace',
        serviceType: 'calendar',
      };

      mockDb.select.mockResolvedValue([mockConnection]);
      mockDb.delete
        .mockResolvedValueOnce([]) // Delete permissions
        .mockResolvedValueOnce([]); // Delete connection

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await deleteOAuthConnection(mockDb as any, {
        connectionId: testConnectionId,
        organizationId: testOrgId,
      });

      expect(result.success).toBe(true);
      expect(mockDb.delete).toHaveBeenCalledTimes(2); // permissions, connection
    });

    it('should return error for non-existent connection', async () => {
      mockDb.select.mockResolvedValue([]);

      const result = await deleteOAuthConnection(mockDb as any, {
        connectionId: 'non-existent',
        organizationId: testOrgId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });
});

describe('Input Validation', () => {
  it('should validate organization ID format', async () => {
    const result = await createOAuthConnection(mockDb as any, {
      organizationId: 'invalid-org-id',
      userId: 'user-123',
      provider: 'google_workspace',
      services: ['calendar'],
      accessToken: 'token',
      expiresAt: new Date(),
      scopes: ['calendar'],
    });

    expect(result.success).toBe(false);
  });

  it('should validate provider enum', async () => {
    const result = await createOAuthConnection(mockDb as any, {
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
      provider: 'invalid_provider' as any,
      services: ['calendar'],
      accessToken: 'token',
      expiresAt: new Date(),
      scopes: ['calendar'],
    });

    expect(result.success).toBe(false);
  });

  it('should validate services array', async () => {
    const result = await createOAuthConnection(mockDb as any, {
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
      provider: 'google_workspace',
      services: [], // Empty array should fail
      accessToken: 'token',
      expiresAt: new Date(),
      scopes: ['calendar'],
    });

    expect(result.success).toBe(false);
  });
});

describe('Token Encryption Integration', () => {
  it('should encrypt tokens during creation', async () => {
    const { encryptOAuthToken } = await import('../../../lib/oauth/token-encryption');
    const testConnId = 'conn-encrypt-test';

    mockDb.select.mockResolvedValue([]);
    mockDb.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: testConnId,
              serviceType: 'calendar',
            },
          ]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

    await createOAuthConnection(mockDb as any, {
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
      provider: 'google_workspace',
      services: ['calendar'],
      accessToken: 'plain-access-token',
      refreshToken: 'plain-refresh-token',
      expiresAt: new Date(),
      scopes: ['calendar'],
    });

    expect(encryptOAuthToken).toHaveBeenCalledWith(
      'plain-access-token',
      '550e8400-e29b-41d4-a716-446655440000'
    );
    expect(encryptOAuthToken).toHaveBeenCalledWith(
      'plain-refresh-token',
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });
});

describe('Audit Logging', () => {
  it('should log connection creation', async () => {
    const testAuditConnId = 'conn-audit-test';

    mockDb.select.mockResolvedValue([]);
    mockDb.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: testAuditConnId,
              serviceType: 'calendar',
            },
          ]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

    await createOAuthConnection(mockDb as any, {
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
      provider: 'google_workspace',
      services: ['calendar'],
      accessToken: 'token',
      expiresAt: new Date(),
      scopes: ['calendar'],
    });

    expect(mockDb.insert).toHaveBeenCalledWith(
      expect.any(Object), // oauthSyncLogs table
      expect.objectContaining({
        values: expect.objectContaining({
          operation: 'connection_created',
          status: 'completed',
        }),
      })
    );
  });
});
