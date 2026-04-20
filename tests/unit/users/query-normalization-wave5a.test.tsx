import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListUsers = vi.fn();
const mockGetUser = vi.fn();
const mockGetUserStats = vi.fn();
const mockGetUserActivity = vi.fn();
const mockGetInvitationByToken = vi.fn();
const mockListInvitations = vi.fn();
const mockListInvitationStats = vi.fn();
const mockListMySessions = vi.fn();
const mockGetPreferences = vi.fn();
const mockGetMyActivity = vi.fn();

vi.mock('@/server/functions/users/users', () => ({
  listUsers: (...args: unknown[]) => mockListUsers(...args),
  getUser: (...args: unknown[]) => mockGetUser(...args),
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  reactivateUser: vi.fn(),
  bulkUpdateUsers: vi.fn(),
  getUserStats: (...args: unknown[]) => mockGetUserStats(...args),
  exportUsers: vi.fn(),
  transferOwnership: vi.fn(),
}));

vi.mock('@/server/functions/_shared/audit-logs', () => ({
  getUserActivity: (...args: unknown[]) => mockGetUserActivity(...args),
  getMyActivity: (...args: unknown[]) => mockGetMyActivity(...args),
  listAuditLogs: vi.fn(),
  getAuditStats: vi.fn(),
  exportAuditLogs: vi.fn(),
}));

vi.mock('@/server/functions/users/invitations', () => ({
  getInvitationByToken: (...args: unknown[]) => mockGetInvitationByToken(...args),
  acceptInvitation: vi.fn(),
  listInvitations: (...args: unknown[]) => mockListInvitations(...args),
  listInvitationStats: (...args: unknown[]) => mockListInvitationStats(...args),
  sendInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  resendInvitation: vi.fn(),
  batchSendInvitations: vi.fn(),
}));

vi.mock('@/server/functions/users/sessions', () => ({
  listMySessions: (...args: unknown[]) => mockListMySessions(...args),
  terminateSession: vi.fn(),
  terminateAllOtherSessions: vi.fn(),
}));

