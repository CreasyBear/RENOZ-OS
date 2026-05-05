import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  PURCHASE_ORDER_LIST_FALLBACK_MESSAGE,
  getPurchaseOrderListErrorMessage,
} from '@/components/domain/purchase-orders/po-list-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

vi.mock('@/components/shared/data-table', () => ({
  DataTableEmpty: ({
    title,
    description,
  }: {
    title: ReactNode;
    description?: ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  ),
  DataTableSkeleton: () => <div>table-skeleton</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>skeleton</div>,
}));

vi.mock('@/components/domain/purchase-orders/po-table-presenter', () => ({
  POTablePresenter: () => <div>po-table</div>,
}));

vi.mock('@/components/domain/purchase-orders/po-mobile-cards', () => ({
  POMobileCards: () => <div>po-mobile-cards</div>,
}));

describe('purchase-order list read state', () => {
  it('keeps read-path normalized purchase-order list copy', () => {
    const error = normalizeReadQueryError(
      {
        message: 'database connection failed',
        statusCode: 503,
        code: 'INTERNAL_ERROR',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PURCHASE_ORDER_LIST_FALLBACK_MESSAGE,
      }
    );

    expect(getPurchaseOrderListErrorMessage(error)).toBe(PURCHASE_ORDER_LIST_FALLBACK_MESSAGE);
  });

  it('does not surface raw non-read purchase-order list errors', async () => {
    const { POListPresenter } = await import(
      '@/components/domain/purchase-orders/po-list-presenter'
    );

    render(
      <POListPresenter
        orders={[]}
        isLoading={false}
        error={new Error('duplicate key value violates unique constraint purchase_orders_pkey')}
        selectedIds={new Set()}
        isAllSelected={false}
        isPartiallySelected={false}
        onSelect={vi.fn()}
        onSelectAll={vi.fn()}
        onShiftClickRange={vi.fn()}
        isSelected={vi.fn()}
        sortField="createdAt"
        sortDirection="desc"
        onSort={vi.fn()}
        onViewPO={vi.fn()}
        page={1}
        pageSize={20}
        total={0}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText('Failed to load purchase orders')).toBeInTheDocument();
    expect(screen.getByText(PURCHASE_ORDER_LIST_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });
});
