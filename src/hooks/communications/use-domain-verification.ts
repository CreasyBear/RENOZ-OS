/**
 * Domain Verification Hooks
 *
 * Query hooks for email domain verification status.
 *
 * @see INT-RES-005
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
    queryFn: () => getDomainVerificationStatus(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - domain status changes infrequently
  });
}
