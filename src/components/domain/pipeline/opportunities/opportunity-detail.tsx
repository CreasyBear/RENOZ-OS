/**
 * OpportunityDetail Component
 *
 * Tabbed interface showing Overview, Quote, Activities, and Versions for an opportunity.
 * Provides comprehensive opportunity management with customer info, key metrics,
 * activity timeline, and quote version history.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-DETAIL-UI)
 */

import { memo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  TrendingUp,
  FileText,
  MessageSquare,
  History,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDate, formatRelativeTime } from "@/lib/formatters";
import { FormatAmount } from "@/components/shared/format";
import { QuoteBuilderContainer } from "@/components/domain/pipeline/quotes/quote-builder-container";
import type { QuoteVersion } from "@/lib/schemas/pipeline";
// OpportunityStage type only needed if using stage-based styling

// ============================================================================
// TYPES
// ============================================================================

interface OpportunityData {
  id: string;
  title: string;
  description: string | null;
  stage: string;
  probability: number | null;
  value: number;
  weightedValue: number | null;
  expectedCloseDate: Date | string | null;
  actualCloseDate: Date | string | null;
  quoteExpiresAt: Date | string | null;
  quotePdfUrl: string | null;
  lostReason: string | null;
  lostNotes: string | null;
  competitorName: string | null;
  daysInStage: number;
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface CustomerData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  customerCode: string | null;
  type: string | null;
}

interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
}

interface ActivityData {
  id: string;
  type: string;
  description: string;
  outcome: string | null;
  scheduledAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
}

interface QuoteVersionData {
  id: string;
  versionNumber: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  createdAt: Date | string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice?: number;
    unitPriceCents?: number;
    discountPercent?: number;
    total?: number;
    totalCents?: number;
  }>;
}

interface WinLossReasonData {
  id: string;
  name: string;
  type: string;
  description: string | null;
}

export interface OpportunityDetailProps {
  opportunity: OpportunityData;
  customer: CustomerData | null;
  contact: ContactData | null;
  activities: ActivityData[];
  versions: QuoteVersionData[];
  winLossReason: WinLossReasonData | null;
  onRefresh?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const activityTypeIcons: Record<string, typeof MessageSquare> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  follow_up: Clock,
};

const activityTypeLabels: Record<string, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  follow_up: "Follow-up",
};

// ============================================================================
// COMPONENT
// ============================================================================

