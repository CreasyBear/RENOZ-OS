import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IssueActionsCard } from '@/components/domain/support/issues/issue-actions-card';
import type { IssueDetailActionPolicy } from '@/components/domain/support/issues/issue-detail-action-policy';
import type { IssueRmaReadiness } from '@/lib/schemas/support/issues';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    search,
    children,
    className,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a
      href={`${to}:${JSON.stringify(params ?? {})}:${JSON.stringify(search ?? {})}`}
      className={className}
      {...props}
    >
      {children}
    </a>
  ),
}));

const activePolicy: IssueDetailActionPolicy = {
  canStart: true,
  canDeEscalate: false,
  canHold: true,
  canEscalate: true,
  canResolve: true,
  canClose: false,
  canDelete: true,
  showRmaSection: false,
  primaryAction: 'start',
};

const resolvedRmaPolicy: IssueDetailActionPolicy = {
  canStart: false,
  canDeEscalate: false,
  canHold: false,
  canEscalate: false,
  canResolve: false,
  canClose: true,
  canDelete: true,
  showRmaSection: true,
  primaryAction: 'close',
};

function createReadiness(
  overrides: Partial<IssueRmaReadiness> = {}
): IssueRmaReadiness {
  return {
    state: 'ready',
    blockedReasonCode: null,
    blockedReason: null,
    sourceOrder: {
      id: 'order-1',
      orderNumber: 'ORD-001',
      customerId: 'customer-1',
      customerName: 'Acme Energy',
    },
    eligibleLineItems: [],
    existingRmas: [],
    suggestedReason: 'defective',
    ...overrides,
  };
}

describe('IssueActionsCard', () => {
  it('routes ready resolved issues to RMA creation and close/delete actions', () => {
    const onStatusChange = vi.fn();
    const onDelete = vi.fn();

    render(
      <IssueActionsCard
        issueId="issue-1"
        rmaReadiness={createReadiness()}
        actionPolicy={resolvedRmaPolicy}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        isPending={false}
      />
    );

    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create RMA' })).toHaveAttribute(
      'href',
      '/orders/$orderId:{"orderId":"order-1"}:{"fromIssueId":"issue-1"}'
    );
    expect(
      screen.queryByText('Resolve the source order before creating an RMA.')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close Issue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Issue' }));

    expect(onStatusChange).toHaveBeenCalledWith('closed');
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows blocked Create RMA copy without implying an available RMA link', () => {
    render(
      <IssueActionsCard
        issueId="issue-1"
        rmaReadiness={createReadiness({
          state: 'blocked',
          blockedReasonCode: 'source_order_missing',
          blockedReason: 'Resolve the source order before creating an RMA.',
          sourceOrder: null,
        })}
        actionPolicy={resolvedRmaPolicy}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
        isPending={false}
      />
    );

    expect(screen.queryByRole('link', { name: 'Create RMA' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create RMA' })).toBeDisabled();
    expect(
      screen.getByText('Resolve the source order before creating an RMA.')
    ).toBeInTheDocument();
  });

  it('maps active workflow buttons to canonical status transitions', () => {
    const onStatusChange = vi.fn();
    const onDelete = vi.fn();

    render(
      <IssueActionsCard
        issueId="issue-1"
        rmaReadiness={null}
        actionPolicy={activePolicy}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        isPending={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Working' }));
    fireEvent.click(screen.getByRole('button', { name: 'Put On Hold' }));
    fireEvent.click(screen.getByRole('button', { name: 'Escalate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Issue' }));

    expect(onStatusChange).toHaveBeenNthCalledWith(1, 'in_progress');
    expect(onStatusChange).toHaveBeenNthCalledWith(2, 'on_hold');
    expect(onStatusChange).toHaveBeenNthCalledWith(3, 'escalated');
    expect(onStatusChange).toHaveBeenNthCalledWith(4, 'resolved');
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('keeps escalated issues on the de-escalation path', () => {
    const onStatusChange = vi.fn();
    const escalatedPolicy: IssueDetailActionPolicy = {
      canStart: false,
      canDeEscalate: true,
      canHold: false,
      canEscalate: false,
      canResolve: false,
      canClose: false,
      canDelete: false,
      showRmaSection: false,
      primaryAction: null,
    };

    render(
      <IssueActionsCard
        issueId="issue-1"
        rmaReadiness={null}
        actionPolicy={escalatedPolicy}
        onStatusChange={onStatusChange}
        onDelete={vi.fn()}
        isPending={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'De-escalate' }));

    expect(onStatusChange).toHaveBeenCalledWith('in_progress');
    expect(screen.queryByRole('button', { name: 'Escalate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Issue' })).not.toBeInTheDocument();
  });
});
