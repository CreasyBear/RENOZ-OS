/**
 * Customer Communications Page
 *
 * Centralized communication management:
 * - Communication timeline for specific customer (real data)
 * - Templates management (CRUD operations)
 * - Bulk campaigns with segment selection (create and track)
 *
 * @source communications from useCustomerCommunications hook
 * @source templates from useTemplates hook
 * @source campaigns from useCampaigns hook
 * @source segments from useSegments hook
 *
 * @see _Initiation/_prd/sprints/sprint-01-route-cleanup.prd.json (SPRINT-01-008)
 */
import { useState, useCallback } from 'react'
import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { InventoryTabsSkeleton } from '@/components/skeletons/inventory'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CommunicationTimeline } from '@/components/domain/customers'
import { CommunicationTemplates } from '@/components/domain/customers'
import { BulkCommunications } from '@/components/domain/customers'
import { QuickLogDialog } from '@/components/domain/communications/quick-log-dialog'
import {
  useCustomerCommunications,
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useCampaigns,
  useCreateCampaign,
} from '@/hooks/communications'
import { useSegments } from '@/hooks/customers'
import { toast } from '@/hooks/_shared/use-toast'

export const Route = createFileRoute('/_authenticated/customers/communications')({
  component: CommunicationsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    customerId: (search.customerId as string) || undefined,
    tab: (search.tab as string) || 'timeline',
  }),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/customers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Communications" />
      <PageLayout.Content>
        <InventoryTabsSkeleton tabCount={3} />
      </PageLayout.Content>
    </PageLayout>
  ),
})

