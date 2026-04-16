import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  Loader2,
  Package,
  ScanSearch,
  Shield,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { RouteErrorFallback } from '@/components/layout';
import { SupportFormSkeleton } from '@/components/skeletons/support';
import { PageLayout } from '@/components/layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  CustomerCombobox,
  EmptyState,
  OrderCombobox,
  type OrderSummary,
  WarrantyCombobox,
  type WarrantySummary,
} from '@/components/shared';
import {
  FormErrorSummary,
  FormField,
  FormFieldDisplayProvider,
  FormSection,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
  extractFieldError,
  type AnyFieldApi,
  useFormFieldDisplay,
} from '@/components/shared/forms';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { useCreateIssue, useIssueIntakePreview } from '@/hooks/support';
import { useCustomer } from '@/hooks/customers';
import { useWarranty } from '@/hooks/warranty';
import { useOrder } from '@/hooks/orders/use-orders';
import { customerSchema, type Customer } from '@/lib/schemas/customers';
import {
  type CreateIssueInput,
  newIssueSearchSchema,
  type NewIssueSearch,
  type IssueIntakeAnchor,
  type IssuePriority,
  issuePrioritySchema,
  type IssueType,
  issueTypeSchema,
} from '@/lib/schemas/support/issues';

export const Route = createFileRoute('/_authenticated/support/issues/new')({
  component: NewIssuePage,
  validateSearch: newIssueSearchSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/issues" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="New Issue" description="Create a new support issue" />
      <PageLayout.Content>
        <SupportFormSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

const TYPE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: 'hardware_fault', label: 'Hardware Fault' },
  { value: 'software_firmware', label: 'Software/Firmware' },
  { value: 'installation_defect', label: 'Installation Defect' },
  { value: 'performance_degradation', label: 'Performance Degradation' },
  { value: 'connectivity', label: 'Connectivity' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS: { value: IssuePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const INTAKE_OPTIONS: Array<{
  value: IssueIntakeAnchor;
  label: string;
  icon: typeof ScanSearch;
}> = [
  { value: 'serial', label: 'Start from Serial', icon: ScanSearch },
  { value: 'warranty', label: 'Start from Warranty', icon: Shield },
  { value: 'order', label: 'Start from Order', icon: Package },
  { value: 'customer', label: 'Start from Customer', icon: User },
];

const newIssueFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  description: z.string().max(5000),
  type: issueTypeSchema,
  priority: issuePrioritySchema,
  customerId: z.string().uuid().nullable(),
  warrantyId: z.string().uuid().nullable(),
  warrantyEntitlementId: z.string().uuid().nullable(),
  productId: z.string().uuid().nullable(),
  orderId: z.string().uuid().nullable(),
  shipmentId: z.string().uuid().nullable(),
  serializedItemId: z.string().uuid().nullable(),
  serviceSystemId: z.string().uuid().nullable(),
  serialNumber: z.string().max(255),
});

type NewIssueFormValues = z.infer<typeof newIssueFormSchema>;

function toNullable(value?: string | null) {
  return value ?? null;
}

function toBlankable(value?: string | null) {
  return value ?? '';
}

function normalizeIssuePayload(values: NewIssueFormValues): CreateIssueInput {
  const normalizeOptionalString = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  return {
    ...values,
    title: values.title.trim(),
    description: normalizeOptionalString(values.description),
    serialNumber: normalizeOptionalString(values.serialNumber),
  } as CreateIssueInput;
}

function toWarrantySummary(data: Awaited<ReturnType<typeof useWarranty>>['data']): WarrantySummary | null {
  if (!data) return null;
  return {
    id: data.id,
    warrantyNumber: data.warrantyNumber,
    customerName: data.customerName,
    productName: data.productName,
    productSerial: data.productSerial,
    status: data.status,
  };
}

function toOrderSummary(data: Awaited<ReturnType<typeof useOrder>>['data']): OrderSummary | null {
  if (!data) return null;
  return {
    id: data.id,
    orderNumber: data.orderNumber ?? `Order ${data.id.slice(0, 8)}`,
    customerName: null,
    total: data.total ?? 0,
    status: data.status,
  };
}

function NewIssuePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const createMutation = useCreateIssue();
  const derivedIntakeAnchor =
    search.intakeAnchor ??
    (search.warrantyId
      ? 'warranty'
      : search.orderId
        ? 'order'
        : search.customerId
          ? 'customer'
          : 'serial');

  const [intakeAnchor, setIntakeAnchor] = useState<IssueIntakeAnchor>(derivedIntakeAnchor);
  const [supportingAnchorsOpen, setSupportingAnchorsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantySummary | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useTanStackForm<NewIssueFormValues>({
    schema: newIssueFormSchema,
    defaultValues: {
      title: '',
      description: '',
      type: 'other',
      priority: 'medium',
      customerId: toNullable(search.customerId),
      warrantyId: toNullable(search.warrantyId),
      warrantyEntitlementId: toNullable(search.warrantyEntitlementId),
      productId: toNullable(search.productId),
      orderId: toNullable(search.orderId),
      shipmentId: toNullable(search.shipmentId),
      serializedItemId: toNullable(search.serializedItemId),
      serviceSystemId: toNullable(search.serviceSystemId),
      serialNumber: toBlankable(search.serialNumber),
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the highlighted fields before creating the issue.');
    },
    onSubmit: async (values) => {
      if (preview?.state === 'conflict') {
        const message = 'These selections point to different records. Clear one of the conflicting anchors before creating the issue.';
        setSubmitError(message);
        toast.error(message);
        return;
      }

      setSubmitError(null);

      try {
        const result = await createMutation.mutateAsync(
          normalizeIssuePayload(values) as CreateIssueInput
        );
        toast.success('Issue created successfully');
        navigate({
          to: '/support/issues/$issueId',
          params: { issueId: result.id },
        });
      } catch (error) {
        const message =
          error &&
          typeof error === 'object' &&
          'details' in error &&
          error.details &&
          typeof error.details === 'object' &&
          'summary' in error.details &&
          typeof error.details.summary === 'string'
            ? error.details.summary
            : error instanceof Error
              ? error.message
              : 'Failed to create issue';
        setSubmitError(message);
        toast.error(message);
      }
    },
  });

  const watchedTitle = form.useWatch('title');
  const watchedCustomerId = form.useWatch('customerId');
  const watchedWarrantyId = form.useWatch('warrantyId');
  const watchedWarrantyEntitlementId = form.useWatch('warrantyEntitlementId');
  const watchedProductId = form.useWatch('productId');
  const watchedOrderId = form.useWatch('orderId');
  const watchedShipmentId = form.useWatch('shipmentId');
  const watchedSerializedItemId = form.useWatch('serializedItemId');
  const watchedServiceSystemId = form.useWatch('serviceSystemId');
  const watchedSerialNumber = form.useWatch('serialNumber');
  const watchedDescription = form.useWatch('description');
  const watchedType = form.useWatch('type');
  const watchedPriority = form.useWatch('priority');

  const { data: customerData } = useCustomer({
    id: watchedCustomerId ?? '',
    enabled: !!watchedCustomerId,
  });
  const { data: warrantyData } = useWarranty({
    id: watchedWarrantyId ?? '',
    enabled: !!watchedWarrantyId,
  });
  const { data: orderData } = useOrder({
    orderId: watchedOrderId ?? '',
    enabled: !!watchedOrderId,
  });

  useEffect(() => {
    setIntakeAnchor(derivedIntakeAnchor);
  }, [derivedIntakeAnchor]);

  useEffect(() => {
    if (submitError) {
      setSubmitError(null);
    }
  }, [
    submitError,
    watchedCustomerId,
    watchedOrderId,
    watchedPriority,
    watchedSerialNumber,
    watchedServiceSystemId,
    watchedTitle,
    watchedWarrantyId,
    watchedDescription,
    watchedType,
  ]);

  useEffect(() => {
    if (!watchedCustomerId) {
      setSelectedCustomer(null);
      return;
    }
    if (customerData) {
      const result = customerSchema.safeParse(customerData);
      if (result.success) {
        setSelectedCustomer(result.data);
      }
    }
  }, [customerData, watchedCustomerId]);

  useEffect(() => {
    if (!watchedWarrantyId) {
      setSelectedWarranty(null);
      return;
    }
    if (warrantyData) {
      setSelectedWarranty(toWarrantySummary(warrantyData));
    }
  }, [watchedWarrantyId, warrantyData]);

  useEffect(() => {
    if (!watchedOrderId) {
      setSelectedOrder(null);
      return;
    }
    if (orderData) {
      setSelectedOrder(toOrderSummary(orderData));
    }
  }, [orderData, watchedOrderId]);

  const previewInput = useMemo(
    () => ({
      customerId: watchedCustomerId ?? undefined,
      warrantyId: watchedWarrantyId ?? undefined,
      warrantyEntitlementId: watchedWarrantyEntitlementId ?? undefined,
      productId: watchedProductId ?? undefined,
      orderId: watchedOrderId ?? undefined,
      shipmentId: watchedShipmentId ?? undefined,
      serializedItemId: watchedSerializedItemId ?? undefined,
      serviceSystemId: watchedServiceSystemId ?? undefined,
      serialNumber: watchedSerialNumber.trim() || undefined,
    }),
    [
      watchedCustomerId,
      watchedOrderId,
      watchedProductId,
      watchedSerializedItemId,
      watchedSerialNumber,
      watchedServiceSystemId,
      watchedShipmentId,
      watchedWarrantyEntitlementId,
      watchedWarrantyId,
    ]
  );

  const hasAnyAnchor = Object.values(previewInput).some(Boolean);
  const { data: preview, isLoading: isPreviewLoading } = useIssueIntakePreview(
    previewInput,
    hasAnyAnchor
  );

  const isConflict = preview?.state === 'conflict';

  const activeAnchors = [
    watchedSerialNumber.trim()
      ? {
          key: 'serial',
          label: `Serial ${watchedSerialNumber.trim()}`,
          onClear: () => {
            form.setFieldValue('serialNumber', '');
            form.setFieldValue('serializedItemId', null);
          },
        }
      : null,
    watchedWarrantyId
      ? {
          key: 'warranty',
          label: selectedWarranty?.warrantyNumber ?? 'Warranty context',
          onClear: () => {
            setSelectedWarranty(null);
            form.setFieldValue('warrantyId', null);
            form.setFieldValue('warrantyEntitlementId', null);
          },
        }
      : null,
    watchedOrderId
      ? {
          key: 'order',
          label: selectedOrder?.orderNumber ?? 'Order context',
          onClear: () => {
            setSelectedOrder(null);
            form.setFieldValue('orderId', null);
            form.setFieldValue('shipmentId', null);
          },
        }
      : null,
    watchedCustomerId
      ? {
          key: 'customer',
          label: selectedCustomer?.name ?? 'Commercial customer',
          onClear: () => {
            setSelectedCustomer(null);
            form.setFieldValue('customerId', null);
          },
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onClear: () => void }>;

  const primaryHelpText =
    intakeAnchor === 'serial'
      ? 'Best when support starts with a battery or inverter serial.'
      : intakeAnchor === 'warranty'
        ? 'Best when support starts from an activated coverage record.'
        : intakeAnchor === 'order'
          ? 'Best when you know the sale but not the installed-system details yet.'
          : 'Best when the caller only knows the commercial account.';

  const handleIntakeAnchorChange = (nextAnchor: IssueIntakeAnchor) => {
    setIntakeAnchor(nextAnchor);
    navigate({
      to: '/support/issues/new',
      search: (prev: NewIssueSearch) => ({
        ...prev,
        intakeAnchor: nextAnchor,
      }),
      replace: true,
    });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="New Issue"
        description="Create a support issue from serial, warranty, order, or customer context"
        actions={
          <Link to="/support/issues" className={cn(buttonVariants({ variant: 'outline' }))}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Issues
          </Link>
        }
      />

      <PageLayout.Content>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-6"
        >
          <FormFieldDisplayProvider form={form}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Context Intake</CardTitle>
                <CardDescription>
                  Start from the strongest anchor you have, then add supporting context only if it helps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {INTAKE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant={intakeAnchor === option.value ? 'default' : 'outline'}
                        onClick={() => handleIntakeAnchorChange(option.value)}
                        className="gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>

                <FormSection
                  title="Primary entry path"
                  description={primaryHelpText}
                  className="rounded-lg border border-border/70 bg-muted/20 p-4"
                >
                  {intakeAnchor === 'serial' ? (
                    <form.Field name="serialNumber">
                      {(field) => (
                        <TextField
                          field={field}
                          label="Serial"
                          placeholder="Enter serial number"
                          description="Use the printed device serial when support starts from hardware."
                        />
                      )}
                    </form.Field>
                  ) : null}

                  {intakeAnchor === 'warranty' ? (
                    <form.Field name="warrantyId">
                      {(field) => (
                        <AnchorComboboxField
                          field={field}
                          label="Warranty"
                          description="Use the activated coverage record when that is the clearest support anchor."
                        >
                          <WarrantyCombobox
                            value={selectedWarranty}
                            onSelect={(warranty) => {
                              setSelectedWarranty(warranty);
                              form.setFieldValue('warrantyId', warranty?.id ?? null);
                            }}
                            customerId={watchedCustomerId ?? undefined}
                            placeholder="Search warranties..."
                          />
                        </AnchorComboboxField>
                      )}
                    </form.Field>
                  ) : null}

                  {intakeAnchor === 'order' ? (
                    <form.Field name="orderId">
                      {(field) => (
                        <AnchorComboboxField
                          field={field}
                          label="Order"
                          description="Use the sale record when the operator knows what was purchased but not yet the exact installed-system context."
                        >
                          <OrderCombobox
                            value={selectedOrder}
                            onSelect={(order) => {
                              setSelectedOrder(order);
                              form.setFieldValue('orderId', order?.id ?? null);
                            }}
                            customerId={watchedCustomerId ?? undefined}
                            placeholder="Search orders..."
                          />
                        </AnchorComboboxField>
                      )}
                    </form.Field>
                  ) : null}

                  {intakeAnchor === 'customer' ? (
                    <form.Field name="customerId">
                      {(field) => (
                        <AnchorComboboxField
                          field={field}
                          label="Customer"
                          description="Use the purchased-via account when the caller only knows the commercial relationship."
                        >
                          <CustomerCombobox
                            value={selectedCustomer}
                            onSelect={(customer) => {
                              setSelectedCustomer(customer);
                              form.setFieldValue('customerId', customer?.id ?? null);
                            }}
                            placeholder="Search customers..."
                          />
                        </AnchorComboboxField>
                      )}
                    </form.Field>
                  ) : null}
                </FormSection>

                {activeAnchors.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Active anchors
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeAnchors.map((anchor) => (
                        <Badge key={anchor.key} variant="secondary" className="gap-2 pr-1">
                          <span className="max-w-[220px] truncate">{anchor.label}</span>
                          <button
                            type="button"
                            onClick={anchor.onClear}
                            className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                            aria-label={`Clear ${anchor.key}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                <Collapsible open={supportingAnchorsOpen} onOpenChange={setSupportingAnchorsOpen}>
                  <div className="rounded-lg border border-dashed border-border/70 bg-background/70">
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left"
                      >
                        <div>
                          <p className="text-sm font-medium">Supporting anchors</p>
                          <p className="text-xs text-muted-foreground">
                            Keep the primary anchor simple, then add extra context only when the operator knows more.
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform',
                            supportingAnchorsOpen && 'rotate-180'
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="grid gap-4 border-t border-border/60 pt-4 lg:grid-cols-2">
                        {intakeAnchor !== 'serial' ? (
                          <form.Field name="serialNumber">
                            {(field) => (
                              <TextField
                                field={field}
                                label="Serial"
                                placeholder="Add serial if known"
                                description="Useful when you have hardware in hand but started from another anchor."
                              />
                            )}
                          </form.Field>
                        ) : null}

                        {intakeAnchor !== 'warranty' ? (
                          <form.Field name="warrantyId">
                            {(field) => (
                              <AnchorComboboxField
                                field={field}
                                label="Warranty"
                                description="Add when coverage is known and should stay attached to the issue."
                              >
                                <WarrantyCombobox
                                  value={selectedWarranty}
                                  onSelect={(warranty) => {
                                    setSelectedWarranty(warranty);
                                    form.setFieldValue('warrantyId', warranty?.id ?? null);
                                  }}
                                  customerId={watchedCustomerId ?? undefined}
                                  placeholder="Add warranty context"
                                />
                              </AnchorComboboxField>
                            )}
                          </form.Field>
                        ) : null}

                        {intakeAnchor !== 'order' ? (
                          <form.Field name="orderId">
                            {(field) => (
                              <AnchorComboboxField
                                field={field}
                                label="Order"
                                description="Add when you want the issue tied back to the source commercial sale."
                              >
                                <OrderCombobox
                                  value={selectedOrder}
                                  onSelect={(order) => {
                                    setSelectedOrder(order);
                                    form.setFieldValue('orderId', order?.id ?? null);
                                  }}
                                  customerId={watchedCustomerId ?? undefined}
                                  placeholder="Add source order"
                                />
                              </AnchorComboboxField>
                            )}
                          </form.Field>
                        ) : null}

                        {intakeAnchor !== 'customer' ? (
                          <form.Field name="customerId">
                            {(field) => (
                              <AnchorComboboxField
                                field={field}
                                label="Customer"
                                description="Add when the purchased-via commercial account matters for follow-up or returns."
                              >
                                <CustomerCombobox
                                  value={selectedCustomer}
                                  onSelect={(customer) => {
                                    setSelectedCustomer(customer);
                                    form.setFieldValue('customerId', customer?.id ?? null);
                                  }}
                                  placeholder="Add commercial customer"
                                />
                              </AnchorComboboxField>
                            )}
                          </form.Field>
                        ) : null}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <p className="text-xs text-muted-foreground">
                  Switching entry paths keeps the current anchors in place. Remove anything that should not travel with the issue before you submit.
                </p>
              </CardContent>
            </Card>

            <FormErrorSummary
              form={form}
              submitError={submitError}
              title="Issue can’t be created yet"
            />

            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
              <Card className="order-2 lg:order-1">
                <CardHeader>
                  <CardTitle className="text-base">Issue Details</CardTitle>
                  <CardDescription>
                    Capture what support is seeing now. The resolved context on the right will stay tied to the issue.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form.Field name="title">
                    {(field) => (
                      <TextField
                        field={field}
                        label="Title"
                        placeholder="Brief description of the issue"
                        description="Keep this short enough to scan in the queue."
                        required
                      />
                    )}
                  </form.Field>

                  <form.Field name="description">
                    {(field) => (
                      <TextareaField
                        field={field}
                        label="Description"
                        placeholder="Describe what the operator is seeing, hearing, or being told."
                        description="Include symptoms, site observations, and anything already tried."
                        rows={8}
                      />
                    )}
                  </form.Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <form.Field name="type">
                      {(field) => (
                        <SelectField
                          field={field}
                          label="Issue Type"
                          options={TYPE_OPTIONS}
                          placeholder="Select issue type"
                        />
                      )}
                    </form.Field>

                    <form.Field name="priority">
                      {(field) => (
                        <SelectField
                          field={field}
                          label="Priority"
                          options={PRIORITY_OPTIONS}
                          placeholder="Select priority"
                        />
                      )}
                    </form.Field>
                  </div>
                </CardContent>
              </Card>

              <div className="order-1 space-y-4 lg:order-2">
                <Card className={cn(isConflict ? 'border-destructive/60' : preview ? 'border-primary/20' : '')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      Resolved Context
                      {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    </CardTitle>
                    <CardDescription>
                      This is the support lineage the issue will inherit once you create it.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {preview ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              preview.state === 'conflict'
                                ? 'destructive'
                                : preview.state === 'resolved'
                                  ? 'default'
                                  : 'secondary'
                            }
                            className="capitalize"
                          >
                            {preview.state}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{preview.summary}</p>
                        </div>

                        <SummaryLine
                          label="Commercial Context"
                          value={preview.supportContext.commercialCustomer?.name ?? 'No commercial customer confirmed'}
                        />
                        <SummaryLine
                          label="Coverage Context"
                          value={preview.supportContext.warranty?.warrantyNumber ?? 'No warranty confirmed'}
                        />
                        <SummaryLine
                          label="Physical Asset"
                          value={
                            preview.supportContext.serializedItem?.serialNumber ??
                            preview.anchors.serialNumber ??
                            'No serialized asset confirmed'
                          }
                          mono={!!(preview.supportContext.serializedItem?.serialNumber ?? preview.anchors.serialNumber)}
                        />
                        <SummaryLine
                          label="Installed System"
                          value={preview.supportContext.serviceSystem?.displayName ?? 'No installed system linked yet'}
                        />
                        <SummaryLine
                          label="Current Owner"
                          value={preview.supportContext.currentOwner?.fullName ?? 'No current owner linked yet'}
                        />
                        <SummaryLine
                          label="RMA Readiness"
                          value={
                            preview.supportContext.order?.id
                              ? 'RMA handoff can be evaluated once the issue is resolved.'
                              : 'Source order could not be confirmed from the current intake context.'
                          }
                        />

                        {preview.conflicts.length > 0 ? (
                          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              Conflicting anchors
                            </div>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {preview.conflicts.map((conflict) => (
                                <li key={`${conflict.field}-${conflict.expected}-${conflict.actual}`}>
                                  {conflict.reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <EmptyState
                        icon={ScanSearch}
                        title="No context resolved yet"
                        message="Add a serial, warranty, order, or customer to preview the support lineage before submit."
                      />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ready to Create</CardTitle>
                    <CardDescription>
                      Issues can be created with partial lineage, but conflicts must be cleared first.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SubmitButton
                      isLoading={form.state.isSubmitting}
                      canSubmit={form.state.canSubmit}
                      label="Create Issue"
                      loadingLabel="Creating issue..."
                      className="w-full"
                      disabled={!watchedTitle.trim() || isConflict}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </FormFieldDisplayProvider>
        </form>
      </PageLayout.Content>
    </PageLayout>
  );
}

function AnchorComboboxField({
  field,
  label,
  description,
  children,
}: {
  field: AnyFieldApi<string | null | undefined>;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  const { showErrorsAfterSubmit } = useFormFieldDisplay();
  const error = extractFieldError(field, { showErrorsAfterSubmit });

  return (
    <FormField label={label} name={field.name} description={description} error={error}>
      {children}
    </FormField>
  );
}

function SummaryLine({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-sm', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  );
}
