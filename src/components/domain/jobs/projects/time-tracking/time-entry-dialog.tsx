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
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
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
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import { FormFieldDisplayProvider, TextareaField, SwitchField, DateStringField } from '@/components/shared/forms';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  now.setMinutes(0, 0, 0);
  return {
    date: formatDateForInput(now),
    time: formatTimeForInput(now),
  };
}

function getDefaultEndTime(): { date: string; time: string } {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  return {
    date: formatDateForInput(now),
    time: formatTimeForInput(now),
  };
}

function getDefaultValues(entry?: TimeEntryResponse): TimeEntryFormValues {
  const start = getDefaultStartTime();
  const end = getDefaultEndTime();
  return {
    startDate: entry ? formatDateForInput(entry.startTime) : start.date,
    startTime: entry ? formatTimeForInput(entry.startTime) : start.time,
    endDate: entry?.endTime ? formatDateForInput(entry.endTime) : end.date,
    endTime: entry?.endTime ? formatTimeForInput(entry.endTime) : end.time,
    description: entry?.description ?? '',
    isBillable: entry?.isBillable ?? true,
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

  const form = useTanStackForm<TimeEntryFormValues>({
    schema: timeEntryFormSchema,
    defaultValues: getDefaultValues(entry),
    onSubmit: (values) => {
      const startTime = new Date(`${values.startDate}T${values.startTime}`);
      const endTime = new Date(`${values.endDate}T${values.endTime}`);
      onSubmit({
        startTime,
        endTime,
        description: values.description || undefined,
        isBillable: values.isBillable,
      });
    },
  });

  // Reset form when entry changes or dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(entry));
    }
  }, [open, entry, form]);

  const pendingInteractionGuards = createPendingDialogInteractionGuards(isSubmitting);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isSubmitting, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Time Entry' : 'Add Time Entry'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the time entry details below.' : 'Record time worked on this job.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <FormFieldDisplayProvider form={form}>
            {/* Start date/time */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="startDate">
                {(field) => (
                  <DateStringField
                    field={field}
                    label="Start Date"
                    required
                  />
                )}
              </form.Field>
              <form.Field name="startTime">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">{String(field.state.meta.errors[0])}</p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            {/* End date/time */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="endDate">
                {(field) => (
                  <DateStringField
                    field={field}
                    label="End Date"
                    required
                  />
                )}
              </form.Field>
              <form.Field name="endTime">
                {(field) => (
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">{String(field.state.meta.errors[0])}</p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            {/* Description */}
            <form.Field name="description">
              {(field) => (
                <TextareaField
                  field={field}
                  label="Description (Optional)"
                  placeholder="What did you work on?"
                  rows={2}
                  className="resize-none"
                />
              )}
            </form.Field>

            {/* Billable toggle */}
            <form.Field name="isBillable">
              {(field) => (
                <SwitchField
                  field={field}
                  label="Billable"
                  description="Include this time in labor cost calculations"
                  className="rounded-lg border p-3"
                />
              )}
            </form.Field>
          </FormFieldDisplayProvider>

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
      </DialogContent>
    </Dialog>
  );
}
