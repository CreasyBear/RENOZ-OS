/**
 * Invoice Action Button
 *
 * Button component for creating invoices.
 * Since invoices are derived from orders, this navigates to order creation.
 */

import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface InvoiceActionButtonProps {
  className?: string;
}

export function InvoiceActionButton({ className }: InvoiceActionButtonProps) {
  return (
    <Link
      to="/orders/create"
      className={cn(buttonVariants(), className)}
    >
      <Plus className="h-4 w-4 mr-2" />
      New Invoice
    </Link>
  );
}