export const OpportunityDetail = memo(function OpportunityDetail({
  opportunity,
  customer,
  contact,
  activities,
  versions,
  winLossReason,
  onRefresh,
}: OpportunityDetailProps) {
  const isClosedStage = opportunity.stage === "won" || opportunity.stage === "lost";
  const hasQuoteExpiring = opportunity.quoteExpiresAt && new Date(opportunity.quoteExpiresAt) > new Date();
  const isQuoteExpired = opportunity.quoteExpiresAt && new Date(opportunity.quoteExpiresAt) <= new Date();
  const latestVersion = versions[0] ?? null;
  const normalizedLatestVersion = latestVersion
    ? ({
        ...latestVersion,
        items: latestVersion.items.map((item) => {
          const unitPrice = item.unitPrice ?? (item.unitPriceCents ? item.unitPriceCents / 100 : 0);
          const total = item.total ?? (item.totalCents ? item.totalCents / 100 : unitPrice * item.quantity);

          return {
            description: item.description,
            quantity: item.quantity,
            unitPrice,
            discountPercent: item.discountPercent,
            total,
          };
        }),
      } as QuoteVersion)
    : null;

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="quote" className="gap-2">
          <FileText className="h-4 w-4" />
          Quote
          {versions.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {versions.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="activities" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Activities
          {activities.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activities.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="versions" className="gap-2">
          <History className="h-4 w-4" />
          Versions
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Metrics */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Value</p>
                  <p className="text-2xl font-bold"><FormatAmount amount={opportunity.value} /></p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Weighted Value</p>
                  <p className="text-2xl font-bold">
                    <FormatAmount amount={opportunity.weightedValue ?? 0} />
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Probability</p>
                  <p className="text-2xl font-bold">{opportunity.probability ?? 0}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Days in Stage</p>
                  <p className="text-2xl font-bold">{opportunity.daysInStage}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Expected Close</p>
                  <p className="font-medium">
                    {opportunity.expectedCloseDate
                      ? formatDate(opportunity.expectedCloseDate)
                      : "Not set"}
                  </p>
                </div>
                {isClosedStage && opportunity.actualCloseDate && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Actual Close</p>
                    <p className="font-medium">
                      {formatDate(opportunity.actualCloseDate)}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(opportunity.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{formatRelativeTime(opportunity.updatedAt)}</p>
                </div>
              </div>

              {/* Quote Status */}
              {opportunity.quoteExpiresAt && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center gap-2">
                    {isQuoteExpired ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">
                          Quote expired {formatRelativeTime(opportunity.quoteExpiresAt)}
                        </span>
                      </>
                    ) : hasQuoteExpiring ? (
                      <>
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-600">
                          Quote expires {formatRelativeTime(opportunity.quoteExpiresAt)}
                        </span>
                      </>
                    ) : null}
                  </div>
                </>
              )}

              {/* Win/Loss Reason */}
              {isClosedStage && (winLossReason || opportunity.lostNotes) && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {opportunity.stage === "won" ? "Win Reason" : "Loss Reason"}
                    </p>
                    {winLossReason && (
                      <Badge
                        className={cn(
                          opportunity.stage === "won"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        )}
                      >
                        {winLossReason.name}
                      </Badge>
                    )}
                    {opportunity.lostNotes && (
                      <p className="text-sm text-muted-foreground">{opportunity.lostNotes}</p>
                    )}
                    {opportunity.competitorName && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Competitor:</span>{" "}
                        {opportunity.competitorName}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer ? (
                <>
                  <div>
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: customer.id }}
                      search={{}}
                      className="font-medium hover:underline"
                    >
                      {customer.name}
                    </Link>
                    {customer.customerCode && (
                      <p className="text-sm text-muted-foreground">{customer.customerCode}</p>
                    )}
                    {customer.type && (
                      <Badge variant="outline" className="mt-1">
                        {customer.type}
                      </Badge>
                    )}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${customer.email}`} className="hover:underline">
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${customer.phone}`} className="hover:underline">
                        {customer.phone}
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No customer assigned</p>
              )}

              {contact && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      <User className="h-4 w-4 inline mr-1" />
                      Primary Contact
                    </p>
                    <p className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </p>
                    {contact.jobTitle && (
                      <p className="text-sm text-muted-foreground">{contact.jobTitle}</p>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${contact.email}`} className="hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${contact.phone}`} className="hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {opportunity.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{opportunity.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {opportunity.tags && opportunity.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {opportunity.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Quote Tab */}
      <TabsContent value="quote" className="space-y-6">
        <QuoteBuilderContainer
          opportunityId={opportunity.id}
          currentVersion={normalizedLatestVersion}
          onSave={() => onRefresh?.()}
        />
      </TabsContent>

      {/* Activities Tab */}
      <TabsContent value="activities" className="space-y-6">
        {activities.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                {activities.length} activities logged
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const Icon = activityTypeIcons[activity.type] ?? MessageSquare;
                  const isCompleted = !!activity.completedAt;

                  return (
                    <div
                      key={activity.id}
                      className={cn(
                        "flex gap-4 pb-4",
                        index < activities.length - 1 && "border-b"
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                          isCompleted ? "bg-green-100" : "bg-muted"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5",
                            isCompleted ? "text-green-600" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              {activityTypeLabels[activity.type] ?? activity.type}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {activity.description}
                            </p>
                            {activity.outcome && (
                              <p className="text-sm mt-2">
                                <span className="font-medium">Outcome:</span> {activity.outcome}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(activity.createdAt)}
                          </div>
                        </div>
                        {activity.scheduledAt && !activity.completedAt && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-yellow-600">
                            <Clock className="h-3 w-3" />
                            Scheduled for {formatDate(activity.scheduledAt)}
                          </div>
                        )}
                        {activity.completedAt && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed {formatRelativeTime(activity.completedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No activities logged yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Log calls, emails, meetings, and notes here
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Versions Tab */}
      <TabsContent value="versions" className="space-y-6">
        {versions.length > 0 ? (
          <div className="space-y-4">
            {versions.map((version) => (
              <Card key={version.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Version {version.versionNumber}
                      </CardTitle>
                      <CardDescription>
                        Created {formatDate(version.createdAt)}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold"><FormatAmount amount={version.total} /></p>
                      <p className="text-sm text-muted-foreground">
                        {version.items.length} item{version.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                {version.notes && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">{version.notes}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No quote versions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Quote versions will appear here when created
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
});

export default OpportunityDetail;
