/**
 * Opportunity Sidebar (Quick Reference Panel)
 *
 * Provides instant access to the most commonly needed reference information
 * without requiring clicks or scrolling. Optimized for the "on a phone call"
 * use case where users need customer/contact info immediately.
 *
 * Content:
 * - Customer card (name, phone, email) - CRITICAL for quick scan
 * - Primary contact card (name, job title, phone, email)
 * - Quote status card (expiration, version, PDF link)
 * - Quick links (View customer, All quotes)
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Sidebar Zone)
 */

import { memo } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Link } from '@tanstack/react-router';
import {
  Mail,
  Phone,
  Copy,
  ExternalLink,
  Building2,
  FileText,
  Clock,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toastSuccess } from '@/hooks';

// ============================================================================
// TYPES
// ============================================================================

interface CustomerData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  customerCode: string | null;
}

interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
}

interface QuoteStatusData {
  expiresAt: Date | string | null;
  pdfUrl: string | null;
  currentVersion: number;
  totalVersions: number;
}

export interface OpportunitySidebarProps {
  /** Customer data for quick reference */
  customer: CustomerData | null;
  /** Primary contact for quick access */
  contact: ContactData | null;
  /** Quote status for expiration tracking */
  quoteStatus: QuoteStatusData;
  /** Opportunity ID for navigation */
  opportunityId: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getContactInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getCompanyInitials(name: string): string {
  const words = name.split(' ');
  if (words.length >= 2) {
    return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
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
// CUSTOMER CARD
// ============================================================================

interface CustomerCardProps {
  customer: CustomerData | null;
}

function CustomerCard({ customer }: CustomerCardProps) {
  if (!customer) {
    return (
      <SidebarSection title="Customer">
        <div className="flex flex-col items-center justify-center py-6 border border-dashed rounded-lg">
          <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No customer linked</p>
          <Button variant="outline" size="sm" disabled>
            Link Customer
          </Button>
        </div>
      </SidebarSection>
    );
  }

  return (
    <SidebarSection title="Customer">
      <div className="space-y-3">
        {/* Customer info */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-sm bg-primary/10 text-primary">
              {getCompanyInitials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <Link
              to="/customers/$customerId"
              params={{ customerId: customer.id }}
              search={{}}
              className="font-medium text-sm truncate hover:underline block"
            >
              {customer.name}
            </Link>
            {customer.customerCode && (
              <p className="text-xs text-muted-foreground font-mono">
                {customer.customerCode}
              </p>
            )}
          </div>
        </div>

        {/* Phone - prominent for quick calling */}
        {customer.phone && (
          <div className="flex items-center gap-2">
            <a
              href={`tel:${customer.phone}`}
              className="flex-1 flex items-center gap-2 p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{customer.phone}</span>
            </a>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 min-h-[44px] min-w-[44px]"
                    onClick={() => copyToClipboard(customer.phone!, 'Phone number')}
                    aria-label="Copy phone number"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy phone</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Email */}
        {customer.email && (
          <div className="flex items-center gap-2">
            <a
              href={`mailto:${customer.email}`}
              className="flex-1 flex items-center gap-2 p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors min-w-0"
            >
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">{customer.email}</span>
            </a>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 min-h-[44px] min-w-[44px]"
                    onClick={() => copyToClipboard(customer.email!, 'Email')}
                    aria-label="Copy email address"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy email</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* View customer link */}
        <Link
          to="/customers/$customerId"
          params={{ customerId: customer.id }}
          search={{}}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'w-full justify-between'
          )}
        >
          <span>View Customer</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </SidebarSection>
  );
}

// ============================================================================
// CONTACT CARD
// ============================================================================

interface ContactCardProps {
  contact: ContactData | null;
}

function ContactCard({ contact }: ContactCardProps) {
  if (!contact) {
    return (
      <SidebarSection title="Primary Contact">
        <div className="flex flex-col items-center justify-center py-6 border border-dashed rounded-lg">
          <Mail className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No primary contact set</p>
          <Button variant="outline" size="sm" disabled>
            Add Contact
          </Button>
        </div>
      </SidebarSection>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <SidebarSection title="Primary Contact">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-sm bg-secondary text-secondary-foreground">
              {getContactInitials(contact.firstName, contact.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{fullName}</p>
            {contact.jobTitle && (
              <p className="text-xs text-muted-foreground">{contact.jobTitle}</p>
            )}
          </div>
        </div>

        {/* Phone */}
        {contact.phone && (
          <div className="flex items-center gap-2">
            <a
              href={`tel:${contact.phone}`}
              className="flex-1 flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{contact.phone}</span>
            </a>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 min-h-[44px] min-w-[44px]"
                    onClick={() => copyToClipboard(contact.phone!, 'Phone')}
                    aria-label="Copy phone number"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy phone</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Email */}
        {contact.email && (
          <div className="flex items-center gap-2">
            <a
              href={`mailto:${contact.email}`}
              className="flex-1 flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors min-w-0"
            >
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{contact.email}</span>
            </a>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 min-h-[44px] min-w-[44px]"
                    onClick={() => copyToClipboard(contact.email!, 'Email')}
                    aria-label="Copy email address"
                  >
                    <Copy className="h-4 w-4" />
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
// QUOTE STATUS CARD
// ============================================================================

interface QuoteStatusCardProps {
  status: QuoteStatusData;
}

function QuoteStatusCard({ status }: QuoteStatusCardProps) {
  const { expiresAt, pdfUrl, currentVersion, totalVersions } = status;

  const expiryDate = expiresAt ? new Date(expiresAt) : null;
  const isExpired = expiryDate ? isPast(expiryDate) : false;
  const expiryText = expiryDate
    ? isExpired
      ? `Expired ${formatDistanceToNow(expiryDate, { addSuffix: true })}`
      : `Expires ${formatDistanceToNow(expiryDate, { addSuffix: true })}`
    : 'No expiration set';

  return (
    <SidebarSection title="Quote Status">
      <div className="space-y-3">
        {/* Expiration status */}
        <div className="flex items-center gap-2 p-3 rounded-md border bg-card">
          {isExpired ? (
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', isExpired && 'text-destructive')}>
              {expiryText}
            </p>
            {expiryDate && (
              <p className="text-xs text-muted-foreground">
                {format(expiryDate, 'PPP')}
              </p>
            )}
          </div>
          {isExpired && (
            <Badge variant="destructive" className="shrink-0">
              Expired
            </Badge>
          )}
        </div>

        {/* Version info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current Version</span>
          <span className="font-medium">
            v{currentVersion} of {totalVersions}
          </span>
        </div>

        {/* PDF download */}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'w-full justify-center gap-2'
            )}
          >
            <FileText className="h-4 w-4" />
            Download PDF
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </SidebarSection>
  );
}

// ============================================================================
// QUICK LINKS
// ============================================================================

interface QuickLinksProps {
  customerId: string | null;
  opportunityId: string;
}

function QuickLinks({ customerId, opportunityId }: QuickLinksProps) {
  return (
    <SidebarSection title="Quick Links">
      <div className="space-y-1">
        {customerId && (
          <Link
            to="/customers/$customerId"
            params={{ customerId }}
            search={{}}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'w-full justify-start gap-2'
            )}
          >
            <Building2 className="h-4 w-4" />
            Customer Profile
          </Link>
        )}
        <Link
          to="/pipeline/quotes/$quoteId"
          params={{ quoteId: opportunityId }}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'w-full justify-start gap-2'
          )}
        >
          <FileText className="h-4 w-4" />
          All Quote Versions
        </Link>
      </div>
    </SidebarSection>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OpportunitySidebar = memo(function OpportunitySidebar({
  customer,
  contact,
  quoteStatus,
  opportunityId,
  className,
}: OpportunitySidebarProps) {
  return (
    <aside className={cn('flex flex-col gap-6 p-4', className)}>
      <CustomerCard customer={customer} />

      <Separator />

      <ContactCard contact={contact} />

      <Separator />

      <QuoteStatusCard status={quoteStatus} />

      <Separator />

      <QuickLinks customerId={customer?.id ?? null} opportunityId={opportunityId} />
    </aside>
  );
});

export default OpportunitySidebar;
