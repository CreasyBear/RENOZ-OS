import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ScheduledCall } from '@/lib/schemas/communications';

const mockUseScheduledCalls = vi.fn();

vi.mock('@/hooks/communications/use-scheduled-calls', () => ({
  useScheduledCalls: (...args: unknown[]) => mockUseScheduledCalls(...args),
}));

vi.mock('@/components/domain/communications/calls/scheduled-call-action-menu', () => ({
  ScheduledCallActionMenu: ({ callId }: { callId: string }) => (
    <div>call-actions:{callId}</div>
  ),
}));

vi.mock('@/components/domain/communications/calls/call-outcome-dialog', () => ({
  CallOutcomeDialog: () => <div>call-outcome-dialog</div>,
}));

describe('upcoming calls widget read states', () => {
  it('shows operator-safe cold-load copy for upcoming call failures', async () => {
    mockUseScheduledCalls.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('postgres timeout while loading scheduled calls'),
      refetch: vi.fn(),
    });

    const { UpcomingCallsWidget } = await import(
      '@/components/domain/communications/calls/upcoming-calls-widget'
    );

    render(<UpcomingCallsWidget />);

    expect(screen.getByText('Upcoming calls unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('Upcoming calls are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('postgres timeout while loading scheduled calls')).not.toBeInTheDocument();
  });

  it('keeps cached upcoming calls visible during refetch failures', async () => {
    mockUseScheduledCalls.mockReturnValue({
      data: {
        items: [
          {
            id: 'call-1',
            customerId: 'customer-1',
            scheduledAt: new Date(Date.now() + 60_000).toISOString(),
            purpose: 'general',
          },
        ] as unknown as ScheduledCall[],
        total: 1,
      },
      isLoading: false,
      error: new Error('postgres timeout while loading scheduled calls'),
      refetch: vi.fn(),
    });

    const { UpcomingCallsWidget } = await import(
      '@/components/domain/communications/calls/upcoming-calls-widget'
    );

    render(<UpcomingCallsWidget />);

    expect(screen.getByText('Showing cached upcoming calls')).toBeInTheDocument();
    expect(screen.getByText('call-actions:call-1')).toBeInTheDocument();
    expect(
      screen.getByText('Upcoming calls are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('postgres timeout while loading scheduled calls')).not.toBeInTheDocument();
  });
});
