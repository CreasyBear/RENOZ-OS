import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  RECEIVING_DASHBOARD_FALLBACK_MESSAGE,
  getReceivingDashboardErrorMessage,
} from '@/components/domain/procurement/receiving/receiving-dashboard-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import type { ReceivingDashboardProps } from '@/components/domain/procurement/receiving/receiving-dashboard';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock('@tanstack/react-table', () => ({
  useReactTable: () => ({
    getHeaderGroups: () => [],
    getRowModel: () => ({ rows: [] }),
  }),
  getCoreRowModel: () => vi.fn(),
  flexRender: (renderer: ReactNode) => renderer,
}));

vi.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className} />;
  return {
    Package: Icon,
    RefreshCw: Icon,
    AlertTriangle: Icon,
  };
});

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
}));

vi.mock('@/components/shared/data-table', () => ({
  BulkActionsBar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DataTableSkeleton: () => <div>table-skeleton</div>,
  DataTableEmpty: ({ title, description }: { title: ReactNode; description?: ReactNode }) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  ),
  CheckboxCell: () => <input type="checkbox" readOnly />,
  DateCell: ({ value }: { value?: ReactNode }) => <span>{value}</span>,
  PriceCell: ({ value }: { value?: ReactNode }) => <span>{value}</span>,
  DataTableColumnHeader: ({ title }: { title: ReactNode }) => <span>{title}</span>,
}));

vi.mock('@/components/shared/truncate-tooltip', () => ({
  TruncateTooltip: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock('@/components/shared/error-state', () => ({
  ErrorState: ({
    title,
    message,
  }: {
    title?: ReactNode;
    message?: ReactNode;
  }) => (
    <div>
      {title ? <div>{title}</div> : null}
      {message ? <div>{message}</div> : null}
    </div>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/components/domain/procurement/receiving/receiving-stats', () => ({
  ReceivingStats: () => <div>receiving-stats</div>,
}));

const rawDatabaseError = new Error(
  'duplicate key value violates unique constraint purchase_orders_pkey'
);

const baseProps: Omit<ReceivingDashboardProps, 'error'> = {
  orders: [],
  metrics: {
    totalOrders: 0,
    totalValue: 0,
    supplierCount: 0,
    oldestOrderDate: null,
    summaryState: 'ready',
  },
  selectedIds: new Set(),
  isAllSelected: false,
  isPartiallySelected: false,
  onSelect: vi.fn(),
  onSelectAll: vi.fn(),
  onShiftClickRange: vi.fn(),
  onClearSelection: vi.fn(),
  isSelected: vi.fn(() => false),
};

describe('receiving dashboard read state', () => {
  it('keeps normalized purchase-order list read copy', () => {
    const normalizedError = normalizeReadQueryError(
      {
        message: 'database connection failed',
        statusCode: 503,
        code: 'INTERNAL_ERROR',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage:
          'Purchase orders are temporarily unavailable. Please refresh and try again.',
      }
    );

    expect(getReceivingDashboardErrorMessage(normalizedError)).toBe(
      'Purchase orders are temporarily unavailable. Please refresh and try again.'
    );
  });

  it('does not surface raw receiving dashboard read errors', async () => {
    const { ReceivingDashboard } = await import(
      '@/components/domain/procurement/receiving/receiving-dashboard'
    );

    render(<ReceivingDashboard {...baseProps} error={rawDatabaseError} />);

    expect(screen.getByText('Failed to load receiving data')).toBeInTheDocument();
    expect(screen.getByText(RECEIVING_DASHBOARD_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });
});
