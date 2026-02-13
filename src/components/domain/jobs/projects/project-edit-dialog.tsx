/**
 * ProjectEditDialog Component
 *
 * Dialog for editing existing projects.
 * Follows STANDARDS.md and Container/Presenter pattern.
 *
 * SPRINT-03: New component for project-centric jobs model
 */

import { useEffect } from 'react';
import { z } from 'zod';
import { Folder, MapPin, Calendar, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  TextField,
  TextareaField,
  SelectField,
  NumberField,
  DateField,
} from '@/components/shared/forms';
import { useUpdateProject } from '@/hooks/jobs';
import { toast } from '@/lib/toast';
import { format, parseISO } from 'date-fns';
import {
  projectStatusSchema,
  projectTypeSchema,
  projectPrioritySchema,
  type ProjectEditFormInput,
} from '@/lib/schemas/jobs';

// ============================================================================
// SCHEMA
// ============================================================================

const editProjectFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  status: projectStatusSchema,
  projectType: projectTypeSchema,
  priority: projectPrioritySchema,
  siteAddress: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string(),
  }),
  startDate: z.date().optional().nullable(),
  targetCompletionDate: z.date().optional().nullable(),
  estimatedTotalValue: z.number().min(0).optional().nullable(),
  progressPercent: z.number().min(0).max(100),
});

const statusOptions = [
  { value: 'quoting', label: 'Quoting' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

const projectTypeOptions = [
  { value: 'solar', label: 'Solar Only' },
  { value: 'battery', label: 'Battery Only' },
  { value: 'solar_battery', label: 'Solar + Battery' },
  { value: 'service', label: 'Service' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'commissioning', label: 'Commissioning' },
];

const priorityOptions = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// ============================================================================
// TYPES (Schema-through: ProjectEditFormInput from @/lib/schemas/jobs)
// ============================================================================

export interface ProjectEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Use toProjectEditFormInput(project) in container before passing */
  project: ProjectEditFormInput | null;
  onSuccess?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProjectEditDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectEditDialogProps) {
  const updateProject = useUpdateProject();

  const form = useTanStackForm({
    schema: editProjectFormSchema,
    defaultValues: {
      title: '',
      description: '',
      status: 'quoting' as const,
      projectType: 'solar_battery' as const,
      priority: 'medium' as const,
      siteAddress: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Australia',
      },
      startDate: null,
      targetCompletionDate: null,
      estimatedTotalValue: null,
      progressPercent: 0,
    },
    onSubmit: async (data) => {
      if (!project) return;

      try {
        await updateProject.mutateAsync({
          projectId: project.id,
          title: data.title,
          description: data.description,
          status: data.status,
          projectType: data.projectType,
          priority: data.priority,
          siteAddress: data.siteAddress,
          startDate: data.startDate ? format(data.startDate, 'yyyy-MM-dd') : undefined,
          targetCompletionDate: data.targetCompletionDate
            ? format(data.targetCompletionDate, 'yyyy-MM-dd')
            : undefined,
          estimatedTotalValue: data.estimatedTotalValue ?? undefined,
          progressPercent: data.progressPercent,
        });

        toast.success('Project updated successfully');
        onOpenChange(false);
        onSuccess?.();
      } catch {
        toast.error('Failed to update project');
      }
    },
  });

  // Reset form when project changes
  useEffect(() => {
    if (project && open) {
      form.reset({
        title: project.title,
        description: project.description || '',
        status: project.status,
        projectType: (project.projectType === 'solar' || project.projectType === 'battery' || project.projectType === 'solar_battery' || project.projectType === 'service' || project.projectType === 'warranty' || project.projectType === 'inspection' || project.projectType === 'commissioning') ? project.projectType : 'solar_battery',
        priority: (project.priority === 'urgent' || project.priority === 'high' || project.priority === 'medium' || project.priority === 'low') ? project.priority : 'medium',
        siteAddress: project.siteAddress,
        startDate: project.startDate ? parseISO(project.startDate) : null,
        targetCompletionDate: project.targetCompletionDate
          ? parseISO(project.targetCompletionDate)
          : null,
        estimatedTotalValue: project.estimatedTotalValue
          ? parseFloat(project.estimatedTotalValue.toString())
          : null,
        progressPercent: project.progressPercent || 0,
      });
    }
  }, [project, open, form]);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Edit Project
          </DialogTitle>
          <DialogDescription>
            Update project details for {project.projectNumber}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex flex-col h-full"
        >
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Basic Information
                </h3>

                <form.Field name="title">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Project Title"
                      placeholder="Enter project title"
                      required
                    />
                  )}
                </form.Field>

                <form.Field name="description">
                  {(field) => (
                    <TextareaField
                      field={field}
                      label="Description"
                      placeholder="Enter project description"
                      rows={3}
                    />
                  )}
                </form.Field>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="status">
                    {(field) => (
                      <SelectField
                        field={field}
                        label="Status"
                        options={statusOptions}
                        required
                      />
                    )}
                  </form.Field>

                  <form.Field name="priority">
                    {(field) => (
                      <SelectField
                        field={field}
                        label="Priority"
                        options={priorityOptions}
                        required
                      />
                    )}
                  </form.Field>
                </div>

                <form.Field name="projectType">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Project Type"
                      options={projectTypeOptions}
                      required
                    />
                  )}
                </form.Field>
              </div>

              {/* Progress */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Progress
                </h3>

                <form.Field name="progressPercent">
                  {(field) => (
                    <div className="space-y-2">
                      <NumberField
                        field={field}
                        label="Completion Percentage"
                        min={0}
                        max={100}
                        className="w-24"
                      />
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${field.state.value ?? 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{field.state.value ?? 0}%</span>
                      </div>
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Site Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Site Address
                </h3>

                <form.Field name="siteAddress.street">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Street"
                      placeholder="Enter street address"
                      required
                    />
                  )}
                </form.Field>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="siteAddress.city">
                    {(field) => (
                      <TextField
                        field={field}
                        label="City"
                        placeholder="Enter city"
                        required
                      />
                    )}
                  </form.Field>

                  <form.Field name="siteAddress.state">
                    {(field) => (
                      <TextField
                        field={field}
                        label="State"
                        placeholder="Enter state"
                        required
                      />
                    )}
                  </form.Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="siteAddress.postalCode">
                    {(field) => (
                      <TextField
                        field={field}
                        label="Postal Code"
                        placeholder="Enter postal code"
                        required
                      />
                    )}
                  </form.Field>

                  <form.Field name="siteAddress.country">
                    {(field) => (
                      <TextField
                        field={field}
                        label="Country"
                        placeholder="Enter country"
                      />
                    )}
                  </form.Field>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Project Dates
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="startDate">
                    {(field) => (
                      <DateField
                        field={field}
                        label="Start Date"
                        placeholder="Pick a date"
                      />
                    )}
                  </form.Field>

                  <form.Field name="targetCompletionDate">
                    {(field) => (
                      <DateField
                        field={field}
                        label="Target Completion"
                        placeholder="Pick a date"
                      />
                    )}
                  </form.Field>
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget
                </h3>

                <form.Field name="estimatedTotalValue">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Estimated Total Value"
                      description="Estimated total project value in AUD"
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                      prefix="$"
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
