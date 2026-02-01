/**
 * Detail Section Component
 *
 * Collapsible accordion section for organizing detail view content.
 * Based on Midday reference pattern.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export interface DetailSectionProps {
  /** Unique section identifier */
  id: string;
  /** Section title */
  title: string;
  /** Section content */
  children: React.ReactNode;
  /** Default expanded state */
  defaultOpen?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single collapsible section for detail views.
 *
 * @example
 * ```tsx
 * <DetailSection id="general" title="General Information">
 *   <DetailGrid fields={generalFields} />
 * </DetailSection>
 * ```
 */
export function DetailSection({
  id,
  title,
  children,
  defaultOpen = true,
  className,
}: DetailSectionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? id : undefined}
      className={className}
    >
      <AccordionItem value={id} className="border-none">
        <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
          {title}
        </AccordionTrigger>
        <AccordionContent className="pt-1 pb-4">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export interface DetailSectionsProps {
  /** Array of sections to render */
  sections: {
    id: string;
    title: string;
    content: React.ReactNode;
    defaultOpen?: boolean;
  }[];
  /** Default expanded sections (array of IDs) */
  defaultValue?: string[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Multiple collapsible sections with shared state.
 *
 * @example
 * ```tsx
 * <DetailSections
 *   defaultValue={['general', 'contact']}
 *   sections={[
 *     { id: 'general', title: 'General', content: <GeneralInfo /> },
 *     { id: 'contact', title: 'Contact', content: <ContactInfo /> },
 *     { id: 'notes', title: 'Notes', content: <Notes /> },
 *   ]}
 * />
 * ```
 */
export function DetailSections({
  sections,
  defaultValue,
  className,
}: DetailSectionsProps) {
  const defaultExpanded =
    defaultValue ??
    sections.filter((s) => s.defaultOpen !== false).map((s) => s.id);

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultExpanded}
      className={cn('space-y-2', className)}
    >
      {sections.map((section) => (
        <AccordionItem
          key={section.id}
          value={section.id}
          className="border rounded-lg px-4"
        >
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            {section.title}
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-4">
            {section.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default DetailSection;
