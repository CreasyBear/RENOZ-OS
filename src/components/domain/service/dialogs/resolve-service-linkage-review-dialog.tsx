/**
 * Resolve Service Linkage Review Dialog
 */
import * as React from 'react';
import { z } from 'zod';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  buildOptionalServiceOwnerAddress,
  getOptionalServiceOwnerAddressError,
} from '@/lib/service-owner-address';
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
import { FormErrorSummary, FormFieldDisplayProvider } from '@/components/shared/forms';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';

const resolveSchema = z
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
    notes: z.string().max(2000),
  })
  .superRefine((values, ctx) => {
    const addressError = getOptionalServiceOwnerAddressError(values);
    if (!addressError) return;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: addressError,
    });
  });

type ResolveValues = z.infer<typeof resolveSchema>;

export interface ResolveServiceLinkageReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: {
    id: string;
    ownerName?: string;
    ownerEmail?: string;
    ownerPhone?: string;
    siteAddress?: {
      street1: string;
      street2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    } | null;
  } | null;
  onSubmit: (payload: {
    reviewId: string;
    resolutionType: 'create_new';
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
    };
    notes?: string;
  }) => Promise<unknown>;
  isSubmitting?: boolean;
}

export function ResolveServiceLinkageReviewDialog({
  open,
  onOpenChange,
  review,
  onSubmit,
  isSubmitting,
}: ResolveServiceLinkageReviewDialogProps) {
  const isPending = isSubmitting ?? false;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(
    isPending,
    onOpenChange
  );
  const form = useTanStackForm<ResolveValues>({
    schema: resolveSchema,
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
      notes: '',
    },
    onSubmit: async (values) => {
      if (!review) return;
      const address = buildOptionalServiceOwnerAddress(values);

      await onSubmit({
        reviewId: review.id,
        resolutionType: 'create_new',
        owner: {
          fullName: values.fullName.trim(),
          email: values.email || undefined,
          phone: values.phone || undefined,
          address,
        },
        notes: values.notes || undefined,
      });
      onOpenChange(false);
    },
  });

  React.useEffect(() => {
    if (open && review) {
      form.reset({
        fullName: review.ownerName ?? '',
        email: review.ownerEmail ?? '',
        phone: review.ownerPhone ?? '',
        street1: review.siteAddress?.street1 ?? '',
        street2: review.siteAddress?.street2 ?? '',
        city: review.siteAddress?.city ?? '',
        state: review.siteAddress?.state ?? '',
        postalCode: review.siteAddress?.postalCode ?? '',
        country: review.siteAddress?.country ?? 'AU',
        notes: '',
      });
    }
  }, [form, open, review]);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>Create New Service System</DialogTitle>
          <DialogDescription>
            Resolve this review by creating a new canonical service owner + system.
          </DialogDescription>
        </DialogHeader>
        {review ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <FormFieldDisplayProvider form={form}>
              <FormErrorSummary
                form={form}
                title="Check service system creation"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="linkage-review-owner-name">Owner name</Label>
                  <form.Field name="fullName">
                    {(field) => (
                      <Input
                        id="linkage-review-owner-name"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkage-review-owner-email">Email</Label>
                  <form.Field name="email">
                    {(field) => (
                      <Input
                        id="linkage-review-owner-email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkage-review-owner-phone">Phone</Label>
                  <form.Field name="phone">
                    {(field) => (
                      <Input
                        id="linkage-review-owner-phone"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkage-review-country">Country</Label>
                  <form.Field name="country">
                    {(field) => (
                      <Input
                        id="linkage-review-country"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="linkage-review-street1">Street address</Label>
                  <form.Field name="street1">
                    {(field) => (
                      <Input
                        id="linkage-review-street1"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="linkage-review-street2">Street address line 2</Label>
                  <form.Field name="street2">
                    {(field) => (
                      <Input
                        id="linkage-review-street2"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkage-review-city">City</Label>
                  <form.Field name="city">
                    {(field) => (
                      <Input
                        id="linkage-review-city"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkage-review-state">State</Label>
                  <form.Field name="state">
                    {(field) => (
                      <Input
                        id="linkage-review-state"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkage-review-postal">Postal code</Label>
                  <form.Field name="postalCode">
                    {(field) => (
                      <Input
                        id="linkage-review-postal"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    )}
                  </form.Field>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkage-review-notes">Resolution notes</Label>
                <form.Field name="notes">
                  {(field) => (
                    <Textarea
                      id="linkage-review-notes"
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
                Create New System
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
