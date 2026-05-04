import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListEmailHistory = vi.fn();
const mockGetScheduledEmails = vi.fn();
const mockGetScheduledEmailById = vi.fn();
const mockGetCustomerCommunications = vi.fn();
const mockGetContactPreferences = vi.fn();
const mockGetPreferenceHistory = vi.fn();
const mockGetSuppressionList = vi.fn();
const mockIsEmailSuppressed = vi.fn();

const mockUseScheduledCalls = vi.fn();
const mockUseCompleteCall = vi.fn();
const mockUseCancelCall = vi.fn();
const mockUseRescheduleCall = vi.fn();

process.env.RESEND_API_KEY = 're_test_key';

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>();
  const createServerFn = () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      validator: () => builder,
      handler: (fn: unknown) => fn,
    };
    return builder;
  };

  return {
    ...actual,
    createServerFn,
    useServerFn: <T,>(fn: T) => fn,
  };
});

vi.mock('@/server/functions/communications/email-history', () => ({
  listEmailHistory: (...args: unknown[]) => mockListEmailHistory(...args),
}));

vi.mock('@/server/functions/communications/scheduled-emails', () => ({
  getScheduledEmails: (...args: unknown[]) => mockGetScheduledEmails(...args),
  getScheduledEmailById: (...args: unknown[]) => mockGetScheduledEmailById(...args),
  scheduleEmail: vi.fn(),
  updateScheduledEmail: vi.fn(),
  cancelScheduledEmail: vi.fn(),
}));

vi.mock('@/server/functions/communications/customer-communications', () => ({
  getCustomerCommunications: (...args: unknown[]) => mockGetCustomerCommunications(...args),
}));

vi.mock('@/server/functions/communications/communication-preferences', () => ({
  getContactPreferences: (...args: unknown[]) => mockGetContactPreferences(...args),
  getPreferenceHistory: (...args: unknown[]) => mockGetPreferenceHistory(...args),
  updateContactPreferences: vi.fn(),
}));

vi.mock('@/server/functions/communications/email-suppression', () => ({
  getSuppressionList: (...args: unknown[]) => mockGetSuppressionList(...args),
  isEmailSuppressed: (...args: unknown[]) => mockIsEmailSuppressed(...args),
  checkSuppressionBatch: vi.fn(),
  addSuppression: vi.fn(),
  removeSuppression: vi.fn(),
}));

vi.mock('@/hooks/communications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/communications')>();
  return {
    ...actual,
    useScheduledCalls: (...args: unknown[]) => mockUseScheduledCalls(...args),
    useCompleteCall: (...args: unknown[]) => mockUseCompleteCall(...args),
    useCancelCall: (...args: unknown[]) => mockUseCancelCall(...args),
    useRescheduleCall: (...args: unknown[]) => mockUseRescheduleCall(...args),
  };
});

vi.mock('@/components/domain/communications', () => ({
  ScheduledCallsList: ({
    calls,
  }: {
    calls: Array<{ id: string }>;
  }) => <div>scheduled-calls:{calls.length}</div>,
  CallOutcomeDialog: () => <div>call-outcome-dialog</div>,
}));

vi.mock('@/components/shared', () => ({
  ErrorState: ({
    title,
    message,
  }: {
    title: string;
    message: string;
  }) => (
    <div>
      <div>{title}</div>
      <div>{message}</div>
    </div>
  ),
}));

vi.mock('@/hooks', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'CommunicationsWave4CWrapper';
  return Wrapper;
}

