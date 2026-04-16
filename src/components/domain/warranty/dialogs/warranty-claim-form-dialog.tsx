/**
 * Warranty Claim Form Dialog Component
 *
 * Dialog for submitting a new warranty claim. Supports different claim types
 * (cell degradation, BMS fault, inverter failure, installation defect).
 *
 * Features:
 * - Claim type selection with descriptions
 * - Description textarea with character count
 * - Cycle count input for battery warranties (auto-populated if available)
 * - Form validation with Zod
 * - Loading state during submission
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-006c
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-006c.wireframe.md
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/shared';
import { AlertCircle, FileWarning, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  warrantyClaimTypeSchema,
  warrantyClaimantRoleSchema,
  isWarrantyClaimTypeValue,
  type WarrantyClaimantRoleValue,
  type WarrantyClaimTypeValue,
} from '@/lib/schemas/warranty';
import { claimTypeConfig } from '@/lib/warranty/claims-utils';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import { FormFieldDisplayProvider } from '@/components/shared/forms';
import {
  WARRANTY_CLAIM_TYPE_OPTIONS,
  WARRANTY_CLAIMANT_ROLE_OPTIONS,
} from '../warranty-claim-options';

// ============================================================================
// TYPES
// ============================================================================

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 5000;

const claimFormSchema = z
  .object({
    claimType: z.union([warrantyClaimTypeSchema, z.literal('')]),
    claimantRole: warrantyClaimantRoleSchema,
    claimantFullName: z.string().max(255).optional(),
    claimantEmail: z.string().email('Enter a valid email').or(z.literal('')).optional(),
    claimantPhone: z.string().max(50).optional(),
    channelBypassReason: z.string().max(2000).optional(),
    description: z
      .string()
      .min(MIN_DESCRIPTION_LENGTH, `Minimum ${MIN_DESCRIPTION_LENGTH} characters required`)
      .max(MAX_DESCRIPTION_LENGTH, `Maximum ${MAX_DESCRIPTION_LENGTH} characters`),
    cycleCount: z.string().optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((data) => data.claimType !== '', {
    message: 'Claim type is required',
    path: ['claimType'],
  })
  .superRefine((data, ctx) => {
    if (data.claimantRole !== 'channel_partner' && !data.channelBypassReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['channelBypassReason'],
        message: 'A channel bypass reason is required for direct claims',
      });
    }

    if (data.claimantRole !== 'channel_partner' && !data.claimantFullName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['claimantFullName'],
        message: 'Claimant name is required for direct claims',
      });
    }
  });

type ClaimFormValues = z.infer<typeof claimFormSchema>;

export interface WarrantyClaimFormDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void;
  /** The warranty to file a claim against */
  warranty: {
    id: string;
    warrantyNumber: string;
    productName?: string;
    commercialCustomerId?: string;
    commercialCustomerName?: string;
    ownerRecord?: {
      fullName: string;
      email?: string | null;
      phone?: string | null;
    } | null;
    status: string;
    policyType?: string;
    currentCycleCount?: number | null;
    cycleLimit?: number | null;
  };
  /** Callback after successful claim submission */
  onSuccess?: () => void;
  /** From route container (mutation). */
  onSubmit: (payload: {
    warrantyId: string;
    claimType: WarrantyClaimTypeValue;
    description: string;
    claimantRole?: WarrantyClaimantRoleValue;
    claimantCustomerId?: string;
    claimantSnapshot?: {
      fullName: string;
      email?: string;
      phone?: string;
    };
    channelBypassReason?: string;
    cycleCountAtClaim?: number;
    notes?: string;
  }) => Promise<void>;
  /** From route container (mutation). */
  isSubmitting?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// ============================================================================
// COMPONENT
// ============================================================================

