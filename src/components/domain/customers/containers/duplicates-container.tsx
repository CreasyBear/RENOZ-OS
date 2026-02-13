/**
 * Customer Duplicates Container
 *
 * Orchestrates data fetching, state management, and actions for duplicate detection.
 * Handles detection and merge history tabs.
 * Returns content only; route owns PageLayout per STANDARDS.md.
 *
 * @source duplicates from useDuplicateScan hook
 * @source mergeHistory from useMergeHistory hook
 * @source dismissMutation from useDismissDuplicate hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState, useMemo, useCallback } from 'react';
import { useCustomerNavigation } from '@/hooks/customers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, History, AlertTriangle } from 'lucide-react';
import { DuplicateDetection, MergeHistory } from '@/components/domain/customers';
import { useDuplicateScan, useMergeHistory, useDismissDuplicate, toastError, toastSuccess } from '@/hooks';
import { customersLogger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface DuplicatesContainerProps {
  /** Initial active tab */
  initialTab?: 'detection' | 'history';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export function DuplicatesContainer({
  initialTab = 'detection',
  className,
}: DuplicatesContainerProps) {
  const { navigateToCustomer } = useCustomerNavigation();
  const [activeTab, setActiveTab] = useState<'detection' | 'history'>(initialTab);
  const [scanThreshold, setScanThreshold] = useState(0.4);

  // Fetch duplicate scan results
  const scan = useDuplicateScan({
    threshold: scanThreshold,
    limit: 50,
    enabled: true,
  });

  // Fetch merge history
  const history = useMergeHistory({
    limit: 50,
    enabled: activeTab === 'history', // Only fetch when tab is active
  });

  // Dismiss mutation
  const dismissMutation = useDismissDuplicate();

  // Navigate to customer detail
  const handleViewCustomer = useCallback(
    (customerId: string) => {
      navigateToCustomer(customerId);
    },
    [navigateToCustomer]
  );

  // Navigate to merge wizard
  const handleMerge = useCallback(
    (pair: {
      customer1: { id: string };
      customer2: { id: string };
    }) => {
      // For now, navigate to customer detail - merge wizard would be implemented later
      navigateToCustomer(pair.customer1.id);
    },
    [navigateToCustomer]
  );

  // Dismiss duplicate pair
  const handleDismiss = useCallback(async (customer1Id: string, customer2Id: string) => {
    try {
      await dismissMutation.mutateAsync({
        customer1Id,
        customer2Id,
        reason: 'Marked as not duplicates by user',
      });
      toastSuccess('Duplicate pair dismissed');
    } catch (error) {
      customersLogger.error('Failed to dismiss duplicate', error);
      toastError(error instanceof Error ? error.message : 'Failed to dismiss duplicate');
    }
  }, [dismissMutation]);

  // Handle threshold change
  const handleThresholdChange = useCallback((threshold: number) => {
    setScanThreshold(threshold / 100); // Convert percentage to decimal
  }, []);

  // Calculate scan stats for the detection component (memoized to prevent unnecessary re-renders)
  const scanStats = useMemo(() => ({
    totalScanned: scan.data?.total ?? 0,
    duplicatesFound: scan.data?.pairs?.length ?? 0,
    lastScanAt: new Date().toISOString(), // Would come from server in production
  }), [scan.data?.total, scan.data?.pairs?.length]);

  return (
    <div className={className}>
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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
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
              onUndo={() => {
                // TODO: Implement undo in production
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
