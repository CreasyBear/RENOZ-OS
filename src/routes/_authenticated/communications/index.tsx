/**
 * Communications Index Route
 *
 * Route definition for communications hub index content.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/communications.tsx - Parent layout route
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Megaphone, CalendarClock, Inbox, PenLine, Settings } from "lucide-react";
import { RouteErrorFallback } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CommunicationsLayoutSkeleton } from "@/components/skeletons/communications";
import { cn } from "@/lib/utils";

const communicationLinks = [
  {
    title: "Inbox",
    description: "Review inbound, outbound, and scheduled communication in one queue.",
    href: "/communications/inbox",
    icon: Inbox,
  },
  {
    title: "Campaigns",
    description: "Create, pause, resume, and inspect campaign delivery.",
    href: "/communications/campaigns",
    icon: Megaphone,
  },
  {
    title: "Scheduled Emails",
    description: "Edit future sends and inspect failed scheduled delivery.",
    href: "/communications/emails",
    icon: CalendarClock,
  },
  {
    title: "Email History",
    description: "Audit delivered, opened, clicked, bounced, and failed mail.",
    href: "/communications/emails/history",
    icon: Mail,
  },
  {
    title: "Templates",
    description: "Manage reusable content used by sends and campaigns.",
    href: "/communications/emails/templates",
    icon: PenLine,
  },
  {
    title: "Settings",
    description: "Manage inbox accounts, suppression, preferences, and signatures.",
    href: "/communications/settings/inbox-accounts",
    icon: Settings,
  },
] as const;

export const Route = createFileRoute("/_authenticated/communications/")({
  component: CommunicationsIndex,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => <CommunicationsLayoutSkeleton />,
});

function CommunicationsIndex() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {communicationLinks.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.href}>
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{item.title}</CardTitle>
              </div>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                to={item.href}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Open
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
