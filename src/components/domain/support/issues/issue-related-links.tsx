import { Link } from '@tanstack/react-router';
import { ExternalLink, PackageSearch } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

export interface IssueRelatedEntityLinkProps {
  to: string;
  params: Record<string, string>;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function IssueRelatedEntityLink({
  to,
  params,
  title,
  subtitle,
  badge,
  badgeVariant = 'outline',
}: IssueRelatedEntityLinkProps) {
  return (
    <Link
      to={to}
      params={params}
      className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors group cursor-pointer"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <Badge variant={badgeVariant} className="text-xs shrink-0 capitalize">
            {badge}
          </Badge>
        )}
        <ExternalLink
          className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 motion-safe:transition-opacity"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

export interface IssueWarrantyEntityLinkProps {
  warrantyId: string;
  title: string;
  serialNumber?: string | null;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function IssueWarrantyEntityLink({
  warrantyId,
  title,
  serialNumber,
  badge,
  badgeVariant = 'outline',
}: IssueWarrantyEntityLinkProps) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted transition-colors">
      <div className="min-w-0 flex-1">
        <Link
          to="/support/warranties/$warrantyId"
          params={{ warrantyId }}
          className="text-sm font-medium truncate hover:underline"
        >
          {title}
        </Link>
        <p className="text-xs text-muted-foreground">SN: {serialNumber || 'N/A'}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {serialNumber ? (
          <Link
            to="/inventory/browser"
            search={{ view: 'serialized', serializedSearch: serialNumber, page: 1 }}
            className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] text-primary hover:bg-background"
            aria-label={`Open serial ${serialNumber} in inventory`}
          >
            <PackageSearch className="h-3 w-3" aria-hidden="true" />
            Serial
          </Link>
        ) : null}
        {badge && (
          <Badge variant={badgeVariant} className="text-xs shrink-0 capitalize">
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}
