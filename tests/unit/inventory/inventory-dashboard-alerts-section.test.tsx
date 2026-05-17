import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildDashboardAlerts } from '@/components/domain/inventory/inventory-dashboard-alert-mappers';
import {
  InventoryDashboardAlertsSection,
  type DashboardAlert,
} from '@/components/domain/inventory/inventory-dashboard-alerts-section';
import type { TriggeredAlert } from '@/lib/schemas/inventory';

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

function triggeredAlert(overrides: Partial<TriggeredAlert>): TriggeredAlert {
  return {
    alert: {
      id: '00000000-0000-4000-8000-000000000001',
      organizationId: '00000000-0000-4000-8000-000000000099',
      alertType: 'low_stock',
      productId: '00000000-0000-4000-8000-000000000011',
      locationId: '00000000-0000-4000-8000-000000000022',
      threshold: {},
      isActive: true,
      notificationChannels: [],
      escalationUsers: [],
      lastTriggeredAt: new Date('2026-05-18T01:00:00.000Z'),
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      createdBy: null,
      updatedBy: null,
      version: 1,
      ...(overrides.alert ?? {}),
    },
    product: 'product' in overrides
      ? overrides.product
      : {
          id: '00000000-0000-4000-8000-000000000011',
          name: 'Battery Module',
          sku: 'BAT-001',
        },
    location: 'location' in overrides
      ? overrides.location
      : {
          id: '00000000-0000-4000-8000-000000000022',
          name: 'Main Warehouse',
          locationCode: 'MAIN',
        },
    currentValue: overrides.currentValue ?? 2,
    thresholdValue: overrides.thresholdValue ?? 10,
    severity: overrides.severity ?? 'high',
    message: overrides.message ?? 'Battery Module is below threshold',
    affectedItems: overrides.affectedItems ?? [],
    isFallback: overrides.isFallback,
  };
}

describe('InventoryDashboardAlertsSection', () => {
  it('maps triggered alert read models into dashboard alert view models', () => {
    expect(
      buildDashboardAlerts([
        triggeredAlert({
          severity: 'high',
          isFallback: true,
        }),
        triggeredAlert({
          alert: {
            id: '00000000-0000-4000-8000-000000000002',
            organizationId: '00000000-0000-4000-8000-000000000099',
            alertType: 'expiry',
            productId: null,
            locationId: null,
            threshold: {},
            isActive: true,
            notificationChannels: [],
            escalationUsers: [],
            lastTriggeredAt: new Date('2026-05-18T02:00:00.000Z'),
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
            updatedAt: new Date('2026-05-01T00:00:00.000Z'),
            createdBy: null,
            updatedBy: null,
            version: 1,
          },
          severity: 'low',
          product: null,
          location: null,
          currentValue: 1,
          thresholdValue: 3,
          message: 'Expiry threshold triggered',
        }),
      ])
    ).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000001',
        alertType: 'low_stock',
        severity: 'warning',
        productName: 'Battery Module',
        locationName: 'Main Warehouse',
        message: 'Battery Module is below threshold',
        value: 2,
        threshold: 10,
        triggeredAt: new Date('2026-05-18T01:00:00.000Z'),
        isFallback: true,
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        alertType: 'expiry',
        severity: 'info',
        productName: undefined,
        locationName: undefined,
        message: 'Expiry threshold triggered',
        value: 1,
        threshold: 3,
        triggeredAt: new Date('2026-05-18T02:00:00.000Z'),
        isFallback: false,
      },
    ]);
  });

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
    const alertMappers = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-alert-mappers.ts'),
      'utf8'
    );

    expect(dashboard).toContain("import { buildDashboardAlerts } from './inventory-dashboard-alert-mappers'");
    expect(dashboard).toContain("import { InventoryDashboardAlertsSection } from './inventory-dashboard-alerts-section'");
    expect(dashboard).toContain('<InventoryDashboardAlertsSection');
    expect(dashboard).toContain('buildDashboardAlerts(alertsData?.alerts ?? [])');
    expect(dashboard).not.toContain('function AlertsSection');
    expect(dashboard).not.toContain('severityMap');
    expect(dashboard).not.toContain("type { TriggeredAlert }");
    expect(dashboard).not.toContain('Dismiss read-only alert');
    expect(alertsSection).toContain('export function InventoryDashboardAlertsSection');
    expect(alertsSection).not.toContain('buildDashboardAlerts');
    expect(alertMappers).toContain('export function buildDashboardAlerts');
    expect(alertMappers).toContain('TriggeredAlert');
    expect(alertsSection).toContain('Dismiss read-only alert');
  });
});
