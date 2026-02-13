/**
 * Job Template Form Dialog Component
 *
 * Dialog for creating/editing job templates.
 * Supports configuring default tasks, BOM, checklist, and SLA.
 *
 * @see src/hooks/use-job-templates.ts
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-007c
 */

'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateJobTemplate, useUpdateJobTemplate, useChecklistTemplates, toast } from '@/hooks';
import { useJobFormValidation } from '@/lib/schemas/jobs/job-validation';
import type {
  JobTemplateResponse,
  JobTemplateTaskInput,
  JobTemplateBOMItemInput,
} from '@/lib/schemas';
import { FileText, Plus, Trash2, GripVertical, ListTodo, ClipboardCheck } from 'lucide-react';

interface JobTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Template to edit (null for create mode) */
  template?: JobTemplateResponse | null;
  /** Callback when template is saved */
  onSuccess?: () => void;
}

export function JobTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: JobTemplateFormDialogProps) {
  const isEditMode = !!template;

  // Mutations
  const createMutation = useCreateJobTemplate();
  const updateMutation = useUpdateJobTemplate();

  // Checklist templates for selection
  const { data: checklistData, isLoading: checklistsLoading } = useChecklistTemplates({
    includeInactive: false,
  });
  const checklistTemplates = checklistData?.templates ?? [];

  // Form validation
  const validation = useJobFormValidation();

  // Form state - initialized from template (key prop on DialogContent handles remount)
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [estimatedDuration, setEstimatedDuration] = useState(template?.estimatedDuration ?? 120);
  const [checklistTemplateId, setChecklistTemplateId] = useState<string | undefined>(
    template?.checklistTemplateId ?? undefined
  );

  // Form state - tasks
  const [tasks, setTasks] = useState<JobTemplateTaskInput[]>(
    template?.defaultTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      position: t.position,
    })) ?? []
  );

  // Form state - BOM (simplified - just product IDs and quantities)
  const [bomItems] = useState<JobTemplateBOMItemInput[]>(
    template?.defaultBOM.map((b) => ({
      id: b.id,
      productId: b.productId,
      quantityRequired: b.quantityRequired,
      notes: b.notes,
    })) ?? []
  );

  // Active tab
  const [activeTab, setActiveTab] = useState('details');

  // Add a new task
  const addTask = () => {
    const newTask: JobTemplateTaskInput = {
      id: crypto.randomUUID(),
      title: '',
      description: undefined,
      position: tasks.length,
    };
    setTasks([...tasks, newTask]);
  };

  // Update a task
  const updateTask = (id: string, field: keyof JobTemplateTaskInput, value: string | number) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, [field]: value } : task)));
  };

  // Remove a task
  const removeTask = (id: string) => {
    setTasks(
      tasks.filter((task) => task.id !== id).map((task, index) => ({ ...task, position: index }))
    );
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name.');
      return;
    }

    // Filter out empty tasks
    const validTasks = tasks.filter((t) => t.title.trim());

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      estimatedDuration,
      checklistTemplateId: checklistTemplateId || undefined,
      defaultTasks: validTasks.map((t, index) => ({
        ...t,
        position: index,
      })),
      defaultBOM: bomItems,
      isActive: true,
    };

    try {
      if (isEditMode && template) {
        await updateMutation.mutateAsync({
          templateId: template.id,
          ...data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error toast is handled by the mutation hook
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Duration options (in minutes)
  const durationOptions = [
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
    { value: 300, label: '5 hours' },
    { value: 360, label: '6 hours' },
    { value: 480, label: '8 hours (1 day)' },
    { value: 960, label: '2 days' },
    { value: 1440, label: '3 days' },
    { value: 2400, label: '5 days' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Key forces remount on template change, resetting all form state */}
      <DialogContent
        key={template?.id ?? 'create'}
        className="max-h-[85vh] overflow-y-auto sm:max-w-[700px]"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditMode ? 'Edit Job Template' : 'Create Job Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the template settings below.'
              : 'Create a new template for quick job creation.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="gap-1">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1">
              <ListTodo className="h-4 w-4" />
              Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-1">
              <ClipboardCheck className="h-4 w-4" />
              Checklist
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Residential Battery Installation"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  validation.validateField('customerName', e.target.value); // Reuse customerName validation for template names
                }}
                className={
                  validation.getFieldValidation('customerName').isValid ? '' : 'border-red-500'
                }
              />
              {validation.getFieldError('customerName') && (
                <p className="text-sm text-red-600">{validation.getFieldError('customerName')}</p>
              )}
              {validation.getFieldSuggestion('customerName') && (
                <p className="text-sm text-blue-600">
                  {validation.getFieldSuggestion('customerName')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this job type..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  validation.validateField('description', e.target.value);
                }}
                rows={2}
                className={
                  validation.getFieldValidation('description').isValid ? '' : 'border-red-500'
                }
              />
              {validation.getFieldError('description') && (
                <p className="text-sm text-red-600">{validation.getFieldError('description')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration</Label>
              <Select
                value={String(estimatedDuration)}
                onValueChange={(v) => setEstimatedDuration(Number(v))}
              >
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Define default tasks that will be created with jobs using this template.
              </p>
              <Button variant="outline" size="sm" onClick={addTask}>
                <Plus className="mr-1 h-4 w-4" />
                Add Task
              </Button>
            </div>

            {tasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <ListTodo className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                  <p className="text-muted-foreground">No default tasks defined</p>
                  <Button variant="link" onClick={addTask}>
                    Add your first task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <Card key={task.id}>
                    <CardContent className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="text-muted-foreground mt-2 h-5 w-5 cursor-grab" />
                        <Badge variant="secondary" className="mt-2">
                          {index + 1}
                        </Badge>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Task title"
                            value={task.title}
                            onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                          />
                          <Input
                            placeholder="Description (optional)"
                            value={task.description ?? ''}
                            onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                          />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeTask(task.id)}>
                          <Trash2 className="text-destructive h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist" className="mt-4 space-y-4">
            <p className="text-muted-foreground text-sm">
              Select a checklist template to automatically apply when jobs are created.
            </p>

            {checklistsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="checklist">Checklist Template</Label>
                <Select
                  value={checklistTemplateId ?? 'none'}
                  onValueChange={(v) => setChecklistTemplateId(v === 'none' ? undefined : v)}
                >
                  <SelectTrigger id="checklist">
                    <SelectValue placeholder="Select a checklist template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No checklist</SelectItem>
                    {checklistTemplates.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.name} ({ct.items.length} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {checklistTemplateId && (
              <Card>
                <CardContent className="py-4">
                  {(() => {
                    const selectedChecklist = checklistTemplates.find(
                      (ct) => ct.id === checklistTemplateId
                    );
                    if (!selectedChecklist) return null;
                    return (
                      <div>
                        <h4 className="mb-2 font-medium">{selectedChecklist.name}</h4>
                        <ul className="text-muted-foreground space-y-1 text-sm">
                          {selectedChecklist.items.slice(0, 5).map((item) => (
                            <li key={item.id} className="flex items-center gap-2">
                              <ClipboardCheck className="h-3 w-3" />
                              {item.text}
                            </li>
                          ))}
                          {selectedChecklist.items.length > 5 && (
                            <li className="text-muted-foreground">
                              ...and {selectedChecklist.items.length - 5} more items
                            </li>
                          )}
                        </ul>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name.trim()}>
            {isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
