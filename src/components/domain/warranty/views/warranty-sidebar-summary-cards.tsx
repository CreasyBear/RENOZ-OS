'use client';

import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateAustralian } from '@/lib/warranty';
import type { WarrantyDetail } from '@/lib/schemas/warranty';

type WarrantySidebarSummaryContext = Pick<
  WarrantyDetail,
  | 'customerId'
  | 'customerName'
  | 'warrantyNumber'
  | 'ownerRecord'
  | 'productId'
  | 'productName'
  | 'productSerial'
  | 'sourceEntitlement'
  | 'policyName'
  | 'registrationDate'
  | 'expiryDate'
>;

interface WarrantySidebarSummaryCardsProps {
  warranty: WarrantySidebarSummaryContext;
}

function formatDate(dateString: string): string {
  return formatDateAustralian(dateString, 'numeric');
}

export function WarrantySidebarSummaryCards({ warranty }: WarrantySidebarSummaryCardsProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Purchased Via</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Link
            to="/customers/$customerId"
            params={{ customerId: warranty.customerId }}
            search={{}}
            className="text-primary hover:underline"
          >
            {warranty.customerName ?? 'Unknown Customer'}
          </Link>
          <div className="text-muted-foreground">Warranty #{warranty.warrantyNumber}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Owner Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="font-medium">
            {warranty.ownerRecord?.fullName ?? 'Not captured yet'}
          </div>
          {warranty.ownerRecord?.email ? (
            <div className="text-muted-foreground">{warranty.ownerRecord.email}</div>
          ) : null}
          {warranty.ownerRecord?.phone ? (
            <div className="text-muted-foreground">{warranty.ownerRecord.phone}</div>
          ) : null}
          {warranty.ownerRecord?.address ? (
            <div className="text-muted-foreground">
              {[
                warranty.ownerRecord.address.street1,
                warranty.ownerRecord.address.city,
                warranty.ownerRecord.address.state,
                warranty.ownerRecord.address.postalCode,
              ]
                .filter(Boolean)
                .join(', ')}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Link
            to="/products/$productId"
            params={{ productId: warranty.productId }}
            className="text-primary hover:underline"
          >
            {warranty.productName ?? 'Unknown Product'}
          </Link>
          <div className="text-muted-foreground">
            Serial:{' '}
            {warranty.productSerial ? (
              <Link
                to="/inventory/browser"
                search={{ view: 'serialized', serializedSearch: warranty.productSerial, page: 1 }}
                className="font-mono text-primary hover:underline"
              >
                {warranty.productSerial}
              </Link>
            ) : (
              'N/A'
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Coverage Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Source</span>
            <span>{warranty.sourceEntitlement ? 'Delivery entitlement' : 'Legacy/manual'}</span>
          </div>
          {warranty.sourceEntitlement ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order</span>
                <span>{warranty.sourceEntitlement.orderNumber ?? 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shipment</span>
                <span>{warranty.sourceEntitlement.shipmentNumber ?? 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delivered</span>
                <span>{formatDate(warranty.sourceEntitlement.deliveredAt)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Policy</span>
                <span>{warranty.policyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registered</span>
                <span>{formatDate(warranty.registrationDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span>{formatDate(warranty.expiryDate)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
