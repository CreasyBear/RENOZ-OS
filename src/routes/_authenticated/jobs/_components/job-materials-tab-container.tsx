import { JobMaterialsTab } from '@/components/domain/jobs';
import {
  useJobMaterials,
  useJobMaterialCost,
  useAddJobMaterial,
  useUpdateJobMaterial,
  useRemoveJobMaterial,
} from '@/hooks/jobs';
import { useProductsForJobMaterials } from '@/hooks/products';

interface JobMaterialsTabContainerProps {
  jobId: string;
}

export function JobMaterialsTabContainer({ jobId }: JobMaterialsTabContainerProps) {
  const { data: materialsData, isLoading, isError, error, refetch } = useJobMaterials({ jobId });
  const { data: costSummary } = useJobMaterialCost({ jobId });

  const addMaterial = useAddJobMaterial();
  const updateMaterial = useUpdateJobMaterial();
  const removeMaterial = useRemoveJobMaterial();

  const { data: products = [], isLoading: isLoadingProducts } = useProductsForJobMaterials({ jobId });

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
