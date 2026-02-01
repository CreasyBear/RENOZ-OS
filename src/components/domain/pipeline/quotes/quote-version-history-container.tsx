/**
 * QuoteVersionHistory Container
 *
 * Container responsibilities:
 * - Fetches quote versions via useQuoteVersions hook
 * - Manages quote comparison via useQuoteComparison hook
 * - Provides restoreQuoteVersion mutation
 * - Passes data to presenter
 *
 * @see ./quote-version-history.tsx (presenter)
 * @see src/hooks/pipeline/use-quotes.ts (hooks)
 * @see src/hooks/pipeline/use-quote-mutations.ts (mutations)
 */

import { useState } from 'react';
import { useQuoteVersions, useQuoteComparison, useRestoreQuoteVersion } from '@/hooks/pipeline';
import { QuoteVersionHistoryPresenter } from './quote-version-history';
import type { QuoteVersionHistoryContainerProps } from './quote-version-history';

export function QuoteVersionHistoryContainer({
  opportunityId,
  currentVersionId,
  onRestore,
  onSelectVersion,
  className,
}: QuoteVersionHistoryContainerProps) {
  // ===========================================================================
  // LOCAL STATE (for comparison selection)
  // ===========================================================================

  const [compareFrom, setCompareFrom] = useState<string | null>(null);
  const [compareTo, setCompareTo] = useState<string | null>(null);

  // ===========================================================================
  // DATA FETCHING (Container responsibility via centralized hooks)
  // ===========================================================================

  const {
    data: versionsData,
    isLoading,
    error,
  } = useQuoteVersions({ opportunityId });

  const {
    data: comparisonData,
    isLoading: comparisonLoading,
  } = useQuoteComparison({
    version1Id: compareFrom ?? '',
    version2Id: compareTo ?? '',
    enabled: !!compareFrom && !!compareTo,
  });

  // ===========================================================================
  // MUTATIONS (Container responsibility via centralized hooks)
  // ===========================================================================

  const restoreMutation = useRestoreQuoteVersion();

  // Extract data
  const versions = versionsData?.versions ?? [];

  return (
    <QuoteVersionHistoryPresenter
      opportunityId={opportunityId}
      versions={versions}
      isLoading={isLoading}
      error={error}
      currentVersionId={currentVersionId}
      compareFrom={compareFrom}
      compareTo={compareTo}
      onCompareFromChange={setCompareFrom}
      onCompareToChange={setCompareTo}
      comparisonData={comparisonData ?? null}
      comparisonLoading={comparisonLoading}
      restoreMutation={restoreMutation}
      onRestore={onRestore}
      onSelectVersion={onSelectVersion}
      className={className}
    />
  );
}

export default QuoteVersionHistoryContainer;
