/**
 * Communication Preferences Settings Page
 *
 * Extracted for code-splitting - see preferences.tsx for route definition.
 */
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Info } from "lucide-react";

export default function PreferencesSettingsPage() {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Settings className="h-6 w-6" />
        Communication Preferences
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Manage communication preference settings and view audit history
      </p>
      <div className="max-w-4xl space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              About Communication Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Communication preferences control whether contacts can receive email and SMS
              communications from your organization. All preference changes are logged for
              compliance and audit purposes.
            </p>
            <p>
              To manage preferences for a specific contact, navigate to their profile page
              in the Customers section. The preference history is shown on a per-contact basis.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
