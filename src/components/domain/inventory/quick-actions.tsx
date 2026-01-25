/**
 * Inventory Quick Actions
 *
 * Quick action buttons for common inventory operations.
 * Used in dashboard header and floating action menu.
 *
 * Accessibility:
 * - All buttons have aria-labels
 * - Keyboard accessible
 * - Focus management
 */
import { memo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Package,
  PackagePlus,
  ClipboardList,
  ArrowLeftRight,
  BarChart3,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// TYPES
// ============================================================================

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  description?: string;
}

// ============================================================================
// QUICK ACTION DEFINITIONS
// ============================================================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "receive",
    label: "Receive Inventory",
    icon: PackagePlus,
    href: "/inventory/receiving",
    description: "Record goods receipt",
  },
  {
    id: "count",
    label: "Create Stock Count",
    icon: ClipboardList,
    href: "/inventory/counts/new",
    description: "Start cycle count",
  },
  {
    id: "adjust",
    label: "Adjust Stock",
    icon: ArrowLeftRight,
    href: "/inventory?action=adjust",
    description: "Make inventory adjustment",
  },
  {
    id: "transfer",
    label: "Transfer Items",
    icon: Package,
    href: "/inventory?action=transfer",
    description: "Move between locations",
  },
  {
    id: "reports",
    label: "View Reports",
    icon: BarChart3,
    href: "/reports/inventory",
    description: "Inventory analytics",
  },
];

// ============================================================================
// QUICK ACTIONS BAR (for header)
// ============================================================================

interface QuickActionsBarProps {
  onAction?: (actionId: string) => void;
  className?: string;
}

export const QuickActionsBar = memo(function QuickActionsBar({
  onAction,
  className,
}: QuickActionsBarProps) {
  return (
    <div className={className}>
      {/* Desktop: show primary actions as buttons */}
      <div className="hidden md:flex items-center gap-2">
        {QUICK_ACTIONS.slice(0, 3).map((action) => {
          const Icon = action.icon;
          if (action.href) {
            return (
              <Button key={action.id} variant="outline" size="sm" asChild>
                <Link to={action.href as any}>
                  <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
                  {action.label}
                </Link>
              </Button>
            );
          }
          return (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => {
                action.onClick?.();
                onAction?.(action.id);
              }}
            >
              <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
              {action.label}
            </Button>
          );
        })}

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label="More actions">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {QUICK_ACTIONS.slice(3).map((action) => {
              const Icon = action.icon;
              if (action.href) {
                return (
                  <DropdownMenuItem key={action.id} asChild>
                    <Link to={action.href as any} className="flex items-center">
                      <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
                      <div>
                        <div>{action.label}</div>
                        {action.description && (
                          <div className="text-xs text-muted-foreground">
                            {action.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              }
              return (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => {
                    action.onClick?.();
                    onAction?.(action.id);
                  }}
                >
                  <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
                  <div>
                    <div>{action.label}</div>
                    {action.description && (
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile: dropdown menu with all actions */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" aria-label="Quick actions">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              if (action.href) {
                return (
                  <DropdownMenuItem key={action.id} asChild>
                    <Link to={action.href as any} className="flex items-center">
                      <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
                      <div>
                        <div>{action.label}</div>
                        {action.description && (
                          <div className="text-xs text-muted-foreground">
                            {action.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              }
              return (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => {
                    action.onClick?.();
                    onAction?.(action.id);
                  }}
                >
                  <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
                  <div>
                    <div>{action.label}</div>
                    {action.description && (
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

// ============================================================================
// QUICK ACTIONS GRID (for widget)
// ============================================================================

interface QuickActionsGridProps {
  onAction?: (actionId: string) => void;
  className?: string;
}

export const QuickActionsGrid = memo(function QuickActionsGrid({
  onAction,
  className,
}: QuickActionsGridProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          if (action.href) {
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                asChild
              >
                <Link to={action.href as any}>
                  <Icon className="h-6 w-6" aria-hidden="true" />
                  <span className="text-xs text-center">{action.label}</span>
                </Link>
              </Button>
            );
          }
          return (
            <Button
              key={action.id}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                action.onClick?.();
                onAction?.(action.id);
              }}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span className="text-xs text-center">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
});

export default QuickActionsBar;
