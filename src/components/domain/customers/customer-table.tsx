/**
 * CustomerTable Component
 *
 * Data table for displaying customers with sorting, selection, and actions.
 * Uses shadcn/ui table components with responsive design.
 */
import {
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { TruncateTooltip } from '@/components/shared/truncate-tooltip'
import { FormatAmount } from '@/components/shared/format'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Minimal customer data structure for table display.
 * Matches the shape returned by getCustomers API.
 */
export interface CustomerTableData {
  id: string
  name: string
  customerCode: string
  email: string | null
  phone: string | null
  status: string
  type: string
  healthScore: number | null
  lifetimeValue: string | number | null
}

interface CustomerTableProps {
  customers: CustomerTableData[]
  isLoading?: boolean
  selectedIds: Set<string>
  onSelectAll: (checked: boolean) => void
  onSelectOne: (id: string, checked: boolean) => void
  onSort: (column: string) => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onEdit?: (customer: CustomerTableData) => void
  onDelete?: (customer: CustomerTableData) => void
}

// ============================================================================
// HELPERS
// ============================================================================

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }
> = {
  prospect: { label: 'Prospect', variant: 'secondary', icon: AlertCircle },
  active: { label: 'Active', variant: 'default', icon: CheckCircle2 },
  inactive: { label: 'Inactive', variant: 'outline', icon: XCircle },
  suspended: { label: 'Suspended', variant: 'destructive', icon: XCircle },
  blacklisted: { label: 'Blacklisted', variant: 'destructive', icon: XCircle },
}

const typeConfig: Record<string, { label: string; icon: typeof Building2 }> = {
  individual: { label: 'Individual', icon: User },
  business: { label: 'Business', icon: Building2 },
  government: { label: 'Government', icon: Building2 },
  non_profit: { label: 'Non-Profit', icon: Building2 },
}

function getHealthScoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-200 text-gray-600'
  if (score >= 80) return 'bg-green-100 text-green-700'
  if (score >= 60) return 'bg-yellow-100 text-yellow-700'
  if (score >= 40) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

// ============================================================================
// SORT HEADER COMPONENT
// ============================================================================

interface SortableHeaderProps {
  column: string
  label: string
  currentColumn?: string
  currentDirection?: 'asc' | 'desc'
  onSort: (column: string) => void
  className?: string
}

function SortableHeader({
  column,
  label,
  currentColumn,
  currentDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentColumn === column

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        'flex items-center gap-1 hover:text-foreground transition-colors',
        isActive ? 'text-foreground' : 'text-muted-foreground',
        className
      )}
    >
      {label}
      {isActive ? (
        currentDirection === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )
      ) : (
        <ChevronUp className="h-4 w-4 opacity-0 group-hover:opacity-50" />
      )}
    </button>
  )
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function TableSkeleton() {
  return (
    <TableBody>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-10" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerTable({
  customers,
  isLoading = false,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onSort,
  sortColumn,
  sortDirection,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  const allSelected = customers.length > 0 && selectedIds.size === customers.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < customers.length

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                // @ts-expect-error - indeterminate is valid HTML attribute
                indeterminate={someSelected}
                onCheckedChange={onSelectAll}
                aria-label="Select all customers"
              />
            </TableHead>
            <TableHead className="min-w-[200px]">
              <SortableHeader
                column="name"
                label="Customer"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                column="status"
                label="Status"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>
              <SortableHeader
                column="lifetimeValue"
                label="Lifetime Value"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                column="healthScore"
                label="Health"
                currentColumn={sortColumn}
                currentDirection={sortDirection}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>

        {isLoading ? (
          <TableSkeleton />
        ) : (
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => {
                const status = statusConfig[customer.status] || statusConfig.prospect
                const type = typeConfig[customer.type] || typeConfig.business
                const StatusIcon = status.icon
                const TypeIcon = type.icon

                return (
                  <TableRow
                    key={customer.id}
                    className={cn(selectedIds.has(customer.id) && 'bg-muted/50')}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(customer.id)}
                        onCheckedChange={(checked) => onSelectOne(customer.id, !!checked)}
                        aria-label={`Select ${customer.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <a
                          href={`/customers/${customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {customer.name}
                        </a>
                        {customer.customerCode && (
                          <span className="text-xs text-muted-foreground">
                            {customer.customerCode}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TypeIcon className="h-4 w-4" />
                        <span className="text-sm">{type.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {customer.email && (
                          <a
                            href={`mailto:${customer.email}`}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="h-3 w-3" />
                            <TruncateTooltip text={customer.email} maxLength={25} maxWidth="max-w-[150px]" />
                          </a>
                        )}
                        {customer.phone && (
                          <a
                            href={`tel:${customer.phone}`}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <FormatAmount amount={typeof customer.lifetimeValue === 'string' ? parseFloat(customer.lifetimeValue) : customer.lifetimeValue} cents={false} showCents={false} />
                    </TableCell>
                    <TableCell>
                      {customer.healthScore !== null ? (
                        <div
                          className={cn(
                            'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
                            getHealthScoreColor(customer.healthScore)
                          )}
                        >
                          {customer.healthScore}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a href={`/customers/${customer.id}`}>
                              View Details
                            </a>
                          </DropdownMenuItem>
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(customer)}>
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {onDelete && (
                            <DropdownMenuItem
                              onClick={() => onDelete(customer)}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        )}
      </Table>
    </div>
  )
}
