import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  PROCUREMENT_ALERTS_FALLBACK_MESSAGE,
  getProcurementAlertsErrorMessage,
} from '@/components/domain/procurement/procurement-alert-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import type { ProcurementAlert } from '@/lib/schemas/procurement';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className} />;
  return {
    AlertCircle: Icon,
    AlertTriangle: Icon,
    Info: Icon,
    X: Icon,
    Clock: Icon,
    Package: Icon,
    Building2: Icon,
    FileText: Icon,
    Bell: Icon,
  };
});

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>skeleton</div>,
}));

vi.mock('@/components/shared/error-state', () => ({
  ErrorState: ({
    title,
    message,
  }: {
    title: ReactNode;
    message?: ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      {message ? <div>{message}</div> : null}
    </div>
  ),
}));

describe('procurement alerts read state', () => {
  it('keeps read-path normalized procurement alert copy', () => {
    const error = normalizeReadQueryError(
      {
        message: 'database connection failed',
        statusCode: 503,
        code: 'INTERNAL_ERROR',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PROCUREMENT_ALERTS_FALLBACK_MESSAGE,
      }
    );

    expect(getProcurementAlertsErrorMessage(error)).toBe(PROCUREMENT_ALERTS_FALLBACK_MESSAGE);
  });

  it('does not surface raw empty-alert errors', async () => {
    const { ProcurementAlerts } = await import(
      '@/components/domain/procurement/procurement-alerts'
    );

    render(
      <ProcurementAlerts
        alerts={[]}
        error={new Error('duplicate key value violates unique constraint procurement_alerts_pkey')}
      />
    );

    expect(screen.getByText('Procurement alerts unavailable')).toBeInTheDocument();
    expect(screen.getByText(PROCUREMENT_ALERTS_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });

  it('does not surface raw stale-alert warning errors', async () => {
    const { ProcurementAlerts } = await import(
      '@/components/domain/procurement/procurement-alerts'
    );
    const alerts: ProcurementAlert[] = [
      {
        id: 'alert-1',
        type: 'delivery_delayed',
        severity: 'warning',
        title: 'Delivery delayed',
        message: 'PO-100 is overdue.',
        createdAt: new Date().toISOString(),
      },
    ];

    render(
      <ProcurementAlerts
        alerts={alerts}
        error={new Error('duplicate key value violates unique constraint procurement_alerts_pkey')}
      />
    );

    expect(screen.getByText('Alert data may be outdated')).toBeInTheDocument();
    expect(screen.getByText(PROCUREMENT_ALERTS_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });
});
