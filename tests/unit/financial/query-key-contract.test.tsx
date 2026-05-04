import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('financial query key contract', () => {
  it('includes statement pagination and sent filters', () => {
    expect(
      queryKeys.financial.statements('customer-1', {
        page: 1,
        pageSize: 10,
        onlySent: true,
      })
    ).not.toEqual(
      queryKeys.financial.statements('customer-1', {
        page: 2,
        pageSize: 10,
        onlySent: true,
      })
    );
  });

  it('includes Xero sync pagination and error filters', () => {
    expect(
      queryKeys.financial.xeroSyncs({
        status: 'error',
        errorsOnly: true,
        page: 1,
        pageSize: 50,
      })
    ).not.toEqual(
      queryKeys.financial.xeroSyncs({
        status: 'error',
        errorsOnly: true,
        page: 2,
        pageSize: 50,
      })
    );
  });

  it('includes recognition filters instead of collapsing to state only', () => {
    expect(queryKeys.financial.recognitions({ state: 'pending', page: 1 })).not.toEqual(
      queryKeys.financial.recognitions({ state: 'pending', page: 2 })
    );
    expect(
      queryKeys.financial.recognitionSummary('2026-01-01', '2026-01-31', 'week')
    ).not.toEqual(
      queryKeys.financial.recognitionSummary('2026-01-01', '2026-01-31', 'month')
    );
  });
});
