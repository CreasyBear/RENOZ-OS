// Server-side campaign helper exports.
//
// Jobs and other server-only code should import shared helpers from here rather
// than importing TanStack ServerFns. ServerFns remain UI/API facades.

export {
  assertCampaignStatus,
  cancelCampaignRecord,
  ensureCampaignHasRecipients,
  getCampaignForAction,
  triggerCampaignPause,
  triggerCampaignSend,
} from '@/server/functions/communications/_shared/campaign-actions'

export {
  buildCampaignRecipientConditions,
} from '@/server/functions/communications/_shared/campaign-recipient-selection'