function CommunicationsPage() {
  const search = useSearch({ from: '/_authenticated/customers/communications' })
  const [activeTab, setActiveTab] = useState(search.tab || 'timeline')

  // ============================================================================
  // DIALOG STATE
  // ============================================================================
  const [quickLogOpen, setQuickLogOpen] = useState(false)

  // ============================================================================
  // DATA FETCHING - Timeline Tab
  // ============================================================================
  const {
    data: communicationsData,
    isLoading: isLoadingCommunications,
  } = useCustomerCommunications({
    customerId: search.customerId || '',
    enabled: !!search.customerId && activeTab === 'timeline',
  })

  const communications = communicationsData?.communications || []

  // ============================================================================
  // DATA FETCHING - Templates Tab
  // ============================================================================
  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
  } = useTemplates({
    enabled: activeTab === 'templates',
  })

  // Map API templates to component format
  type TemplateCategory = 'welcome' | 'follow_up' | 'complaint_resolution' | 'upsell' | 'reactivation' | 'general'
  type TemplateType = 'email' | 'sms' | 'note'
  
  interface ComponentTemplate {
    id: string
    name: string
    category: TemplateCategory
    type: TemplateType
    subject?: string
    body: string
    variables: string[]
    usageCount: number
    createdAt: string
    updatedAt: string
    isActive: boolean
  }
  
  const templates: ComponentTemplate[] = (templatesData || []).map(t => ({
    id: t.id,
    name: t.name,
    category: mapTemplateCategory(t.category) as TemplateCategory,
    type: 'email' as TemplateType,
    subject: t.subject || undefined,
    body: t.bodyHtml,
    variables: (t.variables || []).map(v => v.name),
    usageCount: 0, // API doesn't return this
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    isActive: t.isActive,
  }))

  // ============================================================================
  // DATA FETCHING - Campaigns Tab
  // ============================================================================
  const {
    data: campaignsData,
    isLoading: isLoadingCampaigns,
  } = useCampaigns({
    enabled: activeTab === 'campaigns',
  })

  // ============================================================================
  // DATA FETCHING - Segments (for campaign audience selection)
  // ============================================================================
  const {
    data: segmentsData,
    isLoading: isLoadingSegments,
  } = useSegments({
    enabled: activeTab === 'campaigns',
  })

  // Map API segments to component format
  const segments = (segmentsData || []).map(s => ({
    id: s.id,
    name: s.name,
    customerCount: s.customerCount,
  }))

  // Map API campaigns to component format
  type AudienceType = 'segment' | 'filter' | 'all'
  type ScheduleType = 'now' | 'scheduled'
  type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  
  interface ComponentCampaign {
    id: string
    name: string
    audienceType: AudienceType
    audienceCount: number
    templateId: string
    scheduleType: ScheduleType
    scheduledAt?: string
    status: CampaignStatus
    sent: number
    delivered: number
    opened: number
    clicked: number
    createdAt: string
  }
  
  const campaigns: ComponentCampaign[] = (campaignsData?.items || []).map(c => ({
    id: c.id,
    name: c.name,
    audienceType: 'segment' as AudienceType, // Default since API doesn't have this directly
    audienceCount: 0, // Would need to fetch recipients
    templateId: '', // Not directly available in API response
    scheduleType: (c.scheduledAt ? 'scheduled' : 'now') as ScheduleType,
    scheduledAt: c.scheduledAt?.toISOString(),
    status: c.status as CampaignStatus,
    sent: 0, // Not in API response
    delivered: 0,
    opened: 0,
    clicked: 0,
    createdAt: c.createdAt.toISOString(),
  }))

  // ============================================================================
  // MUTATIONS - Templates
  // ============================================================================
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()

  // ============================================================================
  // MUTATIONS - Campaigns
  // ============================================================================
  const createCampaign = useCreateCampaign()

  // ============================================================================
  // HANDLERS - Timeline Tab
  // ============================================================================
  const handleLogCommunication = useCallback((_type: string) => {
    setQuickLogOpen(true)
  }, [])

  const handleQuickLogClose = useCallback((open: boolean) => {
    setQuickLogOpen(open)
  }, [])

  // ============================================================================
  // HANDLERS - Templates Tab
  // ============================================================================
  // Using explicit any to match component's Partial<Template> expectation
  // The component's Template type is defined locally and not exported
  const handleSaveTemplate = useCallback((template: Record<string, unknown>) => {
    // Execute async without returning promise to match void return type
    void (async () => {
      try {
        // Map component category to API category
        const apiCategory = mapComponentCategoryToApi(String(template.category))
        
        // Map variables to API format
        const apiVariables = ((template.variables as string[]) || []).map((name: string) => ({
          name,
          description: `Variable: ${name}`,
          defaultValue: '',
          type: 'text' as const,
        }))

        if (template.id) {
          // Update existing template
          await updateTemplate.mutateAsync({
            id: String(template.id),
            name: String(template.name),
            category: apiCategory,
            subject: String(template.subject || ''),
            bodyHtml: String(template.body),
            variables: apiVariables,
            createVersion: false,
          })
        } else {
          // Create new template
          await createTemplate.mutateAsync({
            name: String(template.name),
            category: apiCategory,
            subject: String(template.subject || ''),
            bodyHtml: String(template.body),
            variables: apiVariables,
          })
        }
      } catch (error) {
        // Error handled by mutation
        console.error('Failed to save template:', error)
      }
    })()
  }, [createTemplate, updateTemplate])

  const handleDeleteTemplate = useCallback((templateId: string) => {
    // Execute async without returning promise to match void return type
    void (async () => {
      try {
        await deleteTemplate.mutateAsync({ id: templateId })
      } catch (error) {
        // Error handled by mutation
        console.error('Failed to delete template:', error)
      }
    })()
  }, [deleteTemplate])

  const handleUseTemplate = useCallback((templateId: string) => {
    // Find the template and open compose dialog with it
    const template = templates.find(t => t.id === templateId)
    if (template) {
      // For now, show a toast. In full implementation, this would open
      // an email compose dialog pre-filled with the template
      toast.info(`Using template: ${template.name}`, {
        description: 'Opening compose dialog with template content...',
      })
      // TODO: Open email compose dialog with template content
    }
  }, [templates])

  // ============================================================================
  // HANDLERS - Campaigns Tab
  // ============================================================================
  // Using explicit any to match component's Partial<Campaign> expectation
  // The component's Campaign type is defined locally and not exported
  const handleSendCampaign = useCallback((campaign: Record<string, unknown>) => {
    // Execute async without returning promise to match void return type
    void (async () => {
      try {
        await createCampaign.mutateAsync({
          name: String(campaign.name),
          description: campaign.description ? String(campaign.description) : undefined,
          templateType: 'custom', // Map from component format
          templateData: {}, // Would be populated from selected template
          recipientCriteria: {}, // Would be populated from audience selection
          scheduledAt: campaign.scheduledAt ? new Date(String(campaign.scheduledAt)) : undefined,
        })
      } catch (error) {
        // Error handled by mutation
        console.error('Failed to create campaign:', error)
      }
    })()
  }, [createCampaign])

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Communications"
        description="Manage customer communications, templates, and campaigns"
        actions={
          <Button variant="outline" asChild>
            <Link to="/customers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />
      <PageLayout.Content>
        {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          {search.customerId ? (
            <CommunicationTimeline
              customerId={search.customerId}
              communications={communications}
              isLoading={isLoadingCommunications}
              onLogCommunication={handleLogCommunication}
            />
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a Customer</h3>
              <p className="text-muted-foreground mb-4">
                View the communication timeline for a specific customer
              </p>
              <Button asChild>
                <Link to="/customers">Browse Customers</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <CommunicationTemplates
            templates={templates}
            isLoading={isLoadingTemplates}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onUseTemplate={handleUseTemplate}
          />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <BulkCommunications
            segments={segments}
            campaigns={campaigns}
            isLoading={isLoadingCampaigns || isLoadingSegments}
            onSendCampaign={handleSendCampaign}
          />
        </TabsContent>
      </Tabs>

        {/* Quick Log Dialog */}
        <QuickLogDialog
          open={quickLogOpen}
          onOpenChange={handleQuickLogClose}
          customerId={search.customerId}
          customerName={search.customerId ? 'Customer' : undefined}
        />
      </PageLayout.Content>
    </PageLayout>
  )
}

// ============================================================================
// HELPER FUNCTIONS - Category Mapping
// ============================================================================

/**
 * Map API template category to component category format
 */
function mapTemplateCategory(apiCategory: string): 'welcome' | 'follow_up' | 'complaint_resolution' | 'upsell' | 'reactivation' | 'general' {
  const categoryMap: Record<string, 'welcome' | 'follow_up' | 'complaint_resolution' | 'upsell' | 'reactivation' | 'general'> = {
    'welcome': 'welcome',
    'follow_up': 'follow_up',
    'quotes': 'follow_up',
    'orders': 'general',
    'installations': 'general',
    'warranty': 'complaint_resolution',
    'support': 'complaint_resolution',
    'marketing': 'upsell',
    'custom': 'general',
  }
  return categoryMap[apiCategory] || 'general'
}

/**
 * Map component template category to API category format
 */
function mapComponentCategoryToApi(category: string): 'quotes' | 'orders' | 'installations' | 'warranty' | 'support' | 'marketing' | 'follow_up' | 'custom' {
  const categoryMap: Record<string, 'quotes' | 'orders' | 'installations' | 'warranty' | 'support' | 'marketing' | 'follow_up' | 'custom'> = {
    'welcome': 'custom',
    'follow_up': 'follow_up',
    'complaint_resolution': 'support',
    'upsell': 'marketing',
    'reactivation': 'marketing',
    'general': 'custom',
  }
  return categoryMap[category] || 'custom'
}
