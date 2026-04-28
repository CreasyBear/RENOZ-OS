import { and, eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { getEmailFrom, getEmailFromName, getResendApiKey } from '@/lib/email/config';
import { getSampleTemplateData } from '@/lib/communications/template-utils';
import { renderOutboundEmail } from '@/lib/server/outbound-email';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { logger } from '@/lib/logger';
import { emailCampaigns, emailHistory, type CampaignTemplateData, type NewEmailHistory } from 'drizzle/schema/communications';
import type { TestSendCampaignInput } from '@/lib/schemas/communications';

export async function sendCampaignTestEmail(
  ctx: SessionContext,
  data: TestSendCampaignInput
) {
    // Verify campaign exists
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(
        and(
          eq(emailCampaigns.id, data.campaignId),
          eq(emailCampaigns.organizationId, ctx.organizationId),
        ),
      )
      .limit(1)
    if (!campaign) {
      throw new NotFoundError('Campaign not found', 'campaign')
    }

    // Get Resend API key (throws ServerError if not configured)
    const resendApiKey = getResendApiKey();

    const campaignData = (campaign.templateData ?? {}) as CampaignTemplateData;
    const campaignVariables = (campaignData.variables ?? {}) as Record<
      string,
      string | number | boolean
    >;

    // Build variables: start with sample data, overlay campaign variables
    const sampleData = getSampleTemplateData();
    const variables: Record<string, string | number | boolean> = {
      first_name: 'Test',
      email: data.testEmail,
      company_name: sampleData.company.name,
      sender_name: ctx.user.name || 'Renoz Team',
      ...campaignVariables,
    };

    const rendered = await renderOutboundEmail({
      organizationId: ctx.organizationId,
      templateType: campaign.templateType,
      templateData:
        (campaign.templateData as Record<string, unknown> | null) ?? {},
      subject: campaignData.subjectOverride ?? null,
      variables,
      userId: ctx.user.id,
      testPrefix: '[TEST] ',
    });

    // Get sender email from config
    const fromEmail = getEmailFrom();
    const fromName = getEmailFromName();
    const fromAddress = `${fromName} <${fromEmail}>`;

    // Create email history record
    const [emailRecord] = await db
      .insert(emailHistory)
      .values({
        organizationId: campaign.organizationId,
        senderId: ctx.user.id,
        fromAddress,
        toAddress: data.testEmail,
        subject: rendered.subject,
        bodyHtml: rendered.bodyHtml,
        bodyText: rendered.bodyText,
        status: 'pending',
        campaignId: campaign.id,
        templateId: rendered.templateId,
        metadata: {
          previewText: rendered.previewText ?? undefined,
          priority: rendered.priority ?? undefined,
          replyTo: rendered.replyTo ?? undefined,
          templateId: rendered.templateId ?? undefined,
          templateVersion: rendered.templateVersion ?? undefined,
        },
      } as NewEmailHistory)
      .returning();

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: [data.testEmail],
      subject: rendered.subject,
      html: rendered.bodyHtml,
      text: rendered.bodyText,
      ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
    });

    if (sendError) {
      // Update email history with failure
      await db
        .update(emailHistory)
        .set({ status: 'failed' })
        .where(eq(emailHistory.id, emailRecord.id));

      throw new Error(`Failed to send test email: ${sendError.message}`);
    }

    // Update email history with success and Resend message ID
    await db
      .update(emailHistory)
      .set({
        status: 'sent',
        sentAt: new Date(),
        resendMessageId: sendResult?.id,
      })
      .where(eq(emailHistory.id, emailRecord.id));

    logger.info('Test email sent successfully', {
      domain: 'communications',
      campaignId: campaign.id,
      testEmail: data.testEmail,
      emailHistoryId: emailRecord.id,
      resendMessageId: sendResult?.id,
    });

    // Activity logging
    const activityLogger = createActivityLoggerWithContext(ctx)
    await activityLogger.logAsync({
      entityType: 'email',
      entityId: campaign.id,
      action: 'updated',
      description: `Sent test email for campaign: ${campaign.name} to ${data.testEmail}`,
      metadata: {
        campaignName: campaign.name,
        recipientEmail: data.testEmail,
        emailId: emailRecord.id,
      },
    })
    return { 
      success: true, 
      testEmail: data.testEmail,
      messageId: sendResult?.id,
      emailHistoryId: emailRecord.id,
    }
}
