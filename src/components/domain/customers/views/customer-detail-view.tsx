/**
 * Customer Detail View (Presenter)
 *
 * Full-width layout following Project Management reference patterns.
 * Maximizes schema field presentation with specialized section components.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see _reference/project-management-reference/components/projects/ProjectDetailsPage.tsx
 */

import { memo, useMemo, type ReactNode } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Tag,
  Star,
  CreditCard,
  Heart,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Hash,
  Link2,
  PanelRight,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import { CUSTOMER_STATUS_CONFIG, CUSTOMER_TYPE_CONFIG, CUSTOMER_SIZE_CONFIG } from '../customer-status-config';
import { getStatusColorClasses } from '@/lib/status';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { Link } from '@tanstack/react-router';

// ============================================================================
// TYPES
// ============================================================================

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  isPrimary: boolean;
  decisionMaker: boolean;
  department?: string | null;
}

interface Address {
  id: string;
  type: string;
  isPrimary: boolean;
  street1: string;
  street2?: string | null;
  city: string;
  state?: string | null;
  postcode: string;
  country: string;
}

interface TagAssignment {
  tag: {
    id: string;
    name: string;
    color: string;
  };
}

interface Priority {
  id: string;
  priorityLevel: string;
  serviceLevel: string;
  contractValue?: string | number | null;
  accountManager?: string | null;
  contractStartDate?: string | Date | null;
  contractEndDate?: string | Date | null;
  specialTerms?: string | null;
}

interface OrderSummary {
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number | null;
    orderDate: Date | string | null;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
    totalValue: number;
  }>;
}

interface CustomerData {
  id: string;
  name: string;
  customerCode: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  status: string;
  type: string;
  size?: string | null;
  industry?: string | null;
  taxId?: string | null;
  registrationNumber?: string | null;
  healthScore?: number | null;
  lifetimeValue?: string | number | null;
  totalOrders: number;
  totalOrderValue?: string | number | null;
  averageOrderValue?: string | number | null;
  firstOrderDate?: string | Date | null;
  lastOrderDate?: string | Date | null;
  creditLimit?: string | number | null;
  creditHold: boolean;
  creditHoldReason?: string | null;
  tags: string[];
  contacts?: Contact[];
  addresses?: Address[];
  tagAssignments?: TagAssignment[];
  priority?: Priority | null;
  orderSummary?: OrderSummary;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: string | null;
}

