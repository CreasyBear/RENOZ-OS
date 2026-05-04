import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetCurrentUser = vi.fn();
const mockGetUser = vi.fn();
const mockListUserNamesForLookup = vi.fn();
const mockListGroups = vi.fn();
const mockGetGroup = vi.fn();
const mockListGroupMembers = vi.fn();
const mockGetUserGroups = vi.fn();
const mockGetOnboardingProgress = vi.fn();
const mockListApiTokens = vi.fn();
const mockGetOrganizationOnboardingProgress = vi.fn();

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>('@tanstack/react-start');
  return {
    ...actual,
    useServerFn: <T,>(fn: T) => fn,
  };
});

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({
    user: {
      appUserId: 'user-1',
    },
  }),
}));

vi.mock('@/server/functions/users/users', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  getUser: (...args: unknown[]) => mockGetUser(...args),
  updateUser: vi.fn(),
  listUserNamesForLookup: (...args: unknown[]) => mockListUserNamesForLookup(...args),
}));

vi.mock('@/server/functions/users/user-groups', () => ({
  listGroups: (...args: unknown[]) => mockListGroups(...args),
  getGroup: (...args: unknown[]) => mockGetGroup(...args),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  listGroupMembers: (...args: unknown[]) => mockListGroupMembers(...args),
  addGroupMember: vi.fn(),
  updateGroupMemberRole: vi.fn(),
  removeGroupMember: vi.fn(),
  getUserGroups: (...args: unknown[]) => mockGetUserGroups(...args),
}));

vi.mock('@/server/functions/users/onboarding', () => ({
  getOnboardingProgress: (...args: unknown[]) => mockGetOnboardingProgress(...args),
  completeOnboardingStep: vi.fn(),
  dismissOnboardingStep: vi.fn(),
  resetOnboarding: vi.fn(),
}));

vi.mock('@/server/functions/settings/api-tokens', () => ({
  listApiTokens: (...args: unknown[]) => mockListApiTokens(...args),
  createApiToken: vi.fn(),
  revokeApiToken: vi.fn(),
}));

