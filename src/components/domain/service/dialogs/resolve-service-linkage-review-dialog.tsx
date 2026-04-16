/**
 * Resolve Service Linkage Review Dialog
 */
import * as React from 'react';
import { z } from 'zod';
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
import { FormFieldDisplayProvider } from '@/components/shared/forms';

const resolveSchema = z.object({
  fullName: z.string().min(1).max(255),
  email: z.union([z.literal(''), z.string().email()]),
  phone: z.string().max(50),
  street1: z.string().max(255),
  street2: z.string().max(255),
  city: z.string().max(100),
  state: z.string().max(100),
  postalCode: z.string().max(20),
  country: z.string().max(2),
  notes: z.string().max(2000),
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
      await onSubmit({
        reviewId: review.id,
        resolutionType: 'create_new',
        owner: {
          fullName: values.fullName.trim(),
          email: values.email || undefined,
          phone: values.phone || undefined,
          address: values.street1
            ? {
                street1: values.street1,
                street2: values.street2 || undefined,
                city: values.city,
                state: values.state,
                postalCode: values.postalCode,
                country: values.country,
              }
            : undefined,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Owner name</Label>
                  <form.Field name="fullName">
                    {(field) => (
                      <Input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <form.Field name="email">
                    {(field) => (
                      <Input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <form.Field name="phone">
                    {(field) => (
                      <Input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <form.Field name="country">
                    {(field) => (
                      <Input value={field.state.value} onChange={(event) => field.handleChange(event.target.value.toUpperCase())} />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Street address</Label>
                  <form.Field name="street1">
                    {(field) => (
                      <Input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Street address line 2</Label>
                  <form.Field name="street2">
                    {(field) => (
                      <Input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <form.Field name="city">
                    {(field) => (
                      <Input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <form.Field name="state">
                    {(field) => (
                      <Input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                    )}
                  </form.Field>
                </div>
                <div className="space-y-2">
                  <Label>Postal code</Label>
                  <form.Field name="postalCode">
                    {(field) => (
                      <Input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                    )}
                  </form.Field>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Resolution notes</Label>
                <form.Field name="notes">
                  {(field) => (
                    <Textarea rows={3} value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                  )}
                </form.Field>
              </div>
            </FormFieldDisplayProvider>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Create New System
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
