/**
 * Invitations Page Container Component
 *
 * Handles data fetching and mutations for invitations management page.
 *
 * @source invitations from useInvitationsFiltered hook
 * @source mutations from useSendInvitation, useCancelInvitation, useResendInvitation hooks
 *
 * @see src/routes/_authenticated/admin/invitations/invitations-page.tsx - Presenter component
 */
import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useConfirmation } from '@/hooks';
import {
  useInvitationsFiltered,
  useInvitationStats,
  useSendInvitation,
  useCancelInvitation,
  useResendInvitation,
} from '@/hooks/users';
import { PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import { Button } from '@/components/ui/button';
import { Route } from './index';
import InvitationsPagePresenter from './invitations-page';
import type { invitationSearchSchema } from './index';
import type { z } from 'zod';

type SearchParams = z.infer<typeof invitationSearchSchema>;

export default function InvitationsPageContainer() {
  const search = Route.useSearch();
  const confirm = useConfirmation();
  const navigate = useNavigate();

  // Data fetching hook
  const {
    data: invitationsData,
    isLoading: isLoadingInvitations,
    error: invitationsError,
    refetch: refetchInvitations,
  } = useInvitationsFiltered({
    page: search.page,
    pageSize: search.pageSize,
    status: search.status === 'all' ? undefined : search.status,
  });
  const { data: invitationStatsData } = useInvitationStats();

  // Mutation hooks
  const sendInvitationMutation = useSendInvitation();
  const cancelInvitationMutation = useCancelInvitation();
  const resendInvitationMutation = useResendInvitation();

  // UI state (will be passed to presenter)
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state (will be passed to presenter)
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'sales' | 'operations' | 'support' | 'viewer'>('viewer');
  const [newMessage, setNewMessage] = useState('');

  // Extract data with defaults
  const invitations = invitationsData ?? {
    items: [],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
    },
  };

  // Filter invitations by search query (in container)
  const filteredInvitations = invitations.items.filter((inv) =>
    inv.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats (in container)
  const stats = {
    total: invitationStatsData?.total ?? invitations.pagination.totalItems,
    pending: invitationStatsData?.pending ?? invitations.items.filter((i) => i.status === 'pending').length,
    accepted:
      invitationStatsData?.accepted ?? invitations.items.filter((i) => i.status === 'accepted').length,
    expired: invitationStatsData?.expired ?? invitations.items.filter((i) => i.status === 'expired').length,
  };

  // Handlers (must be before any conditional returns - Rules of Hooks)
  const handleStatusFilter = useCallback(
    (status: SearchParams['status']) => {
      navigate({
        to: '/admin/invitations',
        search: { ...search, status, page: 1 },
      });
    },
    [navigate, search]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      navigate({
        to: '/admin/invitations',
        search: { ...search, page },
      });
    },
    [navigate, search]
  );

  const handleSendInvitation = useCallback(async () => {
    if (!newEmail.trim()) return;

    sendInvitationMutation.mutate(
      {
        email: newEmail.trim(),
        role: newRole,
        personalMessage: newMessage.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setNewEmail('');
          setNewRole('viewer');
          setNewMessage('');
        },
        // Error handling is done by the hook (toast), but we keep the dialog open on error
        // so user can retry or fix the issue
      }
    );
  }, [newEmail, newRole, newMessage, sendInvitationMutation]);

  const handleCancelInvitation = useCallback(async (invitationId: string, invitationEmail: string) => {
    const confirmed = await confirm.confirm({
      title: 'Cancel Invitation',
      description: `Are you sure you want to cancel the invitation to ${invitationEmail}? They will no longer be able to accept this invitation.`,
      confirmLabel: 'Cancel Invitation',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      cancelInvitationMutation.mutate({ id: invitationId });
    }
  }, [confirm, cancelInvitationMutation]);

  const handleResendInvitation = useCallback(async (invitationId: string, invitationEmail: string) => {
    const confirmed = await confirm.confirm({
      title: 'Resend Invitation',
      description: `Resend invitation email to ${invitationEmail}?`,
      confirmLabel: 'Resend Invitation',
    });

    if (confirmed.confirmed) {
      resendInvitationMutation.mutate({ id: invitationId });
    }
  }, [confirm, resendInvitationMutation]);

  // Helper to get invitation email by ID
  const getInvitationEmail = useCallback((invitationId: string) => {
    const invitation = invitations.items.find((inv) => inv.id === invitationId);
    return invitation?.email ?? '';
  }, [invitations.items]);

  const isSubmitting =
    sendInvitationMutation.isPending ||
    cancelInvitationMutation.isPending ||
    resendInvitationMutation.isPending;

  // Handle loading state
  if (isLoadingInvitations) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <AdminTableSkeleton />
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // Handle error state
  if (invitationsError) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Content>
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-destructive text-center">
              Failed to load invitations. Please try again.
            </p>
            <Button
              variant="outline"
              onClick={() => refetchInvitations()}
            >
              Retry
            </Button>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <InvitationsPagePresenter
      filteredInvitations={filteredInvitations}
      stats={stats}
      search={search}
      pagination={invitations.pagination}
      searchQuery={searchQuery}
      isCreateOpen={isCreateOpen}
      newEmail={newEmail}
      newRole={newRole}
      newMessage={newMessage}
      isSubmitting={isSubmitting}
      onSearchQueryChange={setSearchQuery}
      onIsCreateOpenChange={setIsCreateOpen}
      onNewEmailChange={setNewEmail}
      onNewRoleChange={setNewRole}
      onNewMessageChange={setNewMessage}
      onStatusFilter={handleStatusFilter}
      onPageChange={handlePageChange}
      onSendInvitation={handleSendInvitation}
      onCancelInvitation={(invitationId) => handleCancelInvitation(invitationId, getInvitationEmail(invitationId))}
      onResendInvitation={(invitationId) => handleResendInvitation(invitationId, getInvitationEmail(invitationId))}
    />
  );
}
