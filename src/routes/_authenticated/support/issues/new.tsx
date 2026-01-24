/**
 * New Issue Page
 *
 * Form for creating a new support issue.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-004
 */
import { useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { ChevronLeft, TicketIcon } from 'lucide-react';
import { toast } from 'sonner';

import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateIssue } from '@/hooks/support';
import type { IssueType, IssuePriority } from '@/lib/schemas/support/issues';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/issues/new')({
  component: NewIssuePage,
});

// ============================================================================
// OPTIONS
// ============================================================================

const TYPE_OPTIONS: { value: IssueType; label: string; description: string }[] = [
  { value: 'hardware_fault', label: 'Hardware Fault', description: 'Physical equipment issues' },
  {
    value: 'software_firmware',
    label: 'Software/Firmware',
    description: 'Software or firmware bugs',
  },
  {
    value: 'installation_defect',
    label: 'Installation Defect',
    description: 'Issues with installation',
  },
  {
    value: 'performance_degradation',
    label: 'Performance Degradation',
    description: 'System underperforming',
  },
  { value: 'connectivity', label: 'Connectivity', description: 'Connection or network issues' },
  { value: 'other', label: 'Other', description: 'Other type of issue' },
];

const PRIORITY_OPTIONS: { value: IssuePriority; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Minor issue, no urgency' },
  { value: 'medium', label: 'Medium', description: 'Standard priority' },
  { value: 'high', label: 'High', description: 'Important, needs attention' },
  { value: 'critical', label: 'Critical', description: 'Urgent, business impact' },
];

// ============================================================================
// COMPONENT
// ============================================================================

function NewIssuePage() {
  const navigate = useNavigate();
  const createMutation = useCreateIssue();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('other');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [customerId, setCustomerId] = useState('');

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        type,
        priority,
        customerId: customerId || undefined,
      });

      toast.success('Issue created successfully');
      navigate({
        to: '/support/issues/$issueId',
        params: { issueId: result.id },
      });
    } catch {
      toast.error('Failed to create issue');
    }
  };

  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-2">
            <TicketIcon className="h-6 w-6" />
            New Issue
          </div>
        }
        description="Create a new support issue"
        actions={
          <Link to="/support/issues">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Issues
            </Button>
          </Link>
        }
      />

      <PageLayout.Content>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Issue Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Brief description of the issue"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed description of the issue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Classification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Issue Type</Label>
                    <Select value={type} onValueChange={(v) => setType(v as IssueType)}>
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
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as IssuePriority)}>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="customerId">Customer ID (optional)</Label>
                    <Input
                      id="customerId"
                      placeholder="Enter customer ID"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                    />
                    <p className="text-muted-foreground text-xs">
                      Link this issue to a specific customer
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || !title.trim()}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Issue'}
              </Button>
            </div>
          </div>
        </form>
      </PageLayout.Content>
    </PageLayout>
  );
}
