/**
 * Action Plans Presenter Component
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 *
 * Displays and manages customer health improvement action plans:
 * - List of action plans with priority and status
 * - Create new action plans
 * - Complete action plans
 * - Filter by status, priority, category
 */

import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  DollarSign,
  ShoppingCart,
  Users,
  Lightbulb,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import type { CustomerActionPlan } from '@/hooks/customers/use-action-plans';

// ============================================================================
// TYPES
// ============================================================================

export interface ActionPlansProps {
  /** @source useCustomerActionPlans hook in container */
  actionPlans: CustomerActionPlan[];
  /** @source useCustomerActionPlans hook in container */
  isLoading?: boolean;
  /** Current customer ID */
  customerId: string;
  /** Handler to create a new action plan */
  onCreate: (data: {
    title: string;
    description?: string;
    priority: 'high' | 'medium' | 'low';
    category: 'recency' | 'frequency' | 'monetary' | 'engagement' | 'general';
    dueDate?: Date;
  }) => Promise<void>;
  /** Handler to complete an action plan */
  onComplete: (id: string) => Promise<void>;
  /** Handler to delete an action plan */
  onDelete: (id: string) => Promise<void>;
  /** Filter by completion status */
  filterCompleted?: boolean;
  /** Filter by priority */
  filterPriority?: 'high' | 'medium' | 'low';
  /** Filter by category */
  filterCategory?: 'recency' | 'frequency' | 'monetary' | 'engagement' | 'general';
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  recency: Calendar,
  frequency: ShoppingCart,
  monetary: DollarSign,
  engagement: Users,
  general: Lightbulb,
};

function isOverdue(dueDate: Date | string | null, isCompleted: boolean): boolean {
  if (!dueDate || isCompleted) return false;
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return d < new Date();
}

// ============================================================================
// ACTION PLAN CARD
// ============================================================================

interface ActionPlanCardProps {
  plan: CustomerActionPlan;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function ActionPlanCard({ plan, onComplete, onDelete }: ActionPlanCardProps) {
  const CategoryIcon = CATEGORY_ICONS[plan.category] ?? Lightbulb;
  const overdue = isOverdue(plan.dueDate, plan.isCompleted);

  return (
    <Card className={cn('transition-all', plan.isCompleted && 'opacity-60')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CategoryIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-medium">{plan.title}</CardTitle>
              {plan.isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground ml-auto" />
              )}
            </div>
            {plan.description && (
              <CardDescription className="text-sm mt-1">{plan.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge variant="outline" className={getPriorityColor(plan.priority)}>
            {plan.priority}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {plan.category}
          </Badge>
          {plan.dueDate && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                overdue && !plan.isCompleted && 'bg-red-50 text-red-700 border-red-300'
              )}
            >
              <Calendar className="h-3 w-3 mr-1" />
              Due {formatDate(plan.dueDate, { locale: 'en-AU' })}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!plan.isCompleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onComplete(plan.id)}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(plan.id)}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CREATE DIALOG
// ============================================================================

interface CreateActionPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    title: string;
    description?: string;
    priority: 'high' | 'medium' | 'low';
    category: 'recency' | 'frequency' | 'monetary' | 'engagement' | 'general';
    dueDate?: Date;
  }) => Promise<void>;
}

function CreateActionPlanDialog({ open, onOpenChange, onCreate }: CreateActionPlanDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [category, setCategory] = useState<
    'recency' | 'frequency' | 'monetary' | 'engagement' | 'general'
  >('general');
  const [dueDate, setDueDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('general');
      setDueDate('');
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Action Plan</DialogTitle>
          <DialogDescription>
            Add a new health improvement action plan for this customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Schedule follow-up call"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details…"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as typeof category)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recency">Recency</SelectItem>
                  <SelectItem value="frequency">Frequency</SelectItem>
                  <SelectItem value="monetary">Monetary</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            Create Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActionPlans({
  actionPlans,
  isLoading = false,
  customerId: _customerId,
  onCreate,
  onComplete,
  onDelete,
  filterCompleted,
  filterPriority,
  filterCategory,
  className,
}: ActionPlansProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Filter plans
  const filteredPlans = actionPlans.filter((plan) => {
    if (filterCompleted !== undefined && plan.isCompleted !== filterCompleted) return false;
    if (filterPriority && plan.priority !== filterPriority) return false;
    if (filterCategory && plan.category !== filterCategory) return false;
    return true;
  });

  const activePlans = filteredPlans.filter((p) => !p.isCompleted);
  const completedPlans = filteredPlans.filter((p) => p.isCompleted);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Action Plans</h3>
          <p className="text-sm text-muted-foreground">
            Track health improvement actions for this customer
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No action plans yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="mt-3"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activePlans.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Active ({activePlans.length})
              </h4>
              <div className="grid gap-3">
                {activePlans.map((plan) => (
                  <ActionPlanCard
                    key={plan.id}
                    plan={plan}
                    onComplete={onComplete}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {completedPlans.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Completed ({completedPlans.length})
              </h4>
              <div className="grid gap-3">
                {completedPlans.map((plan) => (
                  <ActionPlanCard
                    key={plan.id}
                    plan={plan}
                    onComplete={onComplete}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <CreateActionPlanDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={onCreate}
      />
    </div>
  );
}
