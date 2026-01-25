import { JobChecklistTab } from '@/components/domain/jobs';
import {
  useJobChecklist,
  useChecklistTemplates,
  useApplyChecklistToJob,
  useUpdateChecklistItem,
} from '@/hooks';

interface JobChecklistTabContainerProps {
  jobId: string;
}

export function JobChecklistTabContainer({ jobId }: JobChecklistTabContainerProps) {
  const { data: checklistData, isLoading, isError, error, refetch } = useJobChecklist({ jobId });
  const checklist = checklistData?.checklist ?? null;

  const { data: templatesData, isLoading: isLoadingTemplates } = useChecklistTemplates({
    includeInactive: false,
  });

  const applyChecklist = useApplyChecklistToJob();
  const updateItem = useUpdateChecklistItem(jobId);

  return (
    <JobChecklistTab
      checklistItems={checklist?.items ?? []}
      stats={checklist?.stats ?? { total: 0, completed: 0, remaining: 0, percentComplete: 0 }}
      templateName={checklist?.templateName ?? null}
      hasChecklist={!!checklist}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      templates={templatesData?.templates ?? []}
      isLoadingTemplates={isLoadingTemplates}
      onApplyTemplate={async (templateId) => {
        await applyChecklist.mutateAsync({ jobId, templateId });
      }}
      onToggleComplete={async (itemId, isCompleted) => {
        await updateItem.mutateAsync({ itemId, isCompleted });
      }}
      onUpdateNotes={async (itemId, notes) => {
        await updateItem.mutateAsync({ itemId, notes });
      }}
      isApplying={applyChecklist.isPending}
      isUpdating={updateItem.isPending}
    />
  );
}
