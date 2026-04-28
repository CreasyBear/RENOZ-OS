/**
 * Communications Navigation Component
 *
 * Tab navigation for communications domain sections.
 * Rendered by the communications parent route for all child sections.
 */
import { Link, useLocation } from "@tanstack/react-router";
import { Mail, Phone, FileText, PenTool, Settings, History, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

// Navigation items
const navItems = [
  {
    to: "/communications/inbox",
    label: "Inbox",
    icon: Inbox,
    description: "Unified inbox for all emails",
  },
  {
    to: "/communications/campaigns",
    label: "Campaigns",
    icon: Mail,
    description: "Email campaigns",
  },
  {
    to: "/communications/emails",
    label: "Scheduled Emails",
    icon: History,
    description: "Upcoming and scheduled sends",
  },
  {
    to: "/communications/emails/history",
    label: "Email History",
    icon: History,
    description: "Delivery and engagement log",
  },
  {
    to: "/communications/calls",
    label: "Scheduled Calls",
    icon: Phone,
    description: "Follow-up calls",
  },
  {
    to: "/communications/emails/templates",
    label: "Templates",
    icon: FileText,
    description: "Email templates",
  },
  {
    to: "/communications/signatures",
    label: "Signatures",
    icon: PenTool,
    description: "Email signatures",
  },
  {
    to: "/communications/settings/inbox-accounts",
    label: "Email Accounts",
    icon: Settings,
    description: "Connect external email accounts",
  },
  {
    to: "/communications/settings/preferences",
    label: "Settings",
    icon: Settings,
    description: "Communication preferences",
  },
] as const;

export function CommunicationsNav() {
  const location = useLocation();
  const sortedItems = [...navItems].sort((a, b) => b.to.length - a.to.length);
  const activePath =
    sortedItems.find((item) =>
      location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
    )?.to ?? null;

  return (
    <nav className="border-b mb-6" aria-label="Communications sections">
      <div className="flex gap-1 -mb-px">
        {navItems.map((item) => {
          const isActive = activePath === item.to;
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/25"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
