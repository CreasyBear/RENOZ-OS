/**
 * Sheet Layout Component
 *
 * Standard sheet structure with scrollable content and fixed footer.
 * Based on Midday reference pattern.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export interface SheetLayoutProps {
  /** Whether sheet is open */
  open: boolean;
  /** Handler for sheet close */
  onOpenChange: (open: boolean) => void;
  /** Sheet title */
  title: React.ReactNode;
  /** Sheet description (optional) */
  description?: React.ReactNode;
  /** Main scrollable content */
  children: React.ReactNode;
  /** Footer content (typically action buttons) */
  footer?: React.ReactNode;
  /** Sheet max width in pixels */
  maxWidth?: number;
  /** Additional header content (right side) */
  headerActions?: React.ReactNode;
  /** Additional CSS classes for content */
  className?: string;
  /** Sheet side */
  side?: 'right' | 'left' | 'top' | 'bottom';
}

/**
 * Standard sheet layout with scrollable content and fixed footer.
 *
 * @example
 * ```tsx
 * <SheetLayout
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Customer Details"
 *   description="View and edit customer information"
 *   footer={
 *     <>
 *       <Button variant="outline" onClick={handleClose}>Cancel</Button>
 *       <Button onClick={handleSave}>Save</Button>
 *     </>
 *   }
 * >
 *   <DetailSections sections={sections} />
 * </SheetLayout>
 * ```
 */
export function SheetLayout({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = 620,
  headerActions,
  className,
  side = 'right',
}: SheetLayoutProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        style={{ maxWidth }}
        className="flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg font-semibold">
                {title}
              </SheetTitle>
              {description && (
                <SheetDescription className="mt-1">
                  {description}
                </SheetDescription>
              )}
            </div>
            {headerActions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {headerActions}
              </div>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto px-6 py-4 min-h-0',
            className
          )}
        >
          {children}
        </div>

        {/* Fixed Footer */}
        {footer && (
          <SheetFooter className="flex-shrink-0 px-6 py-4 border-t bg-background">
            <div className="flex items-center justify-end gap-2 w-full">
              {footer}
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

export interface SheetLayoutWithEntityProps extends Omit<SheetLayoutProps, 'title' | 'description'> {
  /** Entity name for header */
  entityName: string;
  /** Entity subtitle */
  entitySubtitle?: string;
  /** Entity avatar URL */
  avatarUrl?: string | null;
  /** Status badge */
  status?: React.ReactNode;
}

/**
 * Sheet layout with entity header (avatar + name + status).
 *
 * @example
 * ```tsx
 * <SheetLayoutWithEntity
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   entityName={customer.name}
 *   entitySubtitle={customer.email}
 *   avatarUrl={customer.avatarUrl}
 *   status={<StatusBadge status={customer.status} />}
 *   footer={<Button onClick={handleEdit}>Edit</Button>}
 * >
 *   <DetailSections sections={sections} />
 * </SheetLayoutWithEntity>
 * ```
 */
export function SheetLayoutWithEntity({
  entityName,
  entitySubtitle,
  avatarUrl,
  status,
  ...props
}: SheetLayoutWithEntityProps) {
  return (
    <SheetLayout
      {...props}
      title={
        <div className="flex items-center gap-3">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          )}
          <div className="min-w-0">
            <div className="font-semibold truncate">{entityName}</div>
            {entitySubtitle && (
              <div className="text-sm text-muted-foreground truncate">
                {entitySubtitle}
              </div>
            )}
          </div>
          {status && <div className="ml-2">{status}</div>}
        </div>
      }
    />
  );
}

export default SheetLayout;
