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
import { z } from 'zod';
import { Plus, Edit3, Loader2, CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import type { TaskWithWorkstream } from '@/lib/schemas/jobs';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { TextField, TextareaField, NumberField, FormField } from '@/components/shared/forms';
import { useUpdateTask, useCreateTask, useSiteVisitsByProject, useWorkstreams, useJobTemplates } from '@/hooks/jobs';
import { SiteVisitCreateDialog } from './site-visit-create-dialog';
import { WorkstreamCreateDialog } from './workstream-dialogs';
import { UserInviteDialog } from '@/components/domain/users/user-invite-dialog';
import { useUserLookup } from '@/hooks/users';
import { toast } from '@/lib/toast';


// ============================================================================
// SCHEMAS
// ============================================================================

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']),
  estimatedHours: z.number().min(0).optional().nullable(),
});



// ============================================================================
// CREATE DIALOG
// ============================================================================

export interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

// Extended schema for task creation with additional fields
const createTaskFormSchema = taskFormSchema.omit({ status: true }).extend({
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional().default('normal'),
  workstreamId: z.string().optional(),
});

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

  // Flatten task templates from job templates for "From template" dropdown
  const taskTemplateOptions = useMemo(() => {
    const templates = templatesData?.templates ?? [];
    const options: { value: string; label: string; title: string; description?: string }[] = [];
    for (const t of templates) {
      for (const task of t.defaultTasks ?? []) {
        options.push({
          value: `${t.id}:${task.id}`,
          label: `${t.name}: ${task.title}`,
          title: task.title,
          description: task.description,
        });
      }
    }
    return options;
  }, [templatesData]);
  const { userMap } = useUserLookup();

  // siteVisitId: '' = no visit (project-level), or a visit id when linked to a visit
  const [selectedSiteVisitId, setSelectedSiteVisitId] = useState<string>('');
  const [createMore, setCreateMore] = useState(false);
  const [showSiteVisitCreate, setShowSiteVisitCreate] = useState(false);
  const [showWorkstreamCreate, setShowWorkstreamCreate] = useState(false);
  const [showUserInvite, setShowUserInvite] = useState(false);

  const siteVisits = siteVisitsData?.items || [];
  const workstreams = workstreamsData?.data || [];

  const form = useTanStackForm({
    schema: createTaskFormSchema,
    defaultValues: {
      title: '',
      description: '',
      assigneeId: '',
      dueDate: '',
      priority: 'normal',
      estimatedHours: null,
      workstreamId: '',
    },
    onValidationError: (error) => {
      const messages = error.issues.map(i => i.message).join(', ');
      toast.error(`Validation error: ${messages}`);
    },
    onSubmit: async (values) => {
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
          form.reset({
            title: '',
            description: '',
            assigneeId: values.assigneeId ? String(values.assigneeId) : '', // Keep assignee for batch creation
            dueDate: '',
            priority: values.priority, // Keep priority
            estimatedHours: null,
            workstreamId: values.workstreamId ? String(values.workstreamId) : '', // Keep workstream
          });
        } else {
          onOpenChange(false);
          form.reset();
        }

        onSuccess?.();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to create task: ${message}`);
      }
    },
  });

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      form.handleSubmit();
    }
  };

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

  // Loading state
  if (isLoadingVisits) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
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

  // Task creation form (workstream-first; site visit optional when project has visits)
  const selectedVisit = siteVisits.find(v => v.id === selectedSiteVisitId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Task
          </DialogTitle>
          <DialogDescription>
            {selectedVisit
              ? `Adding to visit: ${selectedVisit.visitNumber || 'Site Visit'}`
              : 'Add a project-level task (optionally link to a site visit)'}
            <span className="ml-2 text-xs text-muted-foreground">(Cmd+Enter to save)</span>
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4 py-4"
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
              {(field) => (
                <FormField label="Priority" name={field.name}>
                  <Select
                    value={field.state.value}
                    onValueChange={(val) => {
                      if (val === 'urgent' || val === 'high' || val === 'normal' || val === 'low') {
                        field.setValue(val);
                      }
                    }}
                    onOpenChange={(open) => !open && field.handleBlur()}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>

            <form.Field name="assigneeId">
              {(field) => (
                <FormField label="Assignee" name={field.name}>
                  <Select
                    value={field.state.value || 'unassigned'}
                    onValueChange={(val) => {
                      if (val === '__invite_user__') {
                        setShowUserInvite(true);
                        return;
                      }
                      field.setValue(val === 'unassigned' ? '' : val);
                    }}
                    onOpenChange={(open) => !open && field.handleBlur()}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {Array.from(userMap.values()).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email || user.id}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="__invite_user__"
                        className="text-primary font-medium border-t mt-1 pt-1"
                      >
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Invite team member
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>

            <form.Field name="dueDate">
              {(field) => {
                const dateValue = field.state.value ? new Date(field.state.value) : undefined;
                return (
                  <FormField label="Due Date" name={field.name}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateValue && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateValue ? format(dateValue, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateValue}
                          onSelect={(date) => {
                            field.handleChange(date ? format(date, "yyyy-MM-dd") : '');
                            field.handleBlur();
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormField>
                );
              }}
            </form.Field>
          </div>

          <form.Field name="estimatedHours">
            {(field) => (
              <NumberField
                field={field}
                label="Estimated Hours"
                placeholder="0"
                min={0}
                step={0.5}
              />
            )}
          </form.Field>

          <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 mr-auto">
              <Checkbox
                id="create-more"
                checked={createMore}
                onCheckedChange={(checked) => setCreateMore(checked === true)}
              />
              <Label htmlFor="create-more" className="text-sm text-muted-foreground cursor-pointer">
                Create another
              </Label>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTask.isPending}
            >
              {createTask.isPending ? 'Creating...' : createMore ? 'Create & Continue' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Nested Workstream Create Dialog */}
      <WorkstreamCreateDialog
        open={showWorkstreamCreate}
        onOpenChange={setShowWorkstreamCreate}
        projectId={projectId}
        onSuccess={() => handleWorkstreamCreated()}
      />

      {/* Nested User Invite Dialog */}
      <UserInviteDialog
        open={showUserInvite}
        onOpenChange={setShowUserInvite}
        onSuccess={() => {
          // User list will refresh via query invalidation
          // User can then select the newly invited user (once they accept)
        }}
      />
    </Dialog>
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

// Extended schema for editing with all fields
const editTaskFormSchema = taskFormSchema.extend({
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
});

export function TaskEditDialog({
  open,
  onOpenChange,
  projectId: _projectId,
  task,
  onSuccess,
}: TaskEditDialogProps) {
  const updateTask = useUpdateTask();
  const { userMap } = useUserLookup();
  const [showUserInvite, setShowUserInvite] = useState(false);



  const form = useTanStackForm({
    schema: editTaskFormSchema,
    defaultValues: {
      title: '',
      description: '',
      status: 'pending' as const,
      estimatedHours: null,
      assigneeId: null,
      dueDate: null,
      priority: 'normal' as const,
    },
    onValidationError: (error) => {
      const messages = error.issues.map(i => i.message).join(', ');
      toast.error(`Validation error: ${messages}`);
    },
    onSubmit: async (data) => {
      if (!task) return;

      try {
        await updateTask.mutateAsync({
          taskId: task.id,
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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to update task: ${message}`);
      }
    },
  });

  // Reset form when task changes
  useEffect(() => {
    if (task && open) {
      const dueDateStr = task.dueDate instanceof Date
        ? task.dueDate.toISOString().slice(0, 10)
        : (task.dueDate ?? null);
      form.reset({
        title: task.title,
        description: task.description || '',
        status: (task.status === 'pending' || task.status === 'in_progress' || task.status === 'completed' || task.status === 'blocked') ? task.status : 'pending',
        estimatedHours: task.estimatedHours ?? null,
        assigneeId: task.assigneeId,
        dueDate: dueDateStr,
        priority: task.priority || 'normal',
      });
    }
  }, [task, open, form]);

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      form.handleSubmit();
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Task
          </DialogTitle>
          <DialogDescription>
            Update task details
            <span className="ml-2 text-xs text-muted-foreground">(Cmd+Enter to save)</span>
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
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
              {(field) => (
                <FormField label="Status" name={field.name}>
                  <Select
                    value={field.state.value}
                    onValueChange={(val) => {
                      if (val === 'pending' || val === 'in_progress' || val === 'completed' || val === 'blocked') {
                        field.setValue(val);
                      }
                    }}
                    onOpenChange={(open) => !open && field.handleBlur()}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>

            <form.Field name="priority">
              {(field) => (
                <FormField label="Priority" name={field.name}>
                  <Select
                    value={field.state.value}
                    onValueChange={(val) => {
                      if (val === 'urgent' || val === 'high' || val === 'normal' || val === 'low') {
                        field.setValue(val);
                      }
                    }}
                    onOpenChange={(open) => !open && field.handleBlur()}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="assigneeId">
              {(field) => (
                <FormField label="Assignee" name={field.name}>
                  <Select
                    value={field.state.value || 'unassigned'}
                    onValueChange={(val) => {
                      if (val === '__invite_user__') {
                        setShowUserInvite(true);
                        return;
                      }
                      field.setValue(val === 'unassigned' ? null : val);
                    }}
                    onOpenChange={(open) => !open && field.handleBlur()}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {Array.from(userMap.values()).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email || user.id}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="__invite_user__"
                        className="text-primary font-medium border-t mt-1 pt-1"
                      >
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Invite team member
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>

            <form.Field name="dueDate">
              {(field) => {
                const dateValue = field.state.value ? new Date(field.state.value) : undefined;
                return (
                  <FormField label="Due Date" name={field.name}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateValue && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateValue ? format(dateValue, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateValue}
                          onSelect={(date) => {
                            field.handleChange(date ? format(date, "yyyy-MM-dd") : null);
                            field.handleBlur();
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormField>
                );
              }}
            </form.Field>
          </div>

          <form.Field name="estimatedHours">
            {(field) => (
              <NumberField
                field={field}
                label="Estimated Hours"
                placeholder="e.g., 4"
                min={0}
                step={0.5}
              />
            )}
          </form.Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTask.isPending}>
              {updateTask.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>

        {/* Nested User Invite Dialog */}
        <UserInviteDialog
          open={showUserInvite}
          onOpenChange={setShowUserInvite}
          onSuccess={() => {
            // User list will refresh via query invalidation
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
