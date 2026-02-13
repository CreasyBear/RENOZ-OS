/**
 * Contact Cell Component
 *
 * Displays email and phone contact information with icons.
 * Features smooth transitions, hover effects, and accessibility support.
 *
 * @example
 * ```tsx
 * <ContactCell email="user@example.com" phone="+1234567890" />
 * ```
 */

import { memo } from "react";
import { Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";

export interface ContactCellProps {
  /** Email address */
  email?: string | null;
  /** Phone number */
  phone?: string | null;
  /** Additional className */
  className?: string;
}

export const ContactCell = memo(function ContactCell({
  email,
  phone,
  className,
}: ContactCellProps) {
  if (!email && !phone) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className={cn("flex flex-col gap-1.5 text-sm", className)}>
      {email && (
        <a
          href={`mailto:${email}`}
          className={cn(
            "group flex items-center gap-1.5",
            "text-muted-foreground hover:text-foreground",
            "transition-colors duration-200 ease-in-out",
            "rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5",
            "hover:bg-accent/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "active:bg-accent"
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Send email to ${email}`}
        >
          <Mail className="h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
          <TruncateTooltip text={email} maxLength={20} maxWidth="max-w-[120px]" />
        </a>
      )}
      {phone && (
        <a
          href={`tel:${phone}`}
          className={cn(
            "group flex items-center gap-1.5",
            "text-muted-foreground hover:text-foreground",
            "transition-colors duration-200 ease-in-out",
            "rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5",
            "hover:bg-accent/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "active:bg-accent"
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Call ${phone}`}
        >
          <Phone className="h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:text-emerald-500 dark:group-hover:text-emerald-400" />
          <span className="tabular-nums">{phone}</span>
        </a>
      )}
    </div>
  );
});

ContactCell.displayName = "ContactCell";
