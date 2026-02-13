/**
 * Mobile Sidebar Sheet Component
 *
 * FAB + Sheet pattern for mobile access to project sidebar.
 * Visible only on mobile (< lg breakpoint).
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 5.1
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md Mobile Patterns
 */

import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CustomerCard,
  SiteAddressCard,
  ProgressCard,
  TeamCard,
  AuditTrailCard,
  type TeamMember,
} from '../sidebar';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface MobileSidebarSheetProps {
  /** Project data for sidebar cards */
  project: {
    id: string;
    createdAt: Date | string;
    updatedAt?: Date | string | null;
    progressPercent: number;
    estimatedTotalValue?: string | null;
    actualTotalCost?: string | null;
    version?: number;
  };
  /** Customer data */
  customer?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  /** Site address */
  siteAddress?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null;
  /** Team members */
  team: TeamMember[];
  /** Task counts for progress */
  completedTasks: number;
  totalTasks: number;
  /** Created by user name */
  createdByName?: string | null;
  /** Updated by user name */
  updatedByName?: string | null;
  /** Sheet open state */
  isOpen: boolean;
  /** Sheet open change handler */
  onOpenChange: (open: boolean) => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MobileSidebarSheet({
  project,
  customer,
  siteAddress,
  team,
  completedTasks,
  totalTasks,
  createdByName,
  updatedByName,
  isOpen,
  onOpenChange,
  className,
}: MobileSidebarSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {/* FAB Trigger - Only visible on mobile */}
      <SheetTrigger asChild>
        <Button
          size="icon"
          className={cn(
            'fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-40',
            'lg:hidden', // Hide on desktop
            className
          )}
          aria-label="Open project details"
        >
          <Info className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      {/* Sheet Content */}
      <SheetContent side="right" className="w-[320px] p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-base">Project Details</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-57px)]">
          <div className="p-4 space-y-4">
            {/* Customer */}
            {customer && (
              <CustomerCard
                customerId={customer.id}
                customerName={customer.name}
                email={customer.email}
                phone={customer.phone}
              />
            )}

            {/* Site Address */}
            {siteAddress && (
              <SiteAddressCard
                addressLine1={siteAddress.addressLine1}
                addressLine2={siteAddress.addressLine2}
                city={siteAddress.city}
                state={siteAddress.state}
                postcode={siteAddress.postcode}
                country={siteAddress.country}
              />
            )}

            {/* Progress */}
            <ProgressCard
              progressPercent={project.progressPercent}
              completedTasks={completedTasks}
              totalTasks={totalTasks}
              estimatedBudget={
                project.estimatedTotalValue
                  ? parseFloat(project.estimatedTotalValue)
                  : null
              }
              actualCost={
                project.actualTotalCost
                  ? parseFloat(project.actualTotalCost)
                  : null
              }
            />

            {/* Team */}
            <TeamCard members={team} />

            {/* Audit Trail */}
            <AuditTrailCard
              createdAt={project.createdAt}
              createdByName={createdByName}
              updatedAt={project.updatedAt}
              updatedByName={updatedByName}
              version={project.version}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
