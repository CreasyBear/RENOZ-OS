/**
 * ProjectEditDialog Component
 *
 * Dialog for editing existing projects.
 * Follows STANDARDS.md and Container/Presenter pattern.
 *
 * SPRINT-03: New component for project-centric jobs model
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUpdateProject } from '@/hooks/jobs';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { Project } from 'drizzle/schema/jobs/projects';

// ============================================================================
// SCHEMA
// ============================================================================

const editProjectFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  status: z.enum(['quoting', 'approved', 'in_progress', 'completed', 'cancelled', 'on_hold']),
  projectType: z.enum(['solar', 'battery', 'solar_battery', 'service', 'warranty', 'inspection', 'commissioning']),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  siteAddress: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string(),
  }),
  startDate: z.date().optional(),
  targetCompletionDate: z.date().optional(),
  estimatedTotalValue: z.number().min(0).optional(),
  progressPercent: z.number().min(0).max(100),
});

type EditProjectFormValues = z.infer<typeof editProjectFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
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

  const form = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'quoting',
      projectType: 'solar_battery',
      priority: 'medium',
      siteAddress: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Australia',
      },
      progressPercent: 0,
    },
  });

  // Reset form when project changes
  useEffect(() => {
    if (project && open) {
      form.reset({
        title: project.title,
        description: project.description || '',
        status: project.status,
        projectType: project.projectType as EditProjectFormValues['projectType'],
        priority: project.priority as EditProjectFormValues['priority'],
        siteAddress: project.siteAddress || {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'Australia',
        },
        startDate: project.startDate ? parseISO(project.startDate) : undefined,
        targetCompletionDate: project.targetCompletionDate
          ? parseISO(project.targetCompletionDate)
          : undefined,
        estimatedTotalValue: project.estimatedTotalValue
          ? parseFloat(project.estimatedTotalValue.toString())
          : undefined,
        progressPercent: project.progressPercent || 0,
      });
    }
  }, [project, open, form]);

  const onSubmit = async (data: EditProjectFormValues) => {
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
        estimatedTotalValue: data.estimatedTotalValue,
        progressPercent: data.progressPercent,
      });

      toast.success('Project updated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Basic Information
                  </h3>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter project title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter project description"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="quoting">Quoting</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="urgent">Urgent</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="projectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="solar">Solar Only</SelectItem>
                            <SelectItem value="battery">Battery Only</SelectItem>
                            <SelectItem value="solar_battery">Solar + Battery</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                            <SelectItem value="warranty">Warranty</SelectItem>
                            <SelectItem value="inspection">Inspection</SelectItem>
                            <SelectItem value="commissioning">Commissioning</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Progress */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Progress
                  </h3>

                  <FormField
                    control={form.control}
                    name="progressPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Completion Percentage</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${field.value}%` }}
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Site Address */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Site Address
                  </h3>

                  <FormField
                    control={form.control}
                    name="siteAddress.street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="siteAddress.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="siteAddress.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter state" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="siteAddress.postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter postal code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="siteAddress.country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Project Dates
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetCompletionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Completion</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Budget */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Budget
                  </h3>

                  <FormField
                    control={form.control}
                    name="estimatedTotalValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Total Value</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              className="pl-7"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              value={field.value || ''}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>Estimated total project value in AUD</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
