/**
 * Site Address Card - Project Sidebar
 *
 * Displays project site address with map link.
 * Pure presenter component - receives all data via props.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 4.1 Zone 5B
 * @see docs/design-system/BUTTON-LINK-STANDARDS.md for navigation patterns
 */

import { MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface SiteAddressCardProps {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatAddress(props: SiteAddressCardProps): string[] {
  const lines: string[] = [];

  if (props.addressLine1) lines.push(props.addressLine1);
  if (props.addressLine2) lines.push(props.addressLine2);

  const cityLine = [props.city, props.state, props.postcode]
    .filter(Boolean)
    .join(', ');
  if (cityLine) lines.push(cityLine);

  if (props.country && props.country !== 'Australia') {
    lines.push(props.country);
  }

  return lines;
}

function getGoogleMapsUrl(props: SiteAddressCardProps): string {
  const query = [
    props.addressLine1,
    props.city,
    props.state,
    props.postcode,
    props.country,
  ]
    .filter(Boolean)
    .join(', ');

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SiteAddressCard({
  addressLine1,
  addressLine2,
  city,
  state,
  postcode,
  country,
  className,
}: SiteAddressCardProps) {
  const addressLines = formatAddress({
    addressLine1,
    addressLine2,
    city,
    state,
    postcode,
    country,
  });

  const hasAddress = addressLines.length > 0;

  if (!hasAddress) {
    return (
      <Card className={cn('shadow-none', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Site Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">No address set</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Site Address
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Address Lines */}
        <address className="text-sm not-italic space-y-0.5">
          {addressLines.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </address>

        {/* View on Maps - Use buttonVariants to avoid Button asChild SSR issues */}
        <a
          href={getGoogleMapsUrl({ addressLine1, city, state, postcode, country })}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}
        >
          <MapPin className="h-3.5 w-3.5 mr-2" aria-hidden="true" />
          View on Maps
          <ExternalLink className="h-3 w-3 ml-auto" aria-hidden="true" />
        </a>
      </CardContent>
    </Card>
  );
}
