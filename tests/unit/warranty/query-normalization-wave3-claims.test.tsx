import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListWarrantyClaims = vi.fn();
const mockGetWarrantyClaimSummary = vi.fn();
const mockGetWarrantyClaim = vi.fn();

vi.mock('@/server/functions/warranty', () => ({
  listWarrantyClaims: (...args: unknown[]) => mockListWarrantyClaims(...args),
  getWarrantyClaimSummary: (...args: unknown[]) => mockGetWarrantyClaimSummary(...args),
  getWarrantyClaim: (...args: unknown[]) => mockGetWarrantyClaim(...args),
  createWarrantyClaim: vi.fn(),
  updateClaimStatus: vi.fn(),
  approveClaim: vi.fn(),
  denyClaim: vi.fn(),
  resolveClaim: vi.fn(),
  assignClaim: vi.fn(),
  cancelWarrantyClaim: vi.fn(),
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
  Wrapper.displayName = 'WarrantyClaimsQueryNormalizationWave3Wrapper';
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
    isClaimsError: false,
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
    onRetryClaims: vi.fn(),
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

describe('warranty claims query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListWarrantyClaims.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    });
    mockGetWarrantyClaimSummary.mockResolvedValue({
      totalClaims: 0,
      pendingClaims: 0,
    });
    mockGetWarrantyClaim.mockResolvedValue({
      id: 'claim-1',
      claimNumber: 'CLM-001',
      status: 'submitted',
    });
  });

  it('treats claim lists and summaries as always-shaped success states', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const {
      useWarrantyClaims,
      useWarrantyClaimsByWarranty,
      useWarrantyClaimSummary,
    } = await import('@/hooks/warranty/claims/use-warranty-claims');

    const claims = renderHook(() => useWarrantyClaims(), {
      wrapper: createWrapper(queryClient),
    });
    const warrantyClaims = renderHook(() => useWarrantyClaimsByWarranty('warranty-1'), {
      wrapper: createWrapper(queryClient),
    });
    const summary = renderHook(() => useWarrantyClaimSummary('warranty-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(claims.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(warrantyClaims.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(summary.result.current.isSuccess).toBe(true));

    expect(claims.result.current.data).toEqual({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    });
    expect(warrantyClaims.result.current.data).toEqual({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    });
    expect(summary.result.current.data).toEqual({
      totalClaims: 0,
      pendingClaims: 0,
    });
  });

  it('preserves not-found semantics for warranty claim detail reads', async () => {
    mockGetWarrantyClaim.mockRejectedValueOnce({
      message: 'Warranty claim not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarrantyClaim } = await import('@/hooks/warranty/claims/use-warranty-claims');

    const { result } = renderHook(() => useWarrantyClaim('missing-claim'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested warranty claim could not be found.',
    });
  });

  it('shows claim history as unavailable instead of pretending the warranty has zero claims', async () => {
    const { WarrantyDetailView } = await import('@/components/domain/warranty/views/warranty-detail-view');

    render(
      <WarrantyDetailView
        {...createWarrantyDetailViewProps()}
        isClaimsError
        claimSummaryState="unavailable"
      />
    );

    const claimsTab = screen.getByRole('tab', { name: /^Claims$/ });
    fireEvent.mouseDown(claimsTab);
    fireEvent.click(claimsTab);

    await waitFor(() => {
      expect(
        screen.getByText('Claim history is temporarily unavailable for this warranty.')
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText('Warranty claims are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No claims filed')).not.toBeInTheDocument();
  });
});
