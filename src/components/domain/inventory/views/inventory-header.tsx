import { type ReactNode } from 'react';
import { formatDistanceToNow, isPast, isBefore, addDays } from 'date-fns';
import { AlertTriangle, Barcode, Hash, MapPin, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusCell } from '@/components/shared/data-table';
import { cn } from '@/lib/utils';
import type { ItemDetailData } from '../item-detail';
import { INVENTORY_STATUS_CONFIG } from '../inventory-status-config';

interface MetaChip {
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
}

interface InventoryHeaderProps {
  item: ItemDetailData;
}

function getExpiryStatus(
  expiryDate: Date | undefined
): { isExpired: boolean; isExpiringSoon: boolean; text: string } {
  if (!expiryDate) return { isExpired: false, isExpiringSoon: false, text: '' };
  const expiry = new Date(expiryDate);
  const now = new Date();
  const isExpired = isPast(expiry);
  const isExpiringSoon = !isExpired && isBefore(expiry, addDays(now, 30));
  const text = isExpired
    ? `Expired ${formatDistanceToNow(expiry)} ago`
    : `Expires ${formatDistanceToNow(expiry, { addSuffix: true })}`;
  return { isExpired, isExpiringSoon, text };
}

function MetaChipsRow({ items }: { items: MetaChip[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {items.map((item, idx) => (
        <div key={`${item.label}-${idx}`} className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
            {item.label && <span className="text-muted-foreground">{item.label}:</span>}
            <span className="text-foreground font-medium">{item.value}</span>
          </div>
          {idx < items.length - 1 && <Separator orientation="vertical" className="h-4" />}
        </div>
      ))}
    </div>
  );
}

export function InventoryHeader({ item }: InventoryHeaderProps) {
  const expiryStatus = getExpiryStatus(item.expiryDate);

  const metaItems: MetaChip[] = [
    ...(item.serialNumber
      ? [
          {
            label: 'Serial',
            value: item.serialNumber,
            icon: <Barcode className="h-3.5 w-3.5" />,
          },
        ]
      : []),
    { label: 'SKU', value: item.productSku, icon: <Hash className="h-3.5 w-3.5" /> },
    {
      label: 'Location',
      value: `${item.locationCode} - ${item.locationName}`,
      icon: <MapPin className="h-3.5 w-3.5" />,
    },
    ...(item.lotNumber
      ? [
          {
            label: 'Lot',
            value: item.lotNumber,
            icon: <Package className="h-3.5 w-3.5" />,
          },
        ]
      : []),
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground leading-tight">
            {item.productName}
          </h1>
          <div className="flex items-center gap-2">
            <StatusCell
              status={item.status}
              statusConfig={INVENTORY_STATUS_CONFIG}
              showIcon
              className="text-[11px]"
            />
            {item.qualityStatus && item.qualityStatus !== 'good' && (
              <Badge
                className={cn(
                  'text-[11px]',
                  item.qualityStatus === 'damaged' && 'bg-destructive/10 text-destructive',
                  item.qualityStatus === 'expired' &&
                    'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
                  item.qualityStatus === 'quarantined' &&
                    'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                )}
              >
                {item.qualityStatus.charAt(0).toUpperCase() + item.qualityStatus.slice(1)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {(expiryStatus.isExpired || expiryStatus.isExpiringSoon) && (
        <div
          className={cn(
            'flex items-center gap-2 text-sm',
            expiryStatus.isExpired
              ? 'text-destructive'
              : 'text-amber-600 dark:text-amber-400'
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          {expiryStatus.text}
        </div>
      )}

      <MetaChipsRow items={metaItems} />
    </section>
  );
}
