/**
 * CustomerTable Component (Presenter)
 *
 * Pure UI component for displaying customer data in a table format.
 * Enhanced with animations, column visibility, and keyboard navigation.
 *
 * @source customers from getCustomers server function via CustomerDirectory container
 * @see STANDARDS.md Section 2: Component Architecture
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
  Settings2,
} from 'lucide-react'
import { useState, useCallback } from 'react'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Enhanced customer data structure for table display.
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
  size: string | null
  industry: string | null
  healthScore: number | null
  lifetimeValue: string | number | null
  totalOrders: number | null
  lastOrderDate: string | Date | null
  tags: string[] | null
  owner?: {
    id: string
    name: string
    avatar?: string
  } | null
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

// Column visibility configuration
type ColumnId = 'status' | 'type' | 'size' | 'industry' | 'contact' | 'ltv' | 'orders' | 'health' | 'lastOrder'

interface ColumnConfig {
  id: ColumnId
  label: string
  defaultVisible: boolean
}

const COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'type', label: 'Type', defaultVisible: true },
  { id: 'size', label: 'Size', defaultVisible: true },
  { id: 'industry', label: 'Industry', defaultVisible: true },
  { id: 'contact', label: 'Contact', defaultVisible: true },
  { id: 'ltv', label: 'LTV', defaultVisible: true },
  { id: 'orders', label: 'Orders', defaultVisible: true },
  { id: 'health', label: 'Health', defaultVisible: true },
  { id: 'lastOrder', label: 'Last Order', defaultVisible: true },
]

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

const sizeConfig: Record<string, { label: string; color: string }> = {
  small: { label: 'Small', color: 'bg-blue-100 text-blue-700' },
  medium: { label: 'Medium', color: 'bg-purple-100 text-purple-700' },
  large: { label: 'Large', color: 'bg-orange-100 text-orange-700' },
  enterprise: { label: 'Enterprise', color: 'bg-red-100 text-red-700' },
}

function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString()
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
// COLUMN VISIBILITY TOGGLE
// ============================================================================

interface ColumnVisibilityToggleProps {
  visibleColumns: Set<ColumnId>
  onToggle: (columnId: ColumnId) => void
  onReset: () => void
}

function ColumnVisibilityToggle({ visibleColumns, onToggle, onReset }: ColumnVisibilityToggleProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Columns</span>
          <span className="bg-primary/10 text-primary rounded-full px-1.5 text-xs min-w-[1.25rem] text-center">
            {visibleColumns.size}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Visible Columns</h4>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onReset} 
              className="h-auto py-1 px-2 text-xs"
            >
              Reset
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {COLUMN_CONFIG.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Switch
                  id={`column-${column.id}`}
                  checked={visibleColumns.has(column.id)}
                  onCheckedChange={() => onToggle(column.id)}
                />
                <Label 
                  htmlFor={`column-${column.id}`} 
                  className="text-sm cursor-pointer flex-1"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
            <Skeleton className="h-5 w-14" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-10" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
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
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
    () => new Set(COLUMN_CONFIG.filter(c => c.defaultVisible).map(c => c.id))
  )
  
  const toggleColumn = useCallback((columnId: ColumnId) => {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }, [])
  
  const resetColumns = useCallback(() => {
    setVisibleColumns(new Set(COLUMN_CONFIG.filter(c => c.defaultVisible).map(c => c.id)))
  }, [])
  
  const isColVisible = (id: ColumnId) => visibleColumns.has(id)

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-muted-foreground">
          {selectedIds.size > 0 ? (
            <span className="font-medium text-foreground">{selectedIds.size}</span>
          ) : (
            <span>{customers.length}</span>
          )}{' '}
          {selectedIds.size === 1 ? 'customer' : 'customers'}
          {selectedIds.size > 0 && ' selected'}
        </div>
        <ColumnVisibilityToggle
          visibleColumns={visibleColumns}
          onToggle={toggleColumn}
          onReset={resetColumns}
        />
      </div>
      
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
            {isColVisible('status') && (
              <TableHead className="w-[100px]">
                <SortableHeader
                  column="status"
                  label="Status"
                  currentColumn={sortColumn}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              </TableHead>
            )}
            {isColVisible('type') && <TableHead className="w-[90px]">Type</TableHead>}
            {isColVisible('size') && <TableHead className="w-[100px]">Size</TableHead>}
            {isColVisible('industry') && <TableHead className="w-[140px]">Industry</TableHead>}
            {isColVisible('contact') && <TableHead className="min-w-[140px]">Contact</TableHead>}
            {isColVisible('ltv') && (
              <TableHead className="w-[110px]">
                <SortableHeader
                  column="lifetimeValue"
                  label="LTV"
                  currentColumn={sortColumn}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              </TableHead>
            )}
            {isColVisible('orders') && (
              <TableHead className="w-[80px]">
                <SortableHeader
                  column="totalOrders"
                  label="Orders"
                  currentColumn={sortColumn}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              </TableHead>
            )}
            {isColVisible('health') && (
              <TableHead className="w-[70px]">
                <SortableHeader
                  column="healthScore"
                  label="Health"
                  currentColumn={sortColumn}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              </TableHead>
            )}
            {isColVisible('lastOrder') && (
              <TableHead className="w-[110px]">
                <SortableHeader
                  column="lastOrderDate"
                  label="Last Order"
                  currentColumn={sortColumn}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              </TableHead>
            )}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>

        {isLoading ? (
          <TableSkeleton />
        ) : (
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
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
                      <div className="flex flex-col gap-1.5">
                        <a
                          href={`/customers/${customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {customer.name}
                        </a>
                        <div className="flex items-center gap-2">
                          {customer.customerCode && (
                            <span className="text-xs text-muted-foreground">
                              {customer.customerCode}
                            </span>
                          )}
                        </div>
                        {/* Tags */}
                        {customer.tags && customer.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {customer.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                            {customer.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{customer.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {isColVisible('status') && (
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1 whitespace-nowrap">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                    )}
                    {isColVisible('type') && (
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <TypeIcon className="h-4 w-4" />
                          <span className="text-sm">{type.label}</span>
                        </div>
                      </TableCell>
                    )}
                    {isColVisible('size') && (
                      <TableCell>
                        {customer.size && sizeConfig[customer.size] ? (
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            sizeConfig[customer.size].color
                          )}>
                            {sizeConfig[customer.size].label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    )}
                    {isColVisible('industry') && (
                      <TableCell>
                        {customer.industry ? (
                          <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
                            {customer.industry}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    )}
                    {isColVisible('contact') && (
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {customer.email && (
                            <a
                              href={`mailto:${customer.email}`}
                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Mail className="h-3 w-3" />
                              <TruncateTooltip text={customer.email} maxLength={20} maxWidth="max-w-[120px]" />
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
                    )}
                    {isColVisible('ltv') && (
                      <TableCell className="font-medium">
                        <FormatAmount amount={typeof customer.lifetimeValue === 'string' ? parseFloat(customer.lifetimeValue) : customer.lifetimeValue} cents={false} showCents={false} />
                      </TableCell>
                    )}
                    {isColVisible('orders') && (
                      <TableCell className="text-center">
                        {customer.totalOrders !== null && customer.totalOrders > 0 ? (
                          <span className="text-sm font-medium">{customer.totalOrders}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    )}
                    {isColVisible('health') && (
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
                    )}
                    {isColVisible('lastOrder') && (
                      <TableCell>
                        {customer.lastOrderDate ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <span title={new Date(customer.lastOrderDate).toLocaleDateString()}>
                              {formatRelativeTime(customer.lastOrderDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    )}
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
    </div>
  )
}
