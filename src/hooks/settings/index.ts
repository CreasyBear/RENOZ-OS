/**
 * Settings Hooks
 *
 * Provides hooks for settings management including API tokens and win/loss reasons.
 */

// --- API Tokens ---
export {
  useApiTokens,
  useCreateApiToken,
  useRevokeApiToken,
  type UseApiTokensOptions,
  type CreateApiTokenParams,
  type RevokeApiTokenParams,
} from './use-api-tokens';

// --- Win/Loss Reasons ---
export {
  useWinLossReasons,
  useCreateWinLossReason,
  useUpdateWinLossReason,
  useDeleteWinLossReason,
  type UseWinLossReasonsOptions,
  type WinLossReason,
  type ReasonForm,
  type WinLossReasonsFilters,
} from './use-win-loss-reasons';

// --- Re-export types from schemas ---
export type {
  ApiTokenListItem,
  CreateApiTokenResponse,
  ApiTokenScope,
} from '@/lib/schemas/auth';

export type { WinLossReasonType } from '@/lib/schemas/pipeline';
