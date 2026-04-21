/**
 * OrderEditDialog Component
 *
 * Dialog for editing order defaults and operator-facing notes.
 * Draft orders can still change customer/order number; live orders keep those locked.
 *
 * @see _misc/docs/reference/form-standards.md
 */

import { useEffect } from 'react';
import {
  FormDialog,
  TextField,
  TextareaField,
  SelectField,
  DateStringField,
} from '@/components/shared/forms';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { editOrderSchema, type EditOrderFormData } from './order-edit-dialog.schema';

export interface OrderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    orderNumber: string;
    customerId: string;
    status: string;
    dueDate?: Date | null;
    internalNotes?: string | null;
    customerNotes?: string | null;
    shippingAddress?: {
      street1?: string | null;
      street2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
      contactName?: string | null;
      contactPhone?: string | null;
    } | null;
  } | null;
  /** From route container (customer options). */
  customers?: Array<{ id: string; name: string }>;
  /** From route container (loading state). */
  isLoadingCustomers?: boolean;
  /** From route container (submit handler). */
  onSubmit?: (data: EditOrderFormData) => Promise<void>;
  /** From route container (submit state). */
  isSubmitting?: boolean;
  /** From route container (server/mutation error). */
  submitError?: string | null;
}

function getDefaultValues(order: NonNullable<OrderEditDialogProps['order']>): EditOrderFormData {
  return {
    customerId: order.customerId,
    orderNumber: order.orderNumber ?? '',
    dueDate: order.dueDate
      ? new Date(order.dueDate).toISOString().split('T')[0]
      : '',
    internalNotes: order.internalNotes ?? '',
    customerNotes: order.customerNotes ?? '',
    shippingAddress: {
      street1: order.shippingAddress?.street1 ?? '',
      street2: order.shippingAddress?.street2 ?? '',
      city: order.shippingAddress?.city ?? '',
      state: order.shippingAddress?.state ?? '',
      postalCode: order.shippingAddress?.postalCode ?? '',
      country: order.shippingAddress?.country ?? '',
      contactName: order.shippingAddress?.contactName ?? '',
      contactPhone: order.shippingAddress?.contactPhone ?? '',
    },
  };
}

function OrderEditFormContent({
  form,
  customers,
  isLoadingCustomers,
  isDraft,
  orderNumber,
}: {
  form: ReturnType<typeof useTanStackForm<EditOrderFormData>>;
  customers: Array<{ id: string; name: string }>;
  isLoadingCustomers: boolean;
  isDraft: boolean;
  orderNumber: string;
}) {
  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));

  return (
    <>
      {isDraft ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <form.Field name="customerId">
              {(field) => (
                <SelectField
                  field={field}
                  label="Customer"
                  options={customerOptions}
                  placeholder="Select a customer..."
                  required
                  disabled={isLoadingCustomers}
                />
              )}
            </form.Field>
          </div>

          <form.Field name="orderNumber">
            {(field) => (
              <TextField field={field} label="Order Number" required />
            )}
          </form.Field>

          <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            Status changes happen from the workflow actions in the order header.
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-sm font-medium">{orderNumber}</p>
              <p className="text-xs text-muted-foreground">
                Customer and order number are locked once fulfillment is underway.
              </p>
            </div>
            <Badge variant="outline">Workflow-controlled status</Badge>
          </div>
        </div>
      )}

      <form.Field name="dueDate">
        {(field) => (
          <DateStringField
            field={field}
            label="Due Date"
            placeholder="Select date"
          />
        )}
      </form.Field>

      <div className="space-y-4 rounded-lg border p-4">
        <div>
          <h3 className="text-sm font-medium">Order Shipping Address</h3>
          <p className="text-xs text-muted-foreground">
            This is the default delivery address for the order. Pending shipments will sync automatically; shipped work must be reopened first.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <form.Field name="shippingAddress.contactName">
            {(field) => <TextField field={field} label="Contact Name" />}
          </form.Field>

          <form.Field name="shippingAddress.contactPhone">
            {(field) => <TextField field={field} label="Contact Phone" />}
          </form.Field>

          <div className="md:col-span-2">
            <form.Field name="shippingAddress.street1">
              {(field) => <TextField field={field} label="Street 1" />}
            </form.Field>
          </div>

          <div className="md:col-span-2">
            <form.Field name="shippingAddress.street2">
              {(field) => <TextField field={field} label="Street 2" />}
            </form.Field>
          </div>

          <form.Field name="shippingAddress.city">
            {(field) => <TextField field={field} label="City" />}
          </form.Field>

          <form.Field name="shippingAddress.state">
            {(field) => <TextField field={field} label="State" />}
          </form.Field>

          <form.Field name="shippingAddress.postalCode">
            {(field) => <TextField field={field} label="Postcode" />}
          </form.Field>

          <form.Field name="shippingAddress.country">
            {(field) => <TextField field={field} label="Country" />}
          </form.Field>
        </div>
      </div>

      <form.Field name="internalNotes">
        {(field) => (
          <TextareaField
            field={field}
            label="Internal Notes"
            placeholder="Internal notes visible only to staff..."
            rows={3}
          />
        )}
      </form.Field>

      <form.Field name="customerNotes">
        {(field) => (
          <TextareaField
            field={field}
            label="Customer Notes"
            placeholder="Notes visible to customer..."
            rows={3}
          />
        )}
      </form.Field>
    </>
  );
}

const EMPTY_ORDER_DEFAULTS: EditOrderFormData = {
  customerId: '',
  orderNumber: '',
  dueDate: '',
  internalNotes: '',
  customerNotes: '',
  shippingAddress: {
    street1: '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    contactName: '',
    contactPhone: '',
  },
};

export function OrderEditDialog(props: OrderEditDialogProps) {
  const {
    open,
    onOpenChange,
    order,
    customers = [],
    isLoadingCustomers = false,
    onSubmit = async () => {},
    isSubmitting = false,
    submitError,
  } = props;

  const defaultValues = order ? getDefaultValues(order) : EMPTY_ORDER_DEFAULTS;

  const form = useTanStackForm<EditOrderFormData>({
    schema: editOrderSchema,
    defaultValues,
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async (values) => {
      await onSubmit(values);
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (order && open) {
      form.reset(getDefaultValues(order));
    }
  }, [order, open, form]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isSubmitting) return;
    onOpenChange(newOpen);
  };

  if (!order) return null;

  const isDraft = order.status === 'draft';

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      key={order.id}
      title="Edit Order"
      description={`Update the order's default delivery details, dates, and notes for #${order.orderNumber}.`}
      form={form}
      submitLabel="Save Changes"
      loadingLabel="Saving..."
      submitError={submitError}
      submitDisabled={isSubmitting}
      size="lg"
      className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]"
      resetOnClose={false}
    >
      <OrderEditFormContent
        form={form}
        customers={customers}
        isLoadingCustomers={isLoadingCustomers}
        isDraft={isDraft}
        orderNumber={order.orderNumber}
      />
    </FormDialog>
  );
}
