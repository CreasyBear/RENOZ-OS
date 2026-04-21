import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListNotifications = vi.fn();
const mockMarkNotificationRead = vi.fn();
const mockGetJobStatus = vi.fn();
const mockGetActiveJobs = vi.fn();
const mockGetDomainVerificationStatus = vi.fn();
const mockListInboxEmailAccounts = vi.fn();
const mockListWarrantyEntitlements = vi.fn();
const mockGetWarrantyEntitlement = vi.fn();
const mockGetGeneratedDocuments = vi.fn();
const mockListAttachments = vi.fn();
const mockGetPresignedDownloadUrl = vi.fn();
const mockGetPresignedDownloadUrls = vi.fn();
const mockGetTransformedImageUrl = vi.fn();

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>('@tanstack/react-start');
  return {
    ...actual,
    useServerFn: <T,>(fn: T) => fn,
  };
});

vi.mock('@/server/functions/notifications', () => ({
  listNotifications: (...args: unknown[]) => mockListNotifications(...args),
  markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
}));

vi.mock('@/server/automation-jobs', () => ({
  getJobStatus: (...args: unknown[]) => mockGetJobStatus(...args),
  getActiveJobs: (...args: unknown[]) => mockGetActiveJobs(...args),
}));

vi.mock('@/server/functions/communications/email-domain', () => ({
  getDomainVerificationStatus: (...args: unknown[]) => mockGetDomainVerificationStatus(...args),
}));

vi.mock('@/server/functions/communications/inbox-accounts', () => ({
  listInboxEmailAccounts: (...args: unknown[]) => mockListInboxEmailAccounts(...args),
  connectInboxEmailAccount: vi.fn(),
  handleInboxEmailAccountCallback: vi.fn(),
  syncInboxEmailAccount: vi.fn(),
  deleteInboxEmailAccount: vi.fn(),
}));

vi.mock('@/server/functions/warranty', () => ({
  listWarrantyEntitlements: (...args: unknown[]) => mockListWarrantyEntitlements(...args),
  getWarrantyEntitlement: (...args: unknown[]) => mockGetWarrantyEntitlement(...args),
  activateWarrantyFromEntitlement: vi.fn(),
}));

vi.mock('@/server/functions/documents/get-generated-documents', () => ({
  getGeneratedDocuments: (...args: unknown[]) => mockGetGeneratedDocuments(...args),
}));

