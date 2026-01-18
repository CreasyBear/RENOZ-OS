/**
 * Customer Relationships Utilities
 *
 * Utilities for managing customer relationships:
 * - Parent/child hierarchy
 * - Contact relationship mapping
 * - Account team assignments
 * - Relationship scoring
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerNode {
  id: string
  name: string
  customerCode: string
  type: string
  status: string
  healthScore: number | null
  lifetimeValue: number | null
  children: CustomerNode[]
}

export interface ContactRelationship {
  id: string
  firstName: string
  lastName: string
  title: string | null
  email: string | null
  phone: string | null
  isPrimary: boolean
  isDecisionMaker: boolean
  isInfluencer: boolean
  lastContactedAt: string | null
  relationshipStrength: 'strong' | 'moderate' | 'weak' | 'unknown'
}

export interface AccountTeamMember {
  userId: string
  name: string
  role: 'account_manager' | 'sales_rep' | 'support' | 'executive'
  isPrimary: boolean
  assignedAt: string
}

export interface RelationshipMetrics {
  totalContacts: number
  primaryContacts: number
  decisionMakers: number
  influencers: number
  lastContactDays: number | null
  contactFrequency: 'high' | 'medium' | 'low' | 'none'
  relationshipScore: number
}

// ============================================================================
// HIERARCHY UTILITIES
// ============================================================================

/**
 * Build customer hierarchy tree from flat list
 */
