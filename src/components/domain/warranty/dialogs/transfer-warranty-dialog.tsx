/**
 * Transfer Warranty Dialog Component
 *
 * Compatibility wrapper for beneficial owner transfer from warranty surfaces.
 */
import * as React from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRightLeft } from 'lucide-react';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  buildOptionalServiceOwnerAddress,
  getOptionalServiceOwnerAddressError,
} from '@/lib/service-owner-address';
import { FormErrorSummary, FormFieldDisplayProvider } from '@/components/shared/forms';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';

const transferWarrantySchema = z
  .object({
    fullName: z.string().min(1, 'Owner name is required').max(255),
    email: z.union([z.literal(''), z.string().email('Enter a valid email')]),
    phone: z
      .string()
      .max(50)
      .refine((value) => value === '' || /^[+\d\s()-]+$/.test(value), 'Enter a valid phone number'),
    street1: z.string().max(255),
    street2: z.string().max(255),
    city: z.string().max(100),
    state: z.string().max(100),
    postalCode: z.string().max(20),
    country: z.string().max(2),
    ownerNotes: z.string().max(2000),
    reason: z.string().min(1, 'Transfer reason is required').max(2000),
  })
  .superRefine((values, ctx) => {
    const addressError = getOptionalServiceOwnerAddressError(values);
    if (!addressError) return;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: addressError,
    });
  });

type TransferWarrantyValues = z.infer<typeof transferWarrantySchema>;

export interface TransferWarrantyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: {
    id: string;
    warrantyNumber: string;
    productName?: string;
    customerName?: string;
  };
  onSuccess?: () => void;
  onSubmit: (payload: {
    id: string;
    newOwner: {
      fullName: string;
      email?: string;
      phone?: string;
      address?: {
        street1: string;
        street2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
      notes?: string;
    };
    reason: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function TransferWarrantyDialog({
  open,
  onOpenChange,
  warranty,
  onSuccess,
  onSubmit,
  isSubmitting,
}: TransferWarrantyDialogProps) {
  const isPending = isSubmitting ?? false;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const form = useTanStackForm<TransferWarrantyValues>({
    schema: transferWarrantySchema,
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'AU',
      ownerNotes: '',
      reason: '',
    },
    onSubmit: async (values) => {
      const address = buildOptionalServiceOwnerAddress(values);
      await onSubmit({
        id: warranty.id,
        newOwner: {
          fullName: values.fullName.trim(),
          email: values.email || undefined,
          phone: values.phone || undefined,
          address,
          notes: values.ownerNotes || undefined,
        },
        reason: values.reason.trim(),
      });

      onOpenChange(false);
      onSuccess?.();
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [form, open]);

  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5" />
            Transfer Warranty Ownership
          </DialogTitle>
          <DialogDescription>
            Transfer the beneficial owner for this warranty&apos;s service system.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <FormFieldDisplayProvider form={form}>
            <FormErrorSummary
              form={form}
              title="Check ownership transfer"
            />

            <Card className="bg-muted/50">
              <CardContent className="space-y-1 p-4 text-sm">
                <div className="font-medium">{warranty.warrantyNumber}</div>
                {warranty.productName ? <div className="text-muted-foreground">{warranty.productName}</div> : null}
                {warranty.customerName ? (
                  <div className="text-muted-foreground">Purchased via {warranty.customerName}</div>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="warranty-transfer-owner-name">New owner name</Label>
                <form.Field name="fullName">
                  {(field) => (
                    <Input
                      id="warranty-transfer-owner-name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warranty-transfer-owner-email">Email</Label>
                <form.Field name="email">
                  {(field) => (
                    <Input
                      id="warranty-transfer-owner-email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warranty-transfer-owner-phone">Phone</Label>
                <form.Field name="phone">
                  {(field) => (
                    <Input
                      id="warranty-transfer-owner-phone"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warranty-transfer-country">Country</Label>
                <form.Field name="country">
                  {(field) => (
                    <Input
                      id="warranty-transfer-country"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="warranty-transfer-street1">Street address</Label>
                <form.Field name="street1">
                  {(field) => (
                    <Input
                      id="warranty-transfer-street1"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="warranty-transfer-street2">Street address line 2</Label>
                <form.Field name="street2">
                  {(field) => (
                    <Input
                      id="warranty-transfer-street2"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warranty-transfer-city">City</Label>
                <form.Field name="city">
                  {(field) => (
                    <Input
                      id="warranty-transfer-city"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warranty-transfer-state">State</Label>
                <form.Field name="state">
                  {(field) => (
                    <Input
                      id="warranty-transfer-state"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warranty-transfer-postal">Postal code</Label>
                <form.Field name="postalCode">
                  {(field) => (
                    <Input
                      id="warranty-transfer-postal"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty-transfer-owner-notes">Owner notes</Label>
              <form.Field name="ownerNotes">
                {(field) => (
                  <Textarea
                    id="warranty-transfer-owner-notes"
                    rows={2}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                )}
              </form.Field>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty-transfer-reason">Transfer reason</Label>
              <form.Field name="reason">
                {(field) => (
                  <Textarea
                    id="warranty-transfer-reason"
                    rows={3}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                )}
              </form.Field>
            </div>
          </FormFieldDisplayProvider>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Transfer Ownership
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
