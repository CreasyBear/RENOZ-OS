/**
 * BulkCommunications Component
 *
 * Send bulk communications to customer segments:
 * - Audience selection (segments or manual)
 * - Template selection with preview
 * - Scheduling options
 * - Campaign tracking
 */
import { useState } from 'react'
import {
  Send,
  Users,
  Mail,
  Calendar,
  Clock,
  ChevronRight,
  Filter,
  Eye,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

type AudienceType = 'segment' | 'filter' | 'all'
type ScheduleType = 'now' | 'scheduled'

interface Segment {
  id: string
  name: string
  customerCount: number
}

interface Template {
  id: string
  name: string
  subject?: string
  preview: string
}

interface Campaign {
  id: string
  name: string
  audienceType: AudienceType
  audienceCount: number
  templateId: string
  scheduleType: ScheduleType
  scheduledAt?: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  sent: number
  delivered: number
  opened: number
  clicked: number
  createdAt: string
}

interface BulkCommunicationsProps {
  segments?: Segment[]
  templates?: Template[]
  campaigns?: Campaign[]
  onSendCampaign?: (campaign: Partial<Campaign>) => void
  className?: string
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_SEGMENTS: Segment[] = [
  { id: '1', name: 'High-Value Active', customerCount: 245 },
  { id: '2', name: 'At Risk - Low Engagement', customerCount: 78 },
  { id: '3', name: 'New Prospects', customerCount: 156 },
  { id: '4', name: 'Enterprise Accounts', customerCount: 42 },
]

const MOCK_TEMPLATES: Template[] = [
  { id: '1', name: 'Welcome Email', subject: 'Welcome to {{company_name}}!', preview: 'Welcome email for new customers' },
  { id: '2', name: 'Quote Follow-up', subject: 'Following up on your quote', preview: 'Follow-up template for pending quotes' },
  { id: '3', name: 'Reactivation Offer', subject: 'We miss you! Here\'s a special offer', preview: 'Win-back campaign for lapsed customers' },
]

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: 'Q1 Reactivation Campaign',
    audienceType: 'segment',
    audienceCount: 78,
    templateId: '3',
    scheduleType: 'now',
    status: 'sent',
    sent: 78,
    delivered: 75,
    opened: 42,
    clicked: 18,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Enterprise Welcome Series',
    audienceType: 'segment',
    audienceCount: 42,
    templateId: '1',
    scheduleType: 'scheduled',
    scheduledAt: '2024-01-22T09:00:00Z',
    status: 'scheduled',
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    createdAt: '2024-01-18T14:00:00Z',
  },
]

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface AudienceStepProps {
  segments: Segment[]
  audienceType: AudienceType
  selectedSegments: string[]
  onAudienceTypeChange: (type: AudienceType) => void
  onSegmentsChange: (segments: string[]) => void
}

