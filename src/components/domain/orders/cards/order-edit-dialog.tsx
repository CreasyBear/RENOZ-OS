/**
 * OrderEditDialog Component
 *
 * Full dialog for comprehensive order editing.
 * Allows editing of all order fields including customer changes.
 *
 * @see _misc/docs/design-system/FORM-STANDARDS.md
 */

import { useEffect } from 'react';
import {
  FormDialog,
  TextField,
  TextareaField,
  SelectField,
  DateStringField,
} from '@/components/shared/forms';
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

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'picking', label: 'Picking' },
  { value: 'picked', label: 'Picked' },
  { value: 'partially_shipped', label: 'Partially Shipped' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

function getDefaultValues(order: NonNullable<OrderEditDialogProps['order']>): EditOrderFormData {
  return {
    customerId: order.customerId,
    orderNumber: order.orderNumber ?? '',
    status: (order.status as EditOrderFormData['status']) ?? 'draft',
    dueDate: order.dueDate
      ? new Date(order.dueDate).toISOString().split('T')[0]
      : '',
    internalNotes: order.internalNotes ?? '',
    customerNotes: order.customerNotes ?? '',
  };
}

function OrderEditFormContent({
  form,
  customers,
  isLoadingCustomers,
}: {
  form: ReturnType<typeof useTanStackForm<EditOrderFormData>>;
  customers: Array<{ id: string; name: string }>;
  isLoadingCustomers: boolean;
}) {
  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));

  return (
    <>
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

        <form.Field name="status">
          {(field) => (
            <SelectField
              field={field}
              label="Status"
              options={STATUS_OPTIONS}
              placeholder="Select status"
            />
          )}
        </form.Field>
      </div>

      <form.Field name="dueDate">
        {(field) => (
          <DateStringField
            field={field}
            label="Due Date"
            placeholder="Select date"
          />
        )}
      </form.Field>

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
  status: 'draft',
  dueDate: '',
  internalNotes: '',
  customerNotes: '',
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

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      key={order.id}
      title="Edit Order"
      description={`Make changes to order #${order.orderNumber}. Changes will be reflected in the fulfillment kanban.`}
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
      />
    </FormDialog>
  );
}
