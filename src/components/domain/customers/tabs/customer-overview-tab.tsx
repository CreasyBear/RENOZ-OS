/**
 * Customer Overview Tab
 *
 * Displays the overview content for customer detail view.
 * Optimized for "deep work" mode - detailed information for managing the customer.
 *
 * Content:
 * - Active Items (quotes, orders, projects in progress)
 * - Contact Information (all contacts with details)
 * - Financial Overview (order history, credit status)
 * - Addresses
 * - Business Identifiers
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { getInitials } from '@/lib/customer-utils';
import { formatDate } from '@/lib/formatters';
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  ShoppingCart,
  CreditCard,
  Star,
  CheckCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { CustomerActiveItems, CustomerActiveItemsSkeleton } from '../active-items';
import { CustomerHierarchyContainer } from '../containers/customer-hierarchy-container';
import type {
  CustomerDetailData,
  CustomerActiveItems as CustomerActiveItemsType,
} from '@/lib/schemas/customers';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerOverviewTabProps {
  customer: CustomerDetailData;
  activeItems?: CustomerActiveItemsType;
  activeItemsLoading?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

// getInitials and formatDate moved to centralized utilities

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

interface SectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function Section({ title, children, className }: SectionProps) {
  return (
    <section className={className}>
      <h2 className="text-base font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </section>
  );
}

// ============================================================================
// CONTACT INFORMATION
// ============================================================================

interface ContactInformationProps {
  contacts: CustomerDetailData['contacts'];
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  website?: string | null;
}

function ContactInformation({ contacts, primaryEmail, primaryPhone, website }: ContactInformationProps) {
  const contactList = contacts ?? [];
  const primaryContact = contactList.find((c) => c.isPrimary);

  return (
    <Section title="Contact Information">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Primary Contact Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Primary Contact</h3>
          {primaryContact ? (
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm">
                  {getInitials(primaryContact.firstName, primaryContact.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {primaryContact.firstName} {primaryContact.lastName}
                  </span>
                  {primaryContact.decisionMaker && (
                    <Badge variant="outline" className="text-[10px]">Decision Maker</Badge>
                  )}
                </div>
                {primaryContact.title && (
                  <p className="text-sm text-muted-foreground">{primaryContact.title}</p>
                )}
                {primaryContact.email && (
                  <a href={`mailto:${primaryContact.email}`} className="flex items-center gap-1 text-sm text-primary hover:underline">
                    <Mail className="h-3 w-3" /> {primaryContact.email}
                  </a>
                )}
                {primaryContact.phone && (
                  <a href={`tel:${primaryContact.phone}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <Phone className="h-3 w-3" /> {primaryContact.phone}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No primary contact set</p>
          )}

          {/* Company Contact Info */}
          <div className="space-y-2 pt-2 border-t">
            <h3 className="text-sm font-medium text-muted-foreground">Company Details</h3>
            {primaryEmail && (
              <a href={`mailto:${primaryEmail}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Mail className="h-4 w-4" /> {primaryEmail}
              </a>
            )}
            {primaryPhone && (
              <a href={`tel:${primaryPhone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <Phone className="h-4 w-4" /> {primaryPhone}
              </a>
            )}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Globe className="h-4 w-4" /> {website}
              </a>
            )}
          </div>
        </div>

        {/* Other Contacts */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            All Contacts ({contactList.length})
          </h3>
          {contactList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts added yet</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {contactList.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(contact.firstName, contact.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {contact.firstName} {contact.lastName}
                      </div>
                      {contact.title && (
                        <div className="text-xs text-muted-foreground truncate">{contact.title}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {contact.isPrimary && <Badge variant="secondary" className="text-[10px]">Primary</Badge>}
                    {contact.decisionMaker && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

// ============================================================================
// FINANCIAL OVERVIEW
// ============================================================================

interface FinancialOverviewProps {
  customer: CustomerDetailData;
}

function FinancialOverview({ customer }: FinancialOverviewProps) {
  const ltv = typeof customer.lifetimeValue === 'string' ? parseFloat(customer.lifetimeValue) : customer.lifetimeValue;
  const totalValue = typeof customer.totalOrderValue === 'string' ? parseFloat(customer.totalOrderValue) : customer.totalOrderValue;
  const credit = typeof customer.creditLimit === 'string' ? parseFloat(customer.creditLimit) : customer.creditLimit;

  return (
    <Section title="Financial Overview">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order History */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Order History
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Orders</span>
              <span className="font-medium tabular-nums">{customer.totalOrders}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Value</span>
              <span className="font-medium tabular-nums">
                <FormatAmount amount={totalValue ?? 0} cents={false} showCents={false} />
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lifetime Value</span>
              <span className="font-medium tabular-nums text-green-600 dark:text-green-400">
                <FormatAmount amount={ltv ?? 0} cents={false} showCents={false} />
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">First Order</span>
              <span className="font-medium">{formatDate(customer.firstOrderDate, { locale: 'en-AU' })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Order</span>
              <span className="font-medium">{formatDate(customer.lastOrderDate, { locale: 'en-AU' })}</span>
            </div>
          </div>
        </div>

        {/* Credit Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Credit Status
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Credit Limit</span>
              <span className="font-medium tabular-nums">
                {credit ? <FormatAmount amount={credit} cents={false} showCents={false} /> : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Credit Hold</span>
              <span className={cn('font-medium', customer.creditHold && 'text-destructive')}>
                {customer.creditHold ? 'Yes' : 'No'}
              </span>
            </div>
            {customer.creditHold && customer.creditHoldReason && (
              <div className="text-xs text-destructive mt-2 p-2 bg-destructive/5 rounded">
                {customer.creditHoldReason}
              </div>
            )}
          </div>

          {/* Priority/Contract Info */}
          {customer.priority && (
            <>
              <Separator />
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4" /> Service Agreement
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Priority Level</span>
                  <Badge variant="outline" className="text-[10px]">
                    {customer.priority.priorityLevel.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Level</span>
                  <span className="font-medium capitalize">{customer.priority.serviceLevel}</span>
                </div>
                {customer.priority.contractValue && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contract Value</span>
                    <span className="font-medium tabular-nums">
                      <FormatAmount
                        amount={typeof customer.priority.contractValue === 'string'
                          ? parseFloat(customer.priority.contractValue)
                          : customer.priority.contractValue}
                        cents={false}
                        showCents={false}
                      />
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

// ============================================================================
// ADDRESSES SECTION
// ============================================================================

interface AddressesSectionProps {
  addresses: CustomerDetailData['addresses'];
}

function AddressesSection({ addresses }: AddressesSectionProps) {
  const addressList = addresses ?? [];
  const typeLabels: Record<string, string> = {
    billing: 'Billing',
    shipping: 'Shipping',
    service: 'Service',
    headquarters: 'Headquarters',
  };

  if (addressList.length === 0) {
    return (
      <Section title="Addresses">
        <p className="text-sm text-muted-foreground">No addresses added yet</p>
      </Section>
    );
  }

  return (
    <Section title="Addresses">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {addressList.map((address) => (
          <div key={address.id} className="flex items-start gap-3 p-4 rounded-lg border">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">{typeLabels[address.type] || address.type}</span>
                {address.isPrimary && (
                  <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>{address.street1}</p>
                {address.street2 && <p>{address.street2}</p>}
                <p>
                  {address.city}
                  {address.state && `, ${address.state}`} {address.postcode}
                </p>
                <p>{address.country}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ============================================================================
// RECENT ORDERS PREVIEW
// ============================================================================

interface RecentOrdersPreviewProps {
  orderSummary?: CustomerDetailData['orderSummary'];
}

function RecentOrdersPreview({ orderSummary }: RecentOrdersPreviewProps) {
  if (!orderSummary || orderSummary.recentOrders.length === 0) {
    return (
      <Section title="Recent Orders">
        <p className="text-sm text-muted-foreground">No orders yet</p>
      </Section>
    );
  }

  // Hardcoded status colors (no dynamic classes)
  // status-draft: bg-secondary text-secondary-foreground
  // status-confirmed: bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200
  // status-picking: bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200
  // status-picked: bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200
  // status-shipped: bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200
  // status-delivered: bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200
  // status-cancelled: bg-destructive/10 text-destructive
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'picking':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200';
      case 'picked':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Section title="Recent Orders">
      <div className="space-y-2">
        {orderSummary.recentOrders.slice(0, 5).map((order) => (
          <Link
            key={order.id}
            to="/orders/$orderId"
            params={{ orderId: order.id }}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{order.orderNumber}</span>
                  <Badge className={cn('text-[10px]', getStatusColor(order.status))}>
                    {order.status}
                  </Badge>
                </div>
                {order.orderDate && (
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(order.orderDate), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
            <div className="text-sm font-medium tabular-nums">
              <FormatAmount amount={order.total ?? 0} />
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <Link
          to="/orders"
          className="text-sm text-primary hover:underline"
        >
          View all orders →
        </Link>
      </div>
    </Section>
  );
}

// ============================================================================
// BUSINESS IDENTIFIERS
// ============================================================================

interface BusinessIdentifiersProps {
  taxId?: string | null;
  registrationNumber?: string | null;
}

function BusinessIdentifiers({ taxId, registrationNumber }: BusinessIdentifiersProps) {
  if (!taxId && !registrationNumber) return null;

  return (
    <Section title="Business Identifiers">
      <div className="grid grid-cols-2 gap-6">
        {taxId && (
          <div>
            <div className="text-[12px] text-muted-foreground mb-1">Tax ID (ABN)</div>
            <div className="text-[14px] font-medium font-mono">{taxId}</div>
          </div>
        )}
        {registrationNumber && (
          <div>
            <div className="text-[12px] text-muted-foreground mb-1">Registration Number</div>
            <div className="text-[14px] font-medium font-mono">{registrationNumber}</div>
          </div>
        )}
      </div>
    </Section>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CustomerOverviewTab = memo(function CustomerOverviewTab({
  customer,
  activeItems,
  activeItemsLoading,
}: CustomerOverviewTabProps) {
  return (
    <div className="space-y-10 pt-6">
      {/* Active Items - What's in progress for this customer */}
      {activeItemsLoading ? (
        <CustomerActiveItemsSkeleton />
      ) : activeItems && (activeItems.counts.quotes + activeItems.counts.orders + activeItems.counts.projects + activeItems.counts.claims) > 0 ? (
        <CustomerActiveItems activeItems={activeItems} />
      ) : null}

      <ContactInformation
        contacts={customer.contacts}
        primaryEmail={customer.email}
        primaryPhone={customer.phone}
        website={customer.website}
      />

      <FinancialOverview customer={customer} />

      <AddressesSection addresses={customer.addresses} />

      <RecentOrdersPreview orderSummary={customer.orderSummary} />

      <BusinessIdentifiers taxId={customer.taxId} registrationNumber={customer.registrationNumber} />

      {/* Customer Hierarchy */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Customer Relationships</h3>
          <p className="text-sm text-muted-foreground mb-4">
            View and manage parent-child customer relationships
          </p>
        </div>
        <CustomerHierarchyContainer
          currentCustomerId={customer.id}
          showHealthScore={true}
          showOrderCount={false}
        />
      </div>
    </div>
  );
});

export default CustomerOverviewTab;