describe('communications query normalization wave 4c', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListEmailHistory.mockResolvedValue({
      items: [],
      hasNextPage: false,
      nextCursor: null,
    });
    mockGetScheduledEmails.mockResolvedValue({
      items: [],
      total: 0,
    });
    mockGetScheduledEmailById.mockResolvedValue(null);
    mockGetCustomerCommunications.mockResolvedValue({
      communications: [],
      total: 0,
    });
    mockGetContactPreferences.mockResolvedValue({
      id: 'contact-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      emailOptIn: true,
      smsOptIn: false,
      emailOptInAt: null,
      smsOptInAt: null,
    });
    mockGetPreferenceHistory.mockResolvedValue({
      items: [],
      total: 0,
    });
    mockGetSuppressionList.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    mockIsEmailSuppressed.mockResolvedValue({
      email: 'ada@example.com',
      isSuppressed: false,
      reason: null,
      bounceType: null,
      suppressedAt: null,
    });

    const idleMutation = { mutateAsync: vi.fn(), isPending: false };
    mockUseScheduledCalls.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseCompleteCall.mockReturnValue(idleMutation);
    mockUseCancelCall.mockReturnValue(idleMutation);
    mockUseRescheduleCall.mockReturnValue(idleMutation);
  });

  it('keeps scheduled email detail nullable by design', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useScheduledEmail } = await import('@/hooks/communications/use-scheduled-emails');

    const { result } = renderHook(
      () => useScheduledEmail({ emailId: 'email-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('preserves not-found semantics for customer communications', async () => {
    mockGetCustomerCommunications.mockRejectedValue({
      message: 'Customer not found',
      code: 'NOT_FOUND',
      status: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCustomerCommunications } = await import('@/hooks/communications/use-customer-communications');

    renderHook(
      () => useCustomerCommunications({ customerId: 'customer-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(queryClient.getQueryCache().getAll()[0]?.state.status).toBe('error');
    });
    expect(
      (queryClient.getQueryCache().getAll()[0]?.state.error as { failureKind?: string }).failureKind
    ).toBe('not-found');
  });

  it('preserves not-found semantics for contact preferences', async () => {
    mockGetContactPreferences.mockRejectedValue({
      message: 'Contact not found',
      code: 'NOT_FOUND',
      status: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useContactPreferences } = await import('@/hooks/communications/use-contact-preferences');

    renderHook(
      () => useContactPreferences({ contactId: 'contact-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(queryClient.getQueryCache().getAll()[0]?.state.status).toBe('error');
    });
    expect(
      (queryClient.getQueryCache().getAll()[0]?.state.error as { failureKind?: string }).failureKind
    ).toBe('not-found');
  });

  it('treats suppression list empty payloads as healthy success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useSuppressionList } = await import('@/hooks/communications/use-email-suppression');

    const { result } = renderHook(
      () => useSuppressionList(),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('keeps cached scheduled calls visible during refetch errors', async () => {
    mockUseScheduledCalls.mockReturnValue({
      data: {
        items: [
          {
            id: 'call-1',
            customerId: 'customer-1',
            scheduledAt: new Date(Date.now() + 60_000).toISOString(),
            purpose: 'follow_up',
          },
        ],
      },
      isLoading: false,
      error: new Error('Scheduled calls are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });

    const { default: CallsPage } = await import('@/routes/_authenticated/communications/calls/calls-page');
    render(<CallsPage />);

    expect(screen.getByText('Showing cached scheduled calls')).toBeInTheDocument();
    expect(screen.getByText('scheduled-calls:1')).toBeInTheDocument();
  }, 20_000);

  it('shows a blocking unavailable state for contact preferences cold-load failures', async () => {
    mockGetContactPreferences.mockRejectedValue(new Error('Contact preferences are temporarily unavailable. Please refresh and try again.'));

    const { CommunicationPreferences } = await import('@/components/domain/communications/communication-preferences');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <CommunicationPreferences contactId="contact-1" contactName="Ada Lovelace" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Preferences unavailable')).toBeInTheDocument();
    });
  });

  it('shows a blocking unavailable state for suppression-list cold-load failures', async () => {
    mockGetSuppressionList.mockRejectedValue(
      new Error('Suppression list data is temporarily unavailable. Please refresh and try again.')
    );

    const { SuppressionListTable } = await import('@/components/domain/communications/settings/suppression-list-table');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <SuppressionListTable />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Suppression list unavailable')).toBeInTheDocument();
    });
  });
});
