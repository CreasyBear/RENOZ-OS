/**
 * Mobile Sidebar Sheet
 *
 * Floating action button + Sheet component for mobile sidebar access.
 * Only visible on mobile devices (< lg breakpoint).
 * Reusable across detail views.
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
  /** Title for the sheet header */
  title: string;
  /** Aria label for the trigger button */
  ariaLabel?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MobileSidebarSheet({
  children,
  title,
  ariaLabel,
}: MobileSidebarSheetProps) {
  return (
    <div className="lg:hidden fixed bottom-4 right-4 z-40">
      {/* z-40 = DETAIL_VIEW.Z_INDEX.MOBILE_FAB */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            aria-label={ariaLabel || `Show ${title.toLowerCase()}`}
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
