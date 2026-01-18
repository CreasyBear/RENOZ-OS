/**
 * Opportunity Detail Route
 *
 * Complete opportunity management interface with tabs for Overview, Quote,
 * Activities, and Versions. Supports inline editing, stage management,
 * and quick actions (Send Quote, Mark Won/Lost, Convert to Order).
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-DETAIL-UI)
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, MoreHorizontal, Send, Trophy, XCircle, ArrowRight } from "lucide-react";
import { useState } from "react";
import { PageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import { OpportunityDetail } from "@/components/domain/pipeline/opportunity-detail";
import { OpportunityForm } from "@/components/domain/pipeline/opportunity-form";
import { WonLostDialog } from "@/components/domain/pipeline";
import {
  getOpportunity,
  updateOpportunity,
  updateOpportunityStage,
  deleteOpportunity,
} from "@/server/functions/pipeline";
import { FormatAmount } from "@/components/shared/format";
import type { OpportunityStage, UpdateOpportunity, Opportunity } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

interface GetOpportunityResponse {
  opportunity: Opportunity;
  customer: { id: string; name: string; email: string | null; phone: string | null; customerCode: string | null; type: string | null } | null;
  contact: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; jobTitle: string | null } | null;
  activities: Array<{ id: string; type: string; description: string; outcome: string | null; scheduledAt: string | null; completedAt: string | null; createdAt: string }>;
  versions: Array<{ id: string; versionNumber: number; subtotal: number; taxAmount: number; total: number; notes: string | null; createdAt: string; items: Array<{ description: string; quantity: number; unitPriceCents: number; discountPercent?: number; totalCents: number }> }>;
  winLossReason: { id: string; name: string; type: string; description: string | null } | null;
}

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId")({
  component: OpportunityDetailPage,
});

// ============================================================================
// STAGE BADGE STYLING
// ============================================================================

const stageBadgeVariants: Record<OpportunityStage, "default" | "secondary" | "outline" | "destructive"> = {
  new: "secondary",
  qualified: "secondary",
  proposal: "default",
  negotiation: "default",
  won: "default",
  lost: "destructive",
};

const stageLabels: Record<OpportunityStage, string> = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function OpportunityDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { opportunityId } = Route.useParams();

  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [wonLostDialog, setWonLostDialog] = useState<{
    open: boolean;
    stage: "won" | "lost" | null;
  }>({ open: false, stage: null });

  // Fetch opportunity with all related data
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<GetOpportunityResponse>({
    queryKey: ["opportunity", opportunityId],
    queryFn: async () => {
      const result = await getOpportunity({ data: { id: opportunityId } });
      return result as GetOpportunityResponse;
    },
  });

  // Update opportunity mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: UpdateOpportunity) => {
      return updateOpportunity({
        data: { id: opportunityId, ...updates },
      });
    },
    onSuccess: () => {
      toastSuccess("Opportunity updated successfully.");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: () => {
      toastError("Failed to update opportunity. Please try again.");
    },
  });

  // Stage change mutation
  const stageChangeMutation = useMutation({
    mutationFn: async ({
      stage,
      reason,
    }: {
      stage: OpportunityStage;
      reason?: { winLossReasonId?: string; lostNotes?: string; competitorName?: string };
    }) => {
      return updateOpportunityStage({
        data: {
          id: opportunityId,
          stage,
          ...reason,
        },
      });
    },
    onSuccess: () => {
      toastSuccess("Stage updated successfully.");
      setWonLostDialog({ open: false, stage: null });
      queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-metrics"] });
    },
    onError: () => {
      toastError("Failed to update stage. Please try again.");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return deleteOpportunity({ data: { id: opportunityId } });
    },
    onSuccess: () => {
      toastSuccess("Opportunity deleted.");
      navigate({ to: "/pipeline" });
    },
    onError: () => {
      toastError("Failed to delete opportunity. Please try again.");
    },
  });

  // Handle stage change from Won/Lost dialog
  const handleWonLostConfirm = async (
    stage: "won" | "lost",
    reason?: { winLossReasonId?: string; lostNotes?: string; competitorName?: string }
  ) => {
    await stageChangeMutation.mutateAsync({ stage, reason });
  };

  // Loading state
  if (isLoading) {
    return (
      <PageLayout>
        <PageLayout.Header title="Loading..." />
        <PageLayout.Content>
          <div className="space-y-6">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <PageLayout>
        <PageLayout.Header title="Opportunity Not Found" />
        <PageLayout.Content>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              The opportunity you're looking for doesn't exist or you don't have access.
            </p>
            <Button variant="outline" onClick={() => navigate({ to: "/pipeline" })}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pipeline
            </Button>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  const { opportunity, customer, contact, activities, versions, winLossReason } = data;
  const isClosedStage = opportunity.stage === "won" || opportunity.stage === "lost";

  return (
    <>
      <PageLayout>
        <PageLayout.Header
          title={opportunity.title}
          description={
            <div className="flex items-center gap-3">
              <Badge variant={stageBadgeVariants[opportunity.stage as OpportunityStage]}>
                {stageLabels[opportunity.stage as OpportunityStage]}
              </Badge>
              <span className="text-muted-foreground">
                {customer?.name ?? "Unknown Customer"}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium">
                <FormatAmount amount={opportunity.value} />
              </span>
              {opportunity.probability !== null && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {opportunity.probability}% probability
                  </span>
                </>
              )}
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate({ to: "/pipeline" })}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {!isClosedStage && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    disabled={isEditing}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      // TODO: Implement quote sending
                      toastError("Quote sending not yet implemented");
                    }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send Quote
                  </Button>
                </>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isClosedStage && (
                    <>
                      <DropdownMenuItem onClick={() => setWonLostDialog({ open: true, stage: "won" })}>
                        <Trophy className="mr-2 h-4 w-4 text-green-600" />
                        Mark as Won
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setWonLostDialog({ open: true, stage: "lost" })}>
                        <XCircle className="mr-2 h-4 w-4 text-red-600" />
                        Mark as Lost
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          // TODO: Implement convert to order
                          toastError("Convert to order not yet implemented");
                        }}
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Convert to Order
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this opportunity?")) {
                        deleteMutation.mutate();
                      }
                    }}
                  >
                    Delete Opportunity
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />
        <PageLayout.Content>
          {isEditing ? (
            <OpportunityForm
              opportunity={opportunity}
              customer={customer}
              contact={contact}
              onSave={(updates) => updateMutation.mutate(updates as UpdateOpportunity)}
              onCancel={() => setIsEditing(false)}
              isLoading={updateMutation.isPending}
            />
          ) : (
            <OpportunityDetail
              opportunity={opportunity}
              customer={customer}
              contact={contact}
              activities={activities}
              versions={versions}
              winLossReason={winLossReason}
              onRefresh={refetch}
            />
          )}
        </PageLayout.Content>
      </PageLayout>

      {/* Won/Lost Dialog */}
      <WonLostDialog
        open={wonLostDialog.open}
        type={wonLostDialog.stage ?? "won"}
        opportunity={data?.opportunity ? { ...data.opportunity, expectedCloseDate: data.opportunity.expectedCloseDate ? new Date(data.opportunity.expectedCloseDate) : null, actualCloseDate: data.opportunity.actualCloseDate ? new Date(data.opportunity.actualCloseDate) : null, quoteExpiresAt: data.opportunity.quoteExpiresAt ? new Date(data.opportunity.quoteExpiresAt) : null, createdAt: new Date(data.opportunity.createdAt), updatedAt: new Date(data.opportunity.updatedAt), deletedAt: data.opportunity.deletedAt ? new Date(data.opportunity.deletedAt) : null } : null}
        onConfirm={(reason) => handleWonLostConfirm(wonLostDialog.stage ?? "won", reason)}
        onCancel={() => setWonLostDialog({ open: false, stage: null })}
      />
    </>
  );
}
