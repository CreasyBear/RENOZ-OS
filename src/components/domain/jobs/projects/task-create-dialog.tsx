import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormDialog,
  FormField,
  TextareaField,
  TextField,
} from '@/components/shared/forms';
import { UserInviteDialog } from '@/components/domain/users/user-invite-dialog';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  formatProjectTaskMutationError,
  useCreateTask,
  useJobTemplates,
  useSiteVisitsByProject,
  useWorkstreams,
} from '@/hooks/jobs';
import { useUserLookup } from '@/hooks/users';
import { toast } from 'sonner';
import {
  buildProjectTaskTemplateOptions,
  getProjectTaskCreateDialogDefaultValues,
  getProjectTaskCreateMoreResetValues,
  projectTaskCreateDialogFormSchema,
} from './project-task-dialog-form-state';
import {
  ProjectTaskAssigneeField,
  ProjectTaskDueDateField,
  ProjectTaskEstimatedHoursField,
  ProjectTaskPriorityField,
} from './project-task-dialog-fields';
import { SiteVisitCreateDialog } from './site-visit-create-dialog';
import { WorkstreamCreateDialog } from './workstream-dialogs';

export interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

export function TaskCreateDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: TaskCreateDialogProps) {
  const navigate = useNavigate();
  const { data: siteVisitsData, isLoading: isLoadingVisits } = useSiteVisitsByProject(projectId);
  const { data: workstreamsData } = useWorkstreams(projectId);
  const { data: templatesData } = useJobTemplates({ includeInactive: false });
  const createTask = useCreateTask();

  const taskTemplateOptions = useMemo(
    () => buildProjectTaskTemplateOptions(templatesData?.templates ?? []),
    [templatesData?.templates]
  );
  const { userMap } = useUserLookup();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedSiteVisitId, setSelectedSiteVisitId] = useState<string>('');
  const [createMore, setCreateMore] = useState(false);
  const [showSiteVisitCreate, setShowSiteVisitCreate] = useState(false);
  const [showWorkstreamCreate, setShowWorkstreamCreate] = useState(false);
  const [showUserInvite, setShowUserInvite] = useState(false);

  const siteVisits = siteVisitsData?.items || [];
  const workstreams = workstreamsData?.data || [];

  const form = useTanStackForm({
    schema: projectTaskCreateDialogFormSchema,
    defaultValues: getProjectTaskCreateDialogDefaultValues(),
    onValidationError: (error) => {
      const messages = error.issues.map(i => i.message).join(', ');
      toast.error(`Validation error: ${messages}`);
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async (values) => {
      setSubmitError(null);
      try {
        await createTask.mutateAsync({
          projectId,
          siteVisitId: selectedSiteVisitId || undefined,
          title: values.title,
          description: values.description || undefined,
          assigneeId: values.assigneeId || undefined,
          dueDate: values.dueDate || undefined,
          priority: values.priority || 'normal',
          estimatedHours: values.estimatedHours ?? undefined,
          workstreamId: values.workstreamId || undefined,
          status: 'pending',
        });

        toast.success('Task created successfully', {
          action: {
            label: 'View Tasks',
            onClick: () => {
              onOpenChange(false);
              navigate({ to: '/projects/$projectId', params: { projectId }, search: { tab: 'tasks' } });
            },
          },
        });

        if (createMore) {
          form.reset(getProjectTaskCreateMoreResetValues(values));
        } else {
          onOpenChange(false);
          form.reset();
        }

        onSuccess?.();
      } catch (error) {
        const message = formatProjectTaskMutationError(error, 'create');
        setSubmitError(message);
        toast.error(message);
      }
    },
  });

  const handleSiteVisitCreated = () => {
    setShowSiteVisitCreate(false);
  };

  const handleWorkstreamCreated = (workstreamId?: string) => {
    setShowWorkstreamCreate(false);
    if (workstreamId) {
      form.setFieldValue('workstreamId', workstreamId);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && createTask.isPending) return;
    if (!newOpen) setSubmitError(null);
    onOpenChange(newOpen);
  };

  if (isLoadingVisits) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-md"
          onEscapeKeyDown={(event) => {
            if (createTask.isPending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (createTask.isPending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="py-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showSiteVisitCreate) {
    return (
      <SiteVisitCreateDialog
        open={showSiteVisitCreate}
        onOpenChange={setShowSiteVisitCreate}
        projectId={projectId}
        onSuccess={handleSiteVisitCreated}
      />
    );
  }

  const selectedVisit = siteVisits.find(visit => visit.id === selectedSiteVisitId);

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={
          <span className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Task
          </span>
        }
        description={
          <>
            {selectedVisit
              ? `Adding to visit: ${selectedVisit.visitNumber || 'Site Visit'}`
              : 'Add a project-level task (optionally link to a site visit)'}
            <span className="ml-2 text-xs text-muted-foreground">(Cmd+Enter to save)</span>
          </>
        }
        form={form}
        submitLabel={createMore ? 'Create & Continue' : 'Create Task'}
        loadingLabel="Creating..."
        submitError={submitError}
        submitDisabled={createTask.isPending}
        size="lg"
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        resetOnClose={false}
      >
        {taskTemplateOptions.length > 0 && (
          <FormField label="From template (optional)" name="taskTemplate">
            <Select
              value="none"
              onValueChange={(value) => {
                if (value === 'none') return;
                const option = taskTemplateOptions.find(taskOption => taskOption.value === value);
                if (option) {
                  form.setFieldValue('title', option.title);
                  form.setFieldValue('description', option.description ?? '');
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pre-fill from template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Start from scratch</SelectItem>
                {taskTemplateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}

        <form.Field name="title">
          {(field) => (
            <TextField
              field={field}
              label="Task Title"
              placeholder="What needs to be done?"
              required
            />
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <TextareaField
              field={field}
              label="Description"
              placeholder="Add details about this task..."
              rows={3}
            />
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="workstreamId">
            {(field) => (
              <FormField label="Workstream" name={field.name}>
                <Select
                  value={field.state.value || 'none'}
                  onValueChange={(value) => {
                    if (value === '__create_new__') {
                      setShowWorkstreamCreate(true);
                      return;
                    }
                    field.setValue(value === 'none' ? '' : value);
                  }}
                  onOpenChange={(isOpen) => !isOpen && field.handleBlur()}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select workstream" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {workstreams.map((workstream) => (
                      <SelectItem key={workstream.id} value={workstream.id}>
                        {workstream.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__create_new__" className="text-primary font-medium border-t mt-1 pt-1">
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create new workstream
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </form.Field>

          {siteVisits.length >= 1 ? (
            <FormField label="Site Visit (optional)" name="siteVisitId">
              <Select
                value={selectedSiteVisitId || 'none'}
                onValueChange={(value) => setSelectedSiteVisitId(value === 'none' ? '' : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No specific visit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific visit</SelectItem>
                  {siteVisits.map((visit) => (
                    <SelectItem key={visit.id} value={visit.id}>
                      {visit.visitNumber || 'Untitled Visit'}
                      {visit.scheduledDate
                        ? ` — ${new Date(visit.scheduledDate).toLocaleDateString()}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : (
            <FormField label="Site Visit" name="siteVisitId">
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <span>No visits yet.</span>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-primary"
                  onClick={() => setShowSiteVisitCreate(true)}
                >
                  Create one
                </Button>
              </div>
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="priority">
            {(field) => <ProjectTaskPriorityField field={field} />}
          </form.Field>

          <form.Field name="assigneeId">
            {(field) => (
              <ProjectTaskAssigneeField
                field={field}
                users={Array.from(userMap.values())}
                emptyValue=""
                onInviteUser={() => setShowUserInvite(true)}
              />
            )}
          </form.Field>

          <form.Field name="dueDate">
            {(field) => <ProjectTaskDueDateField field={field} emptyValue="" />}
          </form.Field>
        </div>

        <form.Field name="estimatedHours">
          {(field) => (
            <ProjectTaskEstimatedHoursField
              field={field}
              placeholder="0"
            />
          )}
        </form.Field>

        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="create-more"
            checked={createMore}
            onCheckedChange={(checked) => setCreateMore(checked === true)}
          />
          <Label htmlFor="create-more" className="text-sm text-muted-foreground cursor-pointer">
            Create another
          </Label>
        </div>
      </FormDialog>

      <WorkstreamCreateDialog
        open={showWorkstreamCreate}
        onOpenChange={setShowWorkstreamCreate}
        projectId={projectId}
        onSuccess={() => handleWorkstreamCreated()}
      />

      <UserInviteDialog
        open={showUserInvite}
        onOpenChange={setShowUserInvite}
        onSuccess={() => {}}
      />
    </>
  );
}
