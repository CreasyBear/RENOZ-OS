/**
 * Entity Type Icon & URL Mapping
 *
 * Maps search entity types to Lucide icons and URL patterns
 * for use in the command palette search results.
 */
import type { LucideIcon } from 'lucide-react'
import {
  Users,
  ShoppingCart,
  Kanban,
  Package,
  Warehouse,
  Truck,
  Shield,
  FileText,
  User,
  Mail,
  Phone,
  FolderKanban,
  CalendarDays,
  Headphones,
  Wrench,
} from 'lucide-react'

interface EntityTypeConfig {
  icon: LucideIcon
  label: string
  /** URL pattern - use $id as placeholder */
  urlPattern: string
}

export const ENTITY_TYPE_CONFIG: Record<string, EntityTypeConfig> = {
  customer: {
    icon: Users,
    label: 'Customers',
    urlPattern: '/customers/$id',
  },
  contact: {
    icon: User,
    label: 'Contacts',
    urlPattern: '/customers/$id',
  },
  order: {
    icon: ShoppingCart,
    label: 'Orders',
    urlPattern: '/orders/$id',
  },
  opportunity: {
    icon: Kanban,
    label: 'Pipeline',
    urlPattern: '/pipeline/$id',
  },
  product: {
    icon: Package,
    label: 'Products',
    urlPattern: '/products/$id',
  },
  inventory: {
    icon: Warehouse,
    label: 'Inventory',
    urlPattern: '/inventory/$id',
  },
  supplier: {
    icon: Truck,
    label: 'Suppliers',
    urlPattern: '/suppliers/$id',
  },
  warranty: {
    icon: Shield,
    label: 'Warranties',
    urlPattern: '/support/warranties/$id',
  },
  warranty_claim: {
    icon: Shield,
    label: 'Warranty Claims',
    urlPattern: '/support/claims/$id',
  },
  job: {
    icon: FolderKanban,
    label: 'Projects',
    urlPattern: '/projects/$id',
  },
  job_assignment: {
    icon: CalendarDays,
    label: 'Assignments',
    urlPattern: '/projects/$id',
  },
  quote: {
    icon: FileText,
    label: 'Quotes',
    urlPattern: '/pipeline/quotes/$id',
  },
  shipment: {
    icon: Truck,
    label: 'Shipments',
    urlPattern: '/orders/$id',
  },
  issue: {
    icon: Headphones,
    label: 'Issues',
    urlPattern: '/support/issues/$id',
  },
  email: {
    icon: Mail,
    label: 'Emails',
    urlPattern: '/customers/$id',
  },
  call: {
    icon: Phone,
    label: 'Calls',
    urlPattern: '/customers/$id',
  },
  user: {
    icon: User,
    label: 'Users',
    urlPattern: '/admin/users',
  },
  invoice: {
    icon: FileText,
    label: 'Invoices',
    urlPattern: '/financial/invoices/$id',
  },
  installer: {
    icon: Wrench,
    label: 'Installers',
    urlPattern: '/installers/$id',
  },
  purchase_order: {
    icon: Truck,
    label: 'Purchase Orders',
    urlPattern: '/purchase-orders/$id',
  },
  rma: {
    icon: Truck,
    label: 'RMAs',
    urlPattern: '/support/rmas/$id',
  },
}

/**
 * Get the icon for an entity type, with a fallback.
 */
export function getEntityIcon(entityType: string): LucideIcon {
  return ENTITY_TYPE_CONFIG[entityType]?.icon ?? Package
}

/**
 * Get the display label for an entity type group.
 */
export function getEntityGroupLabel(entityType: string): string {
  return ENTITY_TYPE_CONFIG[entityType]?.label ?? entityType
}

/**
 * Build a navigation URL for a search result.
 * Prefers the result's own `url` field, falls back to the pattern.
 */
export function getEntityUrl(entityType: string, entityId: string, url?: string | null): string {
  if (url) return url
  const pattern = ENTITY_TYPE_CONFIG[entityType]?.urlPattern
  if (!pattern) return '/'
  return pattern.replace('$id', entityId)
}
