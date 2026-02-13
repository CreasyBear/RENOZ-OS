/**
 * Installers List Page
 *
 * Installer directory with card-based layout showing:
 * - Profile info with avatar
 * - Status and availability
 * - Skills badges
 * - Territory coverage
 * - Quick actions
 *
 * SPRINT-03: Story 020 - Installer management routes
 *
 * @source hooks   src/hooks/jobs/use-installers.ts
 * @source schemas src/lib/schemas/jobs/installers.ts
 * @source server  src/server/functions/installers.ts
 * @source config  src/components/domain/jobs/installers/installer-status-config.ts
 * @source filters src/components/domain/jobs/installers/installer-filter-config.ts
 */

import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { PageLayout } from '@/components/layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/shared/empty-state';
import {
  InstallerCard,
  InstallerCardSkeleton,
  DEFAULT_INSTALLER_FILTERS,
  INSTALLER_FILTER_CONFIG,
  type InstallerFiltersState,
  type InstallerStatus,
} from '@/components/domain/jobs/installers';
import { BulkActionsBar } from '@/components/layout';
import { CheckCircle } from 'lucide-react';
import { DomainFilterBar } from '@/components/shared/filters';
import { FormActions, SelectField } from '@/components/shared/forms';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { Search, Plus } from 'lucide-react';
import { toastError, toastSuccess, useConfirmation } from '@/hooks';
import {
  useInstallers,
  useCreateInstallerProfile,
  useUpdateInstallerStatusBatch,
} from '@/hooks/jobs';
import { useUsers } from '@/hooks/users';
import { cn } from '@/lib/utils';
import { useTransformedFilterUrlState } from '@/hooks/filters/use-filter-url-state';
import type {
  InstallerListQuery,
  CreateInstallerProfileDialogInput,
} from '@/lib/schemas/jobs/installers';
import { createInstallerProfileDialogSchema } from '@/lib/schemas/jobs/installers';
import type { installerSearchSchema } from './index';
import type { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

type SearchParams = z.infer<typeof installerSearchSchema>;

// ============================================================================
// URL FILTER TRANSFORMERS
// ============================================================================

const fromUrlParams = (search: SearchParams): InstallerFiltersState => ({
  search: search.search ?? "",
  status: search.status ? [search.status] : [],
});

const toUrlParams = (filters: InstallerFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  status: filters.status.length > 0 ? filters.status[0] : undefined,
});

const DESTRUCTIVE_STATUSES: InstallerStatus[] = ['suspended', 'inactive'];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

interface InstallersPageProps {
  search: SearchParams;
}

