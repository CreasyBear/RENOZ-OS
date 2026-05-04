'use client';

import { Link } from '@tanstack/react-router';
import { Calendar, Package, User } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { DetailGrid } from '@/components/shared/detail-view/detail-grid';
import { DetailSection } from '@/components/shared/detail-view/detail-section';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateAustralian } from '@/lib/warranty';
import { WarrantySupportActions } from '@/components/domain/warranty/views/warranty-support-actions';
import type { WarrantyDetail } from '@/lib/schemas/warranty';

interface WarrantyLineageSectionsProps {
  warranty: WarrantyDetail;
  daysUntilExpiry: number;
}

function formatDate(dateString: string): string {
  return formatDateAustralian(dateString, 'numeric');
}

function getExpiryBadge(daysUntilExpiry: number) {
  if (daysUntilExpiry <= 0) {
    return <StatusBadge status="expired" variant="error" />;
  }
  if (daysUntilExpiry <= 7) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="error" />;
  }
  if (daysUntilExpiry <= 30) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="pending" />;
  }
  if (daysUntilExpiry <= 90) {
    return <StatusBadge status={`${daysUntilExpiry} days left`} variant="warning" />;
  }
  return <StatusBadge status={`${daysUntilExpiry} days left`} variant="neutral" />;
}

export function WarrantyLineageSections({
  warranty,
  daysUntilExpiry,
}: WarrantyLineageSectionsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <DetailSection id="warranty-details" title="Warranty Details" className="lg:col-span-2">
        <DetailGrid
          fields={[
            {
              label: 'Purchased Via',
              value: (
                <div className="flex items-center gap-2">
                  <User className="text-muted-foreground h-4 w-4" />
                  <Link
                    to="/customers/$customerId"
                    params={{ customerId: warranty.customerId }}
                    search={{}}
                    className="text-primary hover:underline"
                  >
                    {warranty.customerName ?? 'Unknown Customer'}
                  </Link>
                </div>
              ),
            },
            {
              label: 'Owner of Record',
              value: warranty.ownerRecord ? (
                <div className="space-y-1">
                  <div>{warranty.ownerRecord.fullName}</div>
                  <div className="text-muted-foreground text-sm">
                    {[warranty.ownerRecord.email, warranty.ownerRecord.phone]
                      .filter(Boolean)
                      .join(' · ') || 'Contact details not recorded'}
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">Not captured yet</span>
              ),
            },
            {
              label: 'Product',
              value: (
                <div className="flex items-center gap-2">
                  <Package className="text-muted-foreground h-4 w-4" />
                  <Link
                    to="/products/$productId"
                    params={{ productId: warranty.productId }}
                    className="text-primary hover:underline"
                  >
                    {warranty.productName ?? 'Unknown Product'}
                  </Link>
                </div>
              ),
            },
            {
              label: 'Serial Number',
              value: warranty.productSerial ? (
                <Link
                  to="/inventory/browser"
                  search={{ view: 'serialized', serializedSearch: warranty.productSerial, page: 1 }}
                  className="font-mono text-primary hover:underline"
                >
                  {warranty.productSerial}
                </Link>
              ) : (
                <span className="font-mono">N/A</span>
              ),
            },
            {
              label: 'Policy',
              value: warranty.policyName,
            },
            {
              label: 'Source Entitlement',
              value: warranty.sourceEntitlement ? (
                <div className="space-y-1">
                  <div>
                    {warranty.sourceEntitlement.orderNumber ?? 'Unknown order'} ·{' '}
                    {warranty.sourceEntitlement.shipmentNumber ?? 'Unknown shipment'}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Delivered {formatDate(warranty.sourceEntitlement.deliveredAt)}
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">Legacy/manual warranty</span>
              ),
            },
            {
              label: 'Registration Date',
              value: (
                <div className="flex items-center gap-2">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span>{formatDate(warranty.registrationDate)}</span>
                </div>
              ),
            },
            {
              label: 'Expiry Date',
              value: (
                <div className="flex items-center gap-2">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span>{formatDate(warranty.expiryDate)}</span>
                  {getExpiryBadge(daysUntilExpiry)}
                </div>
              ),
            },
            ...(warranty.policyType === 'battery_performance'
              ? [
                  {
                    label: 'Current Cycles',
                    value: warranty.currentCycleCount ?? 'Not tracked',
                  },
                  {
                    label: 'Cycle Limit',
                    value: warranty.cycleLimit ?? 'No limit',
                  },
                ]
              : []),
            ...(warranty.notes
              ? [
                  {
                    label: 'Notes',
                    value: <p className="text-sm">{warranty.notes}</p>,
                    colSpan: 2 as const,
                  },
                ]
              : []),
          ]}
        />

        <WarrantySupportActions warranty={warranty} />
      </DetailSection>

      <DetailSection id="covered-items" title="Covered Items">
        {warranty.items.length === 0 ? (
          <div className="text-muted-foreground text-sm">No items recorded.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warranty.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.productName ?? 'Unknown'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.productSku ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono">
                    {item.productSerial ? (
                      <Link
                        to="/inventory/browser"
                        search={{ view: 'serialized', serializedSearch: item.productSerial, page: 1 }}
                        className="text-primary hover:underline"
                      >
                        {item.productSerial}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{formatDate(item.warrantyStartDate)}</TableCell>
                  <TableCell>{formatDate(item.warrantyEndDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DetailSection>
    </div>
  );
}
