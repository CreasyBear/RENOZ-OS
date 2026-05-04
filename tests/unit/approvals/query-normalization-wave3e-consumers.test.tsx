import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUsePendingApprovals = vi.fn();
const mockUseApproveItem = vi.fn();
const mockUseRejectItem = vi.fn();
const mockUseBulkApprove = vi.fn();
const mockUseEscalateApproval = vi.fn();
const mockUseApprovalDetails = vi.fn();
const mockUseUsers = vi.fn();

vi.mock('@/routes/_authenticated/approvals/index', () => ({
  Route: {
    useNavigate: () => vi.fn(),
    useSearch: () => ({
      tab: 'pending',
      priority: 'all',
      search: '',
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/layout', () => ({
  PageLayout: Object.assign(
    ({ children }: { children: ReactNode; variant?: string }) => <div>{children}</div>,
    {
      Header: ({ title, description }: { title: ReactNode; description?: ReactNode }) => (
        <div>
          <div>{title}</div>
          {description ? <div>{description}</div> : null}
        </div>
      ),
      Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    }
  ),
}));

vi.mock('@/components/domain/approvals/approval-dashboard', () => ({
  APPROVAL_TABS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },
  ApprovalDashboard: ({
    approvalItems,
    approvalDetailsError,
  }: {
    approvalItems: Array<{ id: string }>;
    approvalDetailsError?: Error | null;
  }) => (
    <div>
      <span>approval-items:{approvalItems.length}</span>
      {approvalDetailsError ? <span>{approvalDetailsError.message}</span> : null}
    </div>
  ),
}));

vi.mock('@/hooks/suppliers', () => ({
  usePendingApprovals: (...args: unknown[]) => mockUsePendingApprovals(...args),
  useApproveItem: () => mockUseApproveItem(),
  useRejectItem: () => mockUseRejectItem(),
  useBulkApprove: () => mockUseBulkApprove(),
  useEscalateApproval: () => mockUseEscalateApproval(),
  useApprovalDetails: (...args: unknown[]) => mockUseApprovalDetails(...args),
}));

vi.mock('@/hooks/users', () => ({
  useUsers: (...args: unknown[]) => mockUseUsers(...args),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

vi.mock('@/hooks/use-org-format', () => ({
  useOrgFormat: () => ({
    formatCurrency: (amount: number, options?: { currency?: string }) =>
      `${options?.currency ?? 'AUD'} ${amount}`,
    formatDate: (value: string) => value,
  }),
}));

vi.mock('@/hooks', () => ({
  toastError: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/shared/data-table', () => ({
  StatusCell: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/components/domain/approvals/approval-status-config', () => ({
  APPROVAL_PRIORITY_CONFIG: {},
}));

describe('approvals consumer normalization wave 3e', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUsePendingApprovals.mockReturnValue({
      data: {
        items: [
          {
            id: 'approval-1',
            poNumber: 'PO-100',
            level: 1,
            totalAmount: 100,
            currency: 'AUD',
            requesterName: 'Jane Approver',
            requesterEmail: 'jane@example.com',
            createdAt: new Date('2026-04-20T00:00:00.000Z'),
            dueAt: new Date('2026-04-21T00:00:00.000Z'),
            status: 'pending',
            supplierName: 'Northwind Supply',
            escalatedTo: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    mockUseApproveItem.mockReturnValue({ mutateAsync: vi.fn() });
    mockUseRejectItem.mockReturnValue({ mutateAsync: vi.fn() });
    mockUseBulkApprove.mockReturnValue({ mutateAsync: vi.fn() });
    mockUseEscalateApproval.mockReturnValue({ mutateAsync: vi.fn() });
    mockUseApprovalDetails.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('The requested approval could not be found.'),
    });
    mockUseUsers.mockReturnValue({
      data: { items: [] },
    });
  });

  it('keeps the approvals page usable when detail fetches fail', async () => {
    const ApprovalsPage = (await import('@/routes/_authenticated/approvals/approvals-page')).default;

    render(<ApprovalsPage />);

    expect(screen.getByText('approval-items:1')).toBeInTheDocument();
    expect(screen.getByText('The requested approval could not be found.')).toBeInTheDocument();
  });

  it('shows approval detail errors instead of pretending there are no items', async () => {
    const { ApprovalDecisionDialog } = await import(
      '@/components/domain/approvals/approval-decision-dialog'
    );

    render(
      <ApprovalDecisionDialog
        open
        onOpenChange={vi.fn()}
        item={{
          id: 'approval-1',
          type: 'purchase_order',
          title: 'PO-100',
          description: 'Level 1 approval',
          amount: 100,
          currency: 'AUD',
          requester: 'Jane Approver',
          submittedAt: '2026-04-20T00:00:00.000Z',
          priority: 'high',
          status: 'pending',
          poNumber: 'PO-100',
        } as never}
        onDecision={vi.fn()}
        escalationUsers={[]}
        approvalDetails={undefined}
        approvalDetailsError={new Error('The requested approval could not be found.')}
        isLoadingApprovalDetails={false}
      />
    );

    expect(screen.getByText('The requested approval could not be found.')).toBeInTheDocument();
    expect(screen.queryByText('No items available.')).not.toBeInTheDocument();
  });
});
