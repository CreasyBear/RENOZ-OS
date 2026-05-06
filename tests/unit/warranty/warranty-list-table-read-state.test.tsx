import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WarrantyListTable } from '@/components/domain/warranty/tables/warranty-list-table';

describe('warranty list table read state', () => {
  it('uses operator-safe copy for warranty list failures', () => {
    const retry = vi.fn();

    render(
      <WarrantyListTable
        warranties={[]}
        total={0}
        page={1}
        pageSize={20}
        sortField="expiryDate"
        sortDirection="asc"
        error={new Error('postgres warranty list timeout')}
        onRetry={retry}
        onPageChange={vi.fn()}
        onSortChange={vi.fn()}
      />
    );

    expect(screen.getByText('Failed to load warranties')).toBeInTheDocument();
    expect(
      screen.getByText('Warranties are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('postgres warranty list timeout')).not.toBeInTheDocument();
  });
});
