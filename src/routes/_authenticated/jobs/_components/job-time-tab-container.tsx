import { JobTimeTab } from '@/components/domain/jobs/job-time-tab';
import {
  useJobTimeEntries,
  useStartTimer,
  useStopTimer,
  useCreateManualEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
} from '@/hooks';

interface JobTimeTabContainerProps {
  jobId: string;
  hourlyRate?: number;
}

export function JobTimeTabContainer({ jobId, hourlyRate }: JobTimeTabContainerProps) {
  const { data: timeData, isLoading, isError, error, refetch } = useJobTimeEntries({ jobId });

  const startTimer = useStartTimer();
  const stopTimer = useStopTimer(jobId);
  const createManualEntry = useCreateManualEntry();
  const updateTimeEntry = useUpdateTimeEntry(jobId);
  const deleteTimeEntry = useDeleteTimeEntry(jobId);

  return (
    <JobTimeTab
      hourlyRate={hourlyRate}
      entries={timeData?.entries ?? []}
      totalMinutes={timeData?.totalMinutes ?? 0}
      billableMinutes={timeData?.billableMinutes ?? 0}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      onStartTimer={() => startTimer.mutate({ jobId, isBillable: true })}
      onStopTimer={(entryId) => stopTimer.mutate({ entryId })}
      onCreateEntry={async (values) => {
        await createManualEntry.mutateAsync({ jobId, ...values });
      }}
      onUpdateEntry={async (entryId, values) => {
        await updateTimeEntry.mutateAsync({ entryId, ...values });
      }}
      onDeleteEntry={async (entryId) => {
        await deleteTimeEntry.mutateAsync({ entryId });
      }}
      onToggleBillable={(entryId, isBillable) => updateTimeEntry.mutate({ entryId, isBillable })}
      isTimerLoading={startTimer.isPending || stopTimer.isPending}
      isSubmitting={createManualEntry.isPending || updateTimeEntry.isPending}
      isUpdating={updateTimeEntry.isPending}
    />
  );
}
