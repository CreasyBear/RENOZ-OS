/**
 * Customer Duplicates Route
 *
 * Manage duplicate customer detection and merge operations.
 * Route-level data fetching with presentational components.
 *
 * ARCHITECTURE: Route fetches data via hooks, passes to presentational components.
 */

import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PageLayout, RouteErrorFallback } from '@/components/layout'
import { InventoryTabsSkeleton } from '@/components/skeletons/inventory'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, History, AlertTriangle } from 'lucide-react'
import { DuplicateDetection, MergeHistory } from '@/components/domain/customers'
import { useDuplicateScan, useMergeHistory, useDismissDuplicate } from '@/hooks'

export const Route = createFileRoute('/_authenticated/customers/duplicates')({
  component: CustomerDuplicatesPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/customers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="container">
      <PageLayout.Header title="Duplicate Detection" />
      <PageLayout.Content>
        <InventoryTabsSkeleton tabCount={2} />
      </PageLayout.Content>
    </PageLayout>
  ),
})

function CustomerDuplicatesPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('detection')
  const [scanThreshold, setScanThreshold] = useState(0.4)

  // Fetch duplicate scan results
  const scan = useDuplicateScan({
    threshold: scanThreshold,
    limit: 50,
    enabled: true,
  })

  // Fetch merge history
  const history = useMergeHistory({
    limit: 50,
    enabled: activeTab === 'history', // Only fetch when tab is active
  })

  // Dismiss mutation
  const dismissMutation = useDismissDuplicate()

  // Navigate to customer detail
  const handleViewCustomer = (customerId: string) => {
    navigate({ to: '/customers/$customerId', params: { customerId } })
  }

  // Navigate to merge wizard
  const handleMerge = (pair: {
    customer1: { id: string }
    customer2: { id: string }
  }) => {
    // For now, navigate to customer detail - merge wizard would be implemented later
    navigate({
      to: '/customers/$customerId',
      params: { customerId: pair.customer1.id },
    })
  }

  // Dismiss duplicate pair
  const handleDismiss = async (customer1Id: string, customer2Id: string) => {
    await dismissMutation.mutateAsync({
      customer1Id,
      customer2Id,
      reason: 'Marked as not duplicates by user',
    })
  }

  // Handle threshold change
  const handleThresholdChange = (threshold: number) => {
    setScanThreshold(threshold / 100) // Convert percentage to decimal
  }

  // Calculate scan stats for the detection component
  const scanStats = {
    totalScanned: scan.data?.total ?? 0,
    duplicatesFound: scan.data?.pairs?.length ?? 0,
    lastScanAt: new Date().toISOString(), // Would come from server in production
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Duplicate Management</h1>
        <p className="text-muted-foreground">
          Detect and merge duplicate customer records
        </p>
      </div>

      {/* Error States */}
      {scan.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to scan for duplicates. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
          <TabsTrigger value="detection" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Detection</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Merge History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detection" className="mt-6">
          <DuplicateDetection
            duplicates={scan.data?.pairs}
            scanStats={scanStats}
            isLoading={scan.isLoading}
            isScanning={scan.isFetching}
            threshold={scanThreshold * 100}
            onThresholdChange={handleThresholdChange}
            onScan={() => scan.refetch()}
            onMerge={handleMerge}
            onDismiss={handleDismiss}
            onView={handleViewCustomer}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {history.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load merge history. Please try again.
              </AlertDescription>
            </Alert>
          ) : (
            <MergeHistory
              history={history.data?.history}
              isLoading={history.isLoading}
              onViewCustomer={handleViewCustomer}
              onUndo={(mergeId) => {
                // Would implement undo in production
                console.log('Undo merge:', mergeId)
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
