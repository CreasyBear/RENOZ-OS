/**
 * Supplier Edit Container
 *
 * Handles data fetching and mutation for editing suppliers.
 * Uses TanStack Form with Zod validation.
 *
 * @source supplier from useSupplier hook
 * @source updateMutation from useUpdateSupplier hook
 */

import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { SupplierForm } from './supplier-form';
import { SupplierFormSkeleton } from './supplier-form-skeleton';
import { supplierFormSchema, type SupplierFormValues } from '@/lib/schemas/suppliers/supplier-form';
import {
  supplierStatusSchema,
  supplierTypeSchema,
  paymentTermsSchema,
} from '@/lib/schemas/suppliers';
import { useSupplier, useUpdateSupplier } from '@/hooks/suppliers';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';

export interface SupplierEditContainerProps {
  supplierId: string;
}

export function SupplierEditContainer({ supplierId }: SupplierEditContainerProps) {
  const navigate = useNavigate();
  const { data: supplierData, isLoading } = useSupplier(supplierId);
  const updateMutation = useUpdateSupplier();

  const form = useTanStackForm<SupplierFormValues>({
    schema: supplierFormSchema,
    defaultValues: {
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
    },
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

        await updateMutation.mutateAsync({ data: { id: supplierId, ...cleanedData } });

        toast.success('Supplier updated successfully');
        navigate({ to: '/suppliers/$supplierId', params: { supplierId } });
      } catch (error) {
        logger.error('Failed to update supplier', error);
        toast.error('Failed to update supplier', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
        });
        throw error;
      }
    },
  });

  useEffect(() => {
    if (supplierData) {
      const statusParsed = supplierStatusSchema.safeParse(supplierData.status);
      const typeParsed = supplierTypeSchema.safeParse(supplierData.supplierType);
      const termsParsed = paymentTermsSchema.safeParse(supplierData.paymentTerms);

      form.reset({
        name: supplierData.name ?? '',
        legalName: supplierData.legalName ?? '',
        email: supplierData.email ?? '',
        phone: supplierData.phone ?? '',
        website: supplierData.website ?? '',
        status: statusParsed.success ? statusParsed.data : 'active',
        supplierType: typeParsed.success ? typeParsed.data : null,
        taxId: supplierData.taxId ?? '',
        registrationNumber: supplierData.registrationNumber ?? '',
        primaryContactName: supplierData.primaryContactName ?? '',
        primaryContactEmail: supplierData.primaryContactEmail ?? '',
        primaryContactPhone: supplierData.primaryContactPhone ?? '',
        paymentTerms: termsParsed.success ? termsParsed.data : null,
        currency: supplierData.currency ?? 'AUD',
        leadTimeDays: supplierData.leadTimeDays ?? undefined,
        minimumOrderValue: supplierData.minimumOrderValue
          ? Number(supplierData.minimumOrderValue)
          : undefined,
        maximumOrderValue: supplierData.maximumOrderValue
          ? Number(supplierData.maximumOrderValue)
          : undefined,
        notes: supplierData.notes ?? '',
      });
    }
  }, [supplierData, form]);

  if (isLoading) {
    return <SupplierFormSkeleton />;
  }

  return (
    <SupplierForm
      form={form}
      submitLabel="Save Changes"
      onCancel={() => navigate({ to: '/suppliers/$supplierId', params: { supplierId } })}
      isSubmitting={updateMutation.isPending}
    />
  );
}
