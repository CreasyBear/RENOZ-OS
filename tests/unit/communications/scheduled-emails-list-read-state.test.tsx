import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScheduledEmailsList } from '@/components/domain/communications/emails/scheduled-emails-list';

describe('scheduled emails list read states', () => {
  it('shows operator-safe cold-load copy for scheduled email failures', () => {
    render(
      <ScheduledEmailsList
        items={[]}
        total={0}
        totalAll={0}
        error={new Error('postgres timeout while loading scheduled emails')}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('Failed to load scheduled emails')).toBeInTheDocument();
    expect(
      screen.getByText('Scheduled emails are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('postgres timeout while loading scheduled emails')).not.toBeInTheDocument();
  });
});
