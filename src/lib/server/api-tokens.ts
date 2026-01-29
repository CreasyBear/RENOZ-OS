'use server'

import type { ApiTokenContext, ApiTokenScope } from '@/lib/schemas/auth'
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
  validateApiToken as validateApiTokenRecord,
} from '@/server/functions/settings/api-tokens'

export { createApiToken, listApiTokens, revokeApiToken }

export function scopeIncludesPermission(
  scopes: ApiTokenScope[],
  requiredScope: ApiTokenScope,
): boolean {
  if (scopes.includes('admin')) {
    return true
  }
  if (requiredScope === 'read') {
    return scopes.includes('read') || scopes.includes('write')
  }
  if (requiredScope === 'write') {
    return scopes.includes('write')
  }
  return scopes.includes(requiredScope)
}

export async function validateApiToken(token: string): Promise<ApiTokenContext | null> {
  const tokenRecord = await validateApiTokenRecord(token)
  if (!tokenRecord) {
    return null
  }

  const scopes = tokenRecord.scopes as ApiTokenScope[]

  return {
    tokenId: tokenRecord.id,
    userId: tokenRecord.userId,
    organizationId: tokenRecord.organizationId,
    scopes,
    hasScope: (scope) => scopeIncludesPermission(scopes, scope),
  }
}
