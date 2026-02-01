/**
 * Customer360View Component
 *
 * Comprehensive customer relationship dashboard showing:
 * - Key metrics and health score
 * - Contact list
 * - Address information
 * - Activity timeline
 * - Tags and priority info
 */
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  Star,
  ShoppingCart,
  Activity as ActivityIcon,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UnifiedActivityTimeline } from '@/components/shared/activity'
import { useUnifiedActivities } from '@/hooks/activities'
import { MetricsDashboard } from './analytics/metrics-dashboard'
import { FormatAmount } from '@/components/shared/format'
import { Link } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

interface Contact {
  id: string
  firstName: string
  lastName: string
  title?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  isPrimary: boolean
  decisionMaker: boolean
  department?: string | null
}

interface Address {
  id: string
  type: string
  isPrimary: boolean
  street1: string
  street2?: string | null
  city: string
  state?: string | null
  postcode: string
  country: string
}

interface CustomerActivity {
  id: string
  activityType: string
  direction?: string | null
  subject?: string | null
  description: string
  createdAt: string
  completedAt?: string | null
}

interface TagAssignment {
  tag: {
    id: string
    name: string
    color: string
  }
}

interface Priority {
  id: string
  priorityLevel: string
  serviceLevel: string
  contractValue?: string | null
  accountManager?: string | null
}

interface OrderSummary {
  recentOrders: Array<{
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
    total: number | null
    orderDate: Date | string | null
    dueDate: Date | string | null
  }>
  ordersByStatus: Array<{
    status: string
    count: number
    totalValue: number
  }>
}

interface ActivitySummary {
  byType: Array<{
    activityType: string
    count: number
    lastActivityDate: Date | string | null
  }>
  totalActivities: number
}

interface Customer360Data {
  id: string
  name: string
  customerCode: string
  legalName?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  status: string
  type: string
  size?: string | null
  industry?: string | null
  healthScore?: number | null
  lifetimeValue?: string | number | null
  totalOrders: number
  totalOrderValue?: string | number | null
  averageOrderValue?: string | number | null
  firstOrderDate?: string | null
  lastOrderDate?: string | null
  creditLimit?: string | number | null
  creditHold: boolean
  tags: string[]
  contacts: Contact[]
  addresses: Address[]
  activities: CustomerActivity[]
  tagAssignments: TagAssignment[]
  priority?: Priority | null
  orderSummary?: OrderSummary
  activitySummary?: ActivitySummary
}

interface Customer360ViewProps {
  customer: Customer360Data
}

