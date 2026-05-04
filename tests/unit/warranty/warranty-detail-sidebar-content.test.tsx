import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { WarrantyDetailSidebarContent } from '@/components/domain/warranty/views/warranty-detail-sidebar-content';
import type { WarrantyDetail } from '@/lib/schemas/warranty';

type SummaryCardProps = {
  warranty: WarrantyDetail;
};

type ServiceSystemCardProps = {
  warranty: WarrantyDetail;
  onOpenTransferOwnership?: () => void;
  isTransferringOwnership?: boolean;
};

type NotificationSettingsCardProps = {
  warranty: WarrantyDetail;
  isOptOutUpdating: boolean;
  onToggleOptOut: (checked: boolean) => void;
};

type CertificateStatusCardProps = {
  certificateStatus: {
    exists: boolean;
    certificateUrl: string | null;
  } | null | undefined;
  isCertificateLoading: boolean;
  certificateError?: string | null;
  onRetryCertificate?: () => void;
};

const cardCalls = vi.hoisted(() => ({
  summary: [] as SummaryCardProps[],
  service: [] as ServiceSystemCardProps[],
  notification: [] as NotificationSettingsCardProps[],
  certificate: [] as CertificateStatusCardProps[],
}));

vi.mock('@/components/domain/warranty/views/warranty-sidebar-summary-cards', () => ({
  WarrantySidebarSummaryCards: (props: SummaryCardProps) => {
    cardCalls.summary.push(props);
    return <div data-testid="sidebar-summary" />;
  },
}));

vi.mock('@/components/domain/warranty/views/warranty-service-linkage', () => ({
  WarrantyServiceSystemCard: (props: ServiceSystemCardProps) => {
    cardCalls.service.push(props);
    return <div data-testid="service-system-card" />;
  },
}));

vi.mock('@/components/domain/warranty/views/warranty-notification-settings-card', () => ({
  WarrantyNotificationSettingsCard: (props: NotificationSettingsCardProps) => {
    cardCalls.notification.push(props);
    return <div data-testid="notification-settings-card" />;
  },
}));

vi.mock('@/components/domain/warranty/views/warranty-certificate-status-card', () => ({
  WarrantyCertificateStatusCard: (props: CertificateStatusCardProps) => {
    cardCalls.certificate.push(props);
    return <div data-testid="certificate-status-card" />;
  },
}));

type WarrantyDetailSidebarContentProps = ComponentProps<typeof WarrantyDetailSidebarContent>;

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

function createProps(
  overrides: Partial<WarrantyDetailSidebarContentProps> = {}
): WarrantyDetailSidebarContentProps {
  return {
    warranty: createWarranty(),
    certificateStatus: { exists: true, certificateUrl: '/certificate.pdf' },
    isCertificateLoading: false,
    certificateError: null,
    isOptOutUpdating: false,
    onToggleOptOut: vi.fn(),
    onRetryCertificate: vi.fn(),
    onOpenTransferOwnership: vi.fn(),
    isTransferringOwnership: false,
    ...overrides,
  };
}

beforeEach(() => {
  cardCalls.summary.length = 0;
  cardCalls.service.length = 0;
  cardCalls.notification.length = 0;
  cardCalls.certificate.length = 0;
});

describe('WarrantyDetailSidebarContent', () => {
  it('renders the complete warranty sidebar rail in order', () => {
    const props = createProps();

    render(<WarrantyDetailSidebarContent {...props} />);

    expect(screen.getByTestId('sidebar-summary')).toBeInTheDocument();
    expect(screen.getByTestId('service-system-card')).toBeInTheDocument();
    expect(screen.getByTestId('notification-settings-card')).toBeInTheDocument();
    expect(screen.getByTestId('certificate-status-card')).toBeInTheDocument();
    expect(cardCalls.summary[0]?.warranty).toBe(props.warranty);
    expect(cardCalls.service[0]?.warranty).toBe(props.warranty);
    expect(cardCalls.notification[0]?.warranty).toBe(props.warranty);
  });

  it('passes transfer, notification, and certificate states through unchanged', () => {
    const onOpenTransferOwnership = vi.fn();
    const onToggleOptOut = vi.fn();
    const onRetryCertificate = vi.fn();
    const certificateStatus = { exists: false, certificateUrl: null };

    render(
      <WarrantyDetailSidebarContent
        {...createProps({
          certificateStatus,
          isCertificateLoading: true,
          certificateError: 'Certificate check failed',
          isOptOutUpdating: true,
          onToggleOptOut,
          onRetryCertificate,
          onOpenTransferOwnership,
          isTransferringOwnership: true,
        })}
      />
    );

    expect(cardCalls.service[0]).toMatchObject({
      onOpenTransferOwnership,
      isTransferringOwnership: true,
    });
    expect(cardCalls.notification[0]).toMatchObject({
      isOptOutUpdating: true,
      onToggleOptOut,
    });
    expect(cardCalls.certificate[0]).toMatchObject({
      certificateStatus,
      isCertificateLoading: true,
      certificateError: 'Certificate check failed',
      onRetryCertificate,
    });
  });
});
