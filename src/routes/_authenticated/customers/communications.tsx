/**
 * Customer Communications Page
 *
 * Centralized communication management:
 * - Communication timeline for specific customer
 * - Templates management
 * - Bulk campaigns
 */
import { useState } from 'react'
import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CommunicationTimeline } from '@/components/domain/customers/communication-timeline'
import { CommunicationTemplates } from '@/components/domain/customers/communication-templates'
import { BulkCommunications } from '@/components/domain/customers/bulk-communications'

export const Route = createFileRoute('/_authenticated/customers/communications')({
  component: CommunicationsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    customerId: (search.customerId as string) || undefined,
    tab: (search.tab as string) || 'timeline',
  }),
})

function CommunicationsPage() {
  const search = useSearch({ from: '/_authenticated/customers/communications' })
  const [activeTab, setActiveTab] = useState(search.tab || 'timeline')

  const handleLogCommunication = (type: string) => {
    // In production, open a dialog to log the communication
    console.log('Log communication:', type)
  }

  const handleSaveTemplate = (template: unknown) => {
    // In production, save to the server
    console.log('Save template:', template)
  }

  const handleDeleteTemplate = (templateId: string) => {
    // In production, delete from server
    console.log('Delete template:', templateId)
  }

  const handleUseTemplate = (templateId: string) => {
    // In production, open compose dialog with template
    console.log('Use template:', templateId)
  }

  const handleSendCampaign = (campaign: unknown) => {
    // In production, save and send campaign
    console.log('Send campaign:', campaign)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Communications</h1>
            <p className="text-muted-foreground">
              Manage customer communications, templates, and campaigns
            </p>
          </div>
        </div>
      </div>

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
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onUseTemplate={handleUseTemplate}
          />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <BulkCommunications
            onSendCampaign={handleSendCampaign}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
