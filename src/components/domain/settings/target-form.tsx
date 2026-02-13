/**
 * Target Form Component
 *
 * ARCHITECTURE: Presenter Component - Pure form UI for creating/editing KPI targets.
 *
 * Form fields:
 * - Name (required)
 * - Metric (enum select)
 * - Period (enum select)
 * - Start Date / End Date
 * - Target Value (currency/number)
 * - Description (optional)
 *
 * @see DASH-TARGETS-UI acceptance criteria
 * @see src/lib/schemas/reports/targets.ts for validation
 */

import { memo, useCallback, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  targetMetricValues,
  targetPeriodValues,
  type TargetMetric,
  type TargetPeriod,
  type Target,
  type CreateTargetInput,
} from '@/lib/schemas/reports/targets';

function isTargetMetric(v: string): v is TargetMetric {
  return (targetMetricValues as readonly string[]).includes(v);
}

function isTargetPeriod(v: string): v is TargetPeriod {
  return (targetPeriodValues as readonly string[]).includes(v);
}

// ============================================================================
// TYPES
// ============================================================================

export interface TargetFormProps {
  /** Whether the form sheet is open */
  open: boolean;
  /** @source useState setter in settings/targets.tsx */
  onOpenChange: (open: boolean) => void;
  /** Target being edited (null for create mode) */
  target?: Target | null;
  /** @source useMutation(createTarget/updateTarget) in settings/targets.tsx */
  onSubmit: (data: CreateTargetInput) => Promise<void>;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
}

/** Form values use string for targetValue (input field) */
interface FormValues {
  name: string;
  metric: TargetMetric;
  period: TargetPeriod;
  startDate: string;
  endDate: string;
  targetValue: string;
  description?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const METRIC_LABELS: Record<TargetMetric, string> = {
  revenue: 'Revenue',
  kwh_deployed: 'kWh Deployed',
  quote_win_rate: 'Quote Win Rate',
  active_installations: 'Active Installations',
  warranty_claims: 'Warranty Claims',
  pipeline_value: 'Pipeline Value',
  customer_count: 'Customer Count',
  orders_count: 'Orders Count',
  average_order_value: 'Average Order Value',
};

const METRIC_DESCRIPTIONS: Record<TargetMetric, string> = {
  revenue: 'Total revenue from delivered orders',
  kwh_deployed: 'Total kWh capacity from installations',
  quote_win_rate: 'Percentage of accepted quotes',
  active_installations: 'Number of active installation jobs',
  warranty_claims: 'Number of warranty claims',
  pipeline_value: 'Total value of open opportunities',
  customer_count: 'Number of new customers',
  orders_count: 'Number of orders placed',
  average_order_value: 'Average value per order',
};

const PERIOD_LABELS: Record<TargetPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

// ============================================================================
// UTILITIES
// ============================================================================

function formatDateForInput(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd');
}

function getDefaultFormValues(): FormValues {
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    name: '',
    metric: 'revenue',
    period: 'monthly',
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(endOfMonth, 'yyyy-MM-dd'),
    targetValue: '0',
    description: '',
  };
}

function targetToFormValues(target: Target): FormValues {
  return {
    name: target.name,
    metric: target.metric,
    period: target.period,
    startDate: formatDateForInput(target.startDate),
    endDate: formatDateForInput(target.endDate),
    targetValue: String(target.targetValue),
    description: target.description ?? '',
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TargetForm = memo(function TargetForm({
  open,
  onOpenChange,
  target,
  onSubmit,
  isSubmitting = false,
}: TargetFormProps) {
  const isEditMode = !!target;

  const form = useForm({
    defaultValues: target ? targetToFormValues(target) : getDefaultFormValues(),
    onSubmit: async ({ value }) => {
      // Convert form values to schema input (string targetValue -> number)
      const submitData: CreateTargetInput = {
        name: value.name,
        metric: value.metric,
        period: value.period,
        startDate: value.startDate,
        endDate: value.endDate,
        targetValue: parseFloat(value.targetValue) || 0,
        description: value.description,
      };
      await onSubmit(submitData);
      onOpenChange(false);
    },
  });

  // Reset form when target changes or sheet opens
  useEffect(() => {
    if (open) {
      form.reset(target ? targetToFormValues(target) : getDefaultFormValues());
    }
  }, [open, target, form]);

  const handleCancel = useCallback(() => {
    form.reset();
    onOpenChange(false);
  }, [form, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Edit Target' : 'Create Target'}</SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Update the target details below.'
              : 'Set a new KPI target to track your progress.'}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-6 py-6"
        >
          {/* Name */}
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name *</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Q1 Revenue Target"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Metric */}
          <form.Field name="metric">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Metric *</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => isTargetMetric(value) && field.handleChange(value)}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetMetricValues.map((metric) => (
                      <SelectItem key={metric} value={metric}>
                        <div className="flex flex-col">
                          <span>{METRIC_LABELS[metric]}</span>
                          <span className="text-xs text-muted-foreground">
                            {METRIC_DESCRIPTIONS[metric]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Period */}
          <form.Field name="period">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Period *</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => isTargetPeriod(value) && field.handleChange(value)}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetPeriodValues.map((period) => (
                      <SelectItem key={period} value={period}>
                        {PERIOD_LABELS[period]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <form.Field name="startDate">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id={field.name}
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.state.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.state.value
                          ? format(new Date(field.state.value), 'PP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.state.value ? new Date(field.state.value) : undefined}
                        onSelect={(date) =>
                          field.handleChange(date ? format(date, 'yyyy-MM-dd') : '')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* End Date */}
            <form.Field name="endDate">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id={field.name}
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.state.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.state.value
                          ? format(new Date(field.state.value), 'PP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.state.value ? new Date(field.state.value) : undefined}
                        onSelect={(date) =>
                          field.handleChange(date ? format(date, 'yyyy-MM-dd') : '')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {/* Target Value */}
          <form.Field name="targetValue">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Target Value *</Label>
                <Input
                  id={field.name}
                  type="number"
                  min="0"
                  step="0.01"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="100000"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Description */}
          <form.Field name="description">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Description</Label>
                <Textarea
                  id={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Optional description or notes about this target..."
                  rows={3}
                />
              </div>
            )}
          </form.Field>

          {/* Footer */}
          <SheetFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update Target' : 'Create Target'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
});
