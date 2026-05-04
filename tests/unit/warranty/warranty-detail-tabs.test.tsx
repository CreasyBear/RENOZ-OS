import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { WarrantyDetailTabs } from '@/components/domain/warranty/views/warranty-detail-tabs';
import type { WarrantyClaimListItem, WarrantyDetail } from '@/lib/schemas/warranty';

type OverviewTabProps = {
  warranty: WarrantyDetail;
  daysUntilExpiry: number;
  extensions: unknown[];
  isExtensionsLoading: boolean;
  isExtensionsError: boolean;
  onRetryExtensions: () => void;
  onExtendDialogOpenChange: (open: boolean) => void;
};

type ClaimsHistoryProps = {
  claims: WarrantyClaimListItem[];
  canFileClaim: boolean;
  isClaimsLoading: boolean;
  isClaimsError?: boolean;
  pendingClaimAction?: unknown;
  onClaimRowClick: (claimId: string) => void;
  onResolveClaimRow?: (claimId: string) => void;
  onReviewClaim: (claim: WarrantyClaimListItem) => void;
  onClaimDialogOpenChange: (open: boolean) => void;
  onRetryClaims?: () => void;
};

type ActivityPanelsProps = {
  activeTab: string;
  hasServiceSystem: boolean;
  activities: unknown[];
  activitiesLoading: boolean;
  activitiesError?: Error | null;
  systemActivities: unknown[];
  systemActivitiesLoading: boolean;
  systemActivitiesError?: Error | null;
  onLogActivity?: () => void;
  onScheduleFollowUp?: () => void;
};

const childCalls = vi.hoisted(() => ({
  overview: [] as OverviewTabProps[],
  claims: [] as ClaimsHistoryProps[],
  activity: [] as ActivityPanelsProps[],
}));

vi.mock('@/components/domain/warranty/views/warranty-detail-overview-tab', () => ({
  WarrantyDetailOverviewTab: (props: OverviewTabProps) => {
    childCalls.overview.push(props);
    return <div data-testid="overview-tab" />;
  },
}));

vi.mock('@/components/domain/warranty/views/warranty-claims-history-card', () => ({
  WarrantyClaimsHistoryCard: (props: ClaimsHistoryProps) => {
    childCalls.claims.push(props);
    return <div data-testid="claims-history" />;
  },
}));

vi.mock('@/components/domain/warranty/views/warranty-activity-tab-panels', () => ({
  WarrantyActivityTabPanels: (props: ActivityPanelsProps) => {
    childCalls.activity.push(props);
    return <div data-testid="activity-panels" />;
  },
}));

type WarrantyDetailTabsProps = ComponentProps<typeof WarrantyDetailTabs>;

function createWarranty(overrides: Partial<WarrantyDetail> = {}): WarrantyDetail {
  return {
    id: 'warranty-1',
    warrantyNumber: 'WAR-001',
    organizationId: 'org-1',
    customerId: 'customer-1',
    customerName: 'Acme Energy',
    serviceSystem: null,
    currentOwner: null,
    ownershipHistorySummary: [],
    serviceLinkageStatus: 'linked',
    pendingServiceReview: null,
    systemHistoryPreview: [],
    ownerRecord: {
      id: 'owner-1',
      fullName: 'Avery Owner',
      email: 'avery@example.test',
      phone: '0400 000 000',
      address: null,
      notes: null,
    },
    productId: 'product-1',
    productName: 'RENOZ 48V Battery',
    productSerial: 'RNZ-48100-001',
    warrantyPolicyId: 'policy-1',
    policyName: 'Battery Performance',
    policyType: 'battery_performance',
    registrationDate: '2026-01-01T00:00:00.000Z',
    expiryDate: '2028-01-01T00:00:00.000Z',
    status: 'active',
    currentCycleCount: 128,
    cycleLimit: 6000,
    assignedUserId: null,
    expiryAlertOptOut: false,
    lastExpiryAlertSent: null,
    certificateUrl: null,
    notes: null,
    activatedAt: '2026-02-03T00:00:00.000Z',
    sourceEntitlement: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    items: [],
    ...overrides,
  };
}

function createClaim(overrides: Partial<WarrantyClaimListItem> = {}): WarrantyClaimListItem {
  return {
    id: 'claim-1',
    claimNumber: 'CLM-001',
    warrantyId: 'warranty-1',
    customerId: 'customer-1',
    claimantRole: 'owner',
    claimantCustomerId: 'customer-1',
    claimantSnapshot: null,
    channelBypassReason: null,
    productId: 'product-1',
    claimType: 'bms_fault',
    status: 'submitted',
    cost: 250,
    submittedAt: '2026-02-03T00:00:00.000Z',
    description: 'BMS fault reported by operator.',
    cycleCountAtClaim: null,
    warranty: {
      warrantyNumber: 'WAR-001',
      productSerial: 'BAT-001',
    },
    commercialCustomer: {
      id: 'customer-1',
      name: 'Acme Energy',
    },
    customer: {
      id: 'customer-1',
      name: 'Acme Energy',
    },
    claimant: {
      role: 'owner',
      displayName: 'Acme Energy',
      customerId: 'customer-1',
      customer: {
        id: 'customer-1',
        name: 'Acme Energy',
      },
      snapshot: null,
      channelBypassReason: null,
    },
    product: {
      id: 'product-1',
      name: 'RENOZ Battery',
    },
    slaTracking: null,
    ...overrides,
  };
}

