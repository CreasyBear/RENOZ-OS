/**
 * Activate Warranty Dialog
 *
 * Collects owner-of-record details and converts a commercial entitlement
 * into an activated warranty without creating a CRM customer.
 */
import * as React from 'react';
import { z } from 'zod';
import { CalendarCheck2, ShieldCheck } from 'lucide-react';
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

const activateWarrantyFormSchema = z
  .object({
    activationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
    notes: z.string().max(2000),
  })
  .superRefine((value, ctx) => {
    const hasAnyAddressValue = Boolean(
      value.street1 || value.city || value.state || value.postalCode || value.country
    );

    if (!hasAnyAddressValue) {
      return;
    }

    if (!value.street1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['street1'],
        message: 'Street address is required when adding an address',
      });
    }
    if (!value.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['city'],
        message: 'City is required when adding an address',
      });
    }
    if (!value.state) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['state'],
        message: 'State is required when adding an address',
      });
    }
    if (!value.postalCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['postalCode'],
        message: 'Postal code is required when adding an address',
      });
    }
    if (!value.country) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['country'],
        message: 'Country is required when adding an address',
      });
    }
  });

type ActivateWarrantyFormValues = z.infer<typeof activateWarrantyFormSchema>;

export interface ActivateWarrantyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entitlement: {
    id: string;
    productName?: string | null;
    customerName?: string | null;
    orderNumber?: string | null;
    productSerial?: string | null;
    unitSequence?: number | null;
  } | null;
  onSubmit: (payload: {
    entitlementId: string;
    activationDate: string;
    owner: {
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
    notes?: string;
  }) => Promise<unknown>;
  onSuccess?: () => void;
  isSubmitting?: boolean;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function ActivateWarrantyDialog({
  open,
  onOpenChange,
  entitlement,
  onSubmit,
  onSuccess,
  isSubmitting,
}: ActivateWarrantyDialogProps) {
  const isPending = isSubmitting ?? false;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const form = useTanStackForm<ActivateWarrantyFormValues>({
    schema: activateWarrantyFormSchema,
    defaultValues: {
      activationDate: todayDateString(),
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
      notes: '',
    },
    onSubmit: async (values) => {
      if (!entitlement) return;

      const hasAddress = Boolean(
        values.street1 || values.city || values.state || values.postalCode || values.country
      );

      await onSubmit({
        entitlementId: entitlement.id,
        activationDate: values.activationDate,
        owner: {
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
        notes: values.notes || undefined,
      });

      onOpenChange(false);
      onSuccess?.();
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        activationDate: todayDateString(),
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
        notes: '',
      });
    }
  }, [open, form]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(
    isPending,
    handleOpenChange
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Activate Warranty
          </DialogTitle>
          <DialogDescription>
            Create the owned warranty record from this delivered entitlement.
          </DialogDescription>
        </DialogHeader>

        {entitlement ? (
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
                  <div className="font-medium">{entitlement.productName ?? 'Unknown product'}</div>
                  <div className="text-muted-foreground">
                    Purchased via {entitlement.customerName ?? 'Unknown customer'}
                  </div>
                  <div className="text-muted-foreground">
                    Order {entitlement.orderNumber ?? 'Unknown'}
                  </div>
                  <div className="text-muted-foreground font-mono">
                    {entitlement.productSerial
                      ? `Serial ${entitlement.productSerial}`
                      : `Unit ${entitlement.unitSequence ?? 'N/A'}`}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="activationDate">Activation Date</Label>
                  <Input
                    id="activationDate"
                    type="date"
                    value={form.getFieldValue('activationDate')}
                    onChange={(event) => form.setFieldValue('activationDate', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Owner Full Name</Label>
                  <Input
                    id="fullName"
                    value={form.getFieldValue('fullName')}
                    onChange={(event) => form.setFieldValue('fullName', event.target.value)}
                    placeholder="Jane Citizen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.getFieldValue('email')}
                    onChange={(event) => form.setFieldValue('email', event.target.value)}
                    placeholder="owner@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.getFieldValue('phone')}
                    onChange={(event) => form.setFieldValue('phone', event.target.value)}
                    placeholder="+61 4..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarCheck2 className="size-4" />
                  Owner Address
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street1">Street 1</Label>
                    <Input
                      id="street1"
                      value={form.getFieldValue('street1')}
                      onChange={(event) => form.setFieldValue('street1', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street2">Street 2</Label>
                    <Input
                      id="street2"
                      value={form.getFieldValue('street2')}
                      onChange={(event) => form.setFieldValue('street2', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={form.getFieldValue('city')}
                      onChange={(event) => form.setFieldValue('city', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={form.getFieldValue('state')}
                      onChange={(event) => form.setFieldValue('state', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={form.getFieldValue('postalCode')}
                      onChange={(event) => form.setFieldValue('postalCode', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={form.getFieldValue('country')}
                      onChange={(event) => form.setFieldValue('country', event.target.value)}
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerNotes">Owner Notes</Label>
                  <Textarea
                    id="ownerNotes"
                    value={form.getFieldValue('ownerNotes')}
                    onChange={(event) => form.setFieldValue('ownerNotes', event.target.value)}
                    placeholder="Contact preferences, install notes, transfer context..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Warranty Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.getFieldValue('notes')}
                    onChange={(event) => form.setFieldValue('notes', event.target.value)}
                    placeholder="Anything specific about this activation"
                  />
                </div>
              </div>
            </FormFieldDisplayProvider>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Activating...' : 'Activate Warranty'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
