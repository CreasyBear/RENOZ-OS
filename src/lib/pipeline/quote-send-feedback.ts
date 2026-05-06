import type { SendQuoteResult } from '@/lib/schemas/pipeline';

type QuoteSendResultStages = Pick<SendQuoteResult, 'stages'>;

export function formatPipelineQuoteSendSuccessMessage(result: QuoteSendResultStages): string {
  const emailHistoryFailed = result.stages.emailHistory.status === 'failed';
  const followUpFailed = result.stages.stageBump.status === 'failed';

  if (emailHistoryFailed && followUpFailed) {
    return 'Quote sent, but email history and follow-up updates need attention';
  }

  if (emailHistoryFailed) {
    return 'Quote sent, but email history needs attention';
  }

  if (followUpFailed) {
    return 'Quote sent, but opportunity follow-up updates need attention';
  }

  return 'Quote sent successfully';
}
