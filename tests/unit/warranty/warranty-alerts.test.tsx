import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WarrantyAlerts } from '@/components/domain/warranty/views/warranty-alerts';
import type { WarrantyAlertItem } from '@/components/domain/warranty/views/warranty-alerts-utils';

function createAlert(overrides: Partial<WarrantyAlertItem> = {}): WarrantyAlertItem {
  return {
    id: 'alert-1',
    tone: 'critical',
    title: 'Warranty expired',
    description: 'Warranty expired 5 days ago.',
    actionLabel: 'Extend warranty',
    action: 'extend',
    ...overrides,
  };
}

describe('WarrantyAlerts', () => {
  it('routes extension actions and dismissals from visible alerts', () => {
    const onExtendWarranty = vi.fn();
    const onDismiss = vi.fn();

    render(
      <WarrantyAlerts
        alerts={[createAlert()]}
        onDismiss={onDismiss}
        onExtendWarranty={onExtendWarranty}
        onReviewClaims={vi.fn()}
        onEnableAlerts={vi.fn()}
      />
    );

    expect(screen.getByText('Warranty expired')).toBeInTheDocument();
    expect(screen.getByText('Warranty expired 5 days ago.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Extend warranty' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }));

    expect(onExtendWarranty).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith('alert-1');
  });

  it('routes review-claims and enable-alerts actions explicitly', () => {
    const onReviewClaims = vi.fn();
    const onEnableAlerts = vi.fn();

    render(
      <WarrantyAlerts
        alerts={[
          createAlert({
            id: 'alert-review',
            actionLabel: 'Review claims',
            action: 'review-claims',
          }),
          createAlert({
            id: 'alert-enable',
            tone: 'info',
            title: 'Expiry alerts disabled',
            description: 'You will not receive expiry reminders for this warranty.',
            actionLabel: 'Enable alerts',
            action: 'enable-alerts',
          }),
        ]}
        onDismiss={vi.fn()}
        onExtendWarranty={vi.fn()}
        onReviewClaims={onReviewClaims}
        onEnableAlerts={onEnableAlerts}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Review claims' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enable alerts' }));

    expect(onReviewClaims).toHaveBeenCalledTimes(1);
    expect(onEnableAlerts).toHaveBeenCalledTimes(1);
  });
});