vi.mock('@/server/onboarding', () => ({
  getOrganizationOnboardingProgress: (...args: unknown[]) =>
    mockGetOrganizationOnboardingProgress(...args),
  dismissWelcomeChecklist: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'SystemQueryNormalizationWave6AWrapper';
  return Wrapper;
}

describe('system/admin query normalization wave 6a', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetCurrentUser.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
    });
    mockGetUser.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      role: 'admin',
      status: 'active',
      groups: [],
    });
    mockListUserNamesForLookup.mockResolvedValue({ items: [] });
    mockListGroups.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 24,
        totalItems: 0,
        totalPages: 0,
      },
    });
    mockGetGroup.mockResolvedValue({
      id: 'group-1',
      name: 'Operations',
      description: 'Ops team',
      color: '#3B82F6',
      isActive: true,
    });
    mockListGroupMembers.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 100,
        totalItems: 0,
        totalPages: 0,
      },
    });
    mockGetUserGroups.mockResolvedValue([]);
    mockGetOnboardingProgress.mockResolvedValue({
      steps: [],
      stats: {
        totalSteps: 4,
        completedSteps: 0,
        dismissedSteps: 0,
        remainingSteps: 4,
        percentComplete: 0,
      },
    });
    mockListApiTokens.mockResolvedValue([]);
    mockGetOrganizationOnboardingProgress.mockResolvedValue({
      dismissed: false,
      hasCustomer: false,
      hasProduct: false,
      hasQuote: false,
    });
  });

  it('hardens the read-path guard against generic null-sentinel hook patterns', () => {
    const guardSource = readFileSync(
      path.resolve('scripts/check-read-path-query-guards.mjs'),
      'utf8'
    );

    expect(guardSource).toContain('if\\s*\\(result == null\\)');
    expect(guardSource).toContain('throw normalizeQueryError\\(');
  });

  it('treats current-user, group list, onboarding, api tokens, and dashboard onboarding as healthy shaped success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCurrentUserProfile } = await import('@/hooks/auth/use-current-user-profile');
    const { useGroups, useOnboardingProgress: useUserOnboardingProgress, useUserLookup } =
      await import('@/hooks/users');
    const { useApiTokens } = await import('@/hooks/settings/use-api-tokens');
    const { useOnboardingProgress: useDashboardOnboardingProgress } = await import(
      '@/hooks/dashboard/use-onboarding'
    );

    const currentUser = renderHook(() => useCurrentUserProfile(), {
      wrapper: createWrapper(queryClient),
    });
    const groups = renderHook(() => useGroups(), { wrapper: createWrapper(queryClient) });
    const onboarding = renderHook(() => useUserOnboardingProgress(), {
      wrapper: createWrapper(queryClient),
    });
    const apiTokens = renderHook(() => useApiTokens(), { wrapper: createWrapper(queryClient) });
    const dashboardOnboarding = renderHook(() => useDashboardOnboardingProgress(), {
      wrapper: createWrapper(queryClient),
    });
    const lookup = renderHook(() => useUserLookup(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(currentUser.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(groups.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(onboarding.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(apiTokens.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(dashboardOnboarding.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(lookup.result.current.isLoading).toBe(false));

    expect(currentUser.result.current.data?.email).toBe('ada@example.com');
    expect(groups.result.current.data?.items).toEqual([]);
    expect(onboarding.result.current.data?.stats.percentComplete).toBe(0);
    expect(apiTokens.result.current.data).toEqual([]);
    expect(dashboardOnboarding.result.current.data).toEqual({
      dismissed: false,
      hasCustomer: false,
      hasProduct: false,
      hasQuote: false,
    });
    expect(lookup.result.current.userMap.size).toBe(0);
    expect(lookup.result.current.error).toBeNull();
  });

  it('preserves not-found semantics for profile and group detail reads', async () => {
    mockGetUser.mockRejectedValueOnce({
      message: 'User not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    mockGetGroup.mockRejectedValueOnce({
      message: 'Group not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    mockListGroupMembers.mockRejectedValueOnce({
      message: 'Group not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useProfile } = await import('@/hooks/profile/use-profile');
    const { useGroup, useGroupMembers } = await import('@/hooks/users/use-groups');

    const profile = renderHook(() => useProfile('missing-user'), {
      wrapper: createWrapper(queryClient),
    });
    const group = renderHook(() => useGroup('missing-group'), {
      wrapper: createWrapper(queryClient),
    });
    const members = renderHook(() => useGroupMembers('missing-group'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(profile.result.current.error).toBeTruthy());
    await waitFor(() => expect(group.result.current.error).toBeTruthy());
    await waitFor(() => expect(members.result.current.error).toBeTruthy());

    expect(profile.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested user profile could not be found.',
    });
    expect(group.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested group could not be found.',
    });
    expect(members.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested group could not be found.',
    });
  });

  it('preserves the lookup error signal on cold-load failure', async () => {
    mockListUserNamesForLookup.mockRejectedValueOnce({
      message: 'User lookup is temporarily unavailable. Please refresh and try again.',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useUserLookup } = await import('@/hooks/users');

    const lookup = renderHook(() => useUserLookup(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(lookup.result.current.isLoading).toBe(false));
    expect(lookup.result.current.error).toMatchObject({
      message: 'User lookup is temporarily unavailable. Please refresh and try again.',
    });
  });

  it('keeps group detail usable when member and available-user reads fail', async () => {
    vi.resetModules();

    vi.doMock('@/hooks/users', () => ({
      useGroup: () => ({
        data: {
          id: 'group-1',
          name: 'Operations',
          description: 'Ops team',
          color: '#3B82F6',
          isActive: true,
        },
        isLoading: false,
        error: null,
      }),
      useGroupMembers: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('Group members are temporarily unavailable. Please refresh and try again.'),
      }),
      useUsers: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('Available users are temporarily unavailable. Please refresh and try again.'),
      }),
      useUpdateGroup: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useAddGroupMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useUpdateGroupMemberRole: () => ({ mutateAsync: vi.fn(), isPending: false }),
      useRemoveGroupMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
    }));
    vi.doMock('@/hooks', () => ({
      useConfirmation: () => ({ confirm: vi.fn() }),
      toast: { success: vi.fn(), error: vi.fn() },
    }));
    vi.doMock('@/components/layout', () => ({
      PageLayout: Object.assign(
        ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        {
          Content: ({ children, className }: { children: React.ReactNode; className?: string }) => (
            <div className={className}>{children}</div>
          ),
        }
      ),
    }));
    vi.doMock('@/components/layout/use-detail-breadcrumb', () => ({
      useDetailBreadcrumb: vi.fn(),
    }));
    vi.doMock('@/components/skeletons/admin', () => ({
      AdminDetailSkeleton: () => <div>loading</div>,
    }));
    vi.doMock('@/routes/_authenticated/admin/groups/$groupId', () => ({
      Route: {
        useParams: () => ({ groupId: 'group-1' }),
        useSearch: () => ({ tab: 'members' }),
      },
    }));
    vi.doMock('@/routes/_authenticated/admin/groups/group-detail-page', () => ({
      default: ({
        membersUnavailableMessage,
        usersUnavailableMessage,
      }: {
        membersUnavailableMessage?: string | null;
        usersUnavailableMessage?: string | null;
      }) => (
        <div>
          <div>{membersUnavailableMessage}</div>
          <div>{usersUnavailableMessage}</div>
          <div>group-detail-presenter</div>
        </div>
      ),
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

    const { default: GroupDetailPageContainer } = await import(
      '@/routes/_authenticated/admin/groups/group-detail-page-container'
    );

    render(<GroupDetailPageContainer />);

    expect(screen.getByText('group-detail-presenter')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'Group members are temporarily unavailable. Please refresh and try again.'
      ).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText('Available users are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Failed to load group data. Please try again.')).not.toBeInTheDocument();
  });

  it('renders unavailable member and add-member states instead of fake empty copy', async () => {
    vi.resetModules();
    vi.doUnmock('@/routes/_authenticated/admin/groups/group-detail-page');

    const { default: GroupDetailPagePresenter } = await import(
      '@/routes/_authenticated/admin/groups/group-detail-page'
    );

    render(
      <GroupDetailPagePresenter
        group={{
          id: 'group-1',
          name: 'Operations',
          description: 'Ops team',
          color: '#3B82F6',
          isActive: true,
        }}
        members={[]}
        users={[]}
        membersUnavailableMessage="Group members are temporarily unavailable. Please refresh and try again."
        membersDegradedMessage={null}
        usersUnavailableMessage="Available users are temporarily unavailable. Please refresh and try again."
        usersDegradedMessage={null}
        tab="members"
        groupId="group-1"
        updateGroupMutation={{ isPending: false } as never}
        addMemberMutation={{ isPending: false } as never}
        updateMemberRoleMutation={{ isPending: false } as never}
        removeMemberMutation={{ isPending: false } as never}
        onSaveChanges={vi.fn()}
        onAddMember={vi.fn()}
        onUpdateRole={vi.fn()}
        onRemoveMember={vi.fn()}
        onTabChange={vi.fn()}
      />
    );

    expect(screen.getByText('Members unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No members yet')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add member/i }));

    expect(
      screen.getByText('Available users are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Add Member$/i })).toBeDisabled();
  });

  it('shows an unavailable message instead of a fake empty state for api tokens failures', async () => {
    vi.resetModules();

    vi.doMock('@/components/shared/permission-guard', () => ({
      PermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      useHasPermission: () => true,
    }));
    vi.doMock('@/components/layout', () => ({
      PageLayout: Object.assign(
        ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        {
          Header: ({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) => (
            <div>
              <h1>{title}</h1>
              {description ? <p>{description}</p> : null}
              {actions}
            </div>
          ),
          Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        }
      ),
      RouteErrorFallback: ({ error }: { error: Error }) => <div>{error.message}</div>,
    }));
    vi.doMock('@/components/skeletons/settings', () => ({
      SettingsTableSkeleton: () => <div>loading</div>,
    }));
    vi.doMock('@/hooks/settings', () => ({
      useApiTokens: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('API tokens are temporarily unavailable. Please refresh and try again.'),
      }),
      useCreateApiToken: () => ({ mutate: vi.fn(), isPending: false }),
      useRevokeApiToken: () => ({ mutate: vi.fn(), isPending: false }),
    }));

    const { Route } = await import('@/routes/_authenticated/settings/api-tokens');
    const ApiTokensPage = Route.options.component as React.ComponentType;

    render(<ApiTokensPage />);

    expect(
      screen.getAllByText('API tokens are temporarily unavailable. Please refresh and try again.')
        .length
    ).toBeGreaterThan(0);
    expect(screen.queryByText('No API Tokens')).not.toBeInTheDocument();
  });

  it('shows an unavailable state instead of silent onboarding content when onboarding cannot load', async () => {
    vi.resetModules();

    vi.doMock('@/hooks/users', () => ({
      useOnboardingProgress: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('Onboarding progress is temporarily unavailable. Please refresh and try again.'),
      }),
    }));
    vi.doMock('@/lib/analytics', () => ({
      trackOnboardingStarted: vi.fn(),
      trackOnboardingCompleted: vi.fn(),
    }));
    vi.doMock('@/components/layout', () => ({
      PageLayout: Object.assign(
        ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        {
          Content: ({ children, className }: { children: React.ReactNode; className?: string }) => (
            <div className={className}>{children}</div>
          ),
        }
      ),
    }));
    vi.doMock('@/components/shared/onboarding-checklist', () => ({
      OnboardingChecklist: () => <div>checklist</div>,
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

    const { Route } = await import('@/routes/_authenticated/onboarding/index');
    const OnboardingPage = Route.options.component as React.ComponentType;

    render(<OnboardingPage />);

    expect(
      screen.getByText('Onboarding progress is temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText("Welcome! Let's get you set up")).not.toBeInTheDocument();
  });
});
