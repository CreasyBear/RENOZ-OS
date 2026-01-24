/**
 * Apply Checklist Dialog
 *
 * Dialog for selecting and applying a checklist template to a job.
 * Shows available templates with item counts.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-004c
 */

import * as React from 'react';
import { ClipboardList, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ChecklistTemplateResponse } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface ApplyChecklistDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Available templates to select from */
  templates: ChecklistTemplateResponse[];
  /** Whether templates are loading */
  isLoadingTemplates?: boolean;
  /** Called when a template is selected and applied */
  onApply: (templateId: string) => void;
  /** Whether apply is in progress */
  isApplying?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ApplyChecklistDialog({
  open,
  onOpenChange,
  templates,
  isLoadingTemplates = false,
  onApply,
  isApplying = false,
}: ApplyChecklistDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>('');

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedTemplateId('');
    }
  }, [open]);

  const handleApply = () => {
    if (selectedTemplateId) {
      onApply(selectedTemplateId);
    }
  };

  const activeTemplates = templates.filter((t) => t.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Apply Checklist Template
          </DialogTitle>
          <DialogDescription>
            Select a commissioning checklist template to apply to this job. This will create
            checklist items that can be completed during the job.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoadingTemplates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : activeTemplates.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No checklist templates available.</p>
              <p className="mt-1 text-sm">Create a template in Settings first.</p>
            </div>
          ) : (
            <RadioGroup
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              className="space-y-3"
            >
              {activeTemplates.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    'flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-colors',
                    selectedTemplateId === template.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                  <Label htmlFor={template.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{template.name}</div>
                    {template.description && (
                      <div className="text-muted-foreground mt-1 text-sm">
                        {template.description}
                      </div>
                    )}
                    <div className="text-muted-foreground mt-2 text-xs">
                      {template.items.length} item
                      {template.items.length !== 1 ? 's' : ''}
                    </div>
                  </Label>
                  {selectedTemplateId === template.id && (
                    <Check className="text-primary h-5 w-5 shrink-0" />
                  )}
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selectedTemplateId || isApplying}>
            {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
