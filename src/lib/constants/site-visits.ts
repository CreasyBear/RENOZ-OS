/**
 * Site Visit Constants
 *
 * Shared config for visit types and labels.
 * Per SCHEMA-TRACE: avoid duplication across schedule-dashboard, visit-preview-sheet, create dialogs.
 */

export const VISIT_TYPE_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  assessment: { label: 'Assessment', color: 'text-blue-600' },
  installation: { label: 'Installation', color: 'text-teal-600' },
  commissioning: { label: 'Commissioning', color: 'text-purple-600' },
  service: { label: 'Service', color: 'text-orange-600' },
  warranty: { label: 'Warranty', color: 'text-red-600' },
  inspection: { label: 'Inspection', color: 'text-yellow-600' },
  maintenance: { label: 'Maintenance', color: 'text-green-600' },
};

export const VISIT_TYPE_OPTIONS = [
  { value: 'assessment', label: 'Site Assessment' },
  { value: 'installation', label: 'Installation' },
  { value: 'commissioning', label: 'Commissioning' },
  { value: 'service', label: 'Service Call' },
  { value: 'warranty', label: 'Warranty Repair' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'maintenance', label: 'Maintenance' },
];
