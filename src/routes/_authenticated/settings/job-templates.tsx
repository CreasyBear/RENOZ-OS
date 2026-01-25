/**
 * Job Templates Settings Route
 *
 * Management page for job templates. Allows creating, editing,
 * and deleting templates for quick job creation.
 *
 * @see src/components/domain/jobs/job-template-list.tsx
 * @see src/components/domain/jobs/job-template-form-dialog.tsx
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-007c
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { SettingsPageSkeleton } from '@/components/skeletons/settings';
import { PageLayout } from '@/components/layout/page-layout';
import { JobTemplateList } from '@/components/domain/jobs';
import { JobTemplateFormDialog } from '@/components/domain/jobs';
import { useCreateJobTemplate } from '@/hooks';
import type { JobTemplateResponse } from '@/lib/schemas';
export const Route = createFileRoute('/_authenticated/settings/job-templates')({
  component: JobTemplatesSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsPageSkeleton />,
});

function JobTemplatesSettingsPage() {
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<JobTemplateResponse | null>(null);

  // Create mutation for duplicating
  const createMutation = useCreateJobTemplate();

  // Handle create new template
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  // Handle edit template
  const handleEditTemplate = (template: JobTemplateResponse) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  // Handle duplicate template
  const handleDuplicateTemplate = async (template: JobTemplateResponse) => {
    try {
      await createMutation.mutateAsync({
        name: `${template.name} (Copy)`,
        description: template.description ?? undefined,
        estimatedDuration: template.estimatedDuration,
        checklistTemplateId: template.checklistTemplateId,
        defaultTasks: template.defaultTasks.map((t) => ({
          id: crypto.randomUUID(),
          title: t.title,
          description: t.description,
          position: t.position,
        })),
        defaultBOM: template.defaultBOM.map((b) => ({
          id: crypto.randomUUID(),
          productId: b.productId,
          quantityRequired: b.quantityRequired,
          notes: b.notes,
        })),
        isActive: true,
      });
    } catch (err) {
      // Error toast is handled by the mutation hook
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  return (
    <PageLayout>
      <PageLayout.Header
        title="Job Templates"
        description="Create and manage templates for quick job creation"
      />

      <PageLayout.Content>
        <JobTemplateList
          onCreateTemplate={handleCreateTemplate}
          onEditTemplate={handleEditTemplate}
          onDuplicateTemplate={handleDuplicateTemplate}
          showCreateButton
        />

        <JobTemplateFormDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          template={editingTemplate}
          onSuccess={handleDialogClose}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
