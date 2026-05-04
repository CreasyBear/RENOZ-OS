'use client';

import { Link } from '@tanstack/react-router';
import { TicketIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { WarrantyDetail } from '@/lib/schemas/warranty';

type WarrantySupportActionsContext = Pick<
  WarrantyDetail,
  'customerId' | 'id' | 'sourceEntitlement' | 'productId' | 'productSerial'
>;

interface WarrantySupportActionsProps {
  warranty: WarrantySupportActionsContext;
}

export function WarrantySupportActions({ warranty }: WarrantySupportActionsProps) {
  return (
    <div className="mt-6 space-y-2">
      <Label className="text-muted-foreground text-xs tracking-wider uppercase">
        Support Actions
      </Label>
      <div className="flex flex-col gap-2">
        <Link
          to="/support/issues/new"
          search={{
            customerId: warranty.customerId,
            warrantyId: warranty.id,
            warrantyEntitlementId: warranty.sourceEntitlement?.id ?? undefined,
            productId: warranty.productId,
            orderId: warranty.sourceEntitlement?.orderId ?? undefined,
            shipmentId: warranty.sourceEntitlement?.shipmentId ?? undefined,
            serialNumber: warranty.productSerial ?? undefined,
          }}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'justify-start gap-2'
          )}
        >
          <TicketIcon className="h-4 w-4" />
          Create Support Issue
        </Link>
        <p className="text-xs text-muted-foreground">
          Log a new support issue for this warranty
        </p>
      </div>
    </div>
  );
}
