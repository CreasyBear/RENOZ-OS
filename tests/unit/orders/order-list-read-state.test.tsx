import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  getOrdersListReadErrorMessage,
  ORDERS_LIST_FALLBACK_MESSAGE,
} from '@/components/domain/orders/orders-read-error-messages';

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

vi.mock('@/components/shared/filter-empty-state', () => ({
  FilterEmptyState: () => <div>filter-empty-state</div>,
}));

vi.mock('@/components/shared/filters/types', () => ({
  countActiveFilters: () => 0,
}));

vi.mock('@/components/shared/filters/build-filter-items', () => ({
  buildFilterItems: () => [],
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

vi.mock('@/components/domain/orders/orders-table-presenter', () => ({
  OrdersTablePresenter: () => <div>orders-table</div>,
}));

vi.mock('@/components/domain/orders/orders-mobile-cards', () => ({
  OrdersMobileCards: () => <div>orders-mobile-cards</div>,
}));

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('order list read state', () => {
  it('keeps normalized order list read messages and hides arbitrary raw errors', () => {
    const normalized = normalizeReadQueryError(
      {
        message: 'select from orders violates row-level security policy',
        statusCode: 503,
        code: 'INTERNAL_ERROR',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: ORDERS_LIST_FALLBACK_MESSAGE,
      }
    );

    expect(getOrdersListReadErrorMessage(normalized)).toBe(ORDERS_LIST_FALLBACK_MESSAGE);
    expect(
      getOrdersListReadErrorMessage(
        new Error('duplicate key value violates unique constraint orders_pkey')
      )
    ).toBe(ORDERS_LIST_FALLBACK_MESSAGE);
  });

  it('does not surface raw non-read order list errors', async () => {
    const { OrdersListPresenter } = await import(
      '@/components/domain/orders/orders-list-presenter'
    );

    render(
      <OrdersListPresenter
        orders={[]}
        isLoading={false}
        error={new Error('duplicate key value violates unique constraint orders_pkey')}
        selectedIds={new Set()}
        isAllSelected={false}
        isPartiallySelected={false}
        onSelect={vi.fn()}
        onSelectAll={vi.fn()}
        onShiftClickRange={vi.fn()}
        isSelected={vi.fn()}
        sortField="orderDate"
        sortDirection="desc"
        onSort={vi.fn()}
        onViewOrder={vi.fn()}
        onDuplicateOrder={vi.fn()}
        onDeleteOrder={vi.fn()}
        page={1}
        pageSize={20}
        total={0}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText('Failed to load orders')).toBeInTheDocument();
    expect(screen.getByText(ORDERS_LIST_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });

  it('keeps order list read-error UI behind the read-state helper', () => {
    const list = read('src/components/domain/orders/orders-list-presenter.tsx');

    expect(list).toContain(
      'import { getOrdersListReadErrorMessage } from "./orders-read-error-messages";'
    );
    expect(list).toContain('description={getOrdersListReadErrorMessage(error)}');
    expect(list).not.toContain('description={error.message');
    expect(list).not.toContain('"An unexpected error occurred"');
  });
});
