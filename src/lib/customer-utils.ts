/**
 * Customer Utilities
 *
 * Pure utility functions for customer data transformation:
 * - Formatting helpers
 * - Status utilities
 * - Validation helpers
 * - Data normalization
 */

// ============================================================================
// TYPES
// ============================================================================

export type CustomerStatus = 'active' | 'inactive' | 'prospect' | 'suspended' | 'blacklisted'
export type CustomerType = 'individual' | 'business' | 'government' | 'non_profit'
export type CustomerSize = 'micro' | 'small' | 'medium' | 'large' | 'enterprise'

export interface CustomerData {
  id: string
  customerCode: string
  name: string
  legalName?: string | null
  type: CustomerType
  status: CustomerStatus
  industry?: string | null
  size?: CustomerSize | null
  website?: string | null
  taxId?: string | null
  healthScore?: number | null
  lifetimeValue?: string | number | null
  totalOrders?: number | null
  lastOrderDate?: string | null
  createdAt: string
}

// ============================================================================
// STATUS UTILITIES
// ============================================================================

export const STATUS_CONFIG: Record<CustomerStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-100' },
  inactive: { label: 'Inactive', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  prospect: { label: 'Prospect', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  suspended: { label: 'Suspended', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  blacklisted: { label: 'Blacklisted', color: 'text-red-700', bgColor: 'bg-red-100' },
}

export function getStatusLabel(status: CustomerStatus): string {
  return STATUS_CONFIG[status]?.label ?? status
}

export function getStatusColor(status: CustomerStatus): string {
  return STATUS_CONFIG[status]?.color ?? 'text-gray-700'
}

export function getStatusBgColor(status: CustomerStatus): string {
  return STATUS_CONFIG[status]?.bgColor ?? 'bg-gray-100'
}

// ============================================================================
// TYPE UTILITIES
// ============================================================================

export const TYPE_CONFIG: Record<CustomerType, { label: string; icon: string }> = {
  individual: { label: 'Individual', icon: 'User' },
  business: { label: 'Business', icon: 'Building2' },
  government: { label: 'Government', icon: 'Landmark' },
  non_profit: { label: 'Non-Profit', icon: 'Heart' },
}

export function getTypeLabel(type: CustomerType): string {
  return TYPE_CONFIG[type]?.label ?? type
}

// ============================================================================
// SIZE UTILITIES
// ============================================================================

export const SIZE_CONFIG: Record<CustomerSize, { label: string; employees: string }> = {
  micro: { label: 'Micro', employees: '1-9' },
  small: { label: 'Small', employees: '10-49' },
  medium: { label: 'Medium', employees: '50-249' },
  large: { label: 'Large', employees: '250-999' },
  enterprise: { label: 'Enterprise', employees: '1000+' },
}

export function getSizeLabel(size: CustomerSize): string {
  return SIZE_CONFIG[size]?.label ?? size
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format customer lifetime value
 */
export function formatLifetimeValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '$0'

  if (numValue >= 1000000) {
    return `$${(numValue / 1000000).toFixed(1)}M`
  }
  if (numValue >= 1000) {
    return `$${(numValue / 1000).toFixed(0)}K`
  }
  return `$${numValue.toFixed(0)}`
}

/**
 * Format customer code with prefix
 */
export function formatCustomerCode(code: string): string {
  if (!code) return ''
  // Ensure it starts with CUST- prefix
  if (code.startsWith('CUST-')) return code
  return `CUST-${code}`
}

/**
 * Generate a new customer code
 */
export function generateCustomerCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CUST-${timestamp}${random}`
}

/**
 * Format relative date (e.g., "2 days ago")
 */
export function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

/**
 * Format contact name
 */
export function formatContactName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

/**
 * Get initials from a name string or firstName/lastName pair
 * Handles both signatures to eliminate DRY violations
 * 
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials("John", "Doe") // "JD"
 * getInitials("Mary Jane Watson") // "MJ"
 */
export function getInitials(nameOrFirstName: string, lastName?: string): string {
  if (lastName !== undefined) {
    // Two-parameter signature: firstName, lastName
    return `${nameOrFirstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  // Single-parameter signature: full name string
  return nameOrFirstName
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Calculate days since a given date string
 * Returns null if date is null/undefined
 */
export function calculateDaysSince(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Capitalize first letter of a string
 * 
 * @example
 * capitalizeFirst("hello") // "Hello"
 * capitalizeFirst("HELLO") // "HELLO" (preserves rest)
 */
export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format full address
 */
export function formatAddress(address: {
  street1: string
  street2?: string | null
  city: string
  state?: string | null
  postcode: string
  country?: string | null
}): string {
  const parts = [
    address.street1,
    address.street2,
    address.city,
    address.state,
    address.postcode,
    address.country !== 'AU' ? address.country : null,
  ].filter(Boolean)

  return parts.join(', ')
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  return emailRegex.test(email)
}

/**
 * Validate Australian phone number
 */
export function isValidAustralianPhone(phone: string): boolean {
  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '')
  // Check for valid Australian formats
  const mobileRegex = /^(\+?61|0)?4\d{8}$/
  const landlineRegex = /^(\+?61|0)?[2378]\d{8}$/
  return mobileRegex.test(cleaned) || landlineRegex.test(cleaned)
}

/**
 * Validate ABN (Australian Business Number)
 */
export function isValidABN(abn: string): boolean {
  const cleaned = abn.replace(/\s/g, '')
  if (cleaned.length !== 11 || !/^\d+$/.test(cleaned)) return false

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const digits = cleaned.split('').map(Number)
  digits[0] -= 1

  const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0)
  return sum % 89 === 0
}

/**
 * Validate website URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// NORMALIZATION UTILITIES
// ============================================================================

/**
 * Normalize phone number to standard format
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '')

  // Convert +61 to 0
  if (cleaned.startsWith('+61')) {
    return '0' + cleaned.slice(3)
  }

  // Add leading 0 if missing for Australian numbers
  if (cleaned.match(/^4\d{8}$/)) {
    return '0' + cleaned
  }

  return cleaned
}

/**
 * Normalize website URL (add https:// if missing)
 */
export function normalizeUrl(url: string): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `https://${trimmed}`
}

/**
 * Normalize customer name (trim and capitalize)
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// ============================================================================
// SEARCH UTILITIES
// ============================================================================

/**
 * Create search tokens from customer data
 */
export function createSearchTokens(customer: CustomerData): string[] {
  const tokens: string[] = []

  if (customer.name) tokens.push(customer.name.toLowerCase())
  if (customer.customerCode) tokens.push(customer.customerCode.toLowerCase())
  if (customer.legalName) tokens.push(customer.legalName.toLowerCase())
  if (customer.industry) tokens.push(customer.industry.toLowerCase())
  if (customer.website) tokens.push(customer.website.toLowerCase())
  if (customer.taxId) tokens.push(customer.taxId.toLowerCase())

  return tokens
}

/**
 * Check if customer matches search query
 */
export function matchesSearch(customer: CustomerData, query: string): boolean {
  if (!query) return true

  const tokens = createSearchTokens(customer)
  const searchTerms = query.toLowerCase().split(/\s+/)

  return searchTerms.every((term) => tokens.some((token) => token.includes(term)))
}

// ============================================================================
// SORTING UTILITIES
// ============================================================================

export type SortField = 'name' | 'customerCode' | 'healthScore' | 'lifetimeValue' | 'lastOrderDate' | 'createdAt'
export type SortDirection = 'asc' | 'desc'

export function sortCustomers(
  customers: CustomerData[],
  field: SortField,
  direction: SortDirection
): CustomerData[] {
  return [...customers].sort((a, b) => {
    let comparison = 0

    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'customerCode':
        comparison = a.customerCode.localeCompare(b.customerCode)
        break
      case 'healthScore':
        comparison = (a.healthScore ?? 0) - (b.healthScore ?? 0)
        break
      case 'lifetimeValue': {
        const aValue = typeof a.lifetimeValue === 'string' ? parseFloat(a.lifetimeValue) : (a.lifetimeValue ?? 0)
        const bValue = typeof b.lifetimeValue === 'string' ? parseFloat(b.lifetimeValue) : (b.lifetimeValue ?? 0)
        comparison = aValue - bValue
        break
      }
      case 'lastOrderDate': {
        const aDate = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0
        const bDate = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0
        comparison = aDate - bDate
        break
      }
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
    }

    return direction === 'desc' ? -comparison : comparison
  })
}
