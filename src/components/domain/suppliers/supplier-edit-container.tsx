/**
 * Supplier Edit Container
 *
 * Handles data fetching and mutation for editing suppliers.
 * Follows container/presenter pattern from STANDARDS.md.
 *
 * @source supplier from useSupplier hook
 * @source updateMutation from useUpdateSupplier hook
 */

import { useCallback, useState, useEffect, startTransition } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { SupplierForm, type SupplierFormData, type SupplierFormErrors } from './supplier-form';
import { SupplierFormSkeleton } from './supplier-form-skeleton';
import { useSupplier, useUpdateSupplier } from '@/hooks/suppliers';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import {
  supplierStatusSchema,
  supplierTypeSchema,
  paymentTermsSchema,
} from '@/lib/schemas/suppliers';

// ============================================================================
// TYPES
// ============================================================================

export interface SupplierEditContainerProps {
  supplierId: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isValidEmail(email: string): boolean {
  if (!email) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url: string): boolean {
  if (!url) return true; // Optional field
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export function SupplierEditContainer({ supplierId }: SupplierEditContainerProps) {
  const navigate = useNavigate();
  
  // Data fetching
  const { data: supplierData, isLoading } = useSupplier(supplierId);
  
  // Mutation
  const updateMutation = useUpdateSupplier();
  
  // Form state
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    legalName: '',
    email: '',
    phone: '',
    website: '',
    status: 'active',
    supplierType: undefined,
    taxId: '',
    registrationNumber: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    paymentTerms: undefined,
    currency: 'AUD',
    leadTimeDays: undefined,
    minimumOrderValue: undefined,
    maximumOrderValue: undefined,
    notes: '',
  });
  
  const [errors, setErrors] = useState<SupplierFormErrors>({});
  
  // Load supplier data when available (Zod safeParse for enum validation)
  useEffect(() => {
    if (supplierData) {
      const statusParsed = supplierStatusSchema.safeParse(supplierData.status);
      const typeParsed = supplierTypeSchema.safeParse(supplierData.supplierType);
      const termsParsed = paymentTermsSchema.safeParse(supplierData.paymentTerms);
      startTransition(() => setFormData({
        name: supplierData.name ?? '',
        legalName: supplierData.legalName ?? '',
        email: supplierData.email ?? '',
        phone: supplierData.phone ?? '',
        website: supplierData.website ?? '',
        status: statusParsed.success ? statusParsed.data : 'active',
        supplierType: typeParsed.success ? typeParsed.data : undefined,
        taxId: supplierData.taxId ?? '',
        registrationNumber: supplierData.registrationNumber ?? '',
        primaryContactName: supplierData.primaryContactName ?? '',
        primaryContactEmail: supplierData.primaryContactEmail ?? '',
        primaryContactPhone: supplierData.primaryContactPhone ?? '',
        paymentTerms: termsParsed.success ? termsParsed.data : undefined,
        currency: supplierData.currency ?? 'AUD',
        leadTimeDays: supplierData.leadTimeDays ?? undefined,
        minimumOrderValue: supplierData.minimumOrderValue ? Number(supplierData.minimumOrderValue) : undefined,
        maximumOrderValue: supplierData.maximumOrderValue ? Number(supplierData.maximumOrderValue) : undefined,
        notes: supplierData.notes ?? '',
      }));
    }
  }, [supplierData]);
  
  // Handlers
  const handleChange = useCallback((field: keyof SupplierFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is edited (type guard for error fields)
    const hasError = (f: keyof SupplierFormData): f is keyof SupplierFormErrors =>
      ['name', 'email', 'website', 'primaryContactEmail'].includes(f);
    if (hasError(field) && errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);
  
  const validateForm = useCallback((): boolean => {
    const newErrors: SupplierFormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }
    
    if (!isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (!isValidUrl(formData.website)) {
      newErrors.website = 'Invalid URL';
    }
    
    if (!isValidEmail(formData.primaryContactEmail)) {
      newErrors.primaryContactEmail = 'Invalid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);
  
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      // Clean up empty strings to undefined
      const cleanedData = {
        name: formData.name,
        legalName: formData.legalName || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        status: formData.status,
        supplierType: formData.supplierType,
        taxId: formData.taxId || undefined,
        registrationNumber: formData.registrationNumber || undefined,
        primaryContactName: formData.primaryContactName || undefined,
        primaryContactEmail: formData.primaryContactEmail || undefined,
        primaryContactPhone: formData.primaryContactPhone || undefined,
        paymentTerms: formData.paymentTerms,
        currency: formData.currency,
        leadTimeDays: formData.leadTimeDays,
        minimumOrderValue: formData.minimumOrderValue,
        maximumOrderValue: formData.maximumOrderValue,
        notes: formData.notes || undefined,
      };
      
      await updateMutation.mutateAsync({ data: { id: supplierId, ...cleanedData } });
      
      toast.success('Supplier updated successfully');
      navigate({ to: '/suppliers/$supplierId', params: { supplierId } });
    } catch (error) {
      logger.error('Failed to update supplier', error);
      toast.error('Failed to update supplier', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }, [formData, supplierId, updateMutation, navigate, validateForm]);
  
  const handleCancel = useCallback(() => {
    navigate({ to: '/suppliers/$supplierId', params: { supplierId } });
  }, [navigate, supplierId]);
  
  // Loading state
  if (isLoading) {
    return <SupplierFormSkeleton />;
  }
  
  return (
    <SupplierForm
      data={formData}
      errors={errors}
      isSubmitting={updateMutation.isPending}

      submitLabel="Save Changes"
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
}
