import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FormField,
  NumberField,
} from '@/components/shared/forms';
import type { FormFieldWithType } from '@/components/shared/forms/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import type {
  JobTaskPriority,
  JobTaskStatus,
} from '@/lib/schemas/jobs';

const PROJECT_TASK_PRIORITY_OPTIONS: Array<{
  value: JobTaskPriority;
  label: string;
}> = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

const PROJECT_TASK_STATUS_OPTIONS: Array<{
  value: JobTaskStatus;
  label: string;
}> = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

export interface ProjectTaskDialogAssigneeOption {
  id: string;
  name?: string | null;
  email?: string | null;
}

export function ProjectTaskPriorityField({
  field,
}: {
  field: FormFieldWithType<JobTaskPriority | undefined>;
}) {
  return (
    <FormField label="Priority" name={field.name}>
      <Select
        value={field.state.value ?? 'normal'}
        onValueChange={(value) => {
          if (isProjectTaskPriority(value)) {
            field.setValue(value);
          }
        }}
        onOpenChange={(open) => !open && field.handleBlur()}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROJECT_TASK_PRIORITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

export function ProjectTaskStatusField({
  field,
}: {
  field: FormFieldWithType<JobTaskStatus>;
}) {
  return (
    <FormField label="Status" name={field.name}>
      <Select
        value={field.state.value}
        onValueChange={(value) => {
          if (isProjectTaskStatus(value)) {
            field.setValue(value);
          }
        }}
        onOpenChange={(open) => !open && field.handleBlur()}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROJECT_TASK_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

export function ProjectTaskAssigneeField({
  field,
  users,
  emptyValue,
  onInviteUser,
}: {
  field: FormFieldWithType<string | null | undefined>;
  users: readonly ProjectTaskDialogAssigneeOption[];
  emptyValue: '' | null;
  onInviteUser: () => void;
}) {
  return (
    <FormField label="Assignee" name={field.name}>
      <Select
        value={field.state.value || 'unassigned'}
        onValueChange={(value) => {
          if (value === '__invite_user__') {
            onInviteUser();
            return;
          }
          field.setValue(value === 'unassigned' ? emptyValue : value);
        }}
        onOpenChange={(open) => !open && field.handleBlur()}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {users.map((user) => (
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
  );
}

export function ProjectTaskDueDateField({
  field,
  emptyValue,
}: {
  field: FormFieldWithType<string | null | undefined>;
  emptyValue: '' | null;
}) {
  const dateValue = field.state.value ? new Date(field.state.value) : undefined;

  return (
    <FormField label="Due Date" name={field.name}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !dateValue && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? format(dateValue, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              field.handleChange(date ? format(date, 'yyyy-MM-dd') : emptyValue);
              field.handleBlur();
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </FormField>
  );
}

export function ProjectTaskEstimatedHoursField({
  field,
  placeholder,
}: {
  field: FormFieldWithType<number | null | undefined>;
  placeholder: string;
}) {
  return (
    <NumberField
      field={field}
      label="Estimated Hours"
      placeholder={placeholder}
      min={0}
      step={0.5}
    />
  );
}

function isProjectTaskPriority(value: string): value is JobTaskPriority {
  return PROJECT_TASK_PRIORITY_OPTIONS.some((option) => option.value === value);
}

function isProjectTaskStatus(value: string): value is JobTaskStatus {
  return PROJECT_TASK_STATUS_OPTIONS.some((option) => option.value === value);
}
