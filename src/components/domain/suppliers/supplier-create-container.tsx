/**
 * Supplier Create Container
 *
 * Handles mutation for creating suppliers.
 * Uses TanStack Form with Zod validation.
 *
 * @source createMutation from useCreateSupplier hook
 */

import { useNavigate } from '@tanstack/react-router';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { SupplierForm } from './supplier-form';
import { supplierFormSchema, type SupplierFormValues } from '@/lib/schemas/suppliers/supplier-form';
import { useCreateSupplier } from '@/hooks/suppliers';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';

const defaultValues: SupplierFormValues = {
  name: '',
  legalName: '',
  email: '',
  phone: '',
  website: '',
  status: 'active',
  supplierType: null,
  taxId: '',
  registrationNumber: '',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  paymentTerms: null,
  currency: 'AUD',
  leadTimeDays: undefined,
  minimumOrderValue: undefined,
  maximumOrderValue: undefined,
  notes: '',
};

export function SupplierCreateContainer() {
  const navigate = useNavigate();
  const createMutation = useCreateSupplier();

  const form = useTanStackForm<SupplierFormValues>({
    schema: supplierFormSchema,
    defaultValues,
    onSubmit: async (values) => {
      try {
        const cleanedData = {
          name: values.name,
          legalName: values.legalName || undefined,
          email: values.email || undefined,
          phone: values.phone || undefined,
          website: values.website || undefined,
          status: values.status,
          supplierType: values.supplierType ?? undefined,
          taxId: values.taxId || undefined,
          registrationNumber: values.registrationNumber || undefined,
          primaryContactName: values.primaryContactName || undefined,
          primaryContactEmail: values.primaryContactEmail || undefined,
          primaryContactPhone: values.primaryContactPhone || undefined,
          paymentTerms: values.paymentTerms ?? undefined,
          currency: values.currency,
          leadTimeDays: values.leadTimeDays,
          minimumOrderValue: values.minimumOrderValue,
          maximumOrderValue: values.maximumOrderValue,
          notes: values.notes || undefined,
        };

        const result = await createMutation.mutateAsync({ data: cleanedData });

        toast.success('Supplier created successfully', {
          description: `Supplier Code: ${result.supplierCode}`,
        });

        navigate({ to: '/suppliers/$supplierId', params: { supplierId: result.id } });
      } catch (error) {
        logger.error('Failed to create supplier', error);
        toast.error('Failed to create supplier', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
        });
        throw error;
      }
    },
  });

  return (
    <SupplierForm
      form={form}
      submitLabel="Create Supplier"
      onCancel={() => navigate({ to: '/suppliers' })}
      isSubmitting={createMutation.isPending}
    />
  );
}