export default function InstallersPage({ search }: InstallersPageProps) {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedInstallerIds, setSelectedInstallerIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_INSTALLER_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ['search', 'status'],
  });

  // Data fetching
  const listFilters: Partial<InstallerListQuery> = {
    page: search.page,
    pageSize: 20,
    sortBy: 'name',
    sortOrder: 'asc',
    search: filters.search || undefined,
    status: filters.status[0],
  };
  const { data, isLoading } = useInstallers(listFilters);
  const { data: usersData, isLoading: isUsersLoading } = useUsers(
    {
      page: 1,
      pageSize: 20,
      sortBy: 'name',
      sortOrder: 'asc',
      search: userSearch || undefined,
    },
    isCreateOpen
  );
  const createInstallerProfile = useCreateInstallerProfile();
  const updateInstallerStatusBatch = useUpdateInstallerStatusBatch();
  const confirm = useConfirmation();
  const users = useMemo(() => usersData?.items ?? [], [usersData?.items]);
  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label: user.name ?? user.email,
      })),
    [users]
  );
  const form = useTanStackForm<CreateInstallerProfileDialogInput>({
    schema: createInstallerProfileDialogSchema,
    defaultValues: {
      userId: '',
    },
    onSubmit: async (values) => {
      try {
        const result = await createInstallerProfile.mutateAsync({
          data: { userId: values.userId },
        });
        toastSuccess('Installer profile created');
        setIsCreateOpen(false);
        setUserSearch('');
        setCreateError(null);
        form.reset();
        if (result?.id) {
          navigate({
            to: '/installers/$installerId',
            params: { installerId: result.id },
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to create installer profile';
        toastError(message);
        setCreateError(message);
      }
    },
  });

  // Handlers
  const handleViewInstaller = useCallback(
    (id: string) => {
      navigate({ to: '/installers/$installerId', params: { installerId: id } });
    },
    [navigate]
  );

  const handleFiltersChange = useCallback(
    (nextFilters: InstallerFiltersState) => {
      setFilters(nextFilters);
      setSelectedInstallerIds(new Set());
    },
    [setFilters]
  );

  const handleCreateOpenChange = useCallback((open: boolean) => {
    setIsCreateOpen(open);
    if (open) {
      setUserSearch('');
      setCreateError(null);
      form.reset();
    }
  }, [form]);

  const installers = data?.items || [];
  const pagination = data?.pagination;
  const hasActiveFilters = Boolean(filters.search || filters.status.length > 0);
  const totalCount = pagination?.totalItems ?? installers.length;

  const handleToggleSelect = useCallback((id: string, nextSelected: boolean) => {
    setSelectedInstallerIds((prev) => {
      const next = new Set(prev);
      if (nextSelected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedInstallerIds(new Set());
  }, []);

  const handleBulkStatusUpdate = useCallback(
    async (status: InstallerStatus) => {
      if (selectedInstallerIds.size === 0) return;

      if (DESTRUCTIVE_STATUSES.includes(status)) {
        const { confirmed } = await confirm.confirm({
          title: `Set ${selectedInstallerIds.size} installer(s) to ${status}`,
          description: `This will ${status === 'suspended' ? 'suspend' : 'deactivate'} ${selectedInstallerIds.size} installer(s). They will not appear in scheduling or assignments.`,
          confirmLabel: `Set ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          variant: 'destructive',
        });
        if (!confirmed) return;
      }

      setIsBulkUpdating(true);
      try {
        await updateInstallerStatusBatch.mutateAsync({
          data: {
            installerIds: Array.from(selectedInstallerIds),
            status,
          },
        });
        toastSuccess(`Updated ${selectedInstallerIds.size} installer(s)`);
        setSelectedInstallerIds(new Set());
      } catch (error) {
        toastError(error instanceof Error ? error.message : 'Failed to update installers');
      } finally {
        setIsBulkUpdating(false);
      }
    },
    [selectedInstallerIds, updateInstallerStatusBatch, confirm]
  );

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Installers"
        description="Manage your installation team"
        actions={
          <Button onClick={() => handleCreateOpenChange(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Installer
          </Button>
        }
      />

      <PageLayout.Content>
        <DomainFilterBar<InstallerFiltersState>
          config={INSTALLER_FILTER_CONFIG}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          defaultFilters={DEFAULT_INSTALLER_FILTERS}
          resultCount={totalCount}
        />


        {/* Installers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <InstallerCardSkeleton key={i} />
            ))}
          </div>
        ) : installers.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No installers found"
            message={
              hasActiveFilters
                ? 'Try adjusting your filters.'
                : 'Add your first installer to get started.'
            }
            primaryAction={
              hasActiveFilters
                ? undefined
                : {
                    label: 'Add Installer',
                    onClick: () => handleCreateOpenChange(true),
                    icon: Plus,
                  }
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {installers.map((installer) => (
                <InstallerCard
                  key={installer.id}
                  installer={installer}
                  onClick={() => handleViewInstaller(installer.id)}
                  selected={selectedInstallerIds.has(installer.id)}
                  onToggleSelect={(nextSelected) =>
                    handleToggleSelect(installer.id, nextSelected)
                  }
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    navigate({
                      to: '/installers',
                      search: { ...search, page: Math.max(1, pagination.page - 1) },
                    })
                  }
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    navigate({
                      to: '/installers',
                      search: { ...search, page: Math.min(pagination.totalPages, pagination.page + 1) },
                    })
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </PageLayout.Content>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedInstallerIds.size}
        onClear={handleClearSelection}
        actions={[
          {
            label: 'Set Active',
            icon: CheckCircle,
            onClick: () => handleBulkStatusUpdate('active'),
            disabled: isBulkUpdating,
            loading: isBulkUpdating,
          },
          {
            label: 'Set Busy',
            onClick: () => handleBulkStatusUpdate('busy'),
            disabled: isBulkUpdating,
            loading: isBulkUpdating,
          },
          {
            label: 'Set Away',
            onClick: () => handleBulkStatusUpdate('away'),
            disabled: isBulkUpdating,
            loading: isBulkUpdating,
          },
          {
            label: 'Set Suspended',
            onClick: () => handleBulkStatusUpdate('suspended'),
            variant: 'destructive',
            disabled: isBulkUpdating,
            loading: isBulkUpdating,
          },
          {
            label: 'Set Inactive',
            onClick: () => handleBulkStatusUpdate('inactive'),
            variant: 'destructive',
            disabled: isBulkUpdating,
            loading: isBulkUpdating,
          },
        ]}
      />

      <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Installer</DialogTitle>
            <DialogDescription>
              Create an installer profile for an existing user.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="installer-user-search">Search users</Label>
                <Input
                  id="installer-user-search"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <form.Field name="userId">
                {(field) => (
                  <SelectField
                    field={field}
                    label="User"
                    placeholder="Select a user..."
                    options={userOptions}
                    required
                    disabled={isUsersLoading || users.length === 0}
                    description={
                      isUsersLoading
                        ? 'Loading users...'
                        : users.length === 0
                          ? 'No users found.'
                          : undefined
                    }
                  />
                )}
              </form.Field>
              {!isUsersLoading && users.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Need to add someone?{" "}
                  <Link
                    to="/admin/users/invite"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    Invite user
                  </Link>
                </div>
              )}
              {createError && <p className="text-sm text-destructive">{createError}</p>}
            </div>
            <DialogFooter>
              <FormActions
                form={form}
                submitLabel="Create Installer"
                loadingLabel="Creating..."
                onCancel={() => setIsCreateOpen(false)}
                submitDisabled={isUsersLoading || users.length === 0}
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
