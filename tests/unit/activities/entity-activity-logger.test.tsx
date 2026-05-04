import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { EntityActivityLogger, type ActivityLogData } from '@/components/shared/activity/entity-activity-logger';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

const originalResizeObserver = globalThis.ResizeObserver;

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
});

afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver;
});

function LoggerHarness({
  onSubmit,
}: {
  onSubmit: (data: ActivityLogData) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        reopen
      </button>
      <EntityActivityLogger
        open={open}
        onOpenChange={setOpen}
        entityLabel="Order ORD-20260407-0001"
        onSubmit={onSubmit}
      />
    </div>
  );
}

describe('EntityActivityLogger', () => {
  it('shows the success state only after a successful submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<LoggerHarness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Title'), 'Battery configuration updated');
    await user.type(screen.getByLabelText('Body *'), 'Configured standby timeout to 1440 minutes.');
    await user.click(screen.getByRole('button', { name: 'Log Activity' }));

    expect(onSubmit).toHaveBeenCalled();
    expect(await screen.findByText('Activity logged!')).toBeInTheDocument();
  });

  it('keeps the dialog open with entered values when submit fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Save failed'));
    const user = userEvent.setup();

    render(<LoggerHarness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Title'), 'Battery configuration updated');
    await user.type(screen.getByLabelText('Body *'), 'Configured standby timeout to 1440 minutes.');
    await user.click(screen.getByRole('button', { name: 'Log Activity' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    expect(screen.queryByText('Activity logged!')).toBeNull();
    expect(screen.getByLabelText('Title')).toHaveValue('Battery configuration updated');
    expect(screen.getByLabelText('Body *')).toHaveValue('Configured standby timeout to 1440 minutes.');
  });

  it('resets structured note fields on cancel and reopen', async () => {
    const user = userEvent.setup();

    render(<LoggerHarness onSubmit={vi.fn().mockResolvedValue(undefined)} />);

    await user.type(screen.getByLabelText('Title'), 'Battery configuration updated');
    await user.type(screen.getByLabelText('Body *'), 'Configured standby timeout to 1440 minutes.');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'reopen' }));

    expect(await screen.findByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Body *')).toHaveValue('');
  });
});
