/**
 * API Tokens Hooks
 *
 * TanStack Query hooks for API token management:
 * - List tokens
 * - Create token
 * - Revoke token
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type {
  ApiTokenListItem,
  CreateApiTokenResponse,
  ApiTokenScope,
} from '@/lib/schemas/auth';
import {
  listApiTokens,
  createApiToken,
  revokeApiToken,
} from '@/server/functions/settings/api-tokens';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateApiTokenParams {
  name: string;
  scopes: ApiTokenScope[];
  expiresAt: Date | null;
}

export interface RevokeApiTokenParams {
  tokenId: string;
  reason?: string;
}

// ============================================================================
// LIST HOOK
// ============================================================================

export interface UseApiTokensOptions {
  enabled?: boolean;
}

/**
 * Fetch all API tokens for the current user/organization.
 * Returns masked tokens (no plaintext).
 */
export function useApiTokens({ enabled = true }: UseApiTokensOptions = {}) {
  const listTokensFn = useServerFn(listApiTokens);

  return useQuery({
    queryKey: queryKeys.apiTokens.list(),
    queryFn: async () => {
      const result = await listTokensFn();
      if (result == null) throw new Error('API tokens list returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new API token.
 * Returns the plaintext token ONCE - it cannot be retrieved later.
 *
 * @example
 * const createToken = useCreateApiToken();
 * const result = await createToken.mutateAsync({
 *   name: 'CI/CD Pipeline',
 *   scopes: ['read', 'write'],
 *   expiresAt: null,
 * });
 * // result.token contains the plaintext token - show it to user immediately
 */
export function useCreateApiToken() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createApiToken);

  return useMutation({
    mutationFn: ({ name, scopes, expiresAt }: CreateApiTokenParams) =>
      createFn({ data: { name, scopes, expiresAt } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiTokens.list() });
    },
  });
}

/**
 * Revoke an API token.
 * Users can revoke their own tokens. Admins can revoke any token in org.
 */
export function useRevokeApiToken() {
  const queryClient = useQueryClient();
  const revokeFn = useServerFn(revokeApiToken);

  return useMutation({
    mutationFn: ({ tokenId, reason }: RevokeApiTokenParams) =>
      revokeFn({ data: { tokenId, reason } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiTokens.list() });
    },
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { ApiTokenListItem, CreateApiTokenResponse, ApiTokenScope };
