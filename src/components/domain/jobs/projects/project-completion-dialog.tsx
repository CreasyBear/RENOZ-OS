/**
 * Project Completion Dialog Component
 *
 * Dialog for completing a project with final costs, customer satisfaction,
 * and handover pack generation.
 *
 * Story 028: Project Completion Workflow
 *
 * @path src/components/domain/jobs/projects/project-completion-dialog.tsx
 */

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Star, FileText, PartyPopper } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompleteProject } from '@/hooks/jobs';
import { toast } from '@/lib/toast';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ============================================================================
// SCHEMA
// ============================================================================

const projectCompletionFormSchema = z.object({
  status: z.enum(['completed', 'cancelled', 'on_hold']),
  actualCompletionDate: z.string().date(),
  actualTotalCost: z.number().positive().optional(),
  customerSatisfactionRating: z.number().int().min(1).max(5).optional(),
  customerFeedback: z.string().optional(),
  generateHandoverPack: z.boolean(),
});

type ProjectCompletionFormValues = z.infer<typeof projectCompletionFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  estimatedTotalValue?: number;
  /** Callback after successful completion */
  onSuccess?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProjectCompletionDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  estimatedTotalValue,
  onSuccess,
}: ProjectCompletionDialogProps) {
  const completeProject = useCompleteProject();
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const form = useForm<ProjectCompletionFormValues>({
    resolver: zodResolver(projectCompletionFormSchema),
    defaultValues: {
      status: 'completed',
      actualCompletionDate: format(new Date(), 'yyyy-MM-dd'),
      actualTotalCost: undefined,
      customerSatisfactionRating: undefined,
      customerFeedback: '',
      generateHandoverPack: true,
    },
  });

  const onSubmit: SubmitHandler<ProjectCompletionFormValues> = async (data) => {
    try {
      await completeProject.mutateAsync({
        projectId,
        status: data.status,
        actualCompletionDate: data.actualCompletionDate,
        actualTotalCost: data.actualTotalCost,
        customerSatisfactionRating: data.customerSatisfactionRating,
        customerFeedback: data.customerFeedback,
        generateHandoverPack: data.generateHandoverPack,
      });
      
      if (data.status === 'completed') {
        setShowCelebration(true);
        toast.success('Project completed successfully! 🎉');
      } else {
        toast.success(`Project marked as ${data.status}`);
      }
      
      setTimeout(() => {
        form.reset();
        onSuccess?.();
        onOpenChange(false);
        setShowCelebration(false);
      }, 1500);
    } catch (error) {
      toast.error('Failed to complete project');
      console.error('Completion error:', error);
    }
  };

  const selectedRating = form.watch('customerSatisfactionRating');
  const actualCost = form.watch('actualTotalCost');
  const status = form.watch('status');

  // Calculate variance
  const variance = estimatedTotalValue && actualCost 
    ? actualCost - estimatedTotalValue 
    : null;
  const variancePercent = estimatedTotalValue && actualCost
    ? ((actualCost - estimatedTotalValue) / estimatedTotalValue) * 100
    : null;

  if (showCelebration) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px] text-center">
          <div className="py-8">
            <PartyPopper className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Project Complete!</h2>
            <p className="text-muted-foreground">
              {projectTitle} has been successfully completed.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Complete Project
          </DialogTitle>
          <DialogDescription>
            Finalize {projectTitle} with completion details and customer feedback
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Status Selection */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Final Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select final status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="completed">✅ Completed</SelectItem>
                      <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                      <SelectItem value="on_hold">⏸️ On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Completion Date */}
            <FormField
              control={form.control}
              name="actualCompletionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completion Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actual Cost */}
            <FormField
              control={form.control}
              name="actualTotalCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Total Cost</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter actual total cost"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  {estimatedTotalValue && (
                    <FormDescription>
                      Estimated: ${estimatedTotalValue.toLocaleString()}
                      {variance !== null && (
                        <span className={cn(
                          "ml-2 font-medium",
                          variance > 0 ? 'text-red-500' : variance < 0 ? 'text-green-500' : 'text-gray-500'
                        )}>
                          ({variance > 0 ? '+' : ''}{variancePercent?.toFixed(1)}%)
                        </span>
                      )}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {status === 'completed' && (
              <>
                {/* Customer Rating */}
                <FormField
                  control={form.control}
                  name="customerSatisfactionRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Satisfaction (Optional)</FormLabel>
                      <FormDescription>
                        Overall customer satisfaction rating
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
                          placeholder="Enter overall customer feedback..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Generate Handover Pack */}
                <FormField
                  control={form.control}
                  name="generateHandoverPack"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Generate Handover Pack
                        </FormLabel>
                        <FormDescription>
                          Automatically generate a completion summary document with project details,
                          system specifications, and warranty information.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={completeProject.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={completeProject.isPending || !form.formState.isValid}
              >
                {completeProject.isPending 
                  ? 'Completing...' 
                  : status === 'completed' 
                    ? 'Complete Project' 
                    : 'Update Status'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
