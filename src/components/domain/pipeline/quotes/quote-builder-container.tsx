/**
 * QuoteBuilder Container
 *
 * Container responsibilities:
 * - Provides createQuoteVersion mutation
 * - Passes data to presenter
 *
 * Note: currentVersion is passed through from parent.
 * The parent component (opportunity detail) is responsible for fetching opportunity data.
 *
 * @see ./quote-builder.tsx (presenter)
 * @see src/hooks/pipeline/use-quote-mutations.ts (mutations)
 */

import { useCreateQuoteVersion } from '@/hooks/pipeline';
import { QuoteBuilderPresenter } from './quote-builder';
import type { QuoteBuilderContainerProps } from './quote-builder';

export function QuoteBuilderContainer({
  opportunityId,
  currentVersion,
  onSave,
  onViewHistory,
  className,
}: QuoteBuilderContainerProps) {
  // ===========================================================================
  // MUTATIONS (Container responsibility via centralized hooks)
  // ===========================================================================

  const saveMutation = useCreateQuoteVersion();

  return (
    <QuoteBuilderPresenter
      opportunityId={opportunityId}
      currentVersion={currentVersion}
      saveMutation={saveMutation}
      onSave={onSave}
      onViewHistory={onViewHistory}
      className={className}
    />
  );
}

export default QuoteBuilderContainer;