export function WarrantyClaimFormDialog({
  open,
  onOpenChange,
  warranty,
  onSuccess,
  onSubmit,
  isSubmitting,
}: WarrantyClaimFormDialogProps) {
  const isPending = isSubmitting ?? false;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const isBatteryWarranty = warranty.policyType === 'battery_performance';
  const canFileClaim = warranty.status === 'active' || warranty.status === 'expiring_soon';

  const defaultCycleCount = warranty.currentCycleCount?.toString() ?? '';
  const defaultOwnerSnapshot = React.useMemo(
    () => ({
      fullName: warranty.ownerRecord?.fullName ?? '',
      email: warranty.ownerRecord?.email ?? '',
      phone: warranty.ownerRecord?.phone ?? '',
    }),
    [warranty.ownerRecord]
  );

  const form = useTanStackForm<ClaimFormValues>({
    schema: claimFormSchema,
    defaultValues: {
      claimType: '',
      claimantRole: 'channel_partner',
      claimantFullName: '',
      claimantEmail: '',
      claimantPhone: '',
      channelBypassReason: '',
      description: '',
      cycleCount: defaultCycleCount,
      notes: '',
    },
    onSubmitInvalid: () => {
      // Form-level feedback: focusFirstInvalidField is called automatically
    },
    onSubmit: async (values) => {
      const claimType = values.claimType as WarrantyClaimTypeValue;
      await onSubmit({
        warrantyId: warranty.id,
        claimType,
        description: values.description.trim(),
        claimantRole: values.claimantRole,
        claimantCustomerId:
          values.claimantRole === 'channel_partner'
            ? warranty.commercialCustomerId
            : undefined,
        claimantSnapshot:
          values.claimantRole === 'channel_partner'
            ? undefined
            : {
                fullName: values.claimantFullName?.trim() ?? '',
                email: values.claimantEmail?.trim() || undefined,
                phone: values.claimantPhone?.trim() || undefined,
              },
        channelBypassReason:
          values.claimantRole === 'channel_partner'
            ? undefined
            : values.channelBypassReason?.trim() || undefined,
        cycleCountAtClaim: values.cycleCount ? parseInt(values.cycleCount, 10) : undefined,
        notes: values.notes?.trim() || undefined,
      });
      onOpenChange(false);
      onSuccess?.();
    },
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        claimType: '',
        claimantRole: 'channel_partner',
        claimantFullName: '',
        claimantEmail: '',
        claimantPhone: '',
        channelBypassReason: '',
        description: '',
        cycleCount: defaultCycleCount,
        notes: '',
      });
    }
  }, [open, defaultCycleCount, form]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isPending) return;
    onOpenChange(newOpen);
  };
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, handleOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="size-5" />
            File Warranty Claim
          </DialogTitle>
          <DialogDescription>Submit a claim for {warranty.warrantyNumber}</DialogDescription>
        </DialogHeader>

        {!canFileClaim ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Cannot file a claim for a warranty with status: {warranty.status}. Only active or
              expiring soon warranties can have claims filed.
            </AlertDescription>
          </Alert>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-6"
          >
            <FormFieldDisplayProvider form={form}>
              {/* Warranty Info Card */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <Shield className="text-muted-foreground size-4" />
                      <p className="text-sm font-medium">{warranty.warrantyNumber}</p>
                    </div>
                    {warranty.productName && (
                      <p className="text-muted-foreground text-sm">{warranty.productName}</p>
                    )}
                    {warranty.commercialCustomerName && (
                      <p className="text-muted-foreground text-sm">
                        Purchased via {warranty.commercialCustomerName}
                      </p>
                    )}
                    {warranty.ownerRecord?.fullName && (
                      <p className="text-muted-foreground text-sm">
                        Owner of record: {warranty.ownerRecord.fullName}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge
                        status={warranty.status === 'active' ? 'Active' : 'Expiring Soon'}
                        variant={warranty.status === 'active' ? 'success' : 'warning'}
                      />
                      {isBatteryWarranty && warranty.currentCycleCount !== null && (
                        <Badge variant="secondary">
                          {warranty.currentCycleCount?.toLocaleString() ?? 0}
                          {warranty.cycleLimit ? ` / ${warranty.cycleLimit.toLocaleString()}` : ''} cycles
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Claim Type */}
              <form.Field name="claimantRole">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="claimantRole">
                      Who Is Making This Claim? <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        const nextRole = value as WarrantyClaimantRoleValue;
                        field.handleChange(nextRole);

                        if (nextRole === 'owner') {
                          form.setFieldValue('claimantFullName', defaultOwnerSnapshot.fullName);
                          form.setFieldValue('claimantEmail', defaultOwnerSnapshot.email);
                          form.setFieldValue('claimantPhone', defaultOwnerSnapshot.phone);
                        } else if (nextRole === 'channel_partner') {
                          form.setFieldValue('claimantFullName', '');
                          form.setFieldValue('claimantEmail', '');
                          form.setFieldValue('claimantPhone', '');
                          form.setFieldValue('channelBypassReason', '');
                        } else if (field.state.value === 'channel_partner') {
                          form.setFieldValue('claimantFullName', '');
                          form.setFieldValue('claimantEmail', '');
                          form.setFieldValue('claimantPhone', '');
                        }
                      }}
                    >
                      <SelectTrigger id="claimantRole" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WARRANTY_CLAIMANT_ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col items-start">
                              <span>{option.label}</span>
                              <span className="text-muted-foreground text-xs">
                                {option.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.value === 'channel_partner' ? (
                      <p className="text-muted-foreground text-xs">
                        Claim will default to the commercial customer channel:
                        {' '}
                        {warranty.commercialCustomerName ?? 'Unknown customer'}.
                      </p>
                    ) : field.state.value === 'owner' && !warranty.ownerRecord ? (
                      <p className="text-muted-foreground text-xs">
                        No owner of record is saved on this warranty yet, so enter the direct
                        claimant details manually.
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Direct claims are allowed, but you need to capture who claimed and why the
                        channel was bypassed.
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {form.state.values.claimantRole !== 'channel_partner' && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <form.Field name="claimantFullName">
                      {(field) => (
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="claimantFullName">
                            Claimant Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="claimantFullName"
                            value={field.state.value ?? ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Enter the claimant’s full name"
                          />
                          {field.state.meta.errors.length > 0 && (
                            <p className="text-sm text-destructive">
                              {String(field.state.meta.errors[0])}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    <form.Field name="claimantEmail">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="claimantEmail">Claimant Email</Label>
                          <Input
                            id="claimantEmail"
                            type="email"
                            value={field.state.value ?? ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="name@example.com"
                          />
                          {field.state.meta.errors.length > 0 && (
                            <p className="text-sm text-destructive">
                              {String(field.state.meta.errors[0])}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    <form.Field name="claimantPhone">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="claimantPhone">Claimant Phone</Label>
                          <Input
                            id="claimantPhone"
                            value={field.state.value ?? ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Phone number"
                          />
                        </div>
                      )}
                    </form.Field>
                  </div>

                  <form.Field name="channelBypassReason">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="channelBypassReason">
                          Channel Bypass Reason <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="channelBypassReason"
                          value={field.state.value ?? ''}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          placeholder="Explain why the retailer / installer is not the claimant in this case..."
                          maxLength={2000}
                          rows={2}
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive">
                            {String(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>
                </>
              )}

              {/* Claim Type */}
              <form.Field name="claimType">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="claimType">
                      Claim Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={field.state.value === '' ? undefined : field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(isWarrantyClaimTypeValue(value) ? value : (field.state.value ?? ''))
                      }
                    >
                      <SelectTrigger id="claimType" className="w-full">
                        <SelectValue placeholder="Select the type of issue" />
                      </SelectTrigger>
                      <SelectContent>
                        {WARRANTY_CLAIM_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex flex-col items-start">
                              <span>{type.label}</span>
                              <span className="text-muted-foreground text-xs">{type.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.value && (
                      <p className="text-muted-foreground text-xs">
                        {claimTypeConfig[field.state.value as WarrantyClaimTypeValue].description}
                      </p>
                    )}
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">{String(field.state.meta.errors[0])}</p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Description */}
              <form.Field name="description">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Issue Description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Describe the issue in detail. Include when it started, symptoms, and any relevant information..."
                      minLength={MIN_DESCRIPTION_LENGTH}
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      rows={4}
                      className={
                        (field.state.value?.length ?? 0) > 0 && (field.state.value?.length ?? 0) < MIN_DESCRIPTION_LENGTH
                          ? 'border-destructive'
                          : ''
                      }
                      aria-describedby="description-help"
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span id="description-help">
                        {(field.state.value?.length ?? 0) < MIN_DESCRIPTION_LENGTH
                          ? `Minimum ${MIN_DESCRIPTION_LENGTH} characters required`
                          : 'Provide as much detail as possible'}
                      </span>
                      <span
                        className={
                          (field.state.value?.length ?? 0) > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-destructive' : ''
                        }
                      >
                        {field.state.value?.length ?? 0}/{MAX_DESCRIPTION_LENGTH}
                      </span>
                    </div>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">{String(field.state.meta.errors[0])}</p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Cycle Count (Battery Only) */}
              {isBatteryWarranty && (
                <form.Field name="cycleCount">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="cycleCount">Cycle Count at Time of Issue</Label>
                      <Input
                        id="cycleCount"
                        type="number"
                        min={0}
                        value={field.state.value ?? ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={warranty.currentCycleCount?.toString() ?? 'Enter current cycle count'}
                        aria-describedby="cycleCount-help"
                      />
                      <p id="cycleCount-help" className="text-muted-foreground text-xs">
                        Current battery cycle count helps track degradation patterns.
                        {warranty.currentCycleCount !== null && (
                          <> Last recorded: {warranty.currentCycleCount?.toLocaleString() ?? 0} cycles.</>
                        )}
                      </p>
                    </div>
                  )}
                </form.Field>
              )}

              {/* Additional Notes */}
              <form.Field name="notes">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Any additional information..."
                      maxLength={2000}
                      rows={2}
                    />
                    <p className="text-muted-foreground text-right text-xs">
                      {field.state.value?.length ?? 0}/2000
                    </p>
                  </div>
                )}
              </form.Field>
            </FormFieldDisplayProvider>

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
                {isPending ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Submitting...
                  </>
                ) : (
                  'Submit Claim'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
