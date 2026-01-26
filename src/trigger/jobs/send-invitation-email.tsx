/**
 * Send Invitation Email Job
 *
 * Background job to send user invitation emails.
 * Uses fire-and-forget pattern to not block invitation creation.
 *
 * @see https://trigger.dev/docs/documentation/guides/create-a-job
 */
import { eventTrigger } from '@trigger.dev/sdk'
import { Resend } from 'resend'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { emailHistory, type NewEmailHistory } from 'drizzle/schema'
import { renderEmail } from '@/lib/email/render'
import { InvitationEmail } from '@/lib/email/templates/users'
import {
  client,
  userEvents,
  type InvitationSentPayload,
  type BatchInvitationSentPayload,
} from '../client'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// ============================================================================
// EMAIL CONFIGURATION
// ============================================================================

/**
 * Get sender email configuration from environment.
 */
function getSenderConfig() {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@resend.dev'
  const fromName = process.env.EMAIL_FROM_NAME || 'Renoz'
  return {
    fromEmail,
    fromName,
    fromAddress: `${fromName} <${fromEmail}>`,
  }
}

// ============================================================================
// SEND SINGLE INVITATION EMAIL JOB
// ============================================================================

export const sendInvitationEmailJob = client.defineJob({
  id: 'send-invitation-email',
  name: 'Send Invitation Email',
  version: '1.0.0',
  trigger: eventTrigger({
    name: userEvents.invitationSent,
  }),
  run: async (payload: InvitationSentPayload, io) => {
    const {
      invitationId,
      email,
      organizationId,
      organizationName,
      inviterName,
      inviterEmail,
      role,
      personalMessage,
      acceptUrl,
      expiresAt,
    } = payload

    await io.logger.info('Sending invitation email', {
      invitationId,
      email,
      organizationName,
      role,
    })

    // Step 1: Render email template
    const emailContent = await io.runTask('render-email', async () => {
      const { html, text } = await renderEmail(
        <InvitationEmail
          email={email}
          inviterName={inviterName}
          inviterEmail={inviterEmail}
          organizationName={organizationName}
          role={role}
          acceptUrl={acceptUrl}
          personalMessage={personalMessage}
          expiresAt={new Date(expiresAt)}
        />
      )
      return { html, text }
    })

    // Step 2: Create email history, send via Resend, and update status
    const emailResult = await io.runTask('send-email', async () => {
      const senderConfig = getSenderConfig()
      const subject = `You're invited to join ${organizationName}`

      // Create email history record
      const [emailRecord] = await db
        .insert(emailHistory)
        .values({
          organizationId,
          fromAddress: senderConfig.fromAddress,
          toAddress: email,
          subject,
          bodyHtml: emailContent.html,
          bodyText: emailContent.text,
          status: 'pending',
        } as NewEmailHistory)
        .returning()

      // Send email via Resend
      const { data: sendResult, error } = await resend.emails.send({
        from: senderConfig.fromAddress,
        to: [email],
        subject,
        html: emailContent.html,
        text: emailContent.text,
      })

      if (error) {
        // Update email history with failure
        await db
          .update(emailHistory)
          .set({ status: 'failed' })
          .where(eq(emailHistory.id, emailRecord.id))

        throw new Error(`Failed to send invitation email: ${error.message}`)
      }

      // Update email history with success and Resend message ID
      await db
        .update(emailHistory)
        .set({
          status: 'sent',
          sentAt: new Date(),
          resendMessageId: sendResult?.id,
        })
        .where(eq(emailHistory.id, emailRecord.id))

      return {
        success: true,
        messageId: sendResult?.id || null,
        emailHistoryId: emailRecord.id,
      }
    })

    await io.logger.info(`Invitation email sent (resendMessageId: ${emailResult.messageId})`, {
      to: email,
      emailHistoryId: emailResult.emailHistoryId,
    })

    return {
      success: true,
      invitationId,
      email,
      emailSent: emailResult.success,
      messageId: emailResult.messageId,
      emailHistoryId: emailResult.emailHistoryId,
    }
  },
})

// ============================================================================
// SEND BATCH INVITATION EMAILS JOB
// ============================================================================

export const sendBatchInvitationEmailsJob = client.defineJob({
  id: 'send-batch-invitation-emails',
  name: 'Send Batch Invitation Emails',
  version: '1.0.0',
  trigger: eventTrigger({
    name: 'user.batch_invitation_sent',
  }),
  run: async (payload: BatchInvitationSentPayload, io) => {
    const {
      organizationId,
      organizationName,
      inviterName,
      inviterEmail,
      invitations,
    } = payload

    await io.logger.info('Sending batch invitation emails', {
      organizationName,
      count: invitations.length,
    })

    const results: Array<{
      email: string
      invitationId: string
      success: boolean
      messageId?: string | null
      error?: string
    }> = []

    // Process each invitation
    for (const invitation of invitations) {
      try {
        // Render email template
        const { html, text } = await renderEmail(
          <InvitationEmail
            email={invitation.email}
            inviterName={inviterName}
            inviterEmail={inviterEmail}
            organizationName={organizationName}
            role={invitation.role}
            acceptUrl={invitation.acceptUrl}
            personalMessage={invitation.personalMessage}
            expiresAt={new Date(invitation.expiresAt)}
          />
        )

        const senderConfig = getSenderConfig()
        const subject = `You're invited to join ${organizationName}`

        // Create email history record
        const [emailRecord] = await db
          .insert(emailHistory)
          .values({
            organizationId,
            fromAddress: senderConfig.fromAddress,
            toAddress: invitation.email,
            subject,
            bodyHtml: html,
            bodyText: text,
            status: 'pending',
          } as NewEmailHistory)
          .returning()

        // Send email via Resend
        const { data: sendResult, error } = await resend.emails.send({
          from: senderConfig.fromAddress,
          to: [invitation.email],
          subject,
          html,
          text,
        })

        if (error) {
          // Update email history with failure
          await db
            .update(emailHistory)
            .set({ status: 'failed' })
            .where(eq(emailHistory.id, emailRecord.id))

          results.push({
            email: invitation.email,
            invitationId: invitation.invitationId,
            success: false,
            error: error.message,
          })

          await io.logger.warn(`Failed to send invitation to ${invitation.email}: ${error.message}`)
        } else {
          // Update email history with success
          await db
            .update(emailHistory)
            .set({
              status: 'sent',
              sentAt: new Date(),
              resendMessageId: sendResult?.id,
            })
            .where(eq(emailHistory.id, emailRecord.id))

          results.push({
            email: invitation.email,
            invitationId: invitation.invitationId,
            success: true,
            messageId: sendResult?.id,
          })

          await io.logger.info(`Invitation sent to ${invitation.email} (resendMessageId: ${sendResult?.id})`)
        }
      } catch (err) {
        results.push({
          email: invitation.email,
          invitationId: invitation.invitationId,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })

        await io.logger.error(`Error sending invitation to ${invitation.email}: ${err}`)
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    await io.logger.info(`Batch invitation complete: ${successCount} sent, ${failedCount} failed`)

    return {
      success: successCount > 0,
      totalSent: successCount,
      totalFailed: failedCount,
      results,
    }
  },
})
