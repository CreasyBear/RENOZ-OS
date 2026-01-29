/**
 * CommunicationTimeline Component
 *
 * Unified timeline of all customer communications:
 * - Multi-channel display (email, phone, meeting, portal)
 * - Filtering and search
 * - Communication logging
 * - Quick actions
 */
import { useState, useMemo } from 'react'
import {
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  FileText,
  Send,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  MoreHorizontal,
  Reply,
  Forward,
  Archive,
  ExternalLink,
  Download,
  CalendarRange,
  X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarUI } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'

// ============================================================================
// TYPES
// ============================================================================

type CommunicationType = 'email' | 'phone' | 'meeting' | 'portal' | 'note'
type CommunicationDirection = 'inbound' | 'outbound' | 'internal'
type CommunicationStatus = 'sent' | 'delivered' | 'read' | 'replied' | 'failed'

interface Communication {
  id: string
  type: CommunicationType
  direction: CommunicationDirection
  status?: CommunicationStatus
  subject: string
  preview: string
  content?: string
  from: {
    name: string
    email?: string
  }
  to?: {
    name: string
    email?: string
  }
  timestamp: string
  duration?: number // For calls, in seconds
  attachments?: number
  contactId?: string
  customerId: string
}

interface CommunicationTimelineProps {
  customerId: string
  communications?: Communication[]
  isLoading?: boolean
  onLogCommunication?: (type: CommunicationType) => void
  onReply?: (communicationId: string) => void
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

const typeConfig: Record<CommunicationType, { icon: typeof Mail; label: string; color: string }> = {
  email: { icon: Mail, label: 'Email', color: 'text-blue-600 bg-blue-100' },
  phone: { icon: Phone, label: 'Phone', color: 'text-green-600 bg-green-100' },
  meeting: { icon: Calendar, label: 'Meeting', color: 'text-purple-600 bg-purple-100' },
  portal: { icon: MessageSquare, label: 'Portal', color: 'text-orange-600 bg-orange-100' },
  note: { icon: FileText, label: 'Note', color: 'text-gray-600 bg-gray-100' },
}

const directionConfig: Record<CommunicationDirection, { label: string; icon: typeof Send }> = {
  inbound: { label: 'Received', icon: Mail },
  outbound: { label: 'Sent', icon: Send },
  internal: { label: 'Internal', icon: FileText },
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins >= 60) {
    const hours = Math.floor(mins / 60)
    const remainMins = mins % 60
    return `${hours}h ${remainMins}m`
  }
  return `${mins}m ${secs}s`
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) {
    return 'Yesterday'
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('en-AU', { weekday: 'short' })
  }
  return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ============================================================================
// COMMUNICATION ITEM
// ============================================================================

interface CommunicationItemProps {
  communication: Communication
  onReply?: () => void
}