vi.mock('@/server/functions/files/files-supabase', () => ({
  getPresignedUploadUrl: vi.fn(),
  confirmUpload: vi.fn(),
  getPresignedDownloadUrl: (...args: unknown[]) => mockGetPresignedDownloadUrl(...args),
  getPresignedDownloadUrls: (...args: unknown[]) => mockGetPresignedDownloadUrls(...args),
  getTransformedImageUrl: (...args: unknown[]) => mockGetTransformedImageUrl(...args),
  listAttachments: (...args: unknown[]) => mockListAttachments(...args),
  deleteAttachment: vi.fn(),
  bulkDeleteAttachments: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'SystemQueryNormalizationWave6BWrapper';
  return Wrapper;
}

describe('system/operational query normalization wave 6b', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListNotifications.mockResolvedValue({
      notifications: [],
      unreadCount: 0,
    });
    mockGetJobStatus.mockResolvedValue({
      id: 'job-1',
      name: 'Sync inbox',
      status: 'running',
      metadata: null,
    });
    mockGetActiveJobs.mockResolvedValue([]);
    mockGetDomainVerificationStatus.mockResolvedValue({
      configured: false,
      domain: null,
      error: 'RESEND_DOMAIN_ID not configured',
    });
    mockListInboxEmailAccounts.mockResolvedValue({
      accounts: [],
      total: 0,
    });
    mockListWarrantyEntitlements.mockResolvedValue({
      entitlements: [],
      total: 0,
      hasMore: false,
      nextOffset: undefined,
    });
    mockGetWarrantyEntitlement.mockResolvedValue({
      id: 'entitlement-1',
      status: 'pending_activation',
      evidenceType: 'serialized',
      provisioningIssueCode: null,
      deliveredAt: '2026-04-21T00:00:00.000Z',
      orderId: 'order-1',
      orderNumber: 'ORD-100',
      shipmentId: 'shipment-1',
      shipmentNumber: 'SHP-100',
      customerId: 'customer-1',
      customerName: 'Acme',
      productId: 'product-1',
      productName: 'Sensor',
      productSku: 'SNS-1',
      productSerial: 'SER-1',
      unitSequence: null,
      warrantyPolicyId: 'policy-1',
      policyName: 'Standard',
      activatedWarrantyId: null,
      activatedWarrantyNumber: null,
      commercialCustomer: { id: 'customer-1', name: 'Acme' },
      ownerRecord: null,
    });
    mockGetGeneratedDocuments.mockResolvedValue({
      items: [],
    });
    mockListAttachments.mockResolvedValue({
      attachments: [],
      total: 0,
    });
    mockGetPresignedDownloadUrl.mockResolvedValue({
      downloadUrl: 'https://example.com/file.pdf',
      expiresAt: '2026-04-21T01:00:00.000Z',
      filename: 'file.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 512,
    });
    mockGetPresignedDownloadUrls.mockResolvedValue({});
    mockGetTransformedImageUrl.mockResolvedValue({
      url: 'https://example.com/image.jpg',
      expiresAt: '2026-04-21T01:00:00.000Z',
    });
  });

  it('treats operational lists and histories as healthy shaped success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useNotifications } = await import('@/hooks/notifications/use-notifications');
    const { useActiveJobs } = await import('@/hooks/automation-jobs/use-job-progress');
    const { useDomainVerification } = await import('@/hooks/communications/use-domain-verification');
    const { useInboxEmailAccounts } = await import('@/hooks/communications/use-inbox-email-accounts');
    const { useWarrantyEntitlements } = await import('@/hooks/warranty/entitlements/use-warranty-entitlements');
    const { useDocumentHistory } = await import('@/hooks/documents/use-document-history');
    const { useAttachments } = await import('@/hooks/files/use-files-supabase');

    const notifications = renderHook(() => useNotifications({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    });
    const activeJobs = renderHook(() => useActiveJobs({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    });
    const domain = renderHook(() => useDomainVerification(), {
      wrapper: createWrapper(queryClient),
    });
    const inboxAccounts = renderHook(() => useInboxEmailAccounts(), {
      wrapper: createWrapper(queryClient),
    });
    const entitlements = renderHook(() => useWarrantyEntitlements(), {
      wrapper: createWrapper(queryClient),
    });
    const documents = renderHook(
      () => useDocumentHistory({ entityType: 'order', entityId: 'order-1' }),
      { wrapper: createWrapper(queryClient) }
    );
    const attachments = renderHook(() => useAttachments('order', 'order-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(notifications.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(activeJobs.result.current.isLoading).toBe(false));
    await waitFor(() => expect(domain.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(inboxAccounts.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(entitlements.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(documents.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(attachments.result.current.isSuccess).toBe(true));

    expect(notifications.result.current.data).toEqual({
      notifications: [],
      unreadCount: 0,
    });
    expect(activeJobs.result.current.jobs).toEqual([]);
    expect(domain.result.current.data?.configured).toBe(false);
    expect(inboxAccounts.result.current.data?.accounts).toEqual([]);
    expect(entitlements.result.current.data?.entitlements).toEqual([]);
    expect(documents.result.current.data?.documents).toEqual([]);
    expect(attachments.result.current.data?.attachments).toEqual([]);
  });

  it('preserves not-found semantics for job progress, warranty entitlement detail, and attachment downloads', async () => {
    mockGetJobStatus.mockRejectedValueOnce({
      message: 'Job not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    mockGetWarrantyEntitlement.mockRejectedValueOnce({
      message: 'Warranty entitlement not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    mockGetPresignedDownloadUrl.mockRejectedValueOnce({
      message: 'Attachment not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useJobProgress } = await import('@/hooks/automation-jobs/use-job-progress');
    const { useWarrantyEntitlement } = await import('@/hooks/warranty/entitlements/use-warranty-entitlements');
    const { useDownloadUrl } = await import('@/hooks/files/use-files-supabase');

    const job = renderHook(() => useJobProgress({ jobId: 'missing-job' }), {
      wrapper: createWrapper(queryClient),
    });
    const entitlement = renderHook(() => useWarrantyEntitlement('missing-entitlement'), {
      wrapper: createWrapper(queryClient),
    });
    const download = renderHook(() => useDownloadUrl('missing-attachment'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(job.result.current.error).toBeTruthy());
    await waitFor(() => expect(entitlement.result.current.error).toBeTruthy());
    await waitFor(() => expect(download.result.current.error).toBeTruthy());

    expect(job.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested job could not be found.',
    });
    expect(entitlement.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested warranty entitlement could not be found.',
    });
    expect(download.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested attachment could not be found.',
    });
  });

  it('shows degraded notifications instead of a fake empty state when stale items remain', async () => {
    vi.resetModules();
    vi.doMock('@/components/domain/notifications/notification-list-item', () => ({
      NotificationListItem: ({
        item,
      }: {
        item: { title: string };
      }) => <div>{item.title}</div>,
    }));

    const { NotificationCenterPopover } = await import(
      '@/components/domain/notifications/notification-center-popover'
    );

    render(
      <NotificationCenterPopover
        notifications={[
          {
            id: 'notification-1',
            type: 'system',
            title: 'Sync finished',
            message: 'Inbox sync completed.',
            status: 'unread',
            data: null,
            createdAt: new Date('2026-04-21T00:00:00.000Z'),
            readAt: null,
          },
        ]}
        unreadCount={1}
        isLoading={false}
        error={new Error('Notifications are temporarily unavailable. Please refresh and try again.')}
        onMarkRead={vi.fn()}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(
      screen.getByText('Notifications are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('Sync finished')).toBeInTheDocument();
    expect(screen.queryByText('No new notifications')).not.toBeInTheDocument();
  });

  it('keeps inbox email accounts visible when refresh fails after data has loaded', async () => {
    vi.resetModules();

    vi.doMock('@/hooks/communications/use-inbox-email-accounts', () => ({
      useInboxEmailAccounts: () => ({
        data: {
          accounts: [
            {
              id: 'account-1',
              organizationId: 'org-1',
              userId: 'user-1',
              provider: 'google_workspace',
              email: 'ops@example.com',
              externalAccountId: 'ops@example.com',
              status: 'connected',
              lastSyncedAt: new Date('2026-04-21T00:00:00.000Z'),
              createdAt: new Date('2026-04-21T00:00:00.000Z'),
              updatedAt: new Date('2026-04-21T00:00:00.000Z'),
            },
          ],
          total: 1,
        },
        isLoading: false,
        error: new Error('Email accounts are temporarily unavailable. Please refresh and try again.'),
      }),
      useSyncInboxEmailAccount: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
      useDeleteInboxEmailAccount: () => ({ mutate: vi.fn(), isPending: false }),
    }));
    vi.doMock('@/hooks/_shared/use-confirmation', () => ({
      useConfirmation: () => ({ confirm: vi.fn() }),
    }));

    const { InboxEmailAccountsSettings } = await import(
      '@/components/domain/communications/inbox/inbox-email-accounts-settings'
    );

    render(<InboxEmailAccountsSettings />);

    expect(
      screen.getByText('Email accounts are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('ops@example.com')).toBeInTheDocument();
  });

  it('keeps warranty queues, document history, and attachments visible on degraded reads', async () => {
    vi.resetModules();

    vi.doMock('@/hooks/warranty', () => ({
      useWarrantyEntitlements: () => ({
        data: {
          entitlements: [{ id: 'entitlement-1', productName: 'Sensor' }],
          total: 1,
        },
        isLoading: false,
        error: new Error('Warranty entitlements are temporarily unavailable. Please refresh and try again.'),
        refetch: vi.fn(),
        isRefetching: false,
      }),
      useActivateWarrantyFromEntitlement: () => ({ mutateAsync: vi.fn(), isPending: false }),
    }));
    vi.doMock('@/components/domain/warranty/views/warranty-entitlements-list-view', () => ({
      WarrantyEntitlementsListView: ({
        entitlements,
      }: {
        entitlements: Array<{ id: string; productName: string }>;
      }) => <div>{entitlements[0]?.productName}</div>,
    }));
    vi.doMock('@/components/domain/warranty/dialogs/activate-warranty-dialog', () => ({
      ActivateWarrantyDialog: () => null,
    }));
    vi.doMock('@/components/domain/warranty/dialogs/warranty-entitlement-review-dialog', () => ({
      WarrantyEntitlementReviewDialog: () => null,
    }));

    const { WarrantyEntitlementsListContainer } = await import(
      '@/components/domain/warranty/containers/warranty-entitlements-list-container'
    );

    render(
      <WarrantyEntitlementsListContainer
        search={{}}
        onSearchChange={vi.fn()}
      />
    );

    expect(
      screen.getByText('Warranty entitlements are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('Sensor')).toBeInTheDocument();

    vi.resetModules();
    vi.doMock('@/hooks/documents/use-document-history', () => ({
      useDocumentHistory: () => ({
        data: {
          documents: [
            {
              id: 'doc-1',
              filename: 'quote.pdf',
              documentType: 'quote',
              storageUrl: 'https://example.com/quote.pdf',
              fileSize: 1024,
              generatedAt: '2026-04-21T00:00:00.000Z',
            },
          ],
          total: 1,
        },
        isLoading: false,
        error: new Error('Document history is temporarily unavailable. Please refresh and try again.'),
      }),
      formatFileSize: (bytes: number) => `${bytes} B`,
      getDocumentTypeLabel: () => 'Quote',
    }));

    const { DocumentHistoryList } = await import('@/components/domain/documents/document-history-list');

    render(<DocumentHistoryList entityType="order" entityId="order-1" />);

    expect(
      screen.getByText('Document history is temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('quote.pdf')).toBeInTheDocument();

    vi.resetModules();
    vi.doMock('@/hooks', () => ({
      useAttachments: () => ({
        data: {
          attachments: [
            {
              id: 'attachment-1',
              originalFilename: 'invoice.pdf',
              filename: 'invoice.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 1024,
            },
          ],
        },
        isLoading: false,
        isError: true,
        error: new Error('Attachments are temporarily unavailable. Please refresh and try again.'),
      }),
      useDownloadUrl: () => ({ data: { downloadUrl: 'https://example.com/invoice.pdf' } }),
      useDeleteFile: () => ({ mutate: vi.fn(), isPending: false }),
    }));

    const { AttachmentList } = await import('@/components/files/attachment-list');

    render(<AttachmentList entityType="order" entityId="order-1" />);

    expect(
      screen.getByText('Attachments are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
  });

  it('renders an unavailable indicator for AI approvals instead of silently showing zero', async () => {
    vi.resetModules();

    vi.doMock('@/hooks/ai', () => ({
      useAIPendingApprovalsCount: () => ({
        data: 0,
        isLoading: false,
        error: new Error('AI approvals are temporarily unavailable. Please refresh and try again.'),
      }),
    }));

    const { ApprovalsBadge } = await import('@/components/domain/ai/approvals-badge');

    render(<ApprovalsBadge />);

    expect(screen.getByLabelText('AI approvals unavailable')).toBeInTheDocument();
  });
});
