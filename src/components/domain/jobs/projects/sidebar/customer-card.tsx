/**
 * Customer Card - Project Sidebar
 *
 * Displays customer information with contact actions.
 * Pure presenter component - receives all data via props.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 4.1 Zone 5B
 * @see docs/design-system/BUTTON-LINK-STANDARDS.md for navigation patterns
 */

import { Link } from '@tanstack/react-router';
import { Mail, Phone, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerCardProps {
  customerId: string;
  customerName: string;
  email?: string | null;
  phone?: string | null;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomerCard({
  customerId,
  customerName,
  email,
  phone,
  className,
}: CustomerCardProps) {
  return (
    <Card className={cn('shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Customer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Customer Name + Link */}
        <Link
          to="/customers/$customerId"
          params={{ customerId }}
          search={{}}
          className="font-medium text-sm hover:underline"
        >
          {customerName}
        </Link>

        {/* Contact Actions */}
        <div className="flex flex-col gap-1.5">
          {phone && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start h-auto py-1 px-2 -ml-2"
              asChild
            >
              <a href={`tel:${phone}`}>
                <Phone className="h-3.5 w-3.5 mr-2 text-muted-foreground" aria-hidden="true" />
                <span className="text-xs">{phone}</span>
              </a>
            </Button>
          )}
          {email && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start h-auto py-1 px-2 -ml-2"
              asChild
            >
              <a href={`mailto:${email}`}>
                <Mail className="h-3.5 w-3.5 mr-2 text-muted-foreground" aria-hidden="true" />
                <span className="text-xs truncate max-w-[180px]">{email}</span>
              </a>
            </Button>
          )}
        </div>

        {/* View Customer Link */}
        <Link
          to="/customers/$customerId"
          params={{ customerId }}
          search={{}}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'w-full mt-2'
          )}
        >
          View Customer
        </Link>
      </CardContent>
    </Card>
  );
}
