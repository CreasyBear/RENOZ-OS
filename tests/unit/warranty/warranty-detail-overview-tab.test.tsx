import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { WarrantyDetailOverviewTab } from '@/components/domain/warranty/views/warranty-detail-overview-tab';
import type { WarrantyDetail } from '@/lib/schemas/warranty';

type WarrantyPanelProps = {
  warranty: WarrantyDetail;
  daysUntilExpiry?: number;
};

type ExtensionHistoryProps = {
  warrantyId: string;
  originalExpiryDate?: Date | string;
  onExtendClick?: () => void;
  showExtendButton?: boolean;
  extensions?: unknown[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
};

const panelCalls = vi.hoisted(() => ({
  quickAnswer: [] as WarrantyPanelProps[],
  serviceMission: [] as WarrantyPanelProps[],
  lineage: [] as WarrantyPanelProps[],
  extensionHistory: [] as ExtensionHistoryProps[],
}));

vi.mock('@/components/domain/warranty/views/warranty-quick-answer-strip', () => ({
  WarrantyQuickAnswerStrip: (props: WarrantyPanelProps) => {
    panelCalls.quickAnswer.push(props);
    return <div data-testid="quick-answer" />;
  },
}));

vi.mock('@/components/domain/warranty/views/warranty-service-linkage', () => ({
  WarrantyServiceMissionControl: (props: WarrantyPanelProps) => {
    panelCalls.serviceMission.push(props);
    return <div data-testid="service-mission" />;
  },
}));

vi.mock('@/components/domain/warranty/views/warranty-lineage-sections', () => ({
  WarrantyLineageSections: (props: WarrantyPanelProps) => {
    panelCalls.lineage.push(props);
    return <div data-testid="lineage-sections" />;
  },
}));

vi.mock('@/components/domain/warranty/views/warranty-extension-history', () => ({
  WarrantyExtensionHistory: (props: ExtensionHistoryProps) => {
    panelCalls.extensionHistory.push(props);
    return (
      <div data-testid="extension-history">
        <button type="button" onClick={props.onExtendClick}>
          Open extend
        </button>
        <button type="button" onClick={props.onRetry}>
          Retry extensions
        </button>
      </div>
    );
  },
}));

type WarrantyDetailOverviewTabProps = ComponentProps<typeof WarrantyDetailOverviewTab>;

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
    notes: 'Installed behind the warehouse sub-board.',
    activatedAt: '2026-02-03T00:00:00.000Z',
    sourceEntitlement: {
      id: 'entitlement-1',
      status: 'activated',
      evidenceType: 'serialized',
      provisioningIssueCode: null,
      deliveredAt: '2026-02-03T00:00:00.000Z',
      orderId: 'order-1',
      orderNumber: 'ORD-001',
      shipmentId: 'shipment-1',
      shipmentNumber: 'SHP-001',
      productSerial: 'RNZ-48100-001',
      unitSequence: 1,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productName: 'RENOZ 48V Battery',
        productSku: 'RNZ-48V',
        productSerial: 'RNZ-48100-001-A',
        warrantyStartDate: '2026-02-03T00:00:00.000Z',
        warrantyEndDate: '2028-02-03T00:00:00.000Z',
        warrantyPeriodMonths: 24,
        installationNotes: null,
      },
    ],
    ...overrides,
  };
}

function createProps(
  overrides: Partial<WarrantyDetailOverviewTabProps> = {}
): WarrantyDetailOverviewTabProps {
  return {
    warranty: createWarranty(),
    daysUntilExpiry: 45,
    extensions: [],
    isExtensionsLoading: false,
    isExtensionsError: false,
    onRetryExtensions: vi.fn(),
    onExtendDialogOpenChange: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  panelCalls.quickAnswer.length = 0;
  panelCalls.serviceMission.length = 0;
  panelCalls.lineage.length = 0;
  panelCalls.extensionHistory.length = 0;
});

describe('WarrantyDetailOverviewTab', () => {
  it('renders the warranty overview panel stack with shared warranty context', () => {
    const props = createProps();

    render(<WarrantyDetailOverviewTab {...props} />);

    expect(screen.getByTestId('quick-answer')).toBeInTheDocument();
    expect(screen.getByTestId('service-mission')).toBeInTheDocument();
    expect(screen.getByTestId('lineage-sections')).toBeInTheDocument();
    expect(screen.getByTestId('extension-history')).toBeInTheDocument();

    expect(panelCalls.quickAnswer[0]).toMatchObject({
      warranty: props.warranty,
      daysUntilExpiry: 45,
    });
    expect(panelCalls.serviceMission[0]).toMatchObject({
      warranty: props.warranty,
    });
    expect(panelCalls.lineage[0]).toMatchObject({
      warranty: props.warranty,
      daysUntilExpiry: 45,
    });
  });

  it('passes extension state and keeps retry/open callbacks wired', () => {
    const onRetryExtensions = vi.fn();
    const onExtendDialogOpenChange = vi.fn();
    const extensions = [
      {
        id: 'extension-1',
        warrantyId: 'warranty-1',
        warrantyNumber: 'WAR-001',
        extensionType: 'promotional' as const,
        extensionMonths: 12,
        previousExpiryDate: '2028-01-01T00:00:00.000Z',
        newExpiryDate: '2029-01-01T00:00:00.000Z',
        price: null,
        notes: null,
        approvedById: null,
        createdAt: '2026-05-01T00:00:00.000Z',
      },
    ];

    render(
      <WarrantyDetailOverviewTab
        {...createProps({
          extensions,
          isExtensionsLoading: true,
          isExtensionsError: true,
          onRetryExtensions,
          onExtendDialogOpenChange,
        })}
      />
    );

    expect(panelCalls.extensionHistory[0]).toMatchObject({
      warrantyId: 'warranty-1',
      originalExpiryDate: '2028-01-01T00:00:00.000Z',
      showExtendButton: false,
      extensions,
      isLoading: true,
      isError: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open extend' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry extensions' }));

    expect(onExtendDialogOpenChange).toHaveBeenCalledWith(true);
    expect(onRetryExtensions).toHaveBeenCalledTimes(1);
  });
});
