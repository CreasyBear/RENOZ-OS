/**
 * Scheduled Report Form Component
 *
 * ARCHITECTURE: Presenter Component - Pure form UI for creating/editing scheduled reports.
 *
 * Form fields:
 * - Name (required)
 * - Description (optional)
 * - Frequency (enum select)
 * - Format (enum select)
 * - isActive (switch)
 * - Recipients (email array)
 * - Metrics configuration (multi-select + options)
 *
 * @see DASH-REPORTS-UI acceptance criteria
 * @see src/lib/schemas/dashboard/scheduled-reports.ts for validation
 */

import { memo, useCallback, useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Loader2, Plus, X, Mail, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  reportFrequencyValues,
  reportFormatValues,
  reportComparisonPeriodValues,
  type ReportFrequency,
  type ReportFormat,
  type CreateScheduledReportInput,
} from '@/lib/schemas/dashboard/scheduled-reports';
import type { ScheduledReport } from '@/../drizzle/schema/dashboard/scheduled-reports';

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduledReportFormProps {
  /** Whether the form sheet is open */
  open: boolean;
  /** @source useState setter in settings/scheduled-reports.tsx */
  onOpenChange: (open: boolean) => void;
  /** Report being edited (null for create mode) */
  report?: ScheduledReport | null;
  /** @source useMutation(createScheduledReport/updateScheduledReport) in settings/scheduled-reports.tsx */
  onSubmit: (data: CreateScheduledReportInput) => Promise<void>;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
}

type FormValues = CreateScheduledReportInput;

// ============================================================================
// CONSTANTS
// ============================================================================

const FREQUENCY_LABELS: Record<ReportFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const FREQUENCY_DESCRIPTIONS: Record<ReportFrequency, string> = {
  daily: 'Sent every day at 8 AM',
  weekly: 'Sent every Monday at 8 AM',
  biweekly: 'Sent on the 1st and 15th at 8 AM',
  monthly: 'Sent on the 1st of each month at 8 AM',
  quarterly: 'Sent on the 1st of Jan, Apr, Jul, Oct at 8 AM',
};

const FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  xlsx: 'Excel (XLSX)',
  html: 'HTML',
};

const COMPARISON_LABELS: Record<string, string> = {
  previous_period: 'Previous Period',
  previous_year: 'Previous Year',
  none: 'No Comparison',
};

// Available metrics that can be included in reports
const AVAILABLE_METRICS = [
  { id: 'revenue', label: 'Revenue', description: 'Total revenue from orders' },
  { id: 'orders_count', label: 'Orders Count', description: 'Number of orders' },
  { id: 'customer_count', label: 'Customer Count', description: 'Number of customers' },
  { id: 'pipeline_value', label: 'Pipeline Value', description: 'Value of open opportunities' },
  { id: 'average_order_value', label: 'Average Order Value', description: 'Average per order' },
  { id: 'quote_win_rate', label: 'Quote Win Rate', description: 'Percentage of accepted quotes' },
  { id: 'kwh_deployed', label: 'kWh Deployed', description: 'Total kWh from installations' },
  { id: 'active_installations', label: 'Active Installations', description: 'Current installation jobs' },
];

// ============================================================================
// UTILITIES
// ============================================================================

function getDefaultFormValues(): FormValues {
  return {
    name: '',
    description: '',
    frequency: 'weekly',
    format: 'pdf',
    isActive: true,
    recipients: {
      emails: [],
      userIds: [],
    },
    metrics: {
      metrics: ['revenue', 'orders_count', 'customer_count'],
      includeCharts: true,
      includeTrends: true,
      comparisonPeriod: 'previous_period',
    },
  };
}

