import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { WarrantyDetailAlertsSection } from '@/components/domain/warranty/views/warranty-detail-alerts-section';
import type { WarrantyAlertItem } from '@/components/domain/warranty/views/warranty-alerts-utils';

type WarrantyAlertsProps = {
  alerts: WarrantyAlertItem[];
  onDismiss: (alertId: string) => void;
  onExtendWarranty: () => void;
  onReviewClaims: () => void;
  onEnableAlerts: () => void;
};

const alertMocks = vi.hoisted(() => ({
  buildWarrantyAlerts: vi.fn(),
  dismiss: vi.fn(),
  isAlertDismissed: vi.fn(),
  warrantyAlertsCalls: [] as WarrantyAlertsProps[],
}));

vi.mock('@/components/domain/warranty/views/warranty-alerts-utils', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/components/domain/warranty/views/warranty-alerts-utils')>();

  return {
    ...actual,
    buildWarrantyAlerts: alertMocks.buildWarrantyAlerts,
  };
});

vi.mock('@/hooks/_shared/use-alert-dismissals', () => ({
  useAlertDismissals: () => ({
    dismiss: alertMocks.dismiss,
    isAlertDismissed: alertMocks.isAlertDismissed,
    dismissedAlertIds: new Set(),
    clearAll: vi.fn(),
  }),
}));

vi.mock('@/components/domain/warranty/views/warranty-alerts', () => ({
  WarrantyAlerts: (props: WarrantyAlertsProps) => {
    alertMocks.warrantyAlertsCalls.push(props);
    return (
      <div data-testid="warranty-alerts">
        {props.alerts.map((alert) => (
          <div key={alert.id}>
            <span>{alert.title}</span>
            <button type="button" onClick={() => props.onDismiss(alert.id)}>
              Dismiss {alert.id}
            </button>
          </div>
        ))}
        <button type="button" onClick={props.onExtendWarranty}>
          Extend action
        </button>
        <button type="button" onClick={props.onReviewClaims}>
          Review claims action
        </button>
        <button type="button" onClick={props.onEnableAlerts}>
          Enable alerts action
        </button>
      </div>
    );
  },
}));

type WarrantyDetailAlertsSectionProps = ComponentProps<typeof WarrantyDetailAlertsSection>;

function createAlert(id: string): WarrantyAlertItem {
  return {
    id,
    tone: 'warning',
    title: `Alert ${id}`,
    description: `Description ${id}`,
    actionLabel: 'Extend warranty',
    action: 'extend',
  };
}

function createProps(
  overrides: Partial<WarrantyDetailAlertsSectionProps> = {}
): WarrantyDetailAlertsSectionProps {
  return {
    warranty: {
      id: 'warranty-1',
      status: 'expiring_soon',
      expiryAlertOptOut: false,
    },
    daysUntilExpiry: 14,
    onExtendDialogOpenChange: vi.fn(),
    onReviewClaims: vi.fn(),
    onToggleOptOut: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  alertMocks.buildWarrantyAlerts.mockReset();
  alertMocks.dismiss.mockReset();
  alertMocks.isAlertDismissed.mockReset();
  alertMocks.isAlertDismissed.mockReturnValue(false);
  alertMocks.warrantyAlertsCalls.length = 0;
});

describe('WarrantyDetailAlertsSection', () => {
  it('builds alerts from warranty timing context and renders visible alerts', () => {
    alertMocks.buildWarrantyAlerts.mockReturnValue([createAlert('alert-1')]);

    render(<WarrantyDetailAlertsSection {...createProps()} />);

    expect(alertMocks.buildWarrantyAlerts).toHaveBeenCalledWith({
      warrantyId: 'warranty-1',
      warrantyStatus: 'expiring_soon',
      daysUntilExpiry: 14,
      expiryAlertOptOut: false,
    });
    expect(screen.getByText('Alert alert-1')).toBeInTheDocument();
    expect(alertMocks.warrantyAlertsCalls[0]?.alerts.map((alert) => alert.id)).toEqual([
      'alert-1',
    ]);
  });

  it('filters dismissed alerts and caps visible alerts at three', () => {
    alertMocks.buildWarrantyAlerts.mockReturnValue([
      createAlert('alert-1'),
      createAlert('alert-2'),
      createAlert('alert-3'),
      createAlert('alert-4'),
      createAlert('alert-5'),
    ]);
    alertMocks.isAlertDismissed.mockImplementation((alertId: string) => alertId === 'alert-2');

    render(<WarrantyDetailAlertsSection {...createProps()} />);

    expect(alertMocks.warrantyAlertsCalls[0]?.alerts.map((alert) => alert.id)).toEqual([
      'alert-1',
      'alert-3',
      'alert-4',
    ]);
  });

  it('routes dismiss and alert actions through the existing page callbacks', () => {
    const onExtendDialogOpenChange = vi.fn();
    const onReviewClaims = vi.fn();
    const onToggleOptOut = vi.fn();
    alertMocks.buildWarrantyAlerts.mockReturnValue([createAlert('alert-1')]);

    render(
      <WarrantyDetailAlertsSection
        {...createProps({
          onExtendDialogOpenChange,
          onReviewClaims,
          onToggleOptOut,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Extend action' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review claims action' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enable alerts action' }));

    expect(alertMocks.dismiss).toHaveBeenCalledWith('alert-1');
    expect(onExtendDialogOpenChange).toHaveBeenCalledWith(true);
    expect(onReviewClaims).toHaveBeenCalledTimes(1);
    expect(onToggleOptOut).toHaveBeenCalledWith(false);
  });
});
