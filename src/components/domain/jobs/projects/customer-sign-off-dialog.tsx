/**
 * Customer Sign-off Dialog Component
 *
 * Dialog for capturing customer sign-off, rating, and feedback
 * for completed site visits.
 *
 * Story 027: Customer Sign-off
 *
 * @path src/components/domain/jobs/projects/customer-sign-off-dialog.tsx
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCustomerSignOff } from '@/hooks/jobs';
import { toast } from '@/lib/toast';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// SCHEMA
// ============================================================================

const customerSignOffFormSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  confirmed: z.boolean().refine((val) => val === true, {
    message: 'Customer confirmation is required',
  }),
  customerRating: z.number().min(1).max(5).optional(),
  customerFeedback: z.string().optional(),
});

type CustomerSignOffFormData = z.infer<typeof customerSignOffFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerSignOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteVisitId: string;
  visitNumber: string;
  /** Callback after successful sign-off */
  onSuccess?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomerSignOffDialog({
  open,
  onOpenChange,
  siteVisitId,
  visitNumber,
  onSuccess,
}: CustomerSignOffDialogProps) {
  const signOff = useCustomerSignOff();
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const form = useForm<CustomerSignOffFormData>({
    resolver: zodResolver(customerSignOffFormSchema),
    defaultValues: {
      customerName: '',
      confirmed: false,
      customerRating: undefined,
      customerFeedback: '',
    },
  });

  const onSubmit = async (data: CustomerSignOffFormData) => {
    try {
      await signOff.mutateAsync({
        siteVisitId,
        customerName: data.customerName,
        customerRating: data.customerRating,
        customerFeedback: data.customerFeedback,
      });
      
      toast.success('Customer sign-off recorded successfully');
      form.reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to record sign-off');
      console.error('Sign-off error:', error);
    }
  };

  const selectedRating = form.watch('customerRating');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Customer Sign-off
          </DialogTitle>
          <DialogDescription>
            Record customer confirmation for site visit {visitNumber}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Name */}
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirmation Checkbox */}
            <FormField
              control={form.control}
              name="confirmed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Customer confirmed work completed satisfactorily
                    </FormLabel>
                    <FormDescription>
                      The customer has reviewed the work and confirms it meets their expectations.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Customer Rating */}
            <FormField
              control={form.control}
              name="customerRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Rating (Optional)</FormLabel>
                  <FormDescription>
                    How would the customer rate the service?
                  </FormDescription>
                  <FormControl>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          className={cn(
                            'p-1 transition-colors',
                            (hoveredRating !== null 
                              ? rating <= hoveredRating 
                              : rating <= (selectedRating || 0)
                            ) 
                              ? 'text-yellow-400' 
                              : 'text-gray-300'
                          )}
                          onMouseEnter={() => setHoveredRating(rating)}
                          onMouseLeave={() => setHoveredRating(null)}
                          onClick={() => field.onChange(rating)}
                        >
                          <Star className="h-8 w-8 fill-current" />
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Feedback */}
            <FormField
              control={form.control}
              name="customerFeedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Feedback (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional feedback from the customer..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={signOff.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={signOff.isPending || !form.formState.isValid}
              >
                {signOff.isPending ? 'Recording...' : 'Record Sign-off'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