// ============================================================================
// HELPERS
// ============================================================================

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function getStatusColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'prospect':
      return 'secondary'
    case 'inactive':
    case 'suspended':
    case 'blacklisted':
      return 'destructive'
    default:
      return 'outline'
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CustomerActivityTimeline({ customerId }: { customerId: string }) {
  const { activities, isLoading, error } = useUnifiedActivities({
    entityType: 'customer',
    entityId: customerId,
  })

  return (
    <UnifiedActivityTimeline
      activities={activities}
      isLoading={isLoading}
      hasError={!!error}
      error={error || undefined}
      title="Activity Timeline"
      description="Complete history of customer interactions and system events"
      showFilters={true}
    />
  )
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="text-sm">
          {getInitials(contact.firstName, contact.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {contact.firstName} {contact.lastName}
          </span>
          {contact.isPrimary && (
            <Badge variant="secondary" className="text-xs">
              Primary
            </Badge>
          )}
          {contact.decisionMaker && (
            <Badge variant="outline" className="text-xs">
              Decision Maker
            </Badge>
          )}
        </div>
        {contact.title && (
          <p className="text-sm text-muted-foreground">{contact.title}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-2 text-sm">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-3 w-3" />
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Phone className="h-3 w-3" />
              {contact.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function AddressCard({ address }: { address: Address }) {
  const typeLabels: Record<string, string> = {
    billing: 'Billing',
    shipping: 'Shipping',
    service: 'Service',
    headquarters: 'Headquarters',
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{typeLabels[address.type] || address.type}</span>
          {address.isPrimary && (
            <Badge variant="secondary" className="text-xs">
              Primary
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {address.street1}
          {address.street2 && <>, {address.street2}</>}
        </p>
        <p className="text-sm text-muted-foreground">
          {address.city}
          {address.state && `, ${address.state}`} {address.postcode}
        </p>
        <p className="text-sm text-muted-foreground">{address.country}</p>
      </div>
    </div>
  )
}

function OrderSummaryCard({ orderSummary, customerId }: { orderSummary?: OrderSummary; customerId: string }) {
  if (!orderSummary) return null

  const { recentOrders, ordersByStatus } = orderSummary
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    quote: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-green-100 text-green-700',
    picking: 'bg-yellow-100 text-yellow-700',
    picked: 'bg-orange-100 text-orange-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return '—'
    const d = typeof date === 'string' ? new Date(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order Summary
          </CardTitle>
          <Link
            to="/orders"
            search={{ customerId }}
            className="text-sm text-primary hover:underline"
          >
            View All
          </Link>
        </div>
        <CardDescription>
          Recent orders and status breakdown
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Breakdown */}
        {ordersByStatus.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Orders by Status</h4>
            <div className="space-y-1.5">
              {ordersByStatus.map((status) => (
                <div key={status.status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusColors[status.status] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {status.status}
                    </Badge>
                    <span className="text-muted-foreground">{status.count} orders</span>
                  </div>
                  <span className="font-medium">
                    <FormatAmount amount={status.totalValue} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Orders</h4>
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to="/orders/$orderId"
                  params={{ orderId: order.id }}
                  className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{order.orderNumber}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {order.orderDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(order.orderDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  {order.total && (
                    <div className="ml-4 font-medium text-sm">
                      <FormatAmount amount={order.total} />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {recentOrders.length === 0 && ordersByStatus.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No orders yet
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ActivitySummaryCard({ activitySummary }: { activitySummary?: ActivitySummary }) {
  if (!activitySummary) return null

  const { byType, totalActivities } = activitySummary

  const activityTypeLabels: Record<string, string> = {
    call: 'Calls',
    email: 'Emails',
    meeting: 'Meetings',
    note: 'Notes',
    quote: 'Quotes',
    order: 'Orders',
    complaint: 'Complaints',
    feedback: 'Feedback',
    website_visit: 'Website Visits',
    social_interaction: 'Social',
  }

  const activityIcons: Record<string, React.ReactNode> = {
    call: <Phone className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
    meeting: <User className="h-4 w-4" />,
    note: <ActivityIcon className="h-4 w-4" />,
    quote: <TrendingUp className="h-4 w-4" />,
    order: <ShoppingCart className="h-4 w-4" />,
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never'
    const d = typeof date === 'string' ? new Date(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ActivityIcon className="h-5 w-5" />
          Activity Summary
        </CardTitle>
        <CardDescription>
          {totalActivities} total activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {byType.length > 0 ? (
          <div className="space-y-2">
            {byType.map((activity) => (
              <div
                key={activity.activityType}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {activityIcons[activity.activityType] || <ActivityIcon className="h-4 w-4" />}
                  <span className="text-sm font-medium">
                    {activityTypeLabels[activity.activityType] || activity.activityType}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{activity.count}</span>
                  {activity.lastActivityDate && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(activity.lastActivityDate)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No activities recorded
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Customer360View({ customer }: Customer360ViewProps) {
  const tags = (customer.tagAssignments ?? []).map((ta) => ta.tag)
  const contacts = customer.contacts ?? []
  const addresses = customer.addresses ?? []

  return (
    <div className="space-y-6">
      {/* Status and Tags Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={getStatusColor(customer.status)} className="text-sm">
          {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
        </Badge>
        {customer.creditHold && (
          <Badge variant="destructive" className="text-sm">
            Credit Hold
          </Badge>
        )}
        {customer.priority && (
          <Badge variant="outline" className="text-sm">
            <Star className="mr-1 h-3 w-3" />
            {customer.priority.priorityLevel.toUpperCase()} Priority
          </Badge>
        )}
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
      </div>

      {/* Metrics Dashboard */}
      <MetricsDashboard
        healthScore={customer.healthScore}
        lifetimeValue={customer.lifetimeValue}
        totalOrders={customer.totalOrders}
        averageOrderValue={customer.averageOrderValue}
        firstOrderDate={customer.firstOrderDate}
        lastOrderDate={customer.lastOrderDate}
        creditLimit={customer.creditLimit}
        priority={customer.priority}
      />

      {/* Summary Cards Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <OrderSummaryCard orderSummary={customer.orderSummary} customerId={customer.id} />
        <ActivitySummaryCard activitySummary={customer.activitySummary} />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Contacts & Addresses */}
        <div className="lg:col-span-1 space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {customer.legalName && (
                <div>
                  <span className="text-muted-foreground">Legal Name:</span>{' '}
                  {customer.legalName}
                </div>
              )}
              {customer.industry && (
                <div>
                  <span className="text-muted-foreground">Industry:</span>{' '}
                  {customer.industry}
                </div>
              )}
              {customer.size && (
                <div>
                  <span className="text-muted-foreground">Size:</span>{' '}
                  {customer.size.charAt(0).toUpperCase() + customer.size.slice(1)}
                </div>
              )}
              {customer.website && (
                <div>
                  <span className="text-muted-foreground">Website:</span>{' '}
                  <a
                    href={customer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {customer.website}
                  </a>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${customer.email}`} className="hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${customer.phone}`} className="hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Contacts
              </CardTitle>
              <CardDescription>
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No contacts added yet
                </p>
              ) : (
                contacts.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Addresses
              </CardTitle>
              <CardDescription>
                {addresses.length} address{addresses.length !== 1 ? 'es' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No addresses added yet
                </p>
              ) : (
                addresses.map((address) => (
                  <AddressCard key={address.id} address={address} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity Timeline */}
        <div className="lg:col-span-2">
          <CustomerActivityTimeline customerId={customer.id} />
        </div>
      </div>
    </div>
  )
}
