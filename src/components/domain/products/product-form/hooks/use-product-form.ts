/**
 * useProductForm Hook
 *
 * Encapsulates form state management for the product form.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormValues } from '../types';

export function useProductForm({
  defaultValues,
  onSubmit,
}: {
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (data: ProductFormValues) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as never,
    defaultValues: {
      sku: '',
      name: '',
      description: '',
      type: 'physical',
      status: 'active',
      categoryId: null,
      basePrice: 0,
      costPrice: null,
      trackInventory: true,
      isSerialized: false,
      isSellable: true,
      isPurchasable: true,
      weight: null,
      dimensions: null,
      seoTitle: null,
      seoDescription: null,
      barcode: null,
      tags: [],
      specifications: null,
      reorderPoint: 0,
      reorderQty: 0,
      ...defaultValues,
    },
  });

  const onFormSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    isSubmitting,
    onFormSubmit,
    control: form.control,
    handleSubmit: form.handleSubmit,
    watch: form.watch,
    errors: form.formState.errors,
    isDirty: form.formState.isDirty,
  };
}
