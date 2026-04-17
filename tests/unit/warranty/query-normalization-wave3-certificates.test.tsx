import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetWarrantyCertificate = vi.fn();

vi.mock('@/server/functions/warranty/certificates/warranty-certificates', () => ({
  getWarrantyCertificate: (...args: unknown[]) => mockGetWarrantyCertificate(...args),
  generateWarrantyCertificate: vi.fn(),
  regenerateWarrantyCertificate: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

vi.mock('@/components/shared/activity', () => ({
  UnifiedActivityTimeline: () => null,
}));

vi.mock('@/components/shared', () => ({
  StatusBadge: ({ status }: { status?: string }) => <span>{status}</span>,
  EntityHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DetailGrid: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DetailSection: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
  MetricCard: ({ title, value }: { title?: string; value?: React.ReactNode }) => (
    <div>
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock('@/components/domain/warranty/dialogs/warranty-claim-form-dialog', () => ({
  WarrantyClaimFormDialog: () => null,
}));

vi.mock('@/components/domain/warranty/dialogs/claim-approval-dialog', () => ({
  ClaimApprovalDialog: () => null,
}));

vi.mock('@/components/domain/warranty/dialogs/extend-warranty-dialog', () => ({
  ExtendWarrantyDialog: () => null,
}));

vi.mock('@/components/domain/warranty/views/warranty-extension-history', () => ({
  WarrantyExtensionHistory: () => null,
}));

vi.mock('@/hooks/_shared/use-alert-dismissals', () => ({
  useAlertDismissals: () => ({
    isDismissed: () => false,
    dismiss: vi.fn(),
    restore: vi.fn(),
  }),
  generateAlertIdWithValue: (...parts: unknown[]) => parts.join(':'),
}));

vi.mock('@/hooks/warranty', () => ({
  useWarrantyHeaderActions: () => ({
    primaryAction: null,
    secondaryActions: [],
  }),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'WarrantyCertificatesQueryNormalizationWave3Wrapper';
  return Wrapper;
}

function createWarrantyDetailViewProps() {
  return {
    warranty: {
      id: 'warranty-1',
      warrantyNumber: 'WAR-001',
      customerId: 'customer-1',
      customerName: 'Acme Corp',
      productId: 'product-1',
      productName: 'Home Battery',
      productSerial: 'BAT-001',
      status: 'active',
      policyName: 'Standard Warranty',
      policyType: 'installation_workmanship',
      registrationDate: '2026-01-01T00:00:00.000Z',
      expiryDate: '2027-01-01T00:00:00.000Z',
      currentCycleCount: 0,
      cycleLimit: 6000,
      notes: null,
      expiryAlertOptOut: false,
      lastExpiryAlertSent: null,
      items: [],
      ownerRecord: {
        fullName: 'Acme Corp',
        email: 'ops@acme.test',
        phone: '0400 000 000',
        address: {
          street1: '1 Main St',
          city: 'Perth',
          state: 'WA',
          postalCode: '6000',
        },
      },
      currentOwner: {
        fullName: 'Acme Corp',
        email: 'ops@acme.test',
        phone: '0400 000 000',
      },
      serviceLinkageStatus: 'unlinked',
      serviceSystem: null,
      systemHistoryPreview: [],
      pendingServiceReview: null,
      sourceEntitlement: null,
    },
    headerActionsInLayout: false,
    claims: [],
    claimSummary: undefined,
    claimSummaryState: 'healthy',
    extensions: [],
    certificateStatus: undefined,
    isClaimsLoading: false,
    isClaimSummaryLoading: false,
    isExtensionsLoading: false,
    isExtensionsError: false,
    isCertificateLoading: false,
    isOptOutUpdating: false,
    isSubmittingClaim: false,
    isSubmittingApproval: false,
    isSubmittingExtend: false,
    isClaimDialogOpen: false,
    isApprovalDialogOpen: false,
    isExtendDialogOpen: false,
    pendingClaimAction: null,
    selectedClaimForApproval: null,
    onClaimRowClick: vi.fn(),
    onResolveClaimRow: vi.fn(),
    onReviewClaim: vi.fn(),
    onClaimDialogOpenChange: vi.fn(),
    onApprovalDialogOpenChange: vi.fn(),
    onExtendDialogOpenChange: vi.fn(),
    onRetryExtensions: vi.fn(),
    onClaimsSuccess: vi.fn(),
    onExtensionsSuccess: vi.fn(),
    onSubmitClaim: vi.fn(async () => {}),
    onApproveClaim: vi.fn(async () => {}),
    onDenyClaim: vi.fn(async () => {}),
    onRequestInfoClaim: vi.fn(async () => {}),
    onExtendWarranty: vi.fn(async () => {}),
    onToggleOptOut: vi.fn(),
    certificateError: null,
    onRetryCertificate: vi.fn(),
    onDownloadCertificate: vi.fn(),
    onGenerateCertificate: vi.fn(),
    onRegenerateCertificate: vi.fn(),
    isCertificateGenerating: false,
    isCertificateRegenerating: false,
    onOpenTransferOwnership: vi.fn(),
    isTransferringOwnership: false,
    activities: [],
    activitiesLoading: false,
    activitiesError: null,
    systemActivities: [],
    systemActivitiesLoading: false,
    systemActivitiesError: null,
    onLogActivity: vi.fn(),
    onScheduleFollowUp: vi.fn(),
    onDelete: vi.fn(),
  } as const;
}

describe('warranty certificate query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWarrantyCertificate.mockResolvedValue({
      exists: false,
      certificateUrl: null,
      warranty: {
        id: 'warranty-1',
        warrantyNumber: 'WAR-001',
        customerName: 'Acme Corp',
        productName: 'Home Battery',
        expiryDate: '2027-01-01T00:00:00.000Z',
      },
    });
  });

  it('treats certificate status as always-shaped and accepts absent certificate success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarrantyCertificate } = await import(
      '@/hooks/warranty/certificates/use-warranty-certificates'
    );

    const { result } = renderHook(() => useWarrantyCertificate('warranty-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      exists: false,
      certificateUrl: null,
      warranty: {
        id: 'warranty-1',
        warrantyNumber: 'WAR-001',
        customerName: 'Acme Corp',
        productName: 'Home Battery',
        expiryDate: '2027-01-01T00:00:00.000Z',
      },
    });
  });

  it('normalizes certificate status failures as always-shaped read errors', async () => {
    mockGetWarrantyCertificate.mockRejectedValueOnce({
      message: 'Gateway timeout',
      statusCode: 503,
      code: 'SERVER_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarrantyCertificate } = await import(
      '@/hooks/warranty/certificates/use-warranty-certificates'
    );

    const { result } = renderHook(() => useWarrantyCertificate('warranty-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message:
        'Warranty certificate status is temporarily unavailable. Please refresh and try again.',
    });
  });

  it('shows certificate status as unavailable instead of pretending no certificate exists', async () => {
    const { WarrantyDetailView } = await import('@/components/domain/warranty/views/warranty-detail-view');

    render(
      <WarrantyDetailView
        {...createWarrantyDetailViewProps()}
        certificateError="Warranty certificate status is temporarily unavailable. Please refresh and try again."
      />
    );

    expect(screen.getByText('Certificate status is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('No certificate generated yet.')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Warranty certificate status is temporarily unavailable. Please refresh and try again.'
      )
    ).toBeInTheDocument();
  });
});
