/**
 * Transfer Service System Dialog
 *
 * Bounded admin workflow for transferring beneficial ownership.
 */
import * as React from 'react';
import { z } from 'zod';
import { ArrowRightLeft } from 'lucide-react';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { FormFieldDisplayProvider } from '@/components/shared/forms';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';

const transferServiceSystemSchema = z.object({
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
});

type TransferServiceSystemValues = z.infer<typeof transferServiceSystemSchema>;

export interface TransferServiceSystemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceSystem: {
    id: string;
    displayName: string;
    currentOwnerName?: string | null;
  } | null;
  onSubmit: (payload: {
    serviceSystemId: string;
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
  }) => Promise<unknown>;
  onSuccess?: () => void;
  isSubmitting?: boolean;
}

export function TransferServiceSystemDialog({
  open,
  onOpenChange,
  serviceSystem,
  onSubmit,
  onSuccess,
  isSubmitting,
}: TransferServiceSystemDialogProps) {
  const isPending = isSubmitting ?? false;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const form = useTanStackForm<TransferServiceSystemValues>({
    schema: transferServiceSystemSchema,
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
      if (!serviceSystem) return;
      const hasAddress = Boolean(
        values.street1 || values.city || values.state || values.postalCode || values.country
      );

      await onSubmit({
        serviceSystemId: serviceSystem.id,
        newOwner: {
          fullName: values.fullName.trim(),
          email: values.email || undefined,
          phone: values.phone || undefined,
          address: hasAddress
            ? {
                street1: values.street1,
                street2: values.street2 || undefined,
                city: values.city,
                state: values.state,
                postalCode: values.postalCode,
                country: values.country,
              }
            : undefined,
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
            Transfer System Ownership
          </DialogTitle>
          <DialogDescription>
            Move this installed system to a new beneficial owner without changing the commercial customer record.
          </DialogDescription>
        </DialogHeader>

        {serviceSystem ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <FormFieldDisplayProvider form={form}>
              <Card className="bg-muted/40">
                <CardContent className="space-y-2 p-4 text-sm">
                  <div className="font-medium">{serviceSystem.displayName}</div>
                  <div className="text-muted-foreground">
                    Current owner: {serviceSystem.currentOwnerName ?? 'Unassigned'}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transfer-owner-name">New owner name</Label>
                  <form.Field name="fullName">
                    {(field) => (
                      <Input
                        id="transfer-owner-name"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-owner-email">Email</Label>
                  <form.Field name="email">
                    {(field) => (
                      <Input
                        id="transfer-owner-email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-owner-phone">Phone</Label>
                  <form.Field name="phone">
                    {(field) => (
                      <Input
                        id="transfer-owner-phone"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-country">Country</Label>
                  <form.Field name="country">
                    {(field) => (
                      <Input
                        id="transfer-country"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                      />
                    )}
                  </form.Field>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="transfer-street1">Street address</Label>
                  <form.Field name="street1">
                    {(field) => (
                      <Input
                        id="transfer-street1"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="transfer-street2">Street address line 2</Label>
                  <form.Field name="street2">
                    {(field) => (
                      <Input
                        id="transfer-street2"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-city">City</Label>
                  <form.Field name="city">
                    {(field) => (
                      <Input
                        id="transfer-city"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-state">State</Label>
                  <form.Field name="state">
                    {(field) => (
                      <Input
                        id="transfer-state"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-postal">Postal code</Label>
                  <form.Field name="postalCode">
                    {(field) => (
                      <Input
                        id="transfer-postal"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer-owner-notes">Owner notes</Label>
                <form.Field name="ownerNotes">
                  {(field) => (
                    <Textarea
                      id="transfer-owner-notes"
                      rows={2}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer-reason">Transfer reason</Label>
                <form.Field name="reason">
                  {(field) => (
                    <Textarea
                      id="transfer-reason"
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
