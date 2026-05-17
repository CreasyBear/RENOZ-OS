import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BulkOperationsModal } from '@/components/shared/modals/bulk-operations-modal';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    id,
    onCheckedChange,
  }: {
    checked?: boolean | 'indeterminate';
    id?: string;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      checked={checked === true}
      id={id}
      onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
      type="checkbox"
    />
  ),
}));

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function renderDeleteBulkOperation(onExecute: () => Promise<{
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}>) {
  render(
    <BulkOperationsModal
      entityType="product"
      selectedIds={['product-1', 'product-2']}
      operations={[
        {
          type: 'delete',
          onExecute,
        },
      ]}
      variant="card"
    />
  );
}

async function confirmDelete() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /delete 2 products/i }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('checkbox'));
  });

  const deleteButtons = screen.getAllByRole('button', { name: /delete 2 products/i });
  await act(async () => {
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
  });
}

describe('BulkOperationsModal feedback contract', () => {
  it('sanitizes unsafe rejected operation errors before showing dialog feedback', async () => {
    renderDeleteBulkOperation(
      vi
        .fn()
        .mockRejectedValue(
          new Error('duplicate key value violates unique constraint products_pkey postgres stack')
        )
    );

    await confirmDelete();

    expect(
      await screen.findByText('Unable to delete selected records. Refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });

  it('sanitizes unsafe row-level operation result errors', async () => {
    renderDeleteBulkOperation(
      vi.fn().mockResolvedValue({
        success: 1,
        failed: 1,
        errors: [
          {
            id: 'product-2',
            error: 'duplicate key value violates unique constraint products_sku_key',
          },
        ],
      })
    );

    await confirmDelete();

    await waitFor(() => {
      expect(
        screen.getByText('One selected record could not be deleted. Refresh and try again.')
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/products_sku_key/i)).not.toBeInTheDocument();
  });

  it('keeps the shared bulk operation surface on the centralized mutation formatter', () => {
    const source = read('src/components/shared/modals/bulk-operations-modal.tsx');

    expect(source).toContain('formatMutationError');
    expect(source).toContain('formatBulkOperationError');
    expect(source).not.toContain('err instanceof Error ? err.message');
    expect(source).not.toContain('error: String(error)');
    expect(source).not.toContain('{err.error}</p>');
  });
});
