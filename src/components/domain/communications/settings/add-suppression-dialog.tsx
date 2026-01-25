/**
 * Add Suppression Dialog Component
 *
 * Dialog for manually adding emails to the suppression list.
 *
 * @see INT-RES-005
 */

import { memo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "@/hooks";
import { useAddSuppression } from "@/hooks/communications/use-email-suppression";

// ============================================================================
// SCHEMA
// ============================================================================

const addSuppressionFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  reason: z.enum(["bounce", "complaint", "unsubscribe", "manual"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof addSuppressionFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

export interface AddSuppressionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AddSuppressionDialog = memo(function AddSuppressionDialog({
  open,
  onOpenChange,
}: AddSuppressionDialogProps) {
  const addMutation = useAddSuppression();

  const form = useForm<FormValues>({
    resolver: zodResolver(addSuppressionFormSchema),
    defaultValues: {
      email: "",
      reason: "manual",
      notes: "",
    },
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        await addMutation.mutateAsync({
          email: values.email,
          reason: values.reason,
          source: "manual",
          metadata: values.notes ? { notes: values.notes } : undefined,
        });
        toast.success("Email added to suppression list");
        form.reset();
        onOpenChange(false);
      } catch {
        toast.error("Failed to add to suppression list");
      }
    },
    [addMutation, form, onOpenChange]
  );

  const handleCancel = useCallback(() => {
    form.reset();
    onOpenChange(false);
  }, [form, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add to Suppression List
          </DialogTitle>
          <DialogDescription>
            Manually add an email address to prevent sending emails to it.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Manual Suppression</SelectItem>
                      <SelectItem value="bounce">Bounce</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Reason for suppression..."
                      rows={3}
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
                onClick={handleCancel}
                disabled={addMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Add to List
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});
