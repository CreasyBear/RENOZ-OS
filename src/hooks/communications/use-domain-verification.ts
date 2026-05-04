/**
 * Domain Verification Hooks
 *
 * Query hooks for email domain verification status.
 *
 * @see INT-RES-005
 */

import { useQuery } from "@tanstack/react-query";
import { normalizeReadQueryError } from "@/lib/read-path-policy";
import { queryKeys } from "@/lib/query-keys";
import { QUERY_CONFIG } from "@/lib/constants";
import { getDomainVerificationStatus } from "@/server/functions/communications/email-domain";

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface UseDomainVerificationOptions {
  enabled?: boolean;
}

/**
 * Query domain verification status from Resend.
 * Returns SPF, DKIM, DMARC record status.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useDomainVerification();
 *
 * if (data?.domain) {
 *   console.log(`Domain: ${data.domain.domain} - ${data.domain.status}`);
 * }
 * ```
 */
export function useDomainVerification(
  options: UseDomainVerificationOptions = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.communications.domainVerification.status(),
    queryFn: async () => {
      try {
        return await getDomainVerificationStatus();
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Domain verification status is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: QUERY_CONFIG.STALE_TIME_LONG,
  });
}
