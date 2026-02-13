/**
 * Inbox Email Accounts Settings Page
 *
 * Extracted for code-splitting - see inbox-accounts.tsx for route definition.
 */
import { InboxEmailAccountsSettings } from "@/components/domain/communications/inbox/inbox-email-accounts-settings";

export default function InboxEmailAccountsSettingsPage() {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Email Account Connections</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Connect external email accounts to sync emails into your unified inbox
      </p>
      <div className="max-w-4xl space-y-6">
        <InboxEmailAccountsSettings />
      </div>
    </>
  );
}
