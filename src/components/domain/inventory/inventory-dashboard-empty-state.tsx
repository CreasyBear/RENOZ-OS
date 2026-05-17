import { Package } from 'lucide-react';
import { DataTableEmpty } from '@/components/shared/data-table';

interface InventoryDashboardEmptyStateProps {
  onReceiveInventory: () => void;
  onSetUpLocations: () => void;
}

export function InventoryDashboardEmptyState({
  onReceiveInventory,
  onSetUpLocations,
}: InventoryDashboardEmptyStateProps) {
  return (
    <DataTableEmpty
      variant="empty"
      icon={Package}
      title="Welcome to Inventory Management"
      description="Get started by receiving your first inventory shipment or setting up your warehouse locations."
      action={{
        label: 'Receive Inventory',
        onClick: onReceiveInventory,
      }}
      secondaryAction={{
        label: 'Set Up Locations',
        onClick: onSetUpLocations,
      }}
    />
  );
}
