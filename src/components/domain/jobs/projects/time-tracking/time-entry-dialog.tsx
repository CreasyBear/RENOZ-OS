/**
 * Time Entry Dialog
 *
 * Dialog for creating and editing manual time entries.
 * Includes start/end time pickers, description, and billable toggle.
 *
 * Migrated from jobs/time - now part of projects domain.
 * SPRINT-03: Project-centric restructure
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import type { TimeEntryResponse } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

const timeEntryFormSchema = z
  .object({
    startDate: z.string().min(1, 'Start date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endDate: z.string().min(1, 'End date is required'),
    endTime: z.string().min(1, 'End time is required'),
    description: z.string().max(2000).optional(),
    isBillable: z.boolean(),
  })
  .refine(
    (data) => {
      const start = new Date(`${data.startDate}T${data.startTime}`);
      const end = new Date(`${data.endDate}T${data.endTime}`);
      return end > start;
    },
    { message: 'End time must be after start time', path: ['endTime'] }
  );

type TimeEntryFormValues = z.infer<typeof timeEntryFormSchema>;

export interface TimeEntryDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Existing entry to edit (undefined for new) */
  entry?: TimeEntryResponse;
  /** Called when form is submitted */
  onSubmit: (values: {
    startTime: Date;
    endTime: Date;
    description?: string;
    isBillable: boolean;
  }) => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDateForInput(date: Date): string {
  return new Date(date).toISOString().split('T')[0];
}

function formatTimeForInput(date: Date): string {
  const d = new Date(date);
  return [
    d.getHours().toString().padStart(2, '0'),
    d.getMinutes().toString().padStart(2, '0'),
  ].join(':');
}

function getDefaultStartTime(): { date: string; time: string } {
  const now = new Date();
  // Round to nearest hour
  now.setMinutes(0, 0, 0);
  return {
    date: formatDateForInput(now),
    time: formatTimeForInput(now),
  };
}

function getDefaultEndTime(): { date: string; time: string } {
  const now = new Date();
  // Add 1 hour and round
  now.setHours(now.getHours() + 1, 0, 0, 0);
  return {
    date: formatDateForInput(now),
    time: formatTimeForInput(now),
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TimeEntryDialog({
  open,
  onOpenChange,
  entry,
  onSubmit,
  isSubmitting = false,
}: TimeEntryDialogProps) {
  const isEditing = !!entry;

  const defaultStart = getDefaultStartTime();
  const defaultEnd = getDefaultEndTime();

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: {
      startDate: entry ? formatDateForInput(entry.startTime) : defaultStart.date,
      startTime: entry ? formatTimeForInput(entry.startTime) : defaultStart.time,
      endDate: entry?.endTime ? formatDateForInput(entry.endTime) : defaultEnd.date,
      endTime: entry?.endTime ? formatTimeForInput(entry.endTime) : defaultEnd.time,
      description: entry?.description ?? '',
      isBillable: entry?.isBillable ?? true,
    },
  });

  // Reset form when entry changes or dialog opens
  React.useEffect(() => {
    if (open) {
      const start = getDefaultStartTime();
      const end = getDefaultEndTime();

      form.reset({
        startDate: entry ? formatDateForInput(entry.startTime) : start.date,
        startTime: entry ? formatTimeForInput(entry.startTime) : start.time,
        endDate: entry?.endTime ? formatDateForInput(entry.endTime) : end.date,
        endTime: entry?.endTime ? formatTimeForInput(entry.endTime) : end.time,
        description: entry?.description ?? '',
        isBillable: entry?.isBillable ?? true,
      });
    }
  }, [open, entry, form]);

  const handleSubmit = (values: TimeEntryFormValues) => {
    const startTime = new Date(`${values.startDate}T${values.startTime}`);
    const endTime = new Date(`${values.endDate}T${values.endTime}`);

    onSubmit({
      startTime,
      endTime,
      description: values.description || undefined,
      isBillable: values.isBillable,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Time Entry' : 'Add Time Entry'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the time entry details below.' : 'Record time worked on this job.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Start date/time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* End date/time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What did you work on?"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Billable toggle */}
            <FormField
              control={form.control}
              name="isBillable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Billable</FormLabel>
                    <FormDescription>Include this time in labor cost calculations</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

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
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  'Save Changes'
                ) : (
                  'Add Entry'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