vi.mock('@/server/functions/users/user-preferences', () => ({
  getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
  setPreference: vi.fn(),
  setPreferences: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  trackInviteSent: vi.fn(),
  trackInviteAccepted: vi.fn(),
  trackInviteResend: vi.fn(),
  trackInviteCancelled: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UsersQueryNormalizationWave5AWrapper';
  return Wrapper;
}

describe('users/admin query normalization wave 5a', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListUsers.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
      },
    });
    mockGetUser.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      role: 'admin',
      status: 'active',
      groups: [],
    });
    mockGetUserStats.mockResolvedValue({
      totalUsers: 0,
      byStatus: {},
      byRole: {},
    });
    mockGetUserActivity.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      },
    });
    mockGetInvitationByToken.mockResolvedValue({
      email: 'invitee@example.com',
      role: 'viewer',
      personalMessage: null,
      organizationName: 'Acme',
      inviterName: 'Ada',
      expiresAt: new Date().toISOString(),
    });
    mockListInvitations.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
      },
    });
    mockListInvitationStats.mockResolvedValue({
      total: 0,
      pending: 0,
      accepted: 0,
      expired: 0,
    });
    mockListMySessions.mockResolvedValue([]);
    mockGetPreferences.mockResolvedValue({
      preferences: [],
      grouped: {},
    });
    mockGetMyActivity.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      },
    });
  });

  it('treats users, sessions, preferences, and my activity as always-shaped success states', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useUsers, useUserStats } = await import('@/hooks/users/use-users');
    const { useMySessions } = await import('@/hooks/users/use-sessions');
    const { useNotificationPreferences } = await import('@/hooks/profile/use-notification-preferences');
    const { useMyActivity } = await import('@/hooks/users/use-my-activity');

    const users = renderHook(() => useUsers(), { wrapper: createWrapper(queryClient) });
    const stats = renderHook(() => useUserStats(), { wrapper: createWrapper(queryClient) });
    const sessions = renderHook(() => useMySessions(), { wrapper: createWrapper(queryClient) });
    const prefs = renderHook(() => useNotificationPreferences(), {
      wrapper: createWrapper(queryClient),
    });
    const activity = renderHook(() => useMyActivity({ page: 1, pageSize: 10 }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(users.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(stats.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(sessions.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(prefs.result.current.isLoading).toBe(false));
    await waitFor(() => expect(activity.result.current.isSuccess).toBe(true));

    expect(users.result.current.data?.items).toEqual([]);
    expect(stats.result.current.data).toEqual({
      totalUsers: 0,
      byStatus: {},
      byRole: {},
    });
    expect(sessions.result.current.data).toEqual([]);
    expect(prefs.result.current.preferences.digestFrequency).toBe('daily');
    expect(activity.result.current.data?.items).toEqual([]);
  });

  it('preserves not-found semantics for user detail reads', async () => {
    mockGetUser.mockRejectedValueOnce({
      message: 'User not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useUser } = await import('@/hooks/users/use-users');

    const { result } = renderHook(() => useUser('missing-user'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested user could not be found.',
    });
  });

  it('preserves not-found semantics for invitation token lookups', async () => {
    mockGetInvitationByToken.mockRejectedValue({
      message: 'Invalid invitation',
      code: 'NOT_FOUND',
      status: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useInvitationByToken } = await import('@/hooks/users/use-invitations');

    const { result } = renderHook(() => useInvitationByToken('bad-token'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy(), { timeout: 4000 });
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'This invitation link is invalid or no longer available.',
    });
  });

  it('keeps the admin users page usable when stats fail independently', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/users/use-users', () => ({
      useUsers: () => ({
        data: {
          items: [],
          pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
        },
        isLoading: false,
        error: null,
      }),
      useUserStats: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('User metrics are temporarily unavailable. Please refresh and try again.'),
      }),
      useDeactivateUser: () => ({ mutate: vi.fn(), isPending: false }),
      useReactivateUser: () => ({ mutate: vi.fn(), isPending: false }),
      useBulkUpdateUsers: () => ({ mutate: vi.fn(), isPending: false }),
      useExportUsers: () => ({ mutate: vi.fn(), isPending: false }),
    }));
    vi.doMock('@/components/shared/data-table', () => ({
      useTableSelection: () => ({
        selectedIds: new Set<string>(),
        isAllSelected: false,
        isPartiallySelected: false,
        handleSelect: vi.fn(),
        handleSelectAll: vi.fn(),
        handleShiftClickRange: vi.fn(),
        clearSelection: vi.fn(),
        isSelected: () => false,
        lastClickedIndex: null,
        setLastClickedIndex: vi.fn(),
      }),
    }));
    vi.doMock('@/components/layout', () => ({
      PageLayout: Object.assign(
        ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        {
        Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        }
      ),
      RouteErrorFallback: ({ error }: { error: Error }) => <div>{error.message}</div>,
    }));
    vi.doMock('@/components/skeletons/admin', () => ({
      AdminTableSkeleton: () => <div>loading</div>,
    }));
    vi.doMock('@/hooks', () => ({
      useConfirmation: () => ({ confirm: vi.fn() }),
      toastSuccess: vi.fn(),
      toastError: vi.fn(),
    }));
    vi.doMock('@tanstack/react-router', async () => {
      const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
        '@tanstack/react-router'
      );
      return {
        ...actual,
        useNavigate: () => vi.fn(),
      };
    });
    vi.doMock('@/routes/_authenticated/admin/users/index', () => ({
      Route: {
        useSearch: () => ({ page: 1, pageSize: 20, search: '', role: null, status: null }),
      },
    }));
    vi.doMock('@/routes/_authenticated/admin/users/users-page', () => ({
      default: ({ statsUnavailableMessage }: { statsUnavailableMessage?: string | null }) => (
        <div>{statsUnavailableMessage}</div>
      ),
    }));

    const { default: UsersAdminPageContainer } = await import(
      '@/routes/_authenticated/admin/users/users-page-container'
    );

    render(<UsersAdminPageContainer />);

    expect(
      screen.getByText(
        'User metrics are temporarily unavailable. Showing the latest user table data.'
      )
    ).toBeInTheDocument();
  });

  it('shows an unavailable message instead of a fake-empty state for notification preferences failures', async () => {
    const { NotificationPreferencesFormPresenter } = await import(
      '@/components/domain/users/notification-preferences-form'
    );

    render(
      <NotificationPreferencesFormPresenter
        preferences={{
          email: true,
          push: true,
          digestFrequency: 'daily',
          orderUpdates: true,
          customerMessages: true,
          inventoryAlerts: true,
          taskReminders: true,
          mentions: true,
          systemAnnouncements: true,
        }}
        isLoading={false}
        error="Notification preferences are temporarily unavailable. Please refresh and try again."
        isPending={false}
        onToggle={vi.fn()}
        onDigestChange={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        'Notification preferences are temporarily unavailable. Please refresh and try again.'
      )
    ).toBeInTheDocument();
  });
});
