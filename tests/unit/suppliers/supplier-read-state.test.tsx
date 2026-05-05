import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  SUPPLIER_DETAIL_FALLBACK_MESSAGE,
  SUPPLIER_EDIT_MISSING_DETAIL_MESSAGE,
  SUPPLIER_LIST_FALLBACK_MESSAGE,
  getSupplierDetailReadErrorMessage,
  getSupplierListReadErrorMessage,
} from '@/components/domain/suppliers/supplier-read-error-messages';
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

vi.mock('@/components/domain/suppliers/suppliers-table-presenter', () => ({
  SuppliersTablePresenter: () => <div>suppliers-table</div>,
}));

vi.mock('@/components/domain/suppliers/suppliers-mobile-cards', () => ({
  SuppliersMobileCards: () => <div>suppliers-mobile-cards</div>,
}));

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('supplier read state', () => {
  it('keeps normalized supplier read messages and hides arbitrary raw errors', () => {
    const listError = normalizeReadQueryError(
      {
        message: 'database connection failed',
        statusCode: 503,
        code: 'INTERNAL_ERROR',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: SUPPLIER_LIST_FALLBACK_MESSAGE,
      }
    );
    const notFoundError = normalizeReadQueryError(
      {
        message: 'Supplier not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      },
      {
        contractType: 'detail-not-found',
        fallbackMessage: SUPPLIER_DETAIL_FALLBACK_MESSAGE,
        notFoundMessage: 'The requested supplier could not be found.',
      }
    );

    expect(getSupplierListReadErrorMessage(listError)).toBe(SUPPLIER_LIST_FALLBACK_MESSAGE);
    expect(getSupplierDetailReadErrorMessage(notFoundError)).toBe(
      'The requested supplier could not be found.'
    );
    expect(
      getSupplierDetailReadErrorMessage(
        new Error('duplicate key value violates unique constraint suppliers_email_unique')
      )
    ).toBe(SUPPLIER_DETAIL_FALLBACK_MESSAGE);
    expect(getSupplierDetailReadErrorMessage(null)).toBe(
      SUPPLIER_EDIT_MISSING_DETAIL_MESSAGE
    );
  });

  it('does not surface raw non-read supplier list errors', async () => {
    const { SuppliersListPresenter } = await import(
      '@/components/domain/suppliers/suppliers-list-presenter'
    );

    render(
      <SuppliersListPresenter
        suppliers={[]}
        isLoading={false}
        error={new Error('duplicate key value violates unique constraint suppliers_pkey')}
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
        onViewSupplier={vi.fn()}
        onEditSupplier={vi.fn()}
        onDeleteSupplier={vi.fn()}
        page={1}
        pageSize={20}
        total={0}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText('Failed to load suppliers')).toBeInTheDocument();
    expect(screen.getByText(SUPPLIER_LIST_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });

  it('keeps supplier read-error UI behind the read-state helper', () => {
    const list = read('src/components/domain/suppliers/suppliers-list-presenter.tsx');
    const edit = read('src/components/domain/suppliers/supplier-edit-container.tsx');

    expect(list).toContain(
      'import { getSupplierListReadErrorMessage } from "./supplier-read-error-messages";'
    );
    expect(list).toContain('description={getSupplierListReadErrorMessage(error)}');
    expect(edit).toContain(
      "import { getSupplierDetailReadErrorMessage } from './supplier-read-error-messages';"
    );
    expect(edit).toContain('message={getSupplierDetailReadErrorMessage(error)}');

    expect(list).not.toContain('description={error.message');
    expect(edit).not.toContain('error instanceof Error');
    expect(edit).not.toContain('? error.message');
  });
});
