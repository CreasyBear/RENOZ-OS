/**
 * Customer Sidebar (Quick Reference Panel)
 *
 * Provides instant access to the most commonly needed reference information
 * without requiring clicks or scrolling. Optimized for the "on a phone call"
 * use case where users need contact info and key dates immediately.
 *
 * Content:
 * - Primary contact card (name, phone, email) - CRITICAL for quick scan
 * - Billing address - common lookup
 * - Account details (code, type, industry)
 * - Key dates (first order, last order, created)
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Sidebar Zone)
 */

import { memo } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toastSuccess } from '@/hooks';
import { getInitials } from '@/lib/customer-utils';
import { formatDate } from '@/lib/formatters';
import type { CustomerDetailContact, CustomerDetailAddress } from '@/lib/schemas/customers';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerSidebarProps {
  /** Primary contact for quick access */
  primaryContact: CustomerDetailContact | null;
  /** Billing address for quick reference */
  billingAddress: CustomerDetailAddress | null;
  /** Company contact info */
  companyEmail?: string | null;
  companyPhone?: string | null;
  website?: string | null;
  /** Account details */
  customerCode: string;
  customerType: string;
  industry?: string | null;
  size?: string | null;
  /** Key dates */
  firstOrderDate?: string | Date | null;
  lastOrderDate?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDateForSidebar(date: string | Date | null | undefined): string {
  if (!date) return 'Not set';
  return formatDate(date, { locale: 'en-AU' });
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toastSuccess(`${label} copied`);
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div className={className}>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ============================================================================
// PRIMARY CONTACT CARD
// ============================================================================

interface PrimaryContactCardProps {
  contact: CustomerDetailContact | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
}

function PrimaryContactCard({ contact, companyPhone, companyEmail }: PrimaryContactCardProps) {
  // Use primary contact info, fallback to company info
  const phone = contact?.phone || companyPhone;
  const email = contact?.email || companyEmail;

  if (!contact && !phone && !email) {
    return (
      <SidebarSection title="Primary Contact">
        <p className="text-sm text-muted-foreground">No contact information available</p>
      </SidebarSection>
    );
  }

  return (
    <SidebarSection title="Primary Contact">
      <div className="space-y-3">
        {contact && (
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-sm bg-primary/10 text-primary">
                {getInitials(contact.firstName, contact.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {contact.firstName} {contact.lastName}
              </p>
              {contact.title && (
                <p className="text-xs text-muted-foreground">{contact.title}</p>
              )}
            </div>
          </div>
        )}

        {/* Phone - prominent for quick calling */}
        {phone && (
          <div className="flex items-center gap-2">
            <a
              href={`tel:${phone}`}
              className="flex-1 flex items-center gap-2 p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{phone}</span>
            </a>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(phone, 'Phone number')}
                    aria-label="Copy phone number"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy phone</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Email - prominent for quick emailing */}
        {email && (
          <div className="flex items-center gap-2">
            <a
              href={`mailto:${email}`}
              className="flex-1 flex items-center gap-2 p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors min-w-0"
            >
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">{email}</span>
            </a>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(email, 'Email')}
                    aria-label="Copy email"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy email</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </SidebarSection>
  );
}

// ============================================================================
// BILLING ADDRESS CARD
// ============================================================================

interface BillingAddressCardProps {
  address: CustomerDetailAddress | null;
}

function BillingAddressCard({ address }: BillingAddressCardProps) {
  if (!address) {
    return (
      <SidebarSection title="Billing Address">
        <p className="text-sm text-muted-foreground">No billing address on file</p>
      </SidebarSection>
    );
  }

  const formattedAddress = [
    address.street1,
    address.street2,
    `${address.city}${address.state ? `, ${address.state}` : ''} ${address.postcode}`,
    address.country,
  ]
    .filter(Boolean)
    .join('\n');

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress.replace(/\n/g, ', '))}`;

  return (
    <SidebarSection title="Billing Address">
      <div className="flex items-start gap-3 p-3 rounded-md border bg-card">
        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm space-y-0.5">
            <p>{address.street1}</p>
            {address.street2 && <p>{address.street2}</p>}
            <p>
              {address.city}
              {address.state && `, ${address.state}`} {address.postcode}
            </p>
            <p className="text-muted-foreground">{address.country}</p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => copyToClipboard(formattedAddress.replace(/\n/g, ', '), 'Address')}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy address</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Maps
                  </a>
                </TooltipTrigger>
                <TooltipContent>Open in Google Maps</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </SidebarSection>
  );
}

// ============================================================================
// ACCOUNT DETAILS SECTION
// ============================================================================

interface AccountDetailsProps {
  customerCode: string;
  customerType: string;
  industry?: string | null;
  size?: string | null;
  website?: string | null;
}

function AccountDetails({ customerCode, customerType, industry, size, website }: AccountDetailsProps) {
  return (
    <SidebarSection title="Account Details">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Code</span>
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{customerCode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type</span>
          <span className="font-medium capitalize">{customerType}</span>
        </div>
        {industry && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Industry</span>
            <span className="font-medium">{industry}</span>
          </div>
        )}
        {size && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Size</span>
            <span className="font-medium capitalize">{size}</span>
          </div>
        )}
        {website && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Website</span>
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Globe className="h-3 w-3" />
              Visit
            </a>
          </div>
        )}
      </div>
    </SidebarSection>
  );
}

// ============================================================================
// KEY DATES SECTION
// ============================================================================

interface KeyDatesProps {
  firstOrderDate?: string | Date | null;
  lastOrderDate?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

function KeyDates({ firstOrderDate, lastOrderDate, createdAt, updatedAt }: KeyDatesProps) {
  return (
    <SidebarSection title="Key Dates">
      <div className="space-y-2 text-sm">
        {firstOrderDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">First Order</span>
            <span>{formatDateForSidebar(firstOrderDate)}</span>
          </div>
        )}
        {lastOrderDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Order</span>
            <span>{formatDateForSidebar(lastOrderDate)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Created</span>
          <span>{formatDateForSidebar(createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Updated</span>
          <span>{formatDateForSidebar(updatedAt)}</span>
        </div>
      </div>
    </SidebarSection>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CustomerSidebar = memo(function CustomerSidebar({
  primaryContact,
  billingAddress,
  companyEmail,
  companyPhone,
  website,
  customerCode,
  customerType,
  industry,
  size,
  firstOrderDate,
  lastOrderDate,
  createdAt,
  updatedAt,
  className,
}: CustomerSidebarProps) {
  return (
    <aside className={cn('flex flex-col gap-6 p-4', className)}>
      <PrimaryContactCard
        contact={primaryContact}
        companyPhone={companyPhone}
        companyEmail={companyEmail}
      />

      <Separator />

      <BillingAddressCard address={billingAddress} />

      <Separator />

      <AccountDetails
        customerCode={customerCode}
        customerType={customerType}
        industry={industry}
        size={size}
        website={website}
      />

      <Separator />

      <KeyDates
        firstOrderDate={firstOrderDate}
        lastOrderDate={lastOrderDate}
        createdAt={createdAt}
        updatedAt={updatedAt}
      />
    </aside>
  );
});

export default CustomerSidebar;
