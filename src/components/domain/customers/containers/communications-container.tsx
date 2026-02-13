/**
 * Customer Communications Container
 *
 * Orchestrates data fetching, state management, and actions for customer communications.
 * Handles timeline, templates, and campaigns tabs.
 *
 * @source communications from useCustomerCommunications hook
 * @source templates from useTemplates hook
 * @source campaigns from useCampaigns hook
 * @source segments from useSegments hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useState, useCallback, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { MessageSquare } from 'lucide-react';
import { z } from 'zod';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CommunicationTimeline,
  CommunicationTemplates,
  BulkCommunications,
} from '@/components/domain/customers';
import { EntityActivityLogger } from '@/components/shared/activity';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { ScheduleEmailDialog } from '@/components/domain/communications/emails/schedule-email-dialog';
import {
  useCustomerCommunications,
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useCampaigns,
  useCreateCampaign,
} from '@/hooks/communications';
import { logger } from '@/lib/logger';
import { useSegments } from '@/hooks/customers';
import { toast } from '@/lib/toast';
import { getUserFriendlyMessage } from '@/lib/error-handling';
import { templateInputSchema, campaignInputSchema } from '@/lib/schemas/communications';

// ============================================================================
// TYPES
// ============================================================================

export interface CommunicationsContainerProps {
  /** Optional customer ID to filter timeline */
  customerId?: string;
  /** Initial active tab */
  initialTab?: 'timeline' | 'templates' | 'campaigns';
  /** Additional CSS classes */
  className?: string;
}

// Template types for component compatibility
type TemplateCategory = 'welcome' | 'follow_up' | 'complaint_resolution' | 'upsell' | 'reactivation' | 'general';
type TemplateType = 'email' | 'sms' | 'note';

interface ComponentTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  type: TemplateType;
  subject?: string;
  body: string;
  variables: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

type AudienceType = 'segment' | 'filter' | 'all';
type ScheduleType = 'now' | 'scheduled';
type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

interface ComponentCampaign {
  id: string;
  name: string;
  audienceType: AudienceType;
  audienceCount: number;
  templateId: string;
  scheduleType: ScheduleType;
  scheduledAt?: string;
  status: CampaignStatus;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  createdAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map API template category to component category format
 */
function mapTemplateCategory(apiCategory: string): TemplateCategory {
  const categoryMap: Record<string, TemplateCategory> = {
    'welcome': 'welcome',
    'follow_up': 'follow_up',
    'quotes': 'follow_up',
    'orders': 'general',
    'installations': 'general',
    'warranty': 'complaint_resolution',
    'support': 'complaint_resolution',
    'marketing': 'upsell',
    'custom': 'general',
  };
  return categoryMap[apiCategory] || 'general';
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
  };
  return categoryMap[category] || 'custom';
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export function CommunicationsContainer({
  customerId,
  initialTab = 'timeline',
  className,
}: CommunicationsContainerProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'templates' | 'campaigns'>(initialTab);

  // Activity logging (entity-centric, same as Customer Detail)
  const { openWithType, loggerProps: activityLoggerProps } = useEntityActivityLogging({
    entityType: 'customer',
    entityId: customerId || '',
    entityLabel: `Customer`,
  });

  // Dialog state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ComponentTemplate | null>(null);

  // ============================================================================
  // DATA FETCHING - Timeline Tab
  // ============================================================================
  const {
    data: communicationsData,
    isLoading: isLoadingCommunications,
  } = useCustomerCommunications({
    customerId: customerId || '',
    enabled: !!customerId && activeTab === 'timeline',
  });

  const communications = communicationsData?.communications || [];

  // ============================================================================
  // DATA FETCHING - Templates Tab
  // ============================================================================
  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
  } = useTemplates({
    enabled: activeTab === 'templates',
  });

  // Map API templates to component format (memoized to prevent unnecessary re-renders)
  const templates: ComponentTemplate[] = useMemo(() => {
    return (templatesData || []).map(t => ({
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
    }));
  }, [templatesData]);

  // ============================================================================
  // DATA FETCHING - Campaigns Tab
  // ============================================================================
  const {
    data: campaignsData,
    isLoading: isLoadingCampaigns,
  } = useCampaigns({
    enabled: activeTab === 'campaigns',
  });

  // ============================================================================
  // DATA FETCHING - Segments (for campaign audience selection)
  // ============================================================================
  const {
    data: segmentsData,
    isLoading: isLoadingSegments,
  } = useSegments({
    enabled: activeTab === 'campaigns',
  });

