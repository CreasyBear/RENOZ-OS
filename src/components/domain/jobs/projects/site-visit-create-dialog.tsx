/**
 * SiteVisitCreateDialog Component
 *
 * Dialog for creating new site visits for a project.
 *
 * SPRINT-03: New component for project-centric jobs model
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar } from 'lucide-react';
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
import { useCreateSiteVisit } from '@/hooks/jobs';
import { useUsers } from '@/hooks/users';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ============================================================================
// SCHEMA
// ============================================================================

const createSiteVisitFormSchema = z.object({
  visitType: z.enum(['assessment', 'installation', 'commissioning', 'service', 'warranty', 'inspection', 'maintenance']),
  scheduledDate: z.date(),
  scheduledTime: z.string().optional(),
  estimatedDuration: z.number().min(15).max(480).optional(),
  installerId: z.string().optional(),
  notes: z.string().optional(),
});

type CreateSiteVisitFormData = z.infer<typeof createSiteVisitFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

export interface SiteVisitCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Callback after successful creation */
  onSuccess?: (visitId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SiteVisitCreateDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: SiteVisitCreateDialogProps) {
  const createSiteVisit = useCreateSiteVisit();
  const { data: usersData } = useUsers();

  // Filter installers (users with installer type)
  const installers = usersData?.items?.filter((user) => 
    user.type === 'installer'
  ) ?? [];

  const form = useForm<CreateSiteVisitFormData>({
    resolver: zodResolver(createSiteVisitFormSchema),
    defaultValues: {
      visitType: 'installation',
      estimatedDuration: 120,
      notes: '',
    },
  });

  const onSubmit = async (data: CreateSiteVisitFormData) => {
    try {
      const result = await createSiteVisit.mutateAsync({
        projectId,
        visitType: data.visitType,
        scheduledDate: format(data.scheduledDate, 'yyyy-MM-dd'),
        scheduledTime: data.scheduledTime,
        estimatedDuration: data.estimatedDuration,
        installerId: data.installerId,
        notes: data.notes,
      });

      toast.success('Site visit scheduled successfully');
      onOpenChange(false);
      form.reset();
      onSuccess?.(result.id);
    } catch (error) {
      toast.error('Failed to schedule site visit');
    }
  };

  const isSubmitting = createSiteVisit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Site Visit
          </DialogTitle>
          <DialogDescription>
            Schedule a new site visit for this project.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Visit Type */}
              <FormField
                control={form.control}
                name="visitType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visit Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="assessment">Site Assessment</SelectItem>
                        <SelectItem value="installation">Installation</SelectItem>
                        <SelectItem value="commissioning">Commissioning</SelectItem>
                        <SelectItem value="service">Service Call</SelectItem>
                        <SelectItem value="warranty">Warranty Repair</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? format(field.value, 'PP') : 'Pick date'}
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
                  name="scheduledTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time (Optional)</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Duration & Installer */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={15}
                          max={480}
                          step={15}
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                        />
                      </FormControl>
                      <FormDescription>Estimated visit duration</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="installerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Installer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select installer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {installers.map((installer) => (
                            <SelectItem key={installer.id} value={installer.id}>
                              {installer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special instructions or notes for this visit..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Scheduling...' : 'Schedule Visit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
