/**
 * PaymentReminders Component (Presenter)
 *
 * Displays payment reminder templates and history.
 * Pure presentation component - receives all data via props from container.
 *
 * @see src/routes/_authenticated/financial/reminders.tsx (container)
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-006c)
 */

import { memo, useState } from 'react';
import { Plus, Mail, Clock, Edit, Trash2, Send } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type {
  DeliveryStatus,
  ReminderTemplateWithStats,
  ReminderHistoryWithOrder,
  CreateReminderTemplateInput,
  UpdateReminderTemplateInput,
} from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentRemindersProps {
  /** @source useQuery(['reminder-templates']) from container */
  templates: ReminderTemplateWithStats[];
  /** @source useQuery(['reminder-history']) from container */
  history: ReminderHistoryWithOrder[];
  /** @source Combined loading state from container */
  isLoading: boolean;
  /** @source Error message if queries fail */
  error?: string;
  /** @source useMutation for createReminderTemplate from container */
  onCreateTemplate: (data: CreateReminderTemplateInput) => void;
  /** @source useMutation for updateReminderTemplate from container */
  onUpdateTemplate: (data: UpdateReminderTemplateInput) => void;
  /** @source useMutation for deleteReminderTemplate from container */
  onDeleteTemplate: (id: string) => void;
  /** @source useMutation.isPending from container */
  isSaving: boolean;
  className?: string;
}

// ============================================================================
// DELIVERY STATUS CONFIG
// ============================================================================

const deliveryStatusConfig: Record<
  DeliveryStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  sent: { label: 'Sent', variant: 'secondary' },
  delivered: { label: 'Delivered', variant: 'outline' },
  bounced: { label: 'Bounced', variant: 'destructive' },
  failed: { label: 'Failed', variant: 'destructive' },
};

// ============================================================================
// TEMPLATE DIALOG
// ============================================================================

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: {
    id: string;
    name: string;
    daysOverdue: number;
    subject: string;
    body: string;
    isActive: boolean;
  };
  onSave: (data: CreateReminderTemplateInput | UpdateReminderTemplateInput) => void;
  isSaving: boolean;
}

function TemplateDialog({ open, onOpenChange, template, onSave, isSaving }: TemplateDialogProps) {
  const [formData, setFormData] = useState({
    name: template?.name ?? '',
    daysOverdue: template?.daysOverdue?.toString() ?? '7',
    subject: template?.subject ?? 'Payment Reminder: Invoice {{invoiceNumber}}',
    body:
      template?.body ??
      'Dear {{customerName}},\n\nThis is a reminder that invoice {{invoiceNumber}} for {{invoiceAmount}} is {{daysOverdue}} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.',
    isActive: template?.isActive ?? true,
  });

  const isEdit = !!template;

  const handleSubmit = () => {
    const baseData = {
      name: formData.name,
      daysOverdue: parseInt(formData.daysOverdue),
      subject: formData.subject,
      body: formData.body,
      isActive: formData.isActive,
    };
    if (isEdit && template) {
      onSave({ id: template.id, ...baseData });
    } else {
      // Include sortOrder for new templates (schema has default but TS requires it)
      onSave({ ...baseData, sortOrder: 0 });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Template' : 'Create Reminder Template'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 7 Day Reminder"
              />
            </div>
            <div className="grid gap-2">
              <Label>Days Overdue Trigger</Label>
              <Input
                type="number"
                min="1"
                value={formData.daysOverdue}
                onChange={(e) => setFormData((prev) => ({ ...prev, daysOverdue: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Email Subject</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Email Body</Label>
            <Textarea
              rows={8}
              value={formData.body}
              onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
            />
            <p className="text-muted-foreground text-xs">
              Available variables: {'{{customerName}}'}, {'{{invoiceNumber}}'},{' '}
              {'{{invoiceAmount}}'}, {'{{daysOverdue}}'}, {'{{dueDate}}'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
            />
            <Label>Active (auto-send when conditions match)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !formData.name}>
            {isSaving ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT (PRESENTER)
// ============================================================================

export const PaymentReminders = memo(function PaymentReminders({
  templates,
  history,
  isLoading,
  error,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  isSaving,
  className,
}: PaymentRemindersProps) {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplateWithStats | null>(null);

  const handleEdit = (template: ReminderTemplateWithStats) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  const handleSave = (data: CreateReminderTemplateInput | UpdateReminderTemplateInput) => {
    if ('id' in data) {
      onUpdateTemplate(data);
    } else {
      onCreateTemplate(data);
    }
  };

  if (isLoading) {
    return <Skeleton className={cn('h-96 w-full', className)} />;
  }

  if (error) {
    return (
      <div className={cn('text-destructive rounded-lg border p-4', className)}>
        Error loading reminders: {error}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Reminders</h2>
          <p className="text-muted-foreground">Manage reminder templates and view send history</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Send History</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>

          {templates.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border py-8 text-center">
              <Mail className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No reminder templates configured</p>
              <p className="text-sm">Create templates for automated payment reminders</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteTemplate(template.id)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Triggers at {template.daysOverdue} days overdue
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-medium">{template.subject}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          {history.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border py-8 text-center">
              <Send className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No reminders sent yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((reminder) => {
                  const statusConf = deliveryStatusConfig[reminder.deliveryStatus];
                  return (
                    <TableRow key={reminder.id}>
                      <TableCell>
                        {format(new Date(reminder.sentAt), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{reminder.templateName}</TableCell>
                      <TableCell className="font-mono">{reminder.orderNumber}</TableCell>
                      <TableCell>{reminder.recipientEmail}</TableCell>
                      <TableCell>
                        <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <TemplateDialog
        key={editingTemplate?.id ?? 'new'}
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={editingTemplate ?? undefined}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
});
