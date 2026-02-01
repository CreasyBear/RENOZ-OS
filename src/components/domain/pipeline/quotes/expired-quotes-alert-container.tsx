/**
 * ExpiredQuotesAlert Container
 *
 * Container responsibilities:
 * - Fetches expiring/expired quotes via centralized hooks
 * - Combines loading states
 * - Passes data to presenter
 *
 * @see ./expired-quotes-alert.tsx (presenter)
 * @see src/hooks/pipeline/use-quotes.ts (hooks)
 */

import { useExpiringQuotes, useExpiredQuotes } from '@/hooks/pipeline';
import { ExpiredQuotesAlertPresenter } from './expired-quotes-alert';
import type { ExpiredQuotesAlertContainerProps } from './expired-quotes-alert';

export function ExpiredQuotesAlertContainer({
  warningDays = 7,
  maxItems = 5,
  showExpired = true,
  showExpiring = true,
  variant = 'card',
  className,
}: ExpiredQuotesAlertContainerProps) {
  // ===========================================================================
  // DATA FETCHING (Container responsibility via centralized hooks)
  // ===========================================================================

  const {
    data: expiringData,
    isLoading: expiringLoading,
  } = useExpiringQuotes({
    warningDays,
    limit: maxItems,
    enabled: showExpiring,
  });

  const {
    data: expiredData,
    isLoading: expiredLoading,
  } = useExpiredQuotes({
    limit: maxItems,
    enabled: showExpired,
  });

  // Combined loading state
  const isLoading = expiringLoading || expiredLoading;

  // Extract data
  const expiringQuotes = expiringData?.expiringQuotes ?? [];
  const expiredQuotes = expiredData?.expiredQuotes ?? [];

  return (
    <ExpiredQuotesAlertPresenter
      expiringQuotes={expiringQuotes}
      expiredQuotes={expiredQuotes}
      isLoading={isLoading}
      warningDays={warningDays}
      maxItems={maxItems}
      showExpired={showExpired}
      showExpiring={showExpiring}
      variant={variant}
      className={className}
    />
  );
}

export default ExpiredQuotesAlertContainer;