  // Map API segments to component format (memoized to prevent unnecessary re-renders)
  const segments = useMemo(() => {
    return (segmentsData?.segments || []).map(s => ({
      id: s.id,
      name: s.name,
      customerCount: s.customerCount,
    }));
  }, [segmentsData]);

  // Map API campaigns to component format (memoized to prevent unnecessary re-renders)
  const campaigns: ComponentCampaign[] = useMemo(() => {
    const items = (campaignsData as { items?: Array<{ id: string; name: string; scheduledAt?: Date; status: string; createdAt: Date }> } | undefined)?.items ?? [];
    return items.map((c) => ({
      id: c.id,
      name: c.name,
      audienceType: 'segment' as AudienceType,
      audienceCount: 0,
      templateId: '',
      scheduleType: (c.scheduledAt ? 'scheduled' : 'now') as ScheduleType,
      scheduledAt: c.scheduledAt?.toISOString(),
      status: c.status as CampaignStatus,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      createdAt: c.createdAt.toISOString(),
    }));
  }, [campaignsData]);

  // ============================================================================
  // MUTATIONS - Templates
  // ============================================================================
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  // ============================================================================
  // MUTATIONS - Campaigns
  // ============================================================================
  const createCampaign = useCreateCampaign();

  // ============================================================================
  // HANDLERS - Timeline Tab
  // ============================================================================
  const handleLogCommunication = useCallback((type: string) => {
    const mapped = type === 'phone' ? 'call' : type === 'meeting' ? 'meeting' : 'note';
    openWithType(mapped);
  }, [openWithType]);

  // ============================================================================
  // HANDLERS - Templates Tab
  // ============================================================================
  const handleSaveTemplate = useCallback(async (template: unknown) => {
    try {
      // Validate input with Zod schema
      const validated = templateInputSchema.parse(template);

      // Map component category to API category
      const apiCategory = mapComponentCategoryToApi(validated.category);
      
      // Map variables to API format
      const apiVariables = validated.variables.map((name) => ({
        name,
        description: `Variable: ${name}`,
        defaultValue: '',
        type: 'text' as const,
      }));

      if (validated.id) {
        await updateTemplate.mutateAsync({
          id: validated.id,
          name: validated.name,
          category: apiCategory,
          subject: validated.subject || '',
          bodyHtml: validated.body,
          variables: apiVariables,
          createVersion: false,
        });
        toast.success('Template updated successfully');
      } else {
        await createTemplate.mutateAsync({
          name: validated.name,
          category: apiCategory,
          subject: validated.subject || '',
          bodyHtml: validated.body,
          variables: apiVariables,
        });
        toast.success('Template created successfully');
      }
    } catch (error) {
      logger.error('Failed to save template', error);
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        toast.error(`Invalid template data: ${errorMessages}`);
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to save template');
      }
    }
  }, [createTemplate, updateTemplate]);

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    try {
      await deleteTemplate.mutateAsync({ id: templateId });
      toast.success('Template deleted successfully');
    } catch (error) {
      toast.error('Failed to delete template', {
        description: getUserFriendlyMessage(error as Error),
      });
    }
  }, [deleteTemplate]);

  const handleUseTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setScheduleOpen(true);
    }
  }, [templates]);

  const handleScheduleClose = useCallback((open: boolean) => {
    setScheduleOpen(open);
    if (!open) {
      setSelectedTemplate(null);
    }
  }, []);

  // ============================================================================
  // HANDLERS - Campaigns Tab
  // ============================================================================
  const handleSendCampaign = useCallback(async (campaign: unknown) => {
    try {
      // Validate input with Zod schema
      const validated = campaignInputSchema.parse(campaign);

      await createCampaign.mutateAsync({
        name: validated.name,
        description: validated.description,
        templateType: 'custom',
        templateData: {},
        recipientCriteria: {},
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : undefined,
      });
      toast.success('Campaign created successfully');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        toast.error('Invalid campaign data', {
          description: errorMessages,
        });
      } else {
        toast.error('Failed to create campaign', {
          description: getUserFriendlyMessage(error as Error),
        });
      }
    }
  }, [createCampaign]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-6">
            {customerId ? (
              <CommunicationTimeline
                customerId={customerId}
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
                <Link
                  to="/customers"
                  className={cn(buttonVariants())}
                >
                  Browse Customers
                </Link>
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
        <EntityActivityLogger {...activityLoggerProps} />
        <ScheduleEmailDialog
          open={scheduleOpen}
          onOpenChange={handleScheduleClose}
          defaultCustomerId={customerId}
          defaultTemplate={
            selectedTemplate
              ? {
                  subject: selectedTemplate.subject,
                  body: selectedTemplate.body,
                  templateType: 'custom',
                }
              : undefined
          }
        />
    </div>
  );
}
