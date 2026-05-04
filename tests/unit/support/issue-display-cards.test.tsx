import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  IssueAlerts,
  IssueDetailsCard,
  IssueOverviewTab,
} from '@/components/domain/support/issues/issue-display-cards';
import type { IssueDetail } from '@/lib/schemas/support/issues';

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

function createIssue(overrides: Partial<IssueDetail> = {}): IssueDetail {
  return {
    id: 'issue-1',
    issueNumber: 'ISS-001',
    title: 'Battery support issue',
    description: null,
    status: 'open',
    priority: 'high',
    type: 'hardware_fault',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
    resolvedAt: null,
    customer: { id: 'customer-1', name: 'Acme Energy' },
    assignedTo: null,
    slaMetrics: null,
    escalatedAt: null,
    escalationReason: null,
    customerId: 'customer-1',
    warrantyId: null,
    warrantyEntitlementId: null,
    orderId: null,
    shipmentId: null,
    productId: null,
    serializedItemId: null,
    serviceSystemId: null,
    serialNumber: null,
    supportContext: null,
    resolution: null,
    rmaReadiness: null,
    relatedContext: null,
    ...overrides,
  };
}

describe('issue display cards', () => {
  it('renders overview display states without owning route or mutation behavior', () => {
    render(
      <IssueOverviewTab
        issue={createIssue({
          resolution: {
            category: 'hardware_fault',
            summary: 'Battery module failed load test.',
            diagnosisNotes: 'Cell imbalance reproduced under load.',
            nextActionType: 'create_rma',
            resolvedAt: '2026-05-03T00:00:00.000Z',
            resolvedByUserId: 'user-1',
          },
          slaMetrics: {
            responseDueAt: '2026-05-01T08:00:00.000Z',
            resolutionDueAt: '2026-05-04T08:00:00.000Z',
            responseBreached: false,
            resolutionBreached: false,
            isResponseAtRisk: false,
            isResolutionAtRisk: true,
          },
          escalatedAt: '2026-05-04T00:00:00.000Z',
          escalationReason: 'Needs senior support review',
        })}
      />
    );

    expect(screen.getByText('No description provided')).toBeInTheDocument();
    expect(screen.getAllByText('Resolution').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Hardware Fault')).toBeInTheDocument();
    expect(screen.getByText('Create RMA')).toBeInTheDocument();
    expect(screen.getByText('Battery module failed load test.')).toBeInTheDocument();
    expect(screen.getByText('Cell imbalance reproduced under load.')).toBeInTheDocument();
    expect(screen.getByText('SLA Status')).toBeInTheDocument();
    expect(screen.getByText('Escalation Details')).toBeInTheDocument();
    expect(screen.getByText('Needs senior support review')).toBeInTheDocument();
  });

  it('renders SLA and escalation alerts only for current alert conditions', () => {
    const { rerender } = render(<IssueAlerts issue={createIssue()} />);
    expect(screen.queryByText('SLA Breached')).not.toBeInTheDocument();
    expect(screen.queryByText('Issue Escalated')).not.toBeInTheDocument();

    rerender(
      <IssueAlerts
        issue={createIssue({
          slaMetrics: {
            responseDueAt: '2026-05-01T08:00:00.000Z',
            resolutionDueAt: '2026-05-04T08:00:00.000Z',
            responseBreached: true,
            resolutionBreached: false,
            isResponseAtRisk: false,
            isResolutionAtRisk: false,
          },
        })}
      />
    );
    expect(screen.getByText('SLA Breached')).toBeInTheDocument();
    expect(screen.getByText('Response time deadline has passed')).toBeInTheDocument();

    rerender(
      <IssueAlerts
        issue={createIssue({
          status: 'escalated',
          escalatedAt: '2026-05-04T00:00:00.000Z',
          escalationReason: null,
        })}
      />
    );
    expect(screen.getByText('Issue Escalated')).toBeInTheDocument();
  });

  it('renders compact issue details with type label and honest assignee fallback', () => {
    render(
      <IssueDetailsCard
        issue={createIssue({
          assignedTo: null,
          resolvedAt: '2026-05-03T00:00:00.000Z',
        })}
        typeLabel="Hardware Fault"
      />
    );

    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('Created:')).toBeInTheDocument();
    expect(screen.getByText('Updated:')).toBeInTheDocument();
    expect(screen.getByText('Resolved:')).toBeInTheDocument();
    expect(screen.getByText('Hardware Fault')).toBeInTheDocument();
  });
});