export interface CustomerDetailViewProps {
  customer: CustomerData;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getContactInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getHealthScoreConfig(score: number | null | undefined): {
  color: string;
  bgColor: string;
  label: string;
} {
  if (score === null || score === undefined) {
    return { color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Not Rated' };
  }
  if (score >= 80) {
    return { color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500', label: 'Excellent' };
  }
  if (score >= 60) {
    return { color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-500', label: 'Good' };
  }
  if (score >= 40) {
    return { color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500', label: 'Fair' };
  }
  return { color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500', label: 'At Risk' };
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'Not set';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'PP');
}

// ============================================================================
// META CHIPS ROW (Project Management pattern)
// ============================================================================

interface MetaChip {
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
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

// ============================================================================
// CUSTOMER HEADER (Project Management pattern)
// ============================================================================

interface CustomerHeaderProps {
  customer: CustomerData;
}

function CustomerHeader({ customer }: CustomerHeaderProps) {
  const statusConfig = CUSTOMER_STATUS_CONFIG[customer.status as keyof typeof CUSTOMER_STATUS_CONFIG] ?? CUSTOMER_STATUS_CONFIG.prospect;
  const StatusIcon = statusConfig.icon ?? User;
  const statusColorClasses = getStatusColorClasses(statusConfig.color);
  const typeConfig = CUSTOMER_TYPE_CONFIG[customer.type as keyof typeof CUSTOMER_TYPE_CONFIG];
  const sizeConfig = customer.size ? CUSTOMER_SIZE_CONFIG[customer.size as keyof typeof CUSTOMER_SIZE_CONFIG] : null;
  const tags = (customer.tagAssignments ?? []).map((ta) => ta.tag);

  const metaItems: MetaChip[] = [
    { label: 'Code', value: customer.customerCode, icon: <Hash className="h-3.5 w-3.5" /> },
    { label: 'Type', value: typeConfig?.label ?? customer.type, icon: <Building2 className="h-3.5 w-3.5" /> },
    ...(sizeConfig ? [{ label: 'Size', value: sizeConfig.label, icon: <User className="h-3.5 w-3.5" /> }] : []),
    ...(customer.industry ? [{ label: 'Industry', value: customer.industry, icon: <Tag className="h-3.5 w-3.5" /> }] : []),
    ...(customer.totalOrders > 0 ? [{ label: 'Orders', value: String(customer.totalOrders), icon: <ShoppingCart className="h-3.5 w-3.5" /> }] : []),
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-foreground leading-tight">{customer.name}</h1>
              <div className="flex items-center gap-2">
                <Badge className={cn('gap-1 text-[11px]', statusColorClasses)}>
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
                {customer.creditHold && (
                  <Badge className="text-[11px] bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Credit Hold
                  </Badge>
                )}
                {customer.priority && customer.priority.priorityLevel !== 'medium' && (
                  <Badge className="text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                    <Star className="h-3 w-3 mr-1" />
                    {customer.priority.priorityLevel.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
            {customer.legalName && customer.legalName !== customer.name && (
              <p className="text-sm text-muted-foreground">{customer.legalName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <MetaChipsRow items={metaItems} />
    </section>
  );
}

// ============================================================================
// HEALTH SCORE DASHBOARD
// ============================================================================

interface HealthScoreDashboardProps {
  healthScore: number | null | undefined;
  lifetimeValue: string | number | null | undefined;
  totalOrders: number;
  averageOrderValue: string | number | null | undefined;
  creditLimit?: string | number | null;
}

function HealthScoreDashboard({
  healthScore,
  lifetimeValue,
  totalOrders,
  averageOrderValue,
  creditLimit,
}: HealthScoreDashboardProps) {
  const healthConfig = getHealthScoreConfig(healthScore);
  const ltv = typeof lifetimeValue === 'string' ? parseFloat(lifetimeValue) : lifetimeValue;
  const aov = typeof averageOrderValue === 'string' ? parseFloat(averageOrderValue) : averageOrderValue;
  const credit = typeof creditLimit === 'string' ? parseFloat(creditLimit) : creditLimit;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Customer Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {/* Health Score */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Heart className="h-4 w-4" />
            Health Score
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold tabular-nums', healthConfig.color)}>
              {healthScore ?? '--'}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <p className={cn('text-[12px] font-medium', healthConfig.color)}>{healthConfig.label}</p>
          {healthScore !== null && healthScore !== undefined && (
            <Progress value={healthScore} className="h-1.5" />
          )}
        </div>

        {/* Lifetime Value */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Lifetime Value
          </div>
          <div className="text-2xl font-bold tabular-nums">
            <FormatAmount amount={ltv ?? 0} cents={false} showCents={false} />
          </div>
        </div>

        {/* Total Orders */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <ShoppingCart className="h-4 w-4" />
            Total Orders
          </div>
          <div className="text-2xl font-bold tabular-nums">{totalOrders}</div>
        </div>

        {/* Average Order Value */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Avg. Order
          </div>
          <div className="text-2xl font-bold tabular-nums">
            <FormatAmount amount={aov ?? 0} cents={false} showCents={false} />
          </div>
        </div>

        {/* Credit Limit */}
        {credit !== null && credit !== undefined && credit > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Credit Limit
            </div>
            <div className="text-2xl font-bold tabular-nums">
              <FormatAmount amount={credit} cents={false} showCents={false} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// CONTACT INFORMATION
// ============================================================================

interface ContactInformationProps {
  contacts: Contact[];
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  website?: string | null;
}

function ContactInformation({ contacts, primaryEmail, primaryPhone, website }: ContactInformationProps) {
  const primaryContact = contacts.find((c) => c.isPrimary);

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Contact Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Primary Contact Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Primary Contact</h3>
          {primaryContact ? (
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm">
                  {getContactInitials(primaryContact.firstName, primaryContact.lastName)}
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
            All Contacts ({contacts.length})
          </h3>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts added yet</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getContactInitials(contact.firstName, contact.lastName)}
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
    </section>
  );
}

// ============================================================================
// ADDRESSES SECTION
// ============================================================================

interface AddressesSectionProps {
  addresses: Address[];
}

function AddressesSection({ addresses }: AddressesSectionProps) {
  const typeLabels: Record<string, string> = {
    billing: 'Billing',
    shipping: 'Shipping',
    service: 'Service',
    headquarters: 'Headquarters',
  };

  if (addresses.length === 0) {
    return (
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">Addresses</h2>
        <p className="text-sm text-muted-foreground">No addresses added yet</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Addresses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {addresses.map((address) => (
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
    </section>
  );
}

// ============================================================================
// FINANCIAL OVERVIEW
// ============================================================================

interface FinancialOverviewProps {
  customer: CustomerData;
}

function FinancialOverview({ customer }: FinancialOverviewProps) {
  const ltv = typeof customer.lifetimeValue === 'string' ? parseFloat(customer.lifetimeValue) : customer.lifetimeValue;
  const totalValue = typeof customer.totalOrderValue === 'string' ? parseFloat(customer.totalOrderValue) : customer.totalOrderValue;
  const credit = typeof customer.creditLimit === 'string' ? parseFloat(customer.creditLimit) : customer.creditLimit;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Financial Overview</h2>
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
              <span className="font-medium">{formatDate(customer.firstOrderDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Order</span>
              <span className="font-medium">{formatDate(customer.lastOrderDate)}</span>
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
    </section>
  );
}

// ============================================================================
// RECENT ORDERS PREVIEW
// ============================================================================

interface RecentOrdersPreviewProps {
  orderSummary?: OrderSummary;
  customerId: string;
}

function RecentOrdersPreview({ orderSummary, customerId }: RecentOrdersPreviewProps) {
  if (!orderSummary || orderSummary.recentOrders.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Recent Orders</h2>
          <Link to="/orders" search={{ customerId }} className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">No orders yet</p>
      </section>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-secondary text-secondary-foreground',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    picking: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    picked: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
    shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    cancelled: 'bg-destructive/10 text-destructive',
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Recent Orders</h2>
        <Link to="/orders" search={{ customerId }} className="text-sm text-primary hover:underline">
          View All
        </Link>
      </div>
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
                  <Badge className={cn('text-[10px]', statusColors[order.status] || statusColors.draft)}>
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
    </section>
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
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Business Identifiers</h2>
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
    </section>
  );
}

// ============================================================================
// RIGHT META PANEL (Project Management pattern)
// ============================================================================

interface RightMetaPanelProps {
  customer: CustomerData;
}

function RightMetaPanel({ customer }: RightMetaPanelProps) {
  const tags = (customer.tagAssignments ?? []).map((ta) => ta.tag);
  const healthConfig = getHealthScoreConfig(customer.healthScore);

  return (
    <aside className="flex flex-col gap-8 p-4 pt-8 lg:sticky lg:self-start lg:top-4">
      {/* Health Score Card */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Health Status</h3>
        <div className="flex items-center gap-3">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', healthConfig.bgColor + '/20')}>
            <Heart className={cn('h-6 w-6', healthConfig.color)} />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className={cn('text-2xl font-bold', healthConfig.color)}>
                {customer.healthScore ?? '--'}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <p className={cn('text-xs font-medium', healthConfig.color)}>{healthConfig.label}</p>
          </div>
        </div>
        {customer.healthScore !== null && customer.healthScore !== undefined && (
          <Progress value={customer.healthScore} className="h-1.5 mt-3" />
        )}
      </div>
      <Separator />

      {/* Quick Stats */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Quick Stats</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Orders</span>
            <span className="font-medium">{customer.totalOrders}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lifetime Value</span>
            <span className="font-medium">
              <FormatAmount
                amount={typeof customer.lifetimeValue === 'string'
                  ? parseFloat(customer.lifetimeValue)
                  : customer.lifetimeValue ?? 0}
                cents={false}
                showCents={false}
              />
            </span>
          </div>
          {customer.lastOrderDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Order</span>
              <span className="font-medium">{formatDate(customer.lastOrderDate)}</span>
            </div>
          )}
        </div>
      </div>
      <Separator />

      {/* Tags */}
      {tags.length > 0 && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Contact Info */}
      {(customer.email || customer.phone) && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Contact</h3>
            <div className="space-y-2 text-sm">
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-primary hover:underline">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{customer.email}</span>
                </a>
              )}
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </a>
              )}
              {customer.website && (
                <a href={customer.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="truncate">{customer.website}</span>
                </a>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Audit Trail */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Audit Trail</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{formatDate(customer.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{formatDate(customer.updatedAt)}</span>
          </div>
          {customer.customerCode && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Code</span>
              <span className="font-mono text-xs">{customer.customerCode}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CustomerDetailView = memo(function CustomerDetailView({
  customer,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  className,
}: CustomerDetailViewProps) {
  const contactsCount = useMemo(() => customer.contacts?.length ?? 0, [customer.contacts]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Entity Header with panel toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <CustomerHeader customer={customer} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(window.location.href)}>
                  <Link2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy link</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8', showMetaPanel && 'bg-muted')}
                  onClick={onToggleMetaPanel}
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={cn(
        'grid grid-cols-1 gap-8',
        showMetaPanel ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'lg:grid-cols-1'
      )}>
        {/* Primary Content */}
        <div className="space-y-6 min-w-0">
          <Tabs value={activeTab} onValueChange={onTabChange}>
                <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Contacts ({contactsCount})
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Orders ({customer.totalOrders})
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab - space-y-10 for generous spacing between sections */}
                <TabsContent value="overview" className="mt-0 pt-6">
                  <div className="space-y-10">
                    <HealthScoreDashboard
                      healthScore={customer.healthScore}
                      lifetimeValue={customer.lifetimeValue}
                      totalOrders={customer.totalOrders}
                      averageOrderValue={customer.averageOrderValue}
                      creditLimit={customer.creditLimit}
                    />
                    <ContactInformation
                      contacts={customer.contacts ?? []}
                      primaryEmail={customer.email}
                      primaryPhone={customer.phone}
                      website={customer.website}
                    />
                    <FinancialOverview customer={customer} />
                    <AddressesSection addresses={customer.addresses ?? []} />
                    <RecentOrdersPreview orderSummary={customer.orderSummary} customerId={customer.id} />
                    <BusinessIdentifiers taxId={customer.taxId} registrationNumber={customer.registrationNumber} />
                  </div>
                </TabsContent>

                {/* Contacts Tab */}
                <TabsContent value="contacts" className="mt-0 pt-6">
                  <ContactInformation
                    contacts={customer.contacts ?? []}
                    primaryEmail={customer.email}
                    primaryPhone={customer.phone}
                    website={customer.website}
                  />
                  <div className="mt-8">
                    <AddressesSection addresses={customer.addresses ?? []} />
                  </div>
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders" className="mt-0 pt-6">
                  <RecentOrdersPreview orderSummary={customer.orderSummary} customerId={customer.id} />
                  <div className="mt-8">
                    <FinancialOverview customer={customer} />
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0 pt-6">
                  <UnifiedActivityTimeline
                    activities={activities}
                    isLoading={activitiesLoading}
                    hasError={!!activitiesError}
                    error={activitiesError || undefined}
                    title="Activity Timeline"
                    description="Complete history of customer interactions and system events"
                    showFilters={true}
                    emptyMessage="No activity recorded yet"
                    emptyDescription="Customer activities will appear here when interactions occur."
                  />
                </TabsContent>
          </Tabs>
        </div>

        {/* Animated Side Meta Panel */}
        <AnimatePresence initial={false}>
          {showMetaPanel && (
            <motion.div
              key="meta-panel"
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="border-l border-border pl-6"
            >
              <RightMetaPanel customer={customer} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default CustomerDetailView;
