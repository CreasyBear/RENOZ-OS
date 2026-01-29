/**
 * Supplier Create Container
 *
 * Handles mutation for creating suppliers.
 * Follows container/presenter pattern from STANDARDS.md.
 *
 * @source createMutation from useCreateSupplier hook
 */

import { useCallback, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { SupplierForm, type SupplierFormData, type SupplierFormErrors } from './supplier-form';
import { useCreateSupplier } from '@/hooks/suppliers';
import { toast } from '@/lib/toast';

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

export function SupplierCreateContainer() {
  const navigate = useNavigate();
  
  // Mutation
  const createMutation = useCreateSupplier();
  
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
  
  // Handlers
  const handleChange = useCallback((field: keyof SupplierFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field as keyof SupplierFormErrors]) {
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
      
      const result = await createMutation.mutateAsync({ data: cleanedData });
      
      toast.success('Supplier created successfully', {
        description: `Supplier Code: ${result.supplierCode}`,
      });
      
      navigate({ to: '/suppliers/$supplierId', params: { supplierId: result.id } });
    } catch (error) {
      console.error('Failed to create supplier:', error);
      toast.error('Failed to create supplier', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }, [formData, createMutation, navigate, validateForm]);
  
  const handleCancel = useCallback(() => {
    navigate({ to: '/suppliers' });
  }, [navigate]);
  
  return (
    <SupplierForm
      data={formData}
      errors={errors}
      isSubmitting={createMutation.isPending}

      submitLabel="Create Supplier"
      onChange={handleChange}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
}
