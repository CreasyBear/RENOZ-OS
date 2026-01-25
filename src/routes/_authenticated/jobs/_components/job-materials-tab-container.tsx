import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { JobMaterialsTab } from '@/components/domain/jobs';
import {
  useJobMaterials,
  useJobMaterialCost,
  useAddJobMaterial,
  useUpdateJobMaterial,
  useRemoveJobMaterial,
} from '@/hooks';
import { listProducts } from '@/server/functions/products/products';
import { queryKeys } from '@/lib/query-keys';

interface JobMaterialsTabContainerProps {
  jobId: string;
}

export function JobMaterialsTabContainer({ jobId }: JobMaterialsTabContainerProps) {
  const { data: materialsData, isLoading, isError, error, refetch } = useJobMaterials({ jobId });
  const { data: costSummary } = useJobMaterialCost({ jobId });

  const addMaterial = useAddJobMaterial();
  const updateMaterial = useUpdateJobMaterial();
  const removeMaterial = useRemoveJobMaterial();

  const listProductsFn = useServerFn(listProducts);
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: queryKeys.products.jobMaterials(jobId),
    queryFn: () =>
      listProductsFn({
        data: {
          page: 1,
          pageSize: 200,
          sortBy: 'name',
          sortOrder: 'asc',
        },
      }),
  });

  const products =
    productsData?.products.map((product) => ({
      id: product.id,
      sku: product.sku ?? null,
      name: product.name,
      description: product.description ?? null,
      unitPrice: product.basePrice ?? 0,
    })) ?? [];

  return (
    <JobMaterialsTab
      products={products}
      isLoadingProducts={isLoadingProducts}
      materials={materialsData?.materials ?? []}
      costSummary={costSummary}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      onAddMaterial={async (values) => {
        await addMaterial.mutateAsync({ jobId, ...values });
      }}
      onUpdateMaterial={async (materialId, values) => {
        await updateMaterial.mutateAsync({ materialId, ...values });
      }}
      onRemoveMaterial={async (materialId) => {
        await removeMaterial.mutateAsync({ materialId, jobId });
      }}
      isSubmitting={addMaterial.isPending || updateMaterial.isPending}
      isMutating={updateMaterial.isPending || removeMaterial.isPending}
    />
  );
}
