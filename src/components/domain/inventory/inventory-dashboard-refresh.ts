type DashboardRefetch = () => Promise<unknown>;

interface RefreshInventoryDashboardInput {
  refetchWMS: DashboardRefetch;
  refetchDashboard: DashboardRefetch;
  refetchMovements: DashboardRefetch;
  refetchAlerts: DashboardRefetch;
  notifySuccess: (message: string) => void;
}

export async function refreshInventoryDashboard({
  refetchWMS,
  refetchDashboard,
  refetchMovements,
  refetchAlerts,
  notifySuccess,
}: RefreshInventoryDashboardInput): Promise<void> {
  await Promise.all([
    refetchWMS(),
    refetchDashboard(),
    refetchMovements(),
    refetchAlerts(),
  ]);

  notifySuccess('Dashboard refreshed');
}
