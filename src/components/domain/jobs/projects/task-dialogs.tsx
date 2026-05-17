/**
 * Task Dialogs
 *
 * Create and Edit dialogs for project tasks.
 *
 * NOTE: Tasks in this system are created within site visits, not directly
 * under projects. These dialogs provide guidance to users.
 *
 * @source src/components/domain/jobs/projects/task-dialogs.tsx
 * @see docs/design-system/JOBS-DOMAIN-WORKFLOW.md
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, Edit3, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { TaskWithWorkstream } from '@/lib/schemas/jobs';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  FormDialog,
  TextField,
  TextareaField,
  FormField,
} from '@/components/shared/forms';
import {
  formatProjectTaskMutationError,
  useUpdateTask,
  useCreateTask,
  useSiteVisitsByProject,
  useWorkstreams,
  useJobTemplates,
} from '@/hooks/jobs';
import { SiteVisitCreateDialog } from './site-visit-create-dialog';
import { WorkstreamCreateDialog } from './workstream-dialogs';
import { UserInviteDialog } from '@/components/domain/users/user-invite-dialog';
import { useUserLookup } from '@/hooks/users';
import { toast } from 'sonner';
import {
  buildProjectTaskTemplateOptions,
  getProjectTaskCreateDialogDefaultValues,
  getProjectTaskCreateMoreResetValues,
  getProjectTaskEditDialogDefaultValues,
  getProjectTaskEditDialogResetValues,
  projectTaskCreateDialogFormSchema,
  projectTaskEditDialogFormSchema,
} from './project-task-dialog-form-state';
import {
  ProjectTaskAssigneeField,
  ProjectTaskDueDateField,
  ProjectTaskEstimatedHoursField,
  ProjectTaskPriorityField,
  ProjectTaskStatusField,
} from './project-task-dialog-fields';


// ============================================================================
// CREATE DIALOG
// ============================================================================

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

  // siteVisitId: '' = no visit (project-level), or a visit id when linked to a visit
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
          // Keep dialog open, reset only title and description
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

  // Handle site visit created
  const handleSiteVisitCreated = () => {
    setShowSiteVisitCreate(false);
    // Refresh site visits list would happen via query invalidation
  };

  // Handle workstream created
  const handleWorkstreamCreated = (workstreamId?: string) => {
    setShowWorkstreamCreate(false);
    // If a workstream was created, select it
    if (workstreamId) {
      form.setFieldValue('workstreamId', workstreamId);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && createTask.isPending) return;
    if (!newOpen) setSubmitError(null);
    onOpenChange(newOpen);
  };

  // Loading state
  if (isLoadingVisits) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-md"
          onEscapeKeyDown={(e) => {
            if (createTask.isPending) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (createTask.isPending) e.preventDefault();
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

  // Site visit creation flow (nested dialog)
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

  const selectedVisit = siteVisits.find(v => v.id === selectedSiteVisitId);

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
                onValueChange={(val) => {
                  if (val === 'none') return;
                  const opt = taskTemplateOptions.find((o) => o.value === val);
                  if (opt) {
                    form.setFieldValue('title', opt.title);
                    form.setFieldValue('description', opt.description ?? '');
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pre-fill from template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Start from scratch</SelectItem>
                  {taskTemplateOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
                    onValueChange={(val) => {
                      if (val === '__create_new__') {
                        setShowWorkstreamCreate(true);
                        return;
                      }
                      field.setValue(val === 'none' ? '' : val);
                    }}
                    onOpenChange={(open) => !open && field.handleBlur()}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select workstream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {workstreams.map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.name}
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
                  onValueChange={(val) => setSelectedSiteVisitId(val === 'none' ? '' : val)}
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

// ============================================================================
// EDIT DIALOG
// ============================================================================

export interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task: TaskWithWorkstream | null;
  onSuccess?: () => void;
}

export function TaskEditDialog({
  open,
  onOpenChange,
  projectId: _projectId,
  task,
  onSuccess,
}: TaskEditDialogProps) {
  const updateTask = useUpdateTask();
  const { userMap } = useUserLookup();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showUserInvite, setShowUserInvite] = useState(false);

  const form = useTanStackForm({
    schema: projectTaskEditDialogFormSchema,
    defaultValues: getProjectTaskEditDialogDefaultValues(),
    onValidationError: (error) => {
      const messages = error.issues.map(i => i.message).join(', ');
      toast.error(`Validation error: ${messages}`);
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async (data) => {
      if (!task) return;

      setSubmitError(null);
      try {
        await updateTask.mutateAsync({
          taskId: task.id,
          jobId: task.jobId,
          title: data.title,
          description: data.description,
          status: data.status,
          estimatedHours: data.estimatedHours ?? undefined,
          assigneeId: data.assigneeId || undefined,
          dueDate: data.dueDate || undefined,
          priority: data.priority,
        });

        toast.success('Task updated successfully');
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } catch (error) {
        const message = formatProjectTaskMutationError(error, 'update');
        setSubmitError(message);
        toast.error(message);
      }
    },
  });

  useEffect(() => {
    if (task && open) {
      form.reset(getProjectTaskEditDialogResetValues(task));
    }
  }, [task, open, form]);

  if (!task) return null;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && updateTask.isPending) return;
    if (!newOpen) setSubmitError(null);
    onOpenChange(newOpen);
  };

  return (
    <>
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Edit Task
        </span>
      }
      description={
        <>
          Update task details
          <span className="ml-2 text-xs text-muted-foreground">(Cmd+Enter to save)</span>
        </>
      }
      form={form}
      submitLabel="Save Changes"
      loadingLabel="Saving..."
      submitError={submitError}
      submitDisabled={updateTask.isPending}
      size="lg"
      className="max-w-lg"
      resetOnClose={false}
    >
          <form.Field name="title">
            {(field) => (
              <TextField
                field={field}
                label="Title"
                required
              />
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <TextareaField
                field={field}
                label="Description"
                rows={3}
              />
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="status">
              {(field) => <ProjectTaskStatusField field={field} />}
            </form.Field>

            <form.Field name="priority">
              {(field) => <ProjectTaskPriorityField field={field} />}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="assigneeId">
              {(field) => (
                <ProjectTaskAssigneeField
                  field={field}
                  users={Array.from(userMap.values())}
                  emptyValue={null}
                  onInviteUser={() => setShowUserInvite(true)}
                />
              )}
            </form.Field>

            <form.Field name="dueDate">
              {(field) => <ProjectTaskDueDateField field={field} emptyValue={null} />}
            </form.Field>
          </div>

          <form.Field name="estimatedHours">
            {(field) => (
              <ProjectTaskEstimatedHoursField
                field={field}
                placeholder="e.g., 4"
              />
            )}
          </form.Field>
    </FormDialog>

      <UserInviteDialog
        open={showUserInvite}
        onOpenChange={setShowUserInvite}
        onSuccess={() => {}}
      />
    </>
  );
}
