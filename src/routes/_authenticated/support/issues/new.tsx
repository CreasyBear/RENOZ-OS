/**
 * New Issue Page
 *
 * Form for creating a new support issue.
 * Supports pre-population from warranty context via search params.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-004
 * @design-system Contextual Navigation Pattern (DETAIL-VIEW-STANDARDS.md)
 */
import { useState, useEffect, startTransition } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { SupportFormSkeleton } from '@/components/skeletons/support';
import { ChevronLeft, TicketIcon, Shield, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { PageLayout } from '@/components/layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateIssue } from '@/hooks/support';
import { useCustomer } from '@/hooks/customers';
import { useWarranty } from '@/hooks/warranty';
import { CustomerCombobox } from '@/components/shared';
import { customerSchema } from '@/lib/schemas/customers';
import type { Customer } from '@/lib/schemas/customers';
import type { IssueType, IssuePriority } from '@/lib/schemas/support/issues';
import { z } from 'zod';

// ============================================================================
// SEARCH PARAMS SCHEMA
// ============================================================================

const newIssueSearchSchema = z.object({
  customerId: z.string().optional(),
  warrantyId: z.string().optional(),
  productId: z.string().optional(),
  serialNumber: z.string().optional(),
});

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/issues/new')({
  component: NewIssuePage,
  validateSearch: newIssueSearchSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/issues" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="New Issue"
        description="Create a new support issue"
      />
      <PageLayout.Content>
        <SupportFormSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
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
  const { customerId: searchCustomerId, warrantyId, productId, serialNumber } = Route.useSearch();
  const createMutation = useCreateIssue();

  // Fetch context data when provided via search params
  const { data: customerData, isLoading: isCustomerLoading } = useCustomer({
    id: searchCustomerId ?? '',
    enabled: !!searchCustomerId,
  });
  const { data: warrantyData, isLoading: isWarrantyLoading } = useWarranty({
    id: warrantyId ?? '',
    enabled: !!warrantyId,
  });

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('other');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Prefill customer from entity linking (e.g. ?customerId= in URL)
  useEffect(() => {
    if (searchCustomerId && customerData) {
      const result = customerSchema.safeParse(customerData);
      if (result.success) {
        startTransition(() => setSelectedCustomer(result.data));
      }
    }
  }, [searchCustomerId, customerData]);

  // Auto-populate description with warranty context
  useEffect(() => {
    if (warrantyData || serialNumber) {
      const contextLines: string[] = [];
      
      if (warrantyData) {
        contextLines.push(`Related Warranty: ${warrantyData.warrantyNumber}`);
        contextLines.push(`Product: ${warrantyData.productName ?? 'Unknown Product'}`);
      }
      
      if (serialNumber) {
        contextLines.push(`Serial Number: ${serialNumber}`);
      }
      
      if (contextLines.length > 0) {
        const contextBlock = `\n\n---\n${contextLines.join('\n')}`;
        startTransition(() => {
          setDescription((prev) => {
            if (prev.includes('---')) return prev;
            return prev + contextBlock;
          });
        });
      }
    }
  }, [warrantyData, serialNumber]);

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
        customerId: selectedCustomer?.id ?? undefined,
        // Store warranty context in metadata
        metadata: warrantyId
          ? {
              warrantyId,
              productId,
              serialNumber: serialNumber ?? undefined,
            }
          : undefined,
      });

      toast.success('Issue created successfully');
      navigate({
        to: '/support/issues/$issueId',
        params: { issueId: result.id },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create issue');
    }
  };

  const isLoading = isCustomerLoading || isWarrantyLoading;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-2">
            <TicketIcon className="h-6 w-6" />
            New Issue
          </div>
        }
        description="Create a new support issue"
        actions={
          <Link
            to="/support/issues"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Issues
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
                    rows={8}
                  />
                  {warrantyId && (
                    <p className="text-xs text-muted-foreground">
                      Warranty information has been pre-populated in the description.
                    </p>
                  )}
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
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <CustomerCombobox
                        value={selectedCustomer}
                        onSelect={setSelectedCustomer}
                        placeholder="Search customers..."
                        disabled={false}
                      />
                      <p className="text-muted-foreground text-xs">
                        Link this issue to a specific customer
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Context Card - Shows when coming from warranty */}
              {warrantyId && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Warranty Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isWarrantyLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading warranty...</span>
                      </div>
                    ) : warrantyData ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {warrantyData.warrantyNumber}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {warrantyData.status}
                          </Badge>
                        </div>
                        {warrantyData.productName && (
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {warrantyData.productName}
                            </span>
                          </div>
                        )}
                        {serialNumber && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">SN:</span>
                            <span className="font-mono text-xs">{serialNumber}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground pt-1">
                          This issue will be linked to the warranty
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Warranty information unavailable
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

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