function AudienceStep({
  segments,
  audienceType,
  selectedSegments,
  onAudienceTypeChange,
  onSegmentsChange,
}: AudienceStepProps) {
  const totalSelected = segments
    .filter(s => selectedSegments.includes(s.id))
    .reduce((sum, s) => sum + s.customerCount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-4">Select Audience</h3>
        <RadioGroup value={audienceType} onValueChange={(v) => onAudienceTypeChange(v as AudienceType)}>
          <div className="grid gap-3">
            <Label
              htmlFor="segment"
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                audienceType === 'segment' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              )}
            >
              <RadioGroupItem value="segment" id="segment" />
              <div className="flex-1">
                <p className="font-medium">Customer Segment</p>
                <p className="text-sm text-muted-foreground">Send to customers in saved segments</p>
              </div>
              <Filter className="h-5 w-5 text-muted-foreground" />
            </Label>
            <Label
              htmlFor="all"
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                audienceType === 'all' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              )}
            >
              <RadioGroupItem value="all" id="all" />
              <div className="flex-1">
                <p className="font-medium">All Customers</p>
                <p className="text-sm text-muted-foreground">Send to all active customers</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </Label>
          </div>
        </RadioGroup>
      </div>

      {audienceType === 'segment' && (
        <div>
          <h4 className="font-medium mb-3">Select Segments</h4>
          <div className="space-y-2">
            {segments.map(segment => (
              <Label
                key={segment.id}
                htmlFor={`segment-${segment.id}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedSegments.includes(segment.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                )}
              >
                <Checkbox
                  id={`segment-${segment.id}`}
                  checked={selectedSegments.includes(segment.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSegmentsChange([...selectedSegments, segment.id])
                    } else {
                      onSegmentsChange(selectedSegments.filter(id => id !== segment.id))
                    }
                  }}
                />
                <div className="flex-1">
                  <p className="font-medium">{segment.name}</p>
                </div>
                <Badge variant="secondary">{segment.customerCount} customers</Badge>
              </Label>
            ))}
          </div>
          {selectedSegments.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Total: <span className="font-medium">{totalSelected} customers</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface TemplateStepProps {
  templates: Template[]
  selectedTemplateId: string | null
  onTemplateChange: (templateId: string) => void
}

function TemplateStep({ templates, selectedTemplateId, onTemplateChange }: TemplateStepProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Select Template</h3>
      <div className="grid gap-3">
        {templates.map(template => (
          <Label
            key={template.id}
            htmlFor={`template-${template.id}`}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
              selectedTemplateId === template.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            )}
          >
            <RadioGroup value={selectedTemplateId ?? ''} onValueChange={onTemplateChange}>
              <RadioGroupItem value={template.id} id={`template-${template.id}`} className="mt-1" />
            </RadioGroup>
            <div className="flex-1">
              <p className="font-medium">{template.name}</p>
              {template.subject && (
                <p className="text-sm text-muted-foreground mt-0.5">Subject: {template.subject}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">{template.preview}</p>
            </div>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
          </Label>
        ))}
      </div>
    </div>
  )
}

interface ScheduleStepProps {
  scheduleType: ScheduleType
  scheduledDate: string
  scheduledTime: string
  onScheduleTypeChange: (type: ScheduleType) => void
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
}

function ScheduleStep({
  scheduleType,
  scheduledDate,
  scheduledTime,
  onScheduleTypeChange,
  onDateChange,
  onTimeChange,
}: ScheduleStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-4">When to Send</h3>
        <RadioGroup value={scheduleType} onValueChange={(v) => onScheduleTypeChange(v as ScheduleType)}>
          <div className="grid gap-3">
            <Label
              htmlFor="now"
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                scheduleType === 'now' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              )}
            >
              <RadioGroupItem value="now" id="now" />
              <div className="flex-1">
                <p className="font-medium">Send Now</p>
                <p className="text-sm text-muted-foreground">Campaign will be sent immediately</p>
              </div>
              <Send className="h-5 w-5 text-muted-foreground" />
            </Label>
            <Label
              htmlFor="scheduled"
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                scheduleType === 'scheduled' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              )}
            >
              <RadioGroupItem value="scheduled" id="scheduled" />
              <div className="flex-1">
                <p className="font-medium">Schedule for Later</p>
                <p className="text-sm text-muted-foreground">Choose when to send the campaign</p>
              </div>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </Label>
          </div>
        </RadioGroup>
      </div>

      {scheduleType === 'scheduled' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={scheduledDate}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={scheduledTime}
              onChange={(e) => onTimeChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CAMPAIGN CARD
// ============================================================================

interface CampaignCardProps {
  campaign: Campaign
}

function CampaignCard({ campaign }: CampaignCardProps) {
  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
    sending: { label: 'Sending', color: 'bg-yellow-100 text-yellow-700' },
    sent: { label: 'Sent', color: 'bg-green-100 text-green-700' },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  }

  const status = statusConfig[campaign.status]
  const openRate = campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0
  const clickRate = campaign.sent > 0 ? ((campaign.clicked / campaign.sent) * 100).toFixed(1) : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{campaign.name}</CardTitle>
            <CardDescription>
              {campaign.audienceCount} recipients • Created {new Date(campaign.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {campaign.status === 'sent' ? (
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{campaign.sent}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <div>
              <p className="text-lg font-bold">{campaign.delivered}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
            <div>
              <p className="text-lg font-bold">{openRate}%</p>
              <p className="text-xs text-muted-foreground">Open Rate</p>
            </div>
            <div>
              <p className="text-lg font-bold">{clickRate}%</p>
              <p className="text-xs text-muted-foreground">Click Rate</p>
            </div>
          </div>
        ) : campaign.status === 'scheduled' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Scheduled for {campaign.scheduledAt && new Date(campaign.scheduledAt).toLocaleString()}
          </div>
        ) : campaign.status === 'sending' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Sending in progress...</span>
            </div>
            <Progress value={65} className="h-2" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BulkCommunications({
  segments: propSegments,
  templates: propTemplates,
  campaigns: propCampaigns,
  onSendCampaign,
  className,
}: BulkCommunicationsProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Wizard state
  const [campaignName, setCampaignName] = useState('')
  const [audienceType, setAudienceType] = useState<AudienceType>('segment')
  const [selectedSegments, setSelectedSegments] = useState<string[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [scheduleType, setScheduleType] = useState<ScheduleType>('now')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  // Use mock data
  const segments = propSegments ?? MOCK_SEGMENTS
  const templates = propTemplates ?? MOCK_TEMPLATES
  const campaigns = propCampaigns ?? MOCK_CAMPAIGNS

  const resetWizard = () => {
    setCurrentStep(1)
    setCampaignName('')
    setAudienceType('segment')
    setSelectedSegments([])
    setSelectedTemplateId(null)
    setScheduleType('now')
    setScheduledDate('')
    setScheduledTime('')
  }

  const handleSend = () => {
    const audienceCount = audienceType === 'all'
      ? segments.reduce((sum, s) => sum + s.customerCount, 0)
      : segments.filter(s => selectedSegments.includes(s.id)).reduce((sum, s) => sum + s.customerCount, 0)

    onSendCampaign?.({
      name: campaignName,
      audienceType,
      audienceCount,
      templateId: selectedTemplateId!,
      scheduleType,
      scheduledAt: scheduleType === 'scheduled' ? `${scheduledDate}T${scheduledTime}:00Z` : undefined,
      status: scheduleType === 'now' ? 'sending' : 'scheduled',
    })

    setIsWizardOpen(false)
    resetWizard()
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return audienceType === 'all' || selectedSegments.length > 0
      case 2:
        return selectedTemplateId !== null
      case 3:
        return scheduleType === 'now' || (scheduledDate && scheduledTime)
      default:
        return false
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Bulk Campaigns</h2>
          <p className="text-sm text-muted-foreground">
            Send targeted communications to customer segments
          </p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)}>
          <Send className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No campaigns yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsWizardOpen(true)}>
              Create your first campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}

      {/* Campaign Wizard Dialog */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Step {currentStep} of 3: {currentStep === 1 ? 'Select Audience' : currentStep === 2 ? 'Choose Template' : 'Schedule'}
            </DialogDescription>
          </DialogHeader>

          {/* Progress */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(step => (
              <div
                key={step}
                className={cn(
                  'flex-1 h-2 rounded-full',
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>

          {/* Campaign Name (always visible) */}
          {currentStep === 1 && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Q1 Reactivation Campaign"
              />
            </div>
          )}

          {/* Step Content */}
          {currentStep === 1 && (
            <AudienceStep
              segments={segments}
              audienceType={audienceType}
              selectedSegments={selectedSegments}
              onAudienceTypeChange={setAudienceType}
              onSegmentsChange={setSelectedSegments}
            />
          )}
          {currentStep === 2 && (
            <TemplateStep
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onTemplateChange={setSelectedTemplateId}
            />
          )}
          {currentStep === 3 && (
            <ScheduleStep
              scheduleType={scheduleType}
              scheduledDate={scheduledDate}
              scheduledTime={scheduledTime}
              onScheduleTypeChange={setScheduleType}
              onDateChange={setScheduledDate}
              onTimeChange={setScheduledTime}
            />
          )}

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : setIsWizardOpen(false)}
            >
              {currentStep > 1 ? 'Back' : 'Cancel'}
            </Button>
            {currentStep < 3 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSend} disabled={!canProceed()}>
                <Send className="h-4 w-4 mr-2" />
                {scheduleType === 'now' ? 'Send Now' : 'Schedule Campaign'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
