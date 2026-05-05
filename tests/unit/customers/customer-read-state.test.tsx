import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  CUSTOMER_LIST_FALLBACK_MESSAGE,
  getCustomerListReadErrorMessage,
} from '@/components/domain/customers/customer-read-error-messages';
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

vi.mock('@/components/shared/filter-empty-state', () => ({
  FilterEmptyState: () => <div>filter-empty-state</div>,
}));

vi.mock('@/components/shared/filters', () => ({
  buildFilterItems: () => [],
}));

vi.mock('@/components/shared/filters/types', () => ({
  countActiveFilters: () => 0,
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

vi.mock('@/components/domain/customers/customers-table-presenter', () => ({
  CustomersTablePresenter: () => <div>customers-table</div>,
}));

vi.mock('@/components/domain/customers/customers-mobile-cards', () => ({
  CustomersMobileCards: () => <div>customers-mobile-cards</div>,
}));

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('customer read state', () => {
  it('keeps normalized customer list read messages and hides arbitrary raw errors', () => {
    const normalized = normalizeReadQueryError(
      {
        message: 'select from customers violates row-level security policy',
        statusCode: 503,
        code: 'INTERNAL_ERROR',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: CUSTOMER_LIST_FALLBACK_MESSAGE,
      }
    );

    expect(getCustomerListReadErrorMessage(normalized)).toBe(CUSTOMER_LIST_FALLBACK_MESSAGE);
    expect(
      getCustomerListReadErrorMessage(
        new Error('duplicate key value violates unique constraint customers_pkey')
      )
    ).toBe(CUSTOMER_LIST_FALLBACK_MESSAGE);
  });

  it('does not surface raw non-read customer list errors', async () => {
    const { CustomersListPresenter } = await import(
      '@/components/domain/customers/customers-list-presenter'
    );

    render(
      <CustomersListPresenter
        customers={[]}
        isLoading={false}
        error={new Error('duplicate key value violates unique constraint customers_pkey')}
        selectedIds={new Set()}
        isAllSelected={false}
        isPartiallySelected={false}
        onSelect={vi.fn()}
        onSelectAll={vi.fn()}
        onShiftClickRange={vi.fn()}
        isSelected={vi.fn()}
        sortField="name"
        sortDirection="asc"
        onSort={vi.fn()}
        onViewCustomer={vi.fn()}
        onEditCustomer={vi.fn()}
        onDeleteCustomer={vi.fn()}
        page={1}
        pageSize={20}
        total={0}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText('Failed to load customers')).toBeInTheDocument();
    expect(screen.getByText(CUSTOMER_LIST_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });

  it('keeps customer list read-error UI behind the read-state helper', () => {
    const list = read('src/components/domain/customers/customers-list-presenter.tsx');

    expect(list).toContain(
      'import { getCustomerListReadErrorMessage } from "./customer-read-error-messages";'
    );
    expect(list).toContain('description={getCustomerListReadErrorMessage(error)}');
    expect(list).not.toContain('description={error.message');
    expect(list).not.toContain('"An unexpected error occurred"');
  });
});
