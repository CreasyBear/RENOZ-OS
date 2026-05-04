import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import {
  WarrantyServiceMissionControl,
  WarrantyServiceSystemCard,
} from '@/components/domain/warranty/views/warranty-service-linkage';
import { getServiceLinkagePresentation } from '@/components/domain/warranty/views/warranty-service-linkage-utils';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    search,
    children,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    children: ReactNode;
  } & ComponentProps<'a'>) => (
    <a
      href={`${to}:${JSON.stringify(params ?? {})}:${JSON.stringify(search ?? {})}`}
      {...props}
    >
      {children}
    </a>
  ),
}));

type ServiceLinkageWarranty = ComponentProps<typeof WarrantyServiceSystemCard>['warranty'];

function createWarranty(
  overrides: Partial<ServiceLinkageWarranty> = {}
): ServiceLinkageWarranty {
  return {
    serviceLinkageStatus: 'linked',
    serviceSystem: {
      id: 'service-system-1',
      displayName: 'RZ Battery System',
      commercialCustomer: null,
      sourceOrder: null,
      project: null,
      siteAddress: null,
      siteAddressLabel: '12 Battery Lane, Perth',
    },
    currentOwner: {
      id: 'owner-1',
      fullName: 'Taylor Operator',
      email: 'taylor@example.test',
      phone: null,
      address: null,
      notes: null,
    },
    ownerRecord: {
      id: 'owner-record-1',
      fullName: 'Original Buyer',
      email: 'buyer@example.test',
      phone: null,
      address: null,
      notes: null,
    },
    pendingServiceReview: null,
    systemHistoryPreview: [
      {
        id: 'history-1',
        action: 'ownership_backfilled',
        description: 'Ownership backfilled from delivery entitlement',
        createdAt: '2026-02-03T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('warranty service linkage presentation', () => {
  it('maps every linkage status to an operator-facing label and description', () => {
    expect(getServiceLinkagePresentation('linked')).toMatchObject({
      label: 'Linked',
      description: 'This warranty is linked to a live service-system record.',
    });
    expect(getServiceLinkagePresentation('pending_review')).toMatchObject({
      label: 'Pending Review',
      description: 'A linkage review is blocking automatic system assignment.',
    });
    expect(getServiceLinkagePresentation('unlinked')).toMatchObject({
      label: 'Unlinked',
      description: 'This warranty is not linked to a service-system record yet.',
    });
    expect(getServiceLinkagePresentation('owner_missing')).toMatchObject({
      label: 'Owner Missing',
      description: 'A service system exists, but there is no current owner assigned yet.',
    });
  });
});

describe('WarrantyServiceSystemCard', () => {
  it('shows linked service-system ownership context and transfer action', () => {
    const onOpenTransferOwnership = vi.fn();

    render(
      <WarrantyServiceSystemCard
        warranty={createWarranty()}
        onOpenTransferOwnership={onOpenTransferOwnership}
      />
    );

    expect(screen.getByText('Service System')).toBeInTheDocument();
    expect(screen.getByText('Linked')).toBeInTheDocument();
    expect(screen.getByText('RZ Battery System')).toBeInTheDocument();
    expect(screen.getByText('12 Battery Lane, Perth')).toBeInTheDocument();
    expect(screen.getByText('Taylor Operator')).toBeInTheDocument();
    expect(screen.getByText('Ownership backfilled from delivery entitlement')).toBeInTheDocument();
    expect(screen.getByText('Open System Detail')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Transfer Ownership' }));

    expect(onOpenTransferOwnership).toHaveBeenCalledTimes(1);
  });

  it('shows pending-review recovery when no service system is linked', () => {
    render(
      <WarrantyServiceSystemCard
        warranty={createWarranty({
          serviceLinkageStatus: 'pending_review',
          serviceSystem: null,
          currentOwner: null,
          pendingServiceReview: {
            id: 'review-1',
            status: 'pending',
            reasonCode: 'conflicting_owner_match',
            candidateCount: 2,
            createdAt: '2026-02-03T00:00:00.000Z',
          },
          systemHistoryPreview: [],
        })}
      />
    );

    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('No service system linked yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Resolve the linkage review queue or complete the external migration workflow before relying on system ownership here.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Open Pending Review')).toBeInTheDocument();
  });
});

describe('WarrantyServiceMissionControl', () => {
  it('keeps pending review and unlinked service lineage visible in the overview', () => {
    render(
      <WarrantyServiceMissionControl
        warranty={createWarranty({
          serviceLinkageStatus: 'pending_review',
          serviceSystem: null,
          currentOwner: null,
          pendingServiceReview: {
            id: 'review-1',
            status: 'pending',
            reasonCode: 'multiple_system_matches',
            candidateCount: 3,
            createdAt: '2026-02-03T00:00:00.000Z',
          },
          systemHistoryPreview: [],
        })}
      />
    );

    expect(screen.getByText('Service Mission Control')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('No current owner assigned')).toBeInTheDocument();
    expect(screen.getByText('No system linked')).toBeInTheDocument();
    expect(
      screen.getByText('This warranty is still outside the canonical installed-system graph.')
    ).toBeInTheDocument();
    expect(screen.getByText('Review multiple system matches')).toBeInTheDocument();
    expect(screen.getByText('Open linkage review')).toBeInTheDocument();
  });
});
