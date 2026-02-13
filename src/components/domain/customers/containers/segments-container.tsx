/**
 * Customer Segments Container
 *
 * Orchestrates data fetching, state management, and actions for customer segments.
 * Handles segment list and analytics tabs.
 * Returns content only; route owns PageLayout per STANDARDS.md.
 *
 * @source segments from useSegments hook
 * @source segmentDetail from useSegmentDetail hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SegmentManager, SegmentBuilder, SegmentAnalytics } from '@/components/domain/customers';
import {
  toastError,
  toastSuccess,
  useConfirmation,
  useDeleteCustomerTag,
  useSegments,
  useSegmentDetail,
} from '@/hooks';

// ============================================================================
// TYPES
// ============================================================================

export interface SegmentsContainerProps {
  /** Initial active tab */
  initialTab?: 'list' | 'analytics';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export function SegmentsContainer({
  initialTab = 'list',
  className,
}: SegmentsContainerProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>(initialTab);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [viewingAnalyticsId, setViewingAnalyticsId] = useState<string | null>(null);
  const confirmation = useConfirmation();
  const deleteSegmentMutation = useDeleteCustomerTag();

  // Fetch segments with stats
  const segments = useSegments({ includeEmpty: false });

  // Fetch analytics for selected segment
  const segmentDetail = useSegmentDetail({
    segmentId: viewingAnalyticsId ?? '',
    enabled: !!viewingAnalyticsId,
  });

  const handleCreateSegment = useCallback(() => {
    setEditingSegmentId(null);
    setIsBuilderOpen(true);
  }, []);

  const handleEditSegment = useCallback((segmentId: string) => {
    setEditingSegmentId(segmentId);
    setIsBuilderOpen(true);
  }, []);

  const handleViewAnalytics = useCallback((segmentId: string) => {
    setViewingAnalyticsId(segmentId);
    setActiveTab('analytics');
  }, []);

  const handleSaveSegment = () => {
    setIsBuilderOpen(false);
    setEditingSegmentId(null);
    // Refetch segments
    segments.refetch();
  };

  const handleDeleteSegment = async (segmentId: string) => {
    const { confirmed } = await confirmation.confirm({
      title: 'Delete segment?',
      description: 'This will remove the tag from all customers and cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      await deleteSegmentMutation.mutateAsync(segmentId);
      toastSuccess('Segment deleted');
      if (viewingAnalyticsId === segmentId) {
        setViewingAnalyticsId(null);
        setActiveTab('list');
      }
      segments.refetch();
    } catch {
      toastError('Failed to delete segment');
    }
  };

  const handleViewCustomers = (segmentId: string) => {
    // Navigate to customers list with segment filter
    navigate({
      to: '/customers',
      search: { tag: segmentId },
    });
  };

  return (
    <div className={className}>
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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
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
                  setViewingAnalyticsId(null);
                  setActiveTab('list');
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
    </div>
  );
}