function createProps(
  overrides: Partial<WarrantyDetailTabsProps> = {}
): WarrantyDetailTabsProps {
  return {
    activeTab: 'overview',
    onActiveTabChange: vi.fn(),
    warranty: createWarranty(),
    daysUntilExpiry: 45,
    claims: [createClaim(), createClaim({ id: 'claim-2', claimNumber: 'CLM-002' })],
    extensions: [],
    isClaimsLoading: false,
    isClaimsError: false,
    isExtensionsLoading: false,
    isExtensionsError: false,
    pendingClaimAction: null,
    onClaimRowClick: vi.fn(),
    onResolveClaimRow: vi.fn(),
    onReviewClaim: vi.fn(),
    onClaimDialogOpenChange: vi.fn(),
    onRetryClaims: vi.fn(),
    onRetryExtensions: vi.fn(),
    onExtendDialogOpenChange: vi.fn(),
    activities: [],
    activitiesLoading: false,
    activitiesError: null,
    systemActivities: [],
    systemActivitiesLoading: false,
    systemActivitiesError: null,
    onLogActivity: vi.fn(),
    onScheduleFollowUp: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  childCalls.overview.length = 0;
  childCalls.claims.length = 0;
  childCalls.activity.length = 0;
});

describe('WarrantyDetailTabs', () => {
  it('renders tab labels and a reliable claims count when claims loaded', () => {
    render(<WarrantyDetailTabs {...createProps()} />);

    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Claims2' })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Warranty Activity' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'System History' })).toBeInTheDocument();
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    expect(childCalls.overview[0]).toMatchObject({
      daysUntilExpiry: 45,
      isExtensionsLoading: false,
      isExtensionsError: false,
    });
  });

  it('hides the claims count when claims are unavailable', () => {
    render(
      <WarrantyDetailTabs
        {...createProps({
          activeTab: 'claims',
          isClaimsError: true,
        })}
      />
    );

    expect(screen.getByRole('tab', { name: 'Claims' })).toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(childCalls.claims[0]).toMatchObject({
      isClaimsError: true,
      claims: expect.any(Array),
    });
  });

  it('routes controlled tab changes through the caller', () => {
    const onActiveTabChange = vi.fn();

    render(
      <WarrantyDetailTabs
        {...createProps({
          onActiveTabChange,
        })}
      />
    );

    const claimsTab = screen.getByRole('tab', { name: 'Claims2' });

    fireEvent.mouseDown(claimsTab);
    fireEvent.click(claimsTab);

    expect(onActiveTabChange).toHaveBeenCalledWith('claims');
  });

  it('passes claims workflow callbacks and can-file state to the claims panel', () => {
    const props = createProps({
      activeTab: 'claims',
      warranty: createWarranty({ status: 'expiring_soon' }),
    });

    render(<WarrantyDetailTabs {...props} />);

    expect(screen.getByTestId('claims-history')).toBeInTheDocument();
    expect(childCalls.claims[0]).toMatchObject({
      claims: props.claims,
      canFileClaim: true,
      isClaimsLoading: false,
      pendingClaimAction: null,
    });
    expect(childCalls.claims[0]?.onClaimRowClick).toBe(props.onClaimRowClick);
    expect(childCalls.claims[0]?.onResolveClaimRow).toBe(props.onResolveClaimRow);
    expect(childCalls.claims[0]?.onReviewClaim).toBe(props.onReviewClaim);
    expect(childCalls.claims[0]?.onClaimDialogOpenChange).toBe(props.onClaimDialogOpenChange);
    expect(childCalls.claims[0]?.onRetryClaims).toBe(props.onRetryClaims);
  });

  it('passes activity panel context including service-system presence', () => {
    const activitiesError = new Error('activity unavailable');
    const systemActivitiesError = new Error('system history unavailable');
    const props = createProps({
      activeTab: 'warranty-activity',
      warranty: createWarranty({
        serviceSystem: {
          id: 'service-system-1',
          displayName: 'Warehouse battery system',
          commercialCustomer: null,
          sourceOrder: null,
          project: null,
          siteAddress: null,
          siteAddressLabel: 'Perth warehouse',
        },
      }),
      activitiesLoading: true,
      activitiesError,
      systemActivitiesLoading: true,
      systemActivitiesError,
    });

    render(<WarrantyDetailTabs {...props} />);

    expect(screen.getByTestId('activity-panels')).toBeInTheDocument();
    expect(childCalls.activity[0]).toMatchObject({
      activeTab: 'warranty-activity',
      hasServiceSystem: true,
      activities: [],
      activitiesLoading: true,
      activitiesError,
      systemActivities: [],
      systemActivitiesLoading: true,
      systemActivitiesError,
    });
    expect(childCalls.activity[0]?.onLogActivity).toBe(props.onLogActivity);
    expect(childCalls.activity[0]?.onScheduleFollowUp).toBe(props.onScheduleFollowUp);
  });
});
