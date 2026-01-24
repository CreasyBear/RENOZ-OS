/**
 * Job Assignment Documents Route
 *
 * Provides access to job assignment documents with upload/delete support.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ArrowLeft, Briefcase, ClipboardList, FileText, ListChecks, Timer } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentOrg } from '@/hooks/auth';
import { getJobAssignment } from '@/server/functions/jobs/job-assignments';
import { queryKeys } from '@/lib/query-keys';
import { JobDocumentsTabContainer } from '../_components/job-documents-tab-container';
import { JobTasksTabContainer } from '../_components/job-tasks-tab-container';
import { JobMaterialsTabContainer } from '../_components/job-materials-tab-container';
import { JobTimeTabContainer } from '../_components/job-time-tab-container';
import { JobChecklistTabContainer } from '../_components/job-checklist-tab-container';

export const Route = createFileRoute('/_authenticated/jobs/assignments/$assignmentId')({
  component: JobAssignmentDocumentsPage,
});

function JobAssignmentDocumentsPage() {
  const navigate = useNavigate();
  const { assignmentId } = Route.useParams();
  const { currentOrg } = useCurrentOrg();
  const getAssignmentFn = useServerFn(getJobAssignment);

  const { data: assignmentResponse } = useQuery({
    queryKey: queryKeys.jobAssignments.detail(assignmentId),
    queryFn: () =>
      getAssignmentFn({
        data: {
          id: assignmentId,
          organizationId: currentOrg?.id ?? '',
        },
      }),
    enabled: !!assignmentId && !!currentOrg?.id,
  });
  const assignment = assignmentResponse;

  return (
    <PageLayout>
      <PageLayout.Header
        title={assignment?.title ?? 'Job Assignment'}
        description={
          assignment?.jobNumber ? `Job ${assignment.jobNumber}` : `Assignment ${assignmentId}`
        }
        actions={
          <Button variant="ghost" onClick={() => navigate({ to: '/jobs/kanban' })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Kanban
          </Button>
        }
      />
      <PageLayout.Content>
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="tasks" className="gap-2">
              <ListChecks className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="time" className="gap-2">
              <Timer className="h-4 w-4" />
              Time
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <JobTasksTabContainer jobId={assignmentId} />
          </TabsContent>
          <TabsContent value="materials">
            <JobMaterialsTabContainer jobId={assignmentId} />
          </TabsContent>
          <TabsContent value="time">
            <JobTimeTabContainer jobId={assignmentId} />
          </TabsContent>
          <TabsContent value="checklist">
            <JobChecklistTabContainer jobId={assignmentId} />
          </TabsContent>
          <TabsContent value="documents">
            <JobDocumentsTabContainer jobAssignmentId={assignmentId} />
          </TabsContent>
        </Tabs>
      </PageLayout.Content>
    </PageLayout>
  );
}
