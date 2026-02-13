/**
 * Mobile Sidebar Sheet
 *
 * Floating action button that opens a sheet containing the customer sidebar
 * on mobile devices. Follows accessibility guidelines with proper touch targets.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useState } from 'react';
import { PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { DETAIL_VIEW } from '@/lib/constants/detail-view';
import type { CustomerDetailData } from '@/lib/schemas/customers';

// ============================================================================
// TYPES
// ============================================================================

export interface MobileSidebarSheetProps {
  /** Customer data for the sidebar content */
  customer: CustomerDetailData;
  /** Sidebar content component */
  children: React.ReactNode;
  /** Optional title for the sheet */
  title?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MobileSidebarSheet({
  customer: _customer,
  children,
  title = 'Customer Details',
}: MobileSidebarSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Floating Action Button - only visible on mobile (below lg breakpoint) */}
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className={cn(
            // Positioning
            'lg:hidden fixed bottom-4 right-4',
            // Size - meets 44px touch target minimum
            'h-12 w-12 rounded-full',
            // Elevation
            'shadow-lg hover:shadow-xl',
            // Z-index (40 = DETAIL_VIEW.Z_INDEX.MOBILE_FAB)
            'z-40',
            // Animation
            'transition-all duration-200',
            'hover:scale-105 active:scale-95'
          )}
          aria-label={`Open ${title.toLowerCase()}`}
        >
          <PanelRight className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[320px] overflow-y-auto p-0"
        style={{ width: DETAIL_VIEW.SIDEBAR_WIDTH }}
      >
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="text-base">{title}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MobileSidebarSheet;
