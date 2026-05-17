import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  InventoryDashboardAlertsSection,
  type DashboardAlert,
} from '@/components/domain/inventory/inventory-dashboard-alerts-section';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: ReactNode;
    to: string;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: { children: ReactNode; className?: string }) => (
    <section data-alert-class={className}>{children}</section>
  ),
  AlertTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  AlertDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: string;
    size?: string;
  }) => (
    <button type="button" onClick={onClick} aria-label={props['aria-label']}>
      {children}
    </button>
  ),
}));

function alert(overrides: Partial<DashboardAlert>): DashboardAlert {
  return {
    id: overrides.id ?? 'alert-1',
    alertType: overrides.alertType ?? 'low_stock',
    severity: overrides.severity ?? 'warning',
    productName: overrides.productName,
    locationName: overrides.locationName,
    message: overrides.message ?? 'Battery Module is below threshold',
    value: overrides.value ?? 2,
    threshold: overrides.threshold ?? 10,
    triggeredAt: overrides.triggeredAt ?? new Date('2026-05-01T00:00:00.000Z'),
    isFallback: overrides.isFallback,
  };
}

describe('InventoryDashboardAlertsSection', () => {
  it('dismisses read-only fallback alerts without acknowledging them', () => {
    const onAcknowledge = vi.fn();

    render(
      <InventoryDashboardAlertsSection
        alerts={[
          alert({
            isFallback: true,
            productName: 'Battery Module',
            message: 'Fallback stock threshold triggered',
          }),
        ]}
        onAcknowledge={onAcknowledge}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Dismiss read-only alert: Fallback stock threshold triggered',
      })
    );

    expect(onAcknowledge).not.toHaveBeenCalled();
    expect(screen.queryByText('Fallback stock threshold triggered')).not.toBeInTheDocument();
  });

  it('acknowledges persisted alerts and removes them from the visible list', () => {
    const onAcknowledge = vi.fn();

    render(
      <InventoryDashboardAlertsSection
        alerts={[
          alert({
            id: 'alert-real',
            productName: 'Battery Module',
            message: 'Persisted stock threshold triggered',
          }),
        ]}
        onAcknowledge={onAcknowledge}
      />
    );

    expect(screen.getByText('Low Stock: Battery Module')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Acknowledge alert: Persisted stock threshold triggered',
      })
    );

    expect(onAcknowledge).toHaveBeenCalledWith('alert-real');
    expect(screen.queryByText('Persisted stock threshold triggered')).not.toBeInTheDocument();
  });

  it('shows only the first three active alerts and links to the full alert page', () => {
    render(
      <InventoryDashboardAlertsSection
        alerts={[
          alert({ id: 'alert-1', message: 'Alert one' }),
          alert({ id: 'alert-2', message: 'Alert two', alertType: 'out_of_stock' }),
          alert({ id: 'alert-3', message: 'Alert three', alertType: 'expiry' }),
          alert({ id: 'alert-4', message: 'Alert four', alertType: 'slow_moving' }),
        ]}
        onAcknowledge={vi.fn()}
      />
    );

    expect(screen.getByText('Alert one')).toBeInTheDocument();
    expect(screen.getByText('Alert two')).toBeInTheDocument();
    expect(screen.getByText('Alert three')).toBeInTheDocument();
    expect(screen.queryByText('Alert four')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View all 4 alerts/i })).toHaveAttribute(
      'href',
      '/inventory/alerts'
    );
  });

  it('keeps active alert display behavior out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const alertsSection = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-alerts-section.tsx'),
      'utf8'
    );

    expect(dashboard).toContain(
      "InventoryDashboardAlertsSection,\n  type DashboardAlert,"
    );
    expect(dashboard).toContain('<InventoryDashboardAlertsSection');
    expect(dashboard).not.toContain('function AlertsSection');
    expect(dashboard).not.toContain('Dismiss read-only alert');
    expect(alertsSection).toContain('export function InventoryDashboardAlertsSection');
    expect(alertsSection).toContain('Dismiss read-only alert');
  });
});
