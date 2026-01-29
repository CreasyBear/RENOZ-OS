/**
 * Quick Links Card Component
 *
 * Displays quick navigation links for the project.
 * Adapted from reference project patterns.
 *
 * @path src/components/domain/jobs/projects/quick-links-card.tsx
 */

import { ExternalLink, FileText, Calendar, Package, Mail, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface QuickLink {
  label: string;
  href: string;
  icon?: 'document' | 'calendar' | 'asset' | 'external' | 'mail' | 'map';
}

interface QuickLinksCardProps {
  links: QuickLink[];
}

// ============================================================================
// ICON MAP
// ============================================================================

const iconMap = {
  document: FileText,
  calendar: Calendar,
  asset: Package,
  external: ExternalLink,
  mail: Mail,
  map: MapPin,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function QuickLinksCard({ links }: QuickLinksCardProps) {
  if (!links || links.length === 0) return null;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Quick Links</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {links.map((link, index) => {
            const Icon = link.icon ? iconMap[link.icon] : ExternalLink;
            return (
              <li key={index}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{link.label}</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                </a>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
