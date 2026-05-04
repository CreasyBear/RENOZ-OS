import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WarrantyClaimDetailAlertsSection } from '@/components/domain/warranty/views/warranty-claim-detail-alerts-section';
import type { SlaDueStatus } from '@/lib/schemas/warranty';

const alertDismissalMocks = vi.hoisted(() => ({
  dismiss: vi.fn(),
  isAlertDismissed: vi.fn(),
}));

vi.mock('@/hooks/_shared/use-alert-dismissals', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/_shared/use-alert-dismissals')>();

  return {
    ...actual,
    useAlertDismissals: () => ({
      dismiss: alertDismissalMocks.dismiss,
      isAlertDismissed: alertDismissalMocks.isAlertDismissed,
      dismissedAlertIds: new Set(),
      clearAll: vi.fn(),
    }),
  };
});

function createSla(overrides: Partial<SlaDueStatus> = {}): SlaDueStatus {
  return {
    status: 'breached',
    label: '2 hours overdue',
    color: 'red',
    ...overrides,
  };
}

beforeEach(() => {
  alertDismissalMocks.dismiss.mockReset();
  alertDismissalMocks.isAlertDismissed.mockReset();
  alertDismissalMocks.isAlertDismissed.mockReturnValue(false);
});

describe('WarrantyClaimDetailAlertsSection', () => {
  it('renders response breach and resolution at-risk alerts with SLA navigation', () => {
    const onViewSla = vi.fn();

    render(
      <WarrantyClaimDetailAlertsSection
        claimId="claim-1"
        responseSla={createSla({
          status: 'breached',
          label: 'Response overdue by 2 hours',
        })}
        resolutionSla={createSla({
          status: 'at_risk',
          label: 'Resolution due in 3 hours',
          color: 'yellow',
        })}
        onViewSla={onViewSla}
      />
    );

    expect(screen.getByText('Response SLA breached')).toBeInTheDocument();
    expect(screen.getByText('Response overdue by 2 hours')).toBeInTheDocument();
    expect(screen.getByText('Resolution SLA at risk')).toBeInTheDocument();
    expect(screen.getByText('Resolution due in 3 hours')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'View SLA' })[0]!);

    expect(onViewSla).toHaveBeenCalledTimes(1);
  });

  it('renders response at-risk and resolution breach alerts', () => {
    render(
      <WarrantyClaimDetailAlertsSection
        claimId="claim-1"
        responseSla={createSla({
          status: 'at_risk',
          label: 'Response due in 20 minutes',
          color: 'yellow',
        })}
        resolutionSla={createSla({
          status: 'breached',
          label: 'Resolution overdue by 1 day',
        })}
        onViewSla={vi.fn()}
      />
    );

    expect(screen.getByText('Response SLA at risk')).toBeInTheDocument();
    expect(screen.getByText('Response due in 20 minutes')).toBeInTheDocument();
    expect(screen.getByText('Resolution SLA breached')).toBeInTheDocument();
    expect(screen.getByText('Resolution overdue by 1 day')).toBeInTheDocument();
  });

  it('filters dismissed SLA alerts and dismisses by stable alert id', () => {
    alertDismissalMocks.isAlertDismissed.mockImplementation((alertId: string) =>
      alertId.includes('response_sla_breached')
    );

    render(
      <WarrantyClaimDetailAlertsSection
        claimId="claim-1"
        responseSla={createSla({
          status: 'breached',
          label: 'Response overdue by 2 hours',
        })}
        resolutionSla={createSla({
          status: 'breached',
          label: 'Resolution overdue by 1 day',
        })}
        onViewSla={vi.fn()}
      />
    );

    expect(screen.queryByText('Response SLA breached')).not.toBeInTheDocument();
    expect(screen.getByText('Resolution SLA breached')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert' }));

    expect(alertDismissalMocks.dismiss).toHaveBeenCalledWith(
      'warranty_claim:claim-1:resolution_sla_breached:Resolution overdue by 1 day'
    );
  });

  it('renders nothing when SLA statuses are not actionable', () => {
    const { container } = render(
      <WarrantyClaimDetailAlertsSection
        claimId="claim-1"
        responseSla={createSla({
          status: 'completed',
          label: 'Responded on time',
          color: 'green',
        })}
        resolutionSla={createSla({
          status: 'on_track',
          label: 'Resolution on track',
          color: 'green',
        })}
        onViewSla={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
