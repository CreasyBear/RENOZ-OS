import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { InboxEmailItem } from '@/lib/schemas/communications/inbox';

vi.mock('@/hooks/communications/use-inbox-actions', () => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false });

  return {
    useMarkEmailAsRead: mutation,
    useToggleEmailStarred: mutation,
    useArchiveEmail: mutation,
    useDeleteEmail: mutation,
  };
});

vi.mock('@/components/shared/filters', () => ({
  DomainFilterBar: () => <div>inbox-filters</div>,
}));

vi.mock('@/components/domain/communications/inbox/inbox-list', () => ({
  InboxList: ({ items }: { items: Array<{ id: string }> }) => (
    <div>inbox-list:{items.length}</div>
  ),
}));

vi.mock('@/components/domain/communications/inbox/inbox-detail', () => ({
  InboxDetail: ({ email }: { email: { id: string } | null }) => (
    <div>inbox-detail:{email?.id ?? 'none'}</div>
  ),
}));

describe('inbox read states', () => {
  it('keeps cached inbox items visible during refetch errors', async () => {
    const { Inbox } = await import('@/components/domain/communications/inbox/inbox');
    const items = [{ id: 'email-1' }] as unknown as InboxEmailItem[];

    render(
      <Inbox
        items={items}
        error={new Error('Inbox is temporarily unavailable. Please refresh and try again.')}
        filters={{
          tab: 'all',
          search: '',
          customerId: '',
          status: 'all',
          dateFrom: null,
          dateTo: null,
        }}
        onFiltersChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText('Showing cached inbox items')).toBeInTheDocument();
    expect(screen.getByText('inbox-list:1')).toBeInTheDocument();
  });
});
