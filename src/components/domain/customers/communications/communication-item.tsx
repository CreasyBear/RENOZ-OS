/**
 * CommunicationItem Component
 *
 * Individual communication item in the timeline.
 * Displays communication details with expand/collapse functionality.
 */
import { useState } from 'react'
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
  Reply,
  Forward,
  Archive,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

import { formatDuration, formatTimestamp, getInitials } from './communication-helpers'
import type { Communication } from './communication-timeline.types'

// ============================================================================
// TYPES
// ============================================================================

interface CommunicationItemProps {
  communication: Communication
  onReply?: () => void
  onForward?: () => void
  onOpenInNewTab?: () => void
  onArchive?: () => void
  onDelete?: () => void
}

// ============================================================================
// CONFIG
// ============================================================================

const typeConfig: Record<Communication['type'], { icon: typeof Mail; label: string; color: string }> = {
  email: { icon: Mail, label: 'Email', color: 'text-blue-600 bg-blue-100' },
  phone: { icon: Phone, label: 'Phone', color: 'text-green-600 bg-green-100' },
  meeting: { icon: Calendar, label: 'Meeting', color: 'text-purple-600 bg-purple-100' },
  portal: { icon: MessageSquare, label: 'Portal', color: 'text-orange-600 bg-orange-100' },
  note: { icon: FileText, label: 'Note', color: 'text-gray-600 bg-gray-100' },
}

const directionConfig: Record<Communication['direction'], { label: string; icon: typeof Send }> = {
  inbound: { label: 'Received', icon: Mail },
  outbound: { label: 'Sent', icon: Send },
  internal: { label: 'Internal', icon: FileText },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CommunicationItem({
  communication,
  onReply,
  onForward,
  onOpenInNewTab,
  onArchive,
  onDelete,
}: CommunicationItemProps) {
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
        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${config.color}`}>
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
                    <Button size="sm" variant="outline" onClick={onForward}>
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
                    <DropdownMenuItem onClick={onOpenInNewTab} disabled={!onOpenInNewTab}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in new tab
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onArchive} disabled={!onArchive}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={onDelete} disabled={!onDelete}>
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