export function buildCustomerHierarchy(
  customers: Array<{
    id: string
    name: string
    customerCode: string
    type: string
    status: string
    healthScore: number | null
    lifetimeValue: string | number | null
    parentId: string | null
  }>
): CustomerNode[] {
  const nodeMap = new Map<string, CustomerNode>()
  const roots: CustomerNode[] = []

  // Create nodes
  customers.forEach((c) => {
    nodeMap.set(c.id, {
      id: c.id,
      name: c.name,
      customerCode: c.customerCode,
      type: c.type,
      status: c.status,
      healthScore: c.healthScore,
      lifetimeValue: typeof c.lifetimeValue === 'string'
        ? parseFloat(c.lifetimeValue)
        : c.lifetimeValue,
      children: [],
    })
  })

  // Build tree
  customers.forEach((c) => {
    const node = nodeMap.get(c.id)!
    if (c.parentId && nodeMap.has(c.parentId)) {
      nodeMap.get(c.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

/**
 * Get all ancestors of a customer
 */
export function getCustomerAncestors(
  customerId: string,
  customers: Array<{ id: string; parentId: string | null }>
): string[] {
  const ancestors: string[] = []
  const customerMap = new Map(customers.map((c) => [c.id, c]))

  let current = customerMap.get(customerId)
  while (current?.parentId) {
    ancestors.push(current.parentId)
    current = customerMap.get(current.parentId)
  }

  return ancestors
}

/**
 * Get all descendants of a customer
 */
export function getCustomerDescendants(
  customerId: string,
  customers: Array<{ id: string; parentId: string | null }>
): string[] {
  const descendants: string[] = []
  const childrenMap = new Map<string, string[]>()

  customers.forEach((c) => {
    if (c.parentId) {
      const existing = childrenMap.get(c.parentId) || []
      existing.push(c.id)
      childrenMap.set(c.parentId, existing)
    }
  })

  const traverse = (id: string) => {
    const children = childrenMap.get(id) || []
    children.forEach((childId) => {
      descendants.push(childId)
      traverse(childId)
    })
  }

  traverse(customerId)
  return descendants
}

/**
 * Calculate aggregate metrics for customer hierarchy
 */
export function calculateHierarchyMetrics(
  rootId: string,
  customers: Array<{
    id: string
    parentId: string | null
    healthScore: number | null
    lifetimeValue: string | number | null
    totalOrders: number | null
  }>
): {
  totalCustomers: number
  totalLifetimeValue: number
  avgHealthScore: number
  totalOrders: number
} {
  const descendantIds = getCustomerDescendants(rootId, customers)
  const allIds = [rootId, ...descendantIds]
  const relevantCustomers = customers.filter((c) => allIds.includes(c.id))

  let totalValue = 0
  let totalScore = 0
  let scoreCount = 0
  let totalOrders = 0

  relevantCustomers.forEach((c) => {
    if (c.lifetimeValue) {
      totalValue += typeof c.lifetimeValue === 'string'
        ? parseFloat(c.lifetimeValue)
        : c.lifetimeValue
    }
    if (c.healthScore !== null) {
      totalScore += c.healthScore
      scoreCount++
    }
    totalOrders += c.totalOrders ?? 0
  })

  return {
    totalCustomers: relevantCustomers.length,
    totalLifetimeValue: totalValue,
    avgHealthScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
    totalOrders,
  }
}

// ============================================================================
// CONTACT RELATIONSHIP UTILITIES
// ============================================================================

/**
 * Calculate relationship strength based on contact data
 */
export function calculateRelationshipStrength(contact: {
  lastContactedAt: string | null
  isPrimary: boolean
  isDecisionMaker: boolean
}): 'strong' | 'moderate' | 'weak' | 'unknown' {
  if (!contact.lastContactedAt) return 'unknown'

  const daysSinceContact = Math.floor(
    (Date.now() - new Date(contact.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  if (contact.isPrimary || contact.isDecisionMaker) {
    if (daysSinceContact < 14) return 'strong'
    if (daysSinceContact < 45) return 'moderate'
    return 'weak'
  }

  if (daysSinceContact < 30) return 'strong'
  if (daysSinceContact < 90) return 'moderate'
  return 'weak'
}

/**
 * Calculate overall relationship metrics for a customer
 */
export function calculateRelationshipMetrics(
  contacts: Array<{
    isPrimary: boolean
    isDecisionMaker: boolean
    isInfluencer: boolean
    lastContactedAt: string | null
  }>
): RelationshipMetrics {
  const totalContacts = contacts.length
  const primaryContacts = contacts.filter((c) => c.isPrimary).length
  const decisionMakers = contacts.filter((c) => c.isDecisionMaker).length
  const influencers = contacts.filter((c) => c.isInfluencer).length

  // Find most recent contact
  const contactDates = contacts
    .map((c) => c.lastContactedAt)
    .filter((d): d is string => d !== null)
    .map((d) => new Date(d).getTime())

  const lastContactDays = contactDates.length > 0
    ? Math.floor((Date.now() - Math.max(...contactDates)) / (1000 * 60 * 60 * 24))
    : null

  // Determine contact frequency
  let contactFrequency: 'high' | 'medium' | 'low' | 'none' = 'none'
  if (lastContactDays !== null) {
    if (lastContactDays < 14) contactFrequency = 'high'
    else if (lastContactDays < 45) contactFrequency = 'medium'
    else contactFrequency = 'low'
  }

  // Calculate relationship score (0-100)
  let relationshipScore = 0
  if (totalContacts > 0) relationshipScore += 20
  if (primaryContacts > 0) relationshipScore += 20
  if (decisionMakers > 0) relationshipScore += 25
  if (influencers > 0) relationshipScore += 15
  if (contactFrequency === 'high') relationshipScore += 20
  else if (contactFrequency === 'medium') relationshipScore += 10

  return {
    totalContacts,
    primaryContacts,
    decisionMakers,
    influencers,
    lastContactDays,
    contactFrequency,
    relationshipScore: Math.min(100, relationshipScore),
  }
}

/**
 * Get recommended next contact based on relationship data
 */
export function getRecommendedNextContact(
  contacts: Array<{
    id: string
    firstName: string
    lastName: string
    isPrimary: boolean
    isDecisionMaker: boolean
    lastContactedAt: string | null
  }>
): { contact: typeof contacts[0]; reason: string } | null {
  if (contacts.length === 0) return null

  // Priority: Decision makers with stale contact dates
  const staleDecisionMakers = contacts
    .filter((c) => c.isDecisionMaker && c.lastContactedAt)
    .filter((c) => {
      const days = Math.floor(
        (Date.now() - new Date(c.lastContactedAt!).getTime()) / (1000 * 60 * 60 * 24)
      )
      return days > 30
    })
    .sort((a, b) =>
      new Date(a.lastContactedAt!).getTime() - new Date(b.lastContactedAt!).getTime()
    )

  if (staleDecisionMakers.length > 0) {
    return {
      contact: staleDecisionMakers[0],
      reason: 'Decision maker not contacted in over 30 days',
    }
  }

  // Primary contacts not contacted recently
  const stalePrimary = contacts
    .filter((c) => c.isPrimary && c.lastContactedAt)
    .filter((c) => {
      const days = Math.floor(
        (Date.now() - new Date(c.lastContactedAt!).getTime()) / (1000 * 60 * 60 * 24)
      )
      return days > 14
    })

  if (stalePrimary.length > 0) {
    return {
      contact: stalePrimary[0],
      reason: 'Primary contact not contacted in over 14 days',
    }
  }

  // Contacts never contacted
  const neverContacted = contacts.filter((c) => !c.lastContactedAt)
  if (neverContacted.length > 0) {
    const priority = neverContacted.find((c) => c.isDecisionMaker || c.isPrimary) || neverContacted[0]
    return {
      contact: priority,
      reason: 'Contact has never been reached',
    }
  }

  return null
}

// ============================================================================
// ACCOUNT TEAM UTILITIES
// ============================================================================

/**
 * Get account team structure with roles
 */
export function organizeAccountTeam(
  members: AccountTeamMember[]
): {
  accountManager: AccountTeamMember | null
  salesReps: AccountTeamMember[]
  supportTeam: AccountTeamMember[]
  executives: AccountTeamMember[]
} {
  return {
    accountManager: members.find((m) => m.role === 'account_manager' && m.isPrimary) ?? null,
    salesReps: members.filter((m) => m.role === 'sales_rep'),
    supportTeam: members.filter((m) => m.role === 'support'),
    executives: members.filter((m) => m.role === 'executive'),
  }
}

/**
 * Check if account has adequate coverage
 */
export function checkAccountCoverage(
  members: AccountTeamMember[]
): {
  hasAccountManager: boolean
  hasSalesRep: boolean
  hasSupport: boolean
  coverageLevel: 'full' | 'partial' | 'none'
  recommendations: string[]
} {
  const hasAccountManager = members.some((m) => m.role === 'account_manager')
  const hasSalesRep = members.some((m) => m.role === 'sales_rep')
  const hasSupport = members.some((m) => m.role === 'support')

  const recommendations: string[] = []
  if (!hasAccountManager) recommendations.push('Assign an account manager')
  if (!hasSalesRep) recommendations.push('Assign a sales representative')
  if (!hasSupport) recommendations.push('Assign support coverage')

  let coverageLevel: 'full' | 'partial' | 'none' = 'none'
  if (hasAccountManager && hasSalesRep && hasSupport) coverageLevel = 'full'
  else if (hasAccountManager || hasSalesRep) coverageLevel = 'partial'

  return {
    hasAccountManager,
    hasSalesRep,
    hasSupport,
    coverageLevel,
    recommendations,
  }
}
