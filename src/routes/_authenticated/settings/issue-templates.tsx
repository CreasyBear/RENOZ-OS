/**
 * Issue Templates Settings Route
 *
 * Management page for support issue templates. Allows creating, editing,
 * duplicating, and deleting templates for quick issue creation.
 *
 * @see src/components/domain/support/issue-template-list.tsx
 * @see src/components/domain/support/issue-template-form-dialog.tsx
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-004
 */

import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { SettingsPageSkeleton } from '@/components/skeletons/settings';
import { PageLayout } from '@/components/layout/page-layout';
import { IssueTemplateList } from '@/components/domain/support';
import { IssueTemplateFormDialog } from '@/components/domain/support';
import {
  useIssueTemplates,
  useDeleteIssueTemplate,
  useCreateIssueTemplate,
  useUpdateIssueTemplate,
} from '@/hooks';
import { useConfirmation } from '@/hooks';
import { toast } from 'sonner';
import type {
  IssueTemplateResponse,
  IssueType,
} from '@/lib/schemas/support/issue-templates';

export const Route = createFileRoute('/_authenticated/settings/issue-templates')({
  component: IssueTemplatesSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsPageSkeleton />,
});

function IssueTemplatesSettingsPage() {
  const confirm = useConfirmation();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<IssueTemplateResponse | null>(null);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<IssueType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Query options
  const queryOptions = useMemo(
    () => ({
      type: typeFilter === 'all' ? undefined : typeFilter,
      isActive: true,
      search: searchQuery || undefined,
      page,
      pageSize: 10,
      sortBy: 'usageCount' as const,
      sortOrder: 'desc' as const,
    }),
    [typeFilter, searchQuery, page]
  );

  const { data, isLoading, error, refetch } = useIssueTemplates(queryOptions);

  // Mutations
  const deleteMutation = useDeleteIssueTemplate();
  const createMutation = useCreateIssueTemplate();
  const updateMutation = useUpdateIssueTemplate();

  const templates = data?.data ?? [];
  const totalCount = data?.pagination?.totalCount ?? 0;

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const handleEditTemplate = (template: IssueTemplateResponse) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleDuplicateTemplate = async (template: IssueTemplateResponse) => {
    try {
      await createMutation.mutateAsync({
        name: `${template.name} (Copy)`,
        description: template.description ?? undefined,
        type: template.type,
        defaultPriority: template.defaultPriority,
        titleTemplate: template.titleTemplate ?? undefined,
        descriptionPrompt: template.descriptionPrompt ?? undefined,
        requiredFields: template.requiredFields ?? undefined,
        isActive: true,
      });
      toast.success('Template duplicated successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate template');
    }
  };

  const handleDeleteTemplate = async (template: IssueTemplateResponse) => {
    const confirmed = await confirm.confirm({
      title: 'Delete Issue Template',
      description:
        'Are you sure you want to delete this issue template? This action cannot be undone.',
      confirmLabel: 'Delete Template',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      try {
        await deleteMutation.mutateAsync(template.id);
        toast.success('Template deleted successfully.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete template');
      }
    }
  };

  const handleSubmitTemplate = async (payload: {
    name: string;
    description: string | null;
    type: IssueType;
    defaultPriority: IssueType extends never ? never : any;
    titleTemplate: string | null;
    descriptionPrompt: string | null;
    requiredFields: IssueTemplateResponse['requiredFields'] | null;
    isActive: boolean;
    templateId?: string;
  }) => {
    const { templateId, ...dataToSave } = payload;
    if (templateId) {
      await updateMutation.mutateAsync({
        templateId,
        ...dataToSave,
      });
      toast.success('Template updated successfully.');
    } else {
      await createMutation.mutateAsync(dataToSave);
      toast.success('Template created successfully.');
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  return (
    <PageLayout>
      <PageLayout.Header
        title="Issue Templates"
        description="Create and manage templates for support issue intake"
      />

      <PageLayout.Content>
        <IssueTemplateList
          templates={templates}
          totalCount={totalCount}
          isLoading={isLoading}
          error={error ?? null}
          onRetry={refetch}
          typeFilter={typeFilter}
          searchQuery={searchQuery}
          page={page}
          onTypeFilterChange={(value) => {
            setTypeFilter(value);
            setPage(1);
          }}
          onSearchChange={(value) => {
            setSearchQuery(value);
            setPage(1);
          }}
          onPageChange={setPage}
          onCreateTemplate={handleCreateTemplate}
          onEditTemplate={handleEditTemplate}
          onDuplicateTemplate={handleDuplicateTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          showCreateButton
        />

        <IssueTemplateFormDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          template={editingTemplate}
          onSubmit={handleSubmitTemplate}
          onSuccess={handleDialogClose}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
