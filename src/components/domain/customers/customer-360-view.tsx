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
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ActivityTimeline } from './activity-timeline'
import { MetricsDashboard } from './analytics/metrics-dashboard'

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

interface Activity {
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
  activities: Activity[]
  tagAssignments: TagAssignment[]
  priority?: Priority | null
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Customer360View({ customer }: Customer360ViewProps) {
  const tags = customer.tagAssignments.map((ta) => ta.tag)

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
                {customer.contacts.length} contact{customer.contacts.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No contacts added yet
                </p>
              ) : (
                customer.contacts.map((contact) => (
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
                {customer.addresses.length} address{customer.addresses.length !== 1 ? 'es' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No addresses added yet
                </p>
              ) : (
                customer.addresses.map((address) => (
                  <AddressCard key={address.id} address={address} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity Timeline */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
              <CardDescription>Recent interactions and events</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={customer.activities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
