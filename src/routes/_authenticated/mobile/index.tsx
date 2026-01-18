/**
 * Mobile Home Route
 *
 * Main landing page for warehouse mobile interface.
 *
 * Features:
 * - Quick action buttons for common operations
 * - Status overview (offline indicator, pending syncs)
 * - Recent activity summary
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Package,
  PackagePlus,
  ClipboardList,
  Truck,
  BarChart3,
  Settings,
  User,
  WifiOff,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MobileActionButton,
  MobileQuickActions,
} from "@/components/mobile/inventory-actions";
import { useOnlineStatus } from "@/hooks";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/mobile/" as any)({
  component: MobileHomePage,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function MobileHomePage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  const quickActions = [
    {
      icon: <PackagePlus />,
      label: "Receive",
      href: "/mobile/receiving",
    },
    {
      icon: <Package />,
      label: "Pick",
      href: "/mobile/picking",
    },
    {
      icon: <ClipboardList />,
      label: "Count",
      href: "/mobile/counting",
    },
    {
      icon: <Truck />,
      label: "Transfer",
      href: "/mobile/transfer",
    },
  ];

  return (
    <div className="min-h-dvh bg-muted/30">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">Warehouse Mobile</div>
              <div className="text-sm opacity-80">Renoz Inventory</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="secondary" className="bg-green-500/20 text-green-100 border-0">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-500/20 text-red-100 border-0">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>

        {/* Network warning */}
        {!isOnline && (
          <div role="alert" className="bg-red-500/20 rounded-lg p-3 flex items-start gap-3">
            <WifiOff className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">You are offline</div>
              <div className="opacity-80">
                Changes will be saved locally and synced when connected.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="p-4 -mt-4">
        <Card>
          <CardContent className="pt-4">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <MobileQuickActions actions={quickActions} />
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="px-4 space-y-3">
        <MobileActionButton
          icon={<PackagePlus />}
          label="Receive Inventory"
          description="Scan and receive incoming goods"
          onClick={() => navigate({ to: "/mobile/receiving" as any })}
          variant="success"
        />

        <MobileActionButton
          icon={<Package />}
          label="Pick Order"
          description="Pick items for orders"
          onClick={() => navigate({ to: "/mobile/picking" as any })}
          variant="default"
        />

        <MobileActionButton
          icon={<ClipboardList />}
          label="Cycle Count"
          description="Count inventory at locations"
          onClick={() => navigate({ to: "/mobile/counting" as any })}
          variant="warning"
        />
      </div>

      {/* Recent Activity */}
      <div className="p-4 mt-4">
        <Card>
          <CardContent className="pt-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Today's Activity
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary tabular-nums">12</div>
                <div className="text-xs text-muted-foreground">Received</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary tabular-nums">8</div>
                <div className="text-xs text-muted-foreground">Picked</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary tabular-nums">24</div>
                <div className="text-xs text-muted-foreground">Counted</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom navigation placeholder */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around">
        <button
          aria-label="Home"
          aria-current="page"
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg min-w-[64px]",
            "text-primary"
          )}
        >
          <Package className="h-6 w-6" aria-hidden="true" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button
          onClick={() => navigate({ to: "/inventory" as any })}
          aria-label="Reports"
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg min-w-[64px]",
            "text-muted-foreground hover:text-primary"
          )}
        >
          <BarChart3 className="h-6 w-6" aria-hidden="true" />
          <span className="text-xs">Reports</span>
        </button>
        <button
          aria-label="Settings"
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg min-w-[64px]",
            "text-muted-foreground hover:text-primary"
          )}
        >
          <Settings className="h-6 w-6" aria-hidden="true" />
          <span className="text-xs">Settings</span>
        </button>
      </div>

      {/* Spacer for bottom nav */}
      <div className="h-20" />
    </div>
  );
}

export default MobileHomePage;