function reportToFormValues(report: ScheduledReport): FormValues {
  return {
    name: report.name,
    description: report.description ?? '',
    frequency: report.frequency,
    format: report.format,
    isActive: report.isActive,
    recipients: report.recipients,
    metrics: report.metrics,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ScheduledReportForm = memo(function ScheduledReportForm({
  open,
  onOpenChange,
  report,
  onSubmit,
  isSubmitting = false,
}: ScheduledReportFormProps) {
  const isEditMode = !!report;
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  const form = useForm({
    defaultValues: report ? reportToFormValues(report) : getDefaultFormValues(),
    onSubmit: async ({ value }) => {
      await onSubmit(value as CreateScheduledReportInput);
      onOpenChange(false);
    },
  });

  // Reset form when report changes or sheet opens
  useEffect(() => {
    if (open) {
      form.reset(report ? reportToFormValues(report) : getDefaultFormValues());
      setEmailInput('');
      setEmailError('');
    }
  }, [open, report, form]);

  const handleCancel = useCallback(() => {
    form.reset();
    onOpenChange(false);
  }, [form, onOpenChange]);

  const handleAddEmail = useCallback(() => {
    const email = emailInput.trim();
    if (!email) return;

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    const currentEmails = form.getFieldValue('recipients.emails') || [];
    if (currentEmails.includes(email)) {
      setEmailError('This email has already been added');
      return;
    }

    form.setFieldValue('recipients.emails', [...currentEmails, email]);
    setEmailInput('');
    setEmailError('');
  }, [emailInput, form]);

  const handleRemoveEmail = useCallback(
    (emailToRemove: string) => {
      const currentEmails = form.getFieldValue('recipients.emails') || [];
      form.setFieldValue(
        'recipients.emails',
        currentEmails.filter((e: string) => e !== emailToRemove)
      );
    },
    [form]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddEmail();
      }
    },
    [handleAddEmail]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Edit Scheduled Report' : 'Create Scheduled Report'}</SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Update the report configuration below.'
              : 'Configure a new automated report that will be sent on schedule.'}
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
                <Label htmlFor={field.name}>Report Name *</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Weekly Sales Report"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
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
                  placeholder="Brief description of what this report includes..."
                  rows={2}
                />
              </div>
            )}
          </form.Field>

          {/* Schedule & Format Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Frequency */}
            <form.Field name="frequency">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Frequency *</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as ReportFrequency)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportFrequencyValues.map((freq) => (
                        <SelectItem key={freq} value={freq}>
                          <div className="flex flex-col">
                            <span>{FREQUENCY_LABELS[freq]}</span>
                            <span className="text-xs text-muted-foreground">
                              {FREQUENCY_DESCRIPTIONS[freq]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Format */}
            <form.Field name="format">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Format *</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as ReportFormat)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportFormatValues.map((fmt) => (
                        <SelectItem key={fmt} value={fmt}>
                          {FORMAT_LABELS[fmt]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          {/* Active Toggle */}
          <form.Field name="isActive">
            {(field) => (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor={field.name}>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, the report will be sent automatically
                  </p>
                </div>
                <Switch
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                />
              </div>
            )}
          </form.Field>

          {/* Recipients Section */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Recipients *
            </Label>

            <form.Field name="recipients.emails">
              {(field) => (
                <div className="space-y-3">
                  {/* Email Input */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="email"
                        placeholder="Add email address"
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value);
                          setEmailError('');
                        }}
                        onKeyDown={handleKeyDown}
                        className={cn(emailError && 'border-destructive')}
                      />
                      {emailError && <p className="mt-1 text-sm text-destructive">{emailError}</p>}
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={handleAddEmail}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Email List */}
                  {field.state.value && field.state.value.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {field.state.value.map((email: string) => (
                        <Badge key={email} variant="secondary" className="gap-1 pr-1">
                          {email}
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(email)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {/* Metrics Section */}
          <Accordion type="single" collapsible defaultValue="metrics">
            <AccordionItem value="metrics">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Metrics Configuration
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* Metrics Selection */}
                <form.Field name="metrics.metrics">
                  {(field) => (
                    <div className="space-y-3">
                      <Label>Include Metrics *</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {AVAILABLE_METRICS.map((metric) => {
                          const isChecked = field.state.value?.includes(metric.id) ?? false;
                          return (
                            <div
                              key={metric.id}
                              className={cn(
                                'flex items-start space-x-2 rounded-md border p-3 cursor-pointer transition-colors',
                                isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                              )}
                              onClick={() => {
                                const current = field.state.value || [];
                                if (isChecked) {
                                  field.handleChange(current.filter((m: string) => m !== metric.id));
                                } else {
                                  field.handleChange([...current, metric.id]);
                                }
                              }}
                            >
                              <Checkbox
                                id={`metric-${metric.id}`}
                                checked={isChecked}
                                onCheckedChange={() => {}}
                              />
                              <div className="grid gap-0.5 leading-none">
                                <label
                                  htmlFor={`metric-${metric.id}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {metric.label}
                                </label>
                                <p className="text-xs text-muted-foreground">{metric.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                      )}
                    </div>
                  )}
                </form.Field>

                {/* Report Options */}
                <div className="space-y-3">
                  <Label>Report Options</Label>

                  {/* Include Charts */}
                  <form.Field name="metrics.includeCharts">
                    {(field) => (
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <Label htmlFor="includeCharts" className="cursor-pointer">
                            Include Charts
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Add visual charts to the report
                          </p>
                        </div>
                        <Switch
                          id="includeCharts"
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                        />
                      </div>
                    )}
                  </form.Field>

                  {/* Include Trends */}
                  <form.Field name="metrics.includeTrends">
                    {(field) => (
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <Label htmlFor="includeTrends" className="cursor-pointer">
                            Include Trends
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Show trend analysis and changes
                          </p>
                        </div>
                        <Switch
                          id="includeTrends"
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                        />
                      </div>
                    )}
                  </form.Field>

                  {/* Comparison Period */}
                  <form.Field name="metrics.comparisonPeriod">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="comparisonPeriod">Comparison Period</Label>
                        <Select
                          value={field.state.value}
                          onValueChange={(value) =>
                            field.handleChange(value as 'previous_period' | 'previous_year' | 'none')
                          }
                        >
                          <SelectTrigger id="comparisonPeriod">
                            <SelectValue placeholder="Select comparison" />
                          </SelectTrigger>
                          <SelectContent>
                            {reportComparisonPeriodValues.map((period) => (
                              <SelectItem key={period} value={period}>
                                {COMPARISON_LABELS[period]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </form.Field>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Footer */}
          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update Report' : 'Create Report'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
});
