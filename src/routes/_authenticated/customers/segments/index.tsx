/**
 * Customer Segments Page
 *
 * Manages customer segments with:
 * - Segment list view with statistics
 * - Segment builder dialog
 * - Segment analytics view
 *
 * ARCHITECTURE: Route fetches data via hooks, passes to presentational components.
 */
import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { InventoryTabsSkeleton } from '@/components/skeletons/inventory'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SegmentManager } from '@/components/domain/customers'
import { SegmentBuilder } from '@/components/domain/customers'
import { SegmentAnalytics } from '@/components/domain/customers'
import { useSegments, useSegmentDetail } from '@/hooks'

export const Route = createFileRoute('/_authenticated/customers/segments/')({
  component: SegmentsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/customers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Customer Segments" />
      <PageLayout.Content>
        <InventoryTabsSkeleton tabCount={2} />
      </PageLayout.Content>
    </PageLayout>
  ),
})

function SegmentsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('list')
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null)
  const [viewingAnalyticsId, setViewingAnalyticsId] = useState<string | null>(null)

  // Fetch segments with stats
  const segments = useSegments({ includeEmpty: false })

  // Fetch analytics for selected segment
  const segmentDetail = useSegmentDetail({
    segmentId: viewingAnalyticsId ?? '',
    enabled: !!viewingAnalyticsId,
  })

  const handleCreateSegment = () => {
    setEditingSegmentId(null)
    setIsBuilderOpen(true)
  }

  const handleEditSegment = (segmentId: string) => {
    setEditingSegmentId(segmentId)
    setIsBuilderOpen(true)
  }

  const handleViewAnalytics = (segmentId: string) => {
    setViewingAnalyticsId(segmentId)
    setActiveTab('analytics')
  }

  const handleSaveSegment = () => {
    setIsBuilderOpen(false)
    setEditingSegmentId(null)
    // Refetch segments
    segments.refetch()
  }

  const handleDeleteSegment = (segmentId: string) => {
    // TODO: Implement delete mutation
    console.log('Deleting segment:', segmentId)
    segments.refetch()
  }

  const handleViewCustomers = (segmentId: string) => {
    // Navigate to customers list with segment filter
    navigate({
      to: '/customers',
      search: { tag: segmentId },
    })
  }

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Customer Segments"
        description="Create and manage customer segments for targeted actions"
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
        {/* Error State */}
      {segments.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load segments. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">All Segments</TabsTrigger>
          <TabsTrigger value="analytics" disabled={!viewingAnalyticsId}>
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <SegmentManager
            segments={segments.data?.segments?.map(s => ({
              ...s,
              description: s.description ?? '',
            }))}
            isLoading={segments.isLoading}
            onCreateSegment={handleCreateSegment}
            onEditSegment={handleEditSegment}
            onDeleteSegment={handleDeleteSegment}
            onViewCustomers={handleViewCustomers}
            onViewAnalytics={handleViewAnalytics}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {viewingAnalyticsId && (
            <div className="space-y-4">
              <Button
                variant="outline"
                onClick={() => {
                  setViewingAnalyticsId(null)
                  setActiveTab('list')
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Segments
              </Button>
              <SegmentAnalytics
                segment={segmentDetail.data?.segment}
                healthDistribution={segmentDetail.data?.healthDistribution}
                customersByStatus={segmentDetail.data?.customersByStatus}
                topCustomers={segmentDetail.data?.topCustomers}
                isLoading={segmentDetail.isLoading}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

        {/* Segment Builder Dialog */}
        <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSegmentId ? 'Edit Segment' : 'Create Segment'}
              </DialogTitle>
              <DialogDescription>
                Define criteria to group customers into a segment
              </DialogDescription>
            </DialogHeader>
            <SegmentBuilder
              onSave={handleSaveSegment}
              onCancel={() => setIsBuilderOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </PageLayout.Content>
    </PageLayout>
  )
}
