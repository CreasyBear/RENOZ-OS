import type { ElementType } from 'react';
import { Boxes, CheckCircle2, Circle, Link as LinkIcon, Truck } from 'lucide-react';

import type { BomItemStatus } from '@/lib/schemas/jobs';

export const PROJECT_BOM_ITEM_STATUS_CONFIG: Record<BomItemStatus, {
  label: string;
  icon: ElementType;
  color: string;
  bg: string;
  description: string;
}> = {
  planned: {
    label: 'Planned',
    icon: Circle,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    description: 'Item estimated but not yet ordered',
  },
  ordered: {
    label: 'Ordered',
    icon: Truck,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    description: 'Purchase order placed',
  },
  received: {
    label: 'Received',
    icon: Boxes,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    description: 'Item in warehouse/yard',
  },
  allocated: {
    label: 'Allocated',
    icon: LinkIcon,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    description: 'Reserved for this project',
  },
  installed: {
    label: 'Installed',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-100',
    description: 'Installed on site',
  },
};
