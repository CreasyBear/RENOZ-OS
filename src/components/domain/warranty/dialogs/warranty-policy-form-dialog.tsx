/**
 * Warranty Policy Form Dialog Component
 *
 * Dialog for creating/editing warranty policies.
 * Supports configuring policy terms, SLA settings, and cycle limits.
 *
 * @see src/hooks/use-warranty-policies.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-001c
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  warrantyPolicyTermsSchema,
  isWarrantyPolicyTypeValue,
  type WarrantyPolicy,
  type WarrantyPolicyTerms,
  type WarrantyPolicyTypeValue,
} from '@/lib/schemas/warranty';
import { Battery, Zap, Wrench, Shield } from 'lucide-react';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import { FormFieldDisplayProvider } from '@/components/shared/forms';

// ============================================================================
// TYPES
// ============================================================================

const policyFormSchema = z
  .object({
    name: z.string().min(1, 'Policy name is required'),
    description: z.string().optional(),
    type: z.enum(['battery_performance', 'inverter_manufacturer', 'installation_workmanship']),
    durationMonths: z.coerce.number().min(1, 'Duration must be at least 1 month'),
    cycleLimit: z.union([z.coerce.number().min(0), z.null()]),
    isDefault: z.boolean(),
    coverage: z.string().optional(),
    exclusions: z.string().optional(),
    claimRequirements: z.string().optional(),
    transferable: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.type === 'battery_performance' && data.cycleLimit !== null) {
        return data.cycleLimit >= 1;
      }
      return true;
    },
    { message: 'Cycle limit must be at least 1', path: ['cycleLimit'] }
  );

type PolicyFormValues = z.infer<typeof policyFormSchema>;

interface WarrantyPolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: WarrantyPolicy | null;
  onSuccess?: () => void;
  onSubmit: (payload: {
    policyId?: string;
    name: string;
    description: string | null;
    type: WarrantyPolicyTypeValue;
    durationMonths: number;
    cycleLimit: number | null;
    terms: WarrantyPolicyTerms;
    isDefault: boolean;
    isActive: boolean;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const POLICY_TYPES: { value: WarrantyPolicyTypeValue; label: string; icon: typeof Shield }[] = [
  { value: 'battery_performance', label: 'Battery Performance', icon: Battery },
  { value: 'inverter_manufacturer', label: 'Inverter Manufacturer', icon: Zap },
  { value: 'installation_workmanship', label: 'Installation Workmanship', icon: Wrench },
];

const DEFAULT_DURATIONS: Record<WarrantyPolicyTypeValue, { months: number; cycles?: number }> = {
  battery_performance: { months: 120, cycles: 10000 },
  inverter_manufacturer: { months: 60 },
  installation_workmanship: { months: 24 },
};

function parseTextToArray(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WarrantyPolicyFormDialog({
  open,
  onOpenChange,
  policy,
  onSuccess,
  onSubmit,
  isSubmitting,
}: WarrantyPolicyFormDialogProps) {
  const isEditMode = !!policy;
  const isPending = isSubmitting ?? false;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);

  const getInitialValues = React.useCallback((): PolicyFormValues => {
    if (policy) {
      const parsed = warrantyPolicyTermsSchema.safeParse(policy.terms);
      const terms = parsed.success ? parsed.data : null;
      return {
        name: policy.name,
        description: policy.description ?? '',
        type: policy.type,
        durationMonths: policy.durationMonths,
        cycleLimit: policy.cycleLimit,
        isDefault: policy.isDefault,
        coverage: terms?.coverage?.join('\n') ?? '',
        exclusions: terms?.exclusions?.join('\n') ?? '',
        claimRequirements: terms?.claimRequirements?.join('\n') ?? '',
        transferable: terms?.transferable ?? true,
      };
    }
    const defaults = DEFAULT_DURATIONS['battery_performance'];
    return {
      name: '',
      description: '',
      type: 'battery_performance',
      durationMonths: defaults.months,
      cycleLimit: defaults.cycles ?? null,
      isDefault: false,
      coverage: '',
      exclusions: '',
      claimRequirements: '',
      transferable: true,
    };
  }, [policy]);

  const form = useTanStackForm<PolicyFormValues>({
    schema: policyFormSchema,
    defaultValues: getInitialValues(),
    onSubmitInvalid: () => {
      // Form-level feedback: focusFirstInvalidField is called automatically
    },
    onSubmit: async (values) => {
      try {
        const terms: WarrantyPolicyTerms = {
          coverage: parseTextToArray(values.coverage ?? ''),
          exclusions: parseTextToArray(values.exclusions ?? ''),
          claimRequirements: parseTextToArray(values.claimRequirements ?? ''),
          transferable: values.transferable,
        };
        const payload = {
          name: values.name.trim(),
          description: values.description?.trim() || null,
          type: values.type as WarrantyPolicyTypeValue,
          durationMonths: values.durationMonths,
          cycleLimit: values.type === 'battery_performance' ? values.cycleLimit : null,
          terms,
          isDefault: values.isDefault,
          isActive: true,
        };
        if (isEditMode && policy) {
          await onSubmit({ policyId: policy.id, ...payload });
        } else {
          await onSubmit(payload);
        }
        onOpenChange(false);
        onSuccess?.();
      } catch {
        toast.error('Failed to save policy. Please try again.');
      }
    },
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset(getInitialValues());
    }
  }, [open, policy, form, getInitialValues]);

  const currentType = form.useWatch('type');

  // Update duration/cycle when type changes (create mode only)
  React.useEffect(() => {
    if (!isEditMode && open && currentType) {
      const defaults = DEFAULT_DURATIONS[currentType as WarrantyPolicyTypeValue];
      form.setFieldValue('durationMonths', defaults.months);
      form.setFieldValue('cycleLimit', defaults.cycles ?? null);
    }
  }, [currentType, isEditMode, open, form]);

  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Warranty Policy' : 'Create Warranty Policy'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update the warranty policy details and terms.'
                : 'Create a new warranty policy for products.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <FormFieldDisplayProvider form={form}>
              {/* Basic Info Section */}
              <div className="space-y-4">
                <form.Field name="name">
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor="name">Policy Name *</Label>
                      <Input
                        id="name"
                        value={field.state.value ?? ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="e.g., Battery Performance Warranty"
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">{String(field.state.meta.errors[0])}</p>
                      )}
                    </div>
                  )}
                </form.Field>

                <form.Field name="description">
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={field.state.value ?? ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Brief description of the warranty policy..."
                        rows={2}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="type">
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor="type">Policy Type *</Label>
                      <Select
                        value={field.state.value ?? 'battery_performance'}
                        onValueChange={(v) =>
                          field.handleChange(isWarrantyPolicyTypeValue(v) ? v : field.state.value)
                        }
                        disabled={isEditMode}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {POLICY_TYPES.map(({ value, label, icon: Icon }) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span>{label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isEditMode && (
                        <p className="text-muted-foreground text-xs">
                          Policy type cannot be changed after creation
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="durationMonths">
                    {(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor="durationMonths">Duration (months) *</Label>
                        <Input
                          id="durationMonths"
                          type="number"
                          min={1}
                          value={field.state.value ?? ''}
                          onChange={(e) =>
                            field.handleChange(parseInt(e.target.value, 10) || 0)
                          }
                          onBlur={field.handleBlur}
                        />
                        <p className="text-muted-foreground text-xs">
                          {(field.state.value ?? 0) >= 12
                            ? `${Math.floor((field.state.value ?? 0) / 12)} year${Math.floor((field.state.value ?? 0) / 12) !== 1 ? 's' : ''}${(field.state.value ?? 0) % 12 ? ` ${(field.state.value ?? 0) % 12} month${(field.state.value ?? 0) % 12 !== 1 ? 's' : ''}` : ''}`
                            : `${field.state.value ?? 0} month${(field.state.value ?? 0) !== 1 ? 's' : ''}`}
                        </p>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive">{String(field.state.meta.errors[0])}</p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  {currentType === 'battery_performance' && (
                    <form.Field name="cycleLimit">
                      {(field) => (
                        <div className="grid gap-2">
                          <Label htmlFor="cycleLimit">Cycle Limit</Label>
                          <Input
                            id="cycleLimit"
                            type="number"
                            min={0}
                            value={field.state.value ?? ''}
                            onChange={(e) =>
                              field.handleChange(
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                            onBlur={field.handleBlur}
                            placeholder="e.g., 10000"
                          />
                          <p className="text-muted-foreground text-xs">
                            Maximum charge/discharge cycles
                          </p>
                          {field.state.meta.errors.length > 0 && (
                            <p className="text-sm text-destructive">{String(field.state.meta.errors[0])}</p>
                          )}
                        </div>
                      )}
                    </form.Field>
                  )}
                </div>

                <form.Field name="isDefault">
                  {(field) => (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="isDefault"
                        checked={field.state.value ?? false}
                        onCheckedChange={field.handleChange}
                      />
                      <Label htmlFor="isDefault">
                        Set as default policy for{' '}
                        {POLICY_TYPES.find((t) => t.value === currentType)?.label}
                      </Label>
                    </div>
                  )}
                </form.Field>
              </div>

              <Separator />

              {/* Terms Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Policy Terms</h3>

                <form.Field name="coverage">
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor="coverage">Coverage (one per line)</Label>
                      <Textarea
                        id="coverage"
                        value={field.state.value ?? ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Capacity retention below 60%&#10;Manufacturing defects&#10;Cell failure"
                        rows={3}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="exclusions">
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor="exclusions">Exclusions (one per line)</Label>
                      <Textarea
                        id="exclusions"
                        value={field.state.value ?? ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Physical damage&#10;Improper installation&#10;Unauthorized modifications"
                        rows={3}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="claimRequirements">
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor="claimRequirements">Claim Requirements (one per line)</Label>
                      <Textarea
                        id="claimRequirements"
                        value={field.state.value ?? ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Proof of purchase&#10;Installation certificate&#10;Diagnostic report"
                        rows={3}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="transferable">
                  {(field) => (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="transferable"
                        checked={field.state.value ?? false}
                        onCheckedChange={field.handleChange}
                      />
                      <Label htmlFor="transferable">Warranty is transferable</Label>
                    </div>
                  )}
                </form.Field>
              </div>
            </FormFieldDisplayProvider>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditMode ? 'Update Policy' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
