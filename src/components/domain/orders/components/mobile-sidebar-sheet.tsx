/**
 * Mobile Sidebar Sheet for Order Detail
 *
 * Floating action button + Sheet component for mobile sidebar access.
 * Only visible on mobile devices (< md breakpoint).
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Mobile FAB Pattern)
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

// ============================================================================
// TYPES
// ============================================================================

export interface MobileSidebarSheetProps {
  /** The sidebar content to render inside the sheet */
  children: React.ReactNode;
  /** Optional title for the sheet header */
  title?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MobileSidebarSheet({
  children,
  title = 'Order Details',
}: MobileSidebarSheetProps) {
  return (
    <div className="md:hidden fixed bottom-4 right-4 z-40">
      {/* z-40 = DETAIL_VIEW.Z_INDEX.MOBILE_FAB */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            aria-label="Show order details"
          >
            <Info className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[320px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{children}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
