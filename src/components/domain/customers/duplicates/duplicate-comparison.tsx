/**
 * DuplicateComparison Component
 *
 * Side-by-side comparison of two potential duplicate customers.
 * Highlights differences and allows selection of primary record.
 */
import { useState } from 'react'
import {
  Check,
  X,
  Crown,
  Building2,
  Mail,
  Phone,
  Hash,
  Calendar,
  DollarSign,
  Heart,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FormatAmount } from '@/components/shared/format'
import { formatDate } from '@/lib/formatters'

// ============================================================================
// TYPES
// ============================================================================

interface CustomerData {
  id: string
  customerCode: string
  name: string
  email: string | null
  phone: string | null
  status: string
  lifetimeValue: number
  createdAt: string
  totalOrders?: number
  healthScore?: number
}

interface DuplicateComparisonProps {
  /** First customer to compare */
  customer1: CustomerData
  /** Second customer to compare */
  customer2: CustomerData
  /** Match score (0-1) */
  matchScore: number
  /** Reasons for the match */
  matchReasons: string[]
  /** Called when user selects primary and merges */
  onMerge?: (primaryId: string, secondaryId: string) => void
  /** Called when user dismisses (not duplicates) */
  onDismiss?: () => void
  /** Whether merge is in progress */
  isMerging?: boolean
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-800'
    case 'prospect':
      return 'bg-blue-100 text-blue-800'
    case 'suspended':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// ============================================================================
// FIELD ROW COMPONENT
// ============================================================================

interface FieldRowProps {
  icon: React.ReactNode
  label: string
  value1: string | number | null | undefined
  value2: string | number | null | undefined
  format?: (v: string | number | null | undefined) => string
  highlight?: boolean
}

function FieldRow({ icon, label, value1, value2, format, highlight }: FieldRowProps) {
  const formatted1 = format ? format(value1) : String(value1 ?? '-')
  const formatted2 = format ? format(value2) : String(value2 ?? '-')
  const isDifferent = formatted1 !== formatted2

  return (
    <div
      className={cn(
        'grid grid-cols-[100px_1fr_1fr] gap-4 py-2 border-b border-border/50 last:border-0',
        highlight && 'bg-yellow-50 -mx-4 px-4'
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          'text-sm',
          isDifferent && 'font-medium text-yellow-700'
        )}
      >
        {formatted1}
      </div>
      <div
        className={cn(
          'text-sm',
          isDifferent && 'font-medium text-yellow-700'
        )}
      >
        {formatted2}
      </div>
    </div>
  )
}

// ============================================================================
// CUSTOMER CARD COMPONENT
// ============================================================================

interface CustomerCardProps {
  customer: CustomerData
  isSelected: boolean
  onSelect: () => void
  label: string
}

function CustomerCard({ customer, isSelected, onSelect, label }: CustomerCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all',
        isSelected
          ? 'ring-2 ring-primary border-primary'
          : 'hover:border-primary/50'
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {isSelected && <Crown className="h-4 w-4 text-primary" />}
            {customer.name}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hash className="h-3 w-3" />
          {customer.customerCode}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Badge className={cn('text-xs', getStatusColor(customer.status))}>
            {customer.status}
          </Badge>
          <span className="text-muted-foreground">
            <FormatAmount amount={customer.lifetimeValue} cents={false} showCents={false} /> LTV
          </span>
        </div>
        {isSelected && (
          <div className="flex items-center gap-1 text-xs text-primary font-medium mt-2">
            <Check className="h-3 w-3" />
            Selected as Primary
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DuplicateComparison({
  customer1,
  customer2,
  matchScore,
  matchReasons,
  onMerge,
  onDismiss,
  isMerging = false,
  className,
}: DuplicateComparisonProps) {
  const [primaryId, setPrimaryId] = useState<string | null>(null)

  // Determine which customer should be recommended as primary
  // Prefer: active > inactive, higher LTV, older record (more history)
  const getRecommendedPrimary = (): string => {
    if (customer1.status === 'active' && customer2.status !== 'active') {
      return customer1.id
    }
    if (customer2.status === 'active' && customer1.status !== 'active') {
      return customer2.id
    }
    if (customer1.lifetimeValue > customer2.lifetimeValue) {
      return customer1.id
    }
    if (customer2.lifetimeValue > customer1.lifetimeValue) {
      return customer2.id
    }
    // Prefer older record
    return new Date(customer1.createdAt) < new Date(customer2.createdAt)
      ? customer1.id
      : customer2.id
  }

  const recommendedId = getRecommendedPrimary()

  const handleMerge = () => {
    if (!primaryId || !onMerge) return
    const secondaryId = primaryId === customer1.id ? customer2.id : customer1.id
    onMerge(primaryId, secondaryId)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Match info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <span className="font-medium">
            {Math.round(matchScore * 100)}% Match
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {matchReasons.map((reason, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {reason}
            </Badge>
          ))}
        </div>
      </div>

      {/* Customer selection cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <CustomerCard
            customer={customer1}
            isSelected={primaryId === customer1.id}
            onSelect={() => setPrimaryId(customer1.id)}
            label={recommendedId === customer1.id ? 'Recommended' : 'Customer A'}
          />
        </div>
        <div className="space-y-2">
          <CustomerCard
            customer={customer2}
            isSelected={primaryId === customer2.id}
            onSelect={() => setPrimaryId(customer2.id)}
            label={recommendedId === customer2.id ? 'Recommended' : 'Customer B'}
          />
        </div>
      </div>

      {/* Field comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Field Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[100px_1fr_1fr] gap-4 py-2 border-b font-medium text-sm">
            <div>Field</div>
            <div>Customer A</div>
            <div>Customer B</div>
          </div>

          <FieldRow
            icon={<Building2 className="h-3.5 w-3.5" />}
            label="Name"
            value1={customer1.name}
            value2={customer2.name}
          />
          <FieldRow
            icon={<Hash className="h-3.5 w-3.5" />}
            label="Code"
            value1={customer1.customerCode}
            value2={customer2.customerCode}
          />
          <FieldRow
            icon={<Mail className="h-3.5 w-3.5" />}
            label="Email"
            value1={customer1.email}
            value2={customer2.email}
            highlight
          />
          <FieldRow
            icon={<Phone className="h-3.5 w-3.5" />}
            label="Phone"
            value1={customer1.phone}
            value2={customer2.phone}
            highlight
          />
          <div
            className="grid grid-cols-[100px_1fr_1fr] gap-4 py-2 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>LTV</span>
            </div>
            <div className="text-sm">
              <FormatAmount amount={customer1.lifetimeValue} cents={false} showCents={false} />
            </div>
            <div className="text-sm">
              <FormatAmount amount={customer2.lifetimeValue} cents={false} showCents={false} />
            </div>
          </div>
          <FieldRow
            icon={<Heart className="h-3.5 w-3.5" />}
            label="Health"
            value1={customer1.healthScore}
            value2={customer2.healthScore}
            format={(v) => (v !== null && v !== undefined ? `${v}%` : '-')}
          />
          <FieldRow
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Created"
            value1={customer1.createdAt}
            value2={customer2.createdAt}
            format={(v) => (v ? formatDate(String(v), { locale: 'en-AU' }) : '-')}
          />
        </CardContent>
      </Card>

      {/* Merge info */}
      {primaryId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="text-blue-800">
            <strong>Merge Preview:</strong>{' '}
            {primaryId === customer1.id ? customer2.name : customer1.name} will be
            archived. All contacts, addresses, and history will be moved to{' '}
            {primaryId === customer1.id ? customer1.name : customer2.name}.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={onDismiss} disabled={isMerging}>
          <X className="h-4 w-4 mr-2" />
          Not Duplicates
        </Button>
        <Button onClick={handleMerge} disabled={!primaryId || isMerging}>
          {isMerging ? (
            <>Merging…</>
          ) : (
            <>
              <ArrowRight className="h-4 w-4 mr-2" />
              Merge Customers
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