function CommunicationItem({ communication, onReply }: CommunicationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = typeConfig[communication.type]
  const Icon = config.icon
  const dirConfig = directionConfig[communication.direction]

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="relative pl-8 pb-6 last:pb-0">
        {/* Timeline line */}
        <div className="absolute left-3 top-6 bottom-0 w-px bg-border" />

        {/* Timeline dot */}
        <div className={cn(
          'absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center',
          config.color
        )}>
          <Icon className="h-3 w-3" />
        </div>

        {/* Content */}
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {dirConfig.label}
                    </Badge>
                    {communication.status && (
                      <Badge
                        variant={communication.status === 'read' || communication.status === 'replied' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {communication.status}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-medium line-clamp-1">
                    {communication.subject}
                  </CardTitle>
                  <CardDescription className="line-clamp-1 mt-1">
                    {communication.preview}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(communication.timestamp)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Participants */}
              <div className="flex items-center gap-4 mb-3 text-sm">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(communication.from.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{communication.from.name}</span>
                    {communication.from.email && ` <${communication.from.email}>`}
                  </span>
                </div>
                {communication.to && (
                  <>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{communication.to.name}</span>
                      {communication.to.email && ` <${communication.to.email}>`}
                    </span>
                  </>
                )}
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(communication.timestamp).toLocaleString('en-AU', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </div>
                {communication.duration && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {formatDuration(communication.duration)}
                  </div>
                )}
                {communication.attachments && communication.attachments > 0 && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {communication.attachments} attachment{communication.attachments > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Full content */}
              {communication.content && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm mb-3">
                  {communication.content}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {communication.type === 'email' && (
                  <>
                    <Button size="sm" variant="outline" onClick={onReply}>
                      <Reply className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                    <Button size="sm" variant="outline">
                      <Forward className="h-4 w-4 mr-1" />
                      Forward
                    </Button>
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in new tab
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </div>
    </Collapsible>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CommunicationTimeline({
  customerId,
  communications: propCommunications,
  isLoading = false,
  onLogCommunication,
  onReply,
  className,
}: CommunicationTimelineProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<CommunicationType | 'all'>('all')
  const [directionFilter, setDirectionFilter] = useState<CommunicationDirection | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Use provided communications or empty array
  const communications = propCommunications ?? []

  // Filter communications
  const filteredCommunications = useMemo(() => {
    return communications.filter(comm => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!comm.subject.toLowerCase().includes(query) &&
            !comm.preview.toLowerCase().includes(query) &&
            !comm.from.name.toLowerCase().includes(query)) {
          return false
        }
      }
      // Type filter
      if (typeFilter !== 'all' && comm.type !== typeFilter) return false
      // Direction filter
      if (directionFilter !== 'all' && comm.direction !== directionFilter) return false
      // Date range filter
      if (dateRange?.from) {
        const commDate = new Date(comm.timestamp)
        const from = startOfDay(dateRange.from)
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from)
        if (!isWithinInterval(commDate, { start: from, end: to })) {
          return false
        }
      }
      return true
    })
  }, [communications, searchQuery, typeFilter, directionFilter, dateRange])

  // Export functions
  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Direction', 'Subject', 'From', 'To', 'Preview']
    const rows = filteredCommunications.map(comm => [
      new Date(comm.timestamp).toISOString(),
      comm.type,
      comm.direction,
      comm.subject,
      comm.from.name,
      comm.to?.name ?? '',
      comm.preview,
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `communications-${customerId}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearDateRange = () => {
    setDateRange(undefined)
  }

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || directionFilter !== 'all' || dateRange

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as CommunicationType | 'all')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="portal">Portal</SelectItem>
              <SelectItem value="note">Note</SelectItem>
            </SelectContent>
          </Select>

          {/* Direction Filter */}
          <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as CommunicationDirection | 'all')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="inbound">Received</SelectItem>
              <SelectItem value="outbound">Sent</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                <CalendarRange className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  "Date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarUI
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
              {dateRange && (
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" onClick={clearDateRange} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Clear dates
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Export Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Export communications">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Log Communication */}
          {onLogCommunication && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Log
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onLogCommunication('email')}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLogCommunication('phone')}>
                  <Phone className="h-4 w-4 mr-2" />
                  Phone Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLogCommunication('meeting')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Meeting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLogCommunication('note')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing {filteredCommunications.length} of {communications.length} communications</span>
          {dateRange && (
            <Badge variant="secondary" className="gap-1">
              {format(dateRange.from!, "MMM d")}
              {dateRange.to && ` - ${format(dateRange.to, "MMM d")}`}
              <button onClick={clearDateRange} className="ml-1 hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="pl-8">
              <Card>
                <CardHeader>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
              </Card>
            </div>
          ))}
        </div>
      ) : filteredCommunications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== 'all' || directionFilter !== 'all'
                ? 'No communications match your filters'
                : 'No communications yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {filteredCommunications.map(comm => (
            <CommunicationItem
              key={comm.id}
              communication={comm}
              onReply={() => onReply?.(comm.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
