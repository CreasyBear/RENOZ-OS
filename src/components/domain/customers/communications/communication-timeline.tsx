/**
 * CommunicationTimeline Component
 *
 * Unified timeline of all customer communications:
 * - Multi-channel display (email, phone, meeting, portal)
 * - Filtering and search
 * - Communication logging
 * - Quick actions
 */
import { useState, useMemo, useCallback } from 'react'
import {
  Phone,
  Calendar,
  MessageSquare,
  FileText,
  Search,
  Plus,
  Download,
  CalendarRange,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarUI } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { CommunicationItem } from './communication-item'
import type {
  CommunicationTimelineProps,
  CommunicationType,
  CommunicationDirection,
} from './communication-timeline.types'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CommunicationTimeline({
  customerId,
  communications: propCommunications,
  isLoading = false,
  onLogCommunication,
  onReply,
  onForward,
  className,
}: CommunicationTimelineProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<CommunicationType | 'all'>('all')
  const [directionFilter, setDirectionFilter] = useState<CommunicationDirection | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  // Use provided communications or empty array (memoized for stable deps)
  const communications = useMemo(
    () => propCommunications ?? [],
    [propCommunications]
  )

  // Filter communications
  const filteredCommunications = useMemo(() => {
    return communications.filter(comm => {
      if (hiddenIds.has(comm.id)) return false;
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
  }, [communications, hiddenIds, searchQuery, typeFilter, directionFilter, dateRange])

  const buildMailtoLink = useCallback((opts: {
    to?: string;
    subject: string;
    body?: string;
  }): string => {
    const params = new URLSearchParams();
    params.set('subject', opts.subject);
    if (opts.body) params.set('body', opts.body);
    const to = opts.to ?? '';
    return `mailto:${to}?${params.toString()}`;
  }, []);

  const hideCommunication = useCallback((communicationId: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(communicationId);
      return next;
    });
  }, []);

  // Export functions
  const handleExportCSV = useCallback(() => {
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
  }, [filteredCommunications, customerId])

  const clearDateRange = useCallback(() => {
    setDateRange(undefined)
  }, [])

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || directionFilter !== 'all' || dateRange

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communications…"
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
              onReply={() => {
                if (onReply) {
                  onReply(comm.id);
                  return;
                }
                const href = buildMailtoLink({
                  to: comm.from.email ?? '',
                  subject: `Re: ${comm.subject}`,
                });
                window.open(href, '_blank', 'noopener,noreferrer');
              }}
              onForward={() => {
                if (onForward) {
                  onForward(comm.id);
                  return;
                }
                const body = [
                  '',
                  '--- Forwarded message ---',
                  `From: ${comm.from.name}${comm.from.email ? ` <${comm.from.email}>` : ''}`,
                  `Date: ${new Date(comm.timestamp).toLocaleString('en-AU')}`,
                  `Subject: ${comm.subject}`,
                  '',
                  comm.content ?? comm.preview,
                ].join('\n');
                const href = buildMailtoLink({
                  subject: `Fwd: ${comm.subject}`,
                  body,
                });
                window.open(href, '_blank', 'noopener,noreferrer');
              }}
              onOpenInNewTab={() => {
                const href = buildMailtoLink({
                  to: comm.from.email ?? '',
                  subject: comm.subject,
                  body: comm.content ?? comm.preview,
                });
                window.open(href, '_blank', 'noopener,noreferrer');
              }}
              onArchive={() => hideCommunication(comm.id)}
              onDelete={() => hideCommunication(comm.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
