# Communications Domain

## Purpose
The communications domain manages outbound email delivery, inbound inbox sync, and customer communication records.

## Tier 1
- templates
- signatures
- scheduled emails
- campaigns
- email history
- inbox account sync
- inbox view and mailbox actions
- suppression and unsubscribe
- domain verification
- webhook processing
- analytics consistency

## Tier 2
- scheduled calls
- quick log
- customer communication timeline
- communication preferences

## Product Model
- Templates are first-class reusable email assets.
- Signatures are first-class reusable outbound email assets.
- Scheduled emails and campaigns are delivery modes, not separate template systems.
- Inbox is a synced mailbox viewer with local mailbox actions.
- In-app reply and compose are not part of the current production capability.

## Outbound Pipeline
All outbound email modes must share the same rendering and send pipeline:
- resolve template source
- merge variables
- apply overrides
- apply signature
- generate preview text and plain text
- apply unsubscribe and tracking
- create email history
- send via Resend

## Compatibility
Existing campaign and scheduled-email records still store `templateType` plus `templateData`.
The shared outbound pipeline must support that data as compatibility input while also honoring:
- `templateData.templateId`
- `templateData.signatureId`
- `templateData.signatureContent`

The long-term target is one reusable template system for preview, test send, scheduled send, and campaign send.
