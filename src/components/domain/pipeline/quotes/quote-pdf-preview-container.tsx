/**
 * QuotePdfPreview Container
 *
 * Container responsibilities:
 * - Provides generateQuotePdf mutation
 * - Passes data to presenter
 *
 * Note: Quote version and organization data are passed through from parent.
 *
 * @see ./quote-pdf-preview.tsx (presenter)
 * @see src/hooks/pipeline/use-quote-mutations.ts (mutations)
 */

import { useGenerateQuotePdf } from '@/hooks/pipeline';
import { QuotePdfPreviewPresenter } from './quote-pdf-preview';
import type { QuotePdfPreviewContainerProps } from './quote-pdf-preview';

export function QuotePdfPreviewContainer({
  quoteVersion,
  opportunityTitle,
  customerName,
  customerAddress,
  contactName,
  contactEmail,
  organizationName,
  organizationAbn,
  organizationAddress,
  organizationPhone,
  organizationEmail,
  quoteExpiresAt,
  onSend,
  className,
}: QuotePdfPreviewContainerProps) {
  // ===========================================================================
  // MUTATIONS (Container responsibility via centralized hooks)
  // ===========================================================================

  const generateMutation = useGenerateQuotePdf();

  return (
    <QuotePdfPreviewPresenter
      quoteVersion={quoteVersion}
      opportunityTitle={opportunityTitle}
      customerName={customerName}
      customerAddress={customerAddress}
      contactName={contactName}
      contactEmail={contactEmail}
      organizationName={organizationName}
      organizationAbn={organizationAbn}
      organizationAddress={organizationAddress}
      organizationPhone={organizationPhone}
      organizationEmail={organizationEmail}
      quoteExpiresAt={quoteExpiresAt}
      generateMutation={generateMutation}
      onSend={onSend}
      className={className}
    />
  );
}

export default QuotePdfPreviewContainer;
