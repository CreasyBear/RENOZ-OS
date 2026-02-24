/**
 * Issue Template Form Dialog Component
 *
 * Dialog for creating/editing issue templates.
 *
 * @see src/hooks/use-issue-templates.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-004
 */

'use client';

import { useEffect, useState, startTransition } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import type {
  IssueTemplateResponse,
  IssueType,
  IssuePriority,
  TemplateRequiredFields,
} from '@/lib/schemas/support/issue-templates';
import { FileText } from 'lucide-react';

interface IssueTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Template to edit (null for create mode) */
  template?: IssueTemplateResponse | null;
  /** From route container (mutation). */
  onSubmit: (payload: {
    name: string;
    description: string | null;
    type: IssueType;
    defaultPriority: IssuePriority;
    titleTemplate: string | null;
    descriptionPrompt: string | null;
    requiredFields: TemplateRequiredFields | null;
    isActive: boolean;
    templateId?: string;
  }) => Promise<void>;
  /** Callback when template is saved */
  onSuccess?: () => void;
  /** From route container (mutation). */
  isSubmitting?: boolean;
}

// Type options
const TYPE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: 'hardware_fault', label: 'Hardware Fault' },
  { value: 'software_firmware', label: 'Software/Firmware' },
  { value: 'installation_defect', label: 'Installation Defect' },
  { value: 'performance_degradation', label: 'Performance Degradation' },
  { value: 'connectivity', label: 'Connectivity' },
  { value: 'other', label: 'Other' },
];

// Priority options
const PRIORITY_OPTIONS: { value: IssuePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function IssueTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
  onSuccess,
  isSubmitting,
}: IssueTemplateFormDialogProps) {
  const isEditMode = !!template;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('hardware_fault');
  const [defaultPriority, setDefaultPriority] = useState<IssuePriority>('medium');
  const [titleTemplate, setTitleTemplate] = useState('');
  const [descriptionPrompt, setDescriptionPrompt] = useState('');
  const [requiredFields, setRequiredFields] = useState<TemplateRequiredFields>({});

  // Reset form when dialog opens or template changes
  useEffect(() => {
    if (open) {
      startTransition(() => {
        if (template) {
          setName(template.name);
          setDescription(template.description ?? '');
          setType(template.type);
          setDefaultPriority(template.defaultPriority);
          setTitleTemplate(template.titleTemplate ?? '');
          setDescriptionPrompt(template.descriptionPrompt ?? '');
          setRequiredFields(template.requiredFields ?? {});
        } else {
          setName('');
          setDescription('');
          setType('hardware_fault');
          setDefaultPriority('medium');
          setTitleTemplate('');
          setDescriptionPrompt('');
          setRequiredFields({});
        }
      });
    }
  }, [open, template]);

  // Handle submit
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name.');
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      defaultPriority,
      titleTemplate: titleTemplate.trim() || null,
      descriptionPrompt: descriptionPrompt.trim() || null,
      requiredFields: Object.keys(requiredFields).length > 0 ? requiredFields : null,
      isActive: true,
    };

    try {
      await onSubmit({
        ...data,
        ...(isEditMode && template ? { templateId: template.id } : {}),
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const isLoading = isSubmitting ?? false;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isLoading);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isLoading, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-[550px]"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditMode ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the template settings below.'
              : 'Create a new issue template to speed up issue creation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Battery Not Charging"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of when to use this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Issue Type *</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  const opt = TYPE_OPTIONS.find((o) => o.value === v);
                  if (opt) setType(opt.value);
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Default Priority</Label>
              <Select
                value={defaultPriority}
                onValueChange={(v) => {
                  const opt = PRIORITY_OPTIONS.find((o) => o.value === v);
                  if (opt) setDefaultPriority(opt.value);
                }}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title Template */}
          <div className="space-y-2">
            <Label htmlFor="titleTemplate">Title Template</Label>
            <Input
              id="titleTemplate"
              placeholder="e.g., Battery Not Charging - {serialNumber}"
              value={titleTemplate}
              onChange={(e) => setTitleTemplate(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Use {'{serialNumber}'}, {'{batteryModel}'}, etc. as placeholders
            </p>
          </div>

          {/* Description Prompt */}
          <div className="space-y-2">
            <Label htmlFor="descriptionPrompt">Description Prompt</Label>
            <Textarea
              id="descriptionPrompt"
              placeholder="Help text shown when creating an issue from this template..."
              value={descriptionPrompt}
              onChange={(e) => setDescriptionPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Required Fields */}
          <div className="space-y-3">
            <Label>Required Fields</Label>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="req-customer"
                  checked={requiredFields.customerId ?? false}
                  onCheckedChange={(checked) =>
                    setRequiredFields((prev) => ({ ...prev, customerId: !!checked }))
                  }
                />
                <label htmlFor="req-customer" className="text-sm">
                  Customer
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="req-serial"
                  checked={requiredFields.serialNumber ?? false}
                  onCheckedChange={(checked) =>
                    setRequiredFields((prev) => ({ ...prev, serialNumber: !!checked }))
                  }
                />
                <label htmlFor="req-serial" className="text-sm">
                  Serial Number
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="req-battery"
                  checked={requiredFields.batteryModel ?? false}
                  onCheckedChange={(checked) =>
                    setRequiredFields((prev) => ({ ...prev, batteryModel: !!checked }))
                  }
                />
                <label htmlFor="req-battery" className="text-sm">
                  Battery Model
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="req-inverter"
                  checked={requiredFields.inverterErrorCode ?? false}
                  onCheckedChange={(checked) =>
                    setRequiredFields((prev) => ({ ...prev, inverterErrorCode: !!checked }))
                  }
                />
                <label htmlFor="req-inverter" className="text-sm">
                  Inverter Error Code
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="req-date"
                  checked={requiredFields.installedDate ?? false}
                  onCheckedChange={(checked) =>
                    setRequiredFields((prev) => ({ ...prev, installedDate: !!checked }))
                  }
                />
                <label htmlFor="req-date" className="text-sm">
                  Installed Date
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
