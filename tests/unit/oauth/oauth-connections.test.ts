import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbState = vi.hoisted(() => ({
  connection: {
    id: 'conn-1',
    organizationId: 'org-1',
    userId: 'user-1',
    provider: 'xero',
    serviceType: 'accounting',
    externalAccountId: 'tenant-1',
  },
  loggedDeletes: 0,
  updatedConnections: [] as Array<Record<string, unknown>>,
  updatedPermissions: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/oauth/connections', () => ({
  createOAuthConnections: vi.fn(),
}))

describe('oauth connections server functions', () => {
  beforeEach(() => {
    dbState.loggedDeletes = 0
    dbState.updatedConnections = []
    dbState.updatedPermissions = []
  })

  it('deactivates connections and preserves audit logging on disconnect', async () => {
    let updateCallCount = 0
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [dbState.connection],
          }),
        }),
      }),
      transaction: async (
        callback: (tx: {
          insert: () => { values: () => Promise<void> }
          update: (_table: unknown) => {
            set: (values: Record<string, unknown>) => { where: () => Promise<void> }
          }
        }) => Promise<void>
      ) => {
        const tx = {
          insert: () => ({
            values: async () => {
              dbState.loggedDeletes += 1
            },
          }),
          update: (_table: unknown) => ({
            set: (values: Record<string, unknown>) => ({
              where: async () => {
                if (updateCallCount === 0) {
                  dbState.updatedPermissions.push(values)
                }
                if (updateCallCount === 1) {
                  dbState.updatedConnections.push(values)
                }
                updateCallCount += 1
              },
            }),
          }),
        }

        await callback(tx)
      },
    }

    const { deleteOAuthConnection } = await import('@/server/functions/oauth/connections')
    const result = await deleteOAuthConnection(db as never, {
      connectionId: 'conn-1',
      organizationId: 'org-1',
    })

    expect(result).toEqual({ success: true })
    expect(dbState.loggedDeletes).toBe(1)
    expect(dbState.updatedPermissions[0]).toMatchObject({
      isGranted: false,
    })
    expect(dbState.updatedConnections[0]).toMatchObject({
      isActive: false,
    })
  })

  it('blocks manual Xero tenant reassignment', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [dbState.connection],
          }),
        }),
      }),
    }

    const { updateOAuthConnection } = await import('@/server/functions/oauth/connections')
    const result = await updateOAuthConnection(db as never, {
      connectionId: 'conn-1',
      organizationId: 'org-1',
      updates: {
        externalAccountId: 'tenant-2',
      },
    })

    expect(result).toEqual({
      success: false,
      error: 'Xero tenant assignment can only be changed through the OAuth reconnect flow',
    })
  })

  it('lists connections without returning raw external account identifiers', async () => {
    const selections: unknown[] = []
    const db = {
      select: (selection?: unknown) => {
        selections.push(selection)

        if (selections.length === 1) {
          return {
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => ({
                    offset: async () => [
                      {
                        id: 'conn-1',
                        organizationId: 'org-1',
                        provider: 'xero',
                        serviceType: 'accounting',
                        externalAccountId: 'tenant-secret-1',
                        externalAccountLabel: 'RENOZ Energy Operations',
                        accessToken: 'access-token-secret',
                        refreshToken: 'refresh-token-secret',
                        scopes: ['accounting.transactions'],
                        isActive: true,
                        lastSyncedAt: null,
                        createdAt: new Date('2026-05-01T00:00:00.000Z'),
                        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
                      },
                    ],
                  }),
                }),
              }),
            }),
          }
        }

        return {
          from: () => ({
            where: async () => [{ count: 1 }],
          }),
        }
      },
    }

    const { listOAuthConnections } = await import('@/server/functions/oauth/connections')
    const result = await listOAuthConnections(db as never, {
      organizationId: 'org-1',
      provider: 'xero',
      serviceType: 'accounting',
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error(result.error)
    }

    expect(result.connections[0]).toEqual({
      id: 'conn-1',
      organizationId: 'org-1',
      provider: 'xero',
      serviceType: 'accounting',
      accountLabel: 'RENOZ Energy Operations',
      scopes: ['accounting.transactions'],
      isActive: true,
      lastSyncAt: undefined,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    })
    expect(JSON.stringify(result)).not.toContain('tenant-secret-1')
    expect(JSON.stringify(result)).not.toContain('access-token-secret')
    expect(JSON.stringify(result)).not.toContain('refresh-token-secret')
    expect(Object.keys(selections[0] as Record<string, unknown>)).not.toContain('externalAccountId')
    expect(Object.keys(selections[0] as Record<string, unknown>)).toContain('externalAccountLabel')
    expect(Object.keys(selections[0] as Record<string, unknown>)).not.toContain('accessToken')
    expect(Object.keys(selections[0] as Record<string, unknown>)).not.toContain('refreshToken')
  })
})
