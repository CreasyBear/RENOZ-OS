import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WarrantyNotificationSettingsCard } from '@/components/domain/warranty/views/warranty-notification-settings-card';
import { formatDateAustralian } from '@/lib/warranty';

function createWarranty(overrides: {
  expiryAlertOptOut?: boolean;
  lastExpiryAlertSent?: string | null;
} = {}) {
  return {
    expiryAlertOptOut: false,
    lastExpiryAlertSent: null,
    ...overrides,
  };
}

describe('WarrantyNotificationSettingsCard', () => {
  it('shows active reminder state and routes disabling as an opt-out', () => {
    const onToggleOptOut = vi.fn();

    render(
      <WarrantyNotificationSettingsCard
        warranty={createWarranty({ expiryAlertOptOut: false })}
        isOptOutUpdating={false}
        onToggleOptOut={onToggleOptOut}
      />
    );

    expect(screen.getByText('Receive alerts at 90, 60, and 30 days before expiry')).toBeInTheDocument();
    expect(screen.getByText('Expiry reminders are active')).toBeInTheDocument();
    expect(screen.getByText('No alerts sent yet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Disable expiry alerts' }));

    expect(onToggleOptOut).toHaveBeenCalledWith(true);
  });

  it('shows disabled reminder state and routes enabling as opt-out removal', () => {
    const onToggleOptOut = vi.fn();
    const lastAlertSent = '2026-05-05T00:00:00.000Z';

    render(
      <WarrantyNotificationSettingsCard
        warranty={createWarranty({
          expiryAlertOptOut: true,
          lastExpiryAlertSent: lastAlertSent,
        })}
        isOptOutUpdating={false}
        onToggleOptOut={onToggleOptOut}
      />
    );

    expect(screen.getByText('Alerts are disabled for this warranty')).toBeInTheDocument();
    expect(
      screen.getByText('You will not receive expiry reminders for this warranty')
    ).toBeInTheDocument();
    expect(screen.getByText(formatDateAustralian(lastAlertSent, 'numeric'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Enable expiry alerts' }));

    expect(onToggleOptOut).toHaveBeenCalledWith(false);
  });

  it('locks the toggle and shows updating state while the mutation is pending', () => {
    const onToggleOptOut = vi.fn();

    render(
      <WarrantyNotificationSettingsCard
        warranty={createWarranty()}
        isOptOutUpdating
        onToggleOptOut={onToggleOptOut}
      />
    );

    expect(screen.getByText('Updating...')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Disable expiry alerts' })).toBeDisabled();
  });
});
