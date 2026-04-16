import type {
  IssueNextActionType,
  IssueResolutionCategory,
} from '@/lib/schemas/support/issues';

export const ISSUE_RESOLUTION_CATEGORY_LABELS: Record<
  IssueResolutionCategory,
  string
> = {
  hardware_fault: 'Hardware Fault',
  shipping_damage: 'Shipping Damage',
  fulfillment_error: 'Fulfillment Error',
  installation_issue: 'Installation Issue',
  software_or_firmware: 'Software/Firmware',
  usage_guidance: 'Usage Guidance',
  no_fault_found: 'No Fault Found',
  other: 'Other',
};

export const ISSUE_NEXT_ACTION_LABELS: Record<IssueNextActionType, string> = {
  create_rma: 'Create RMA',
  warranty_claim: 'Warranty Claim',
  field_service: 'Field Service',
  customer_follow_up: 'Customer Follow-up',
  monitor: 'Monitor',
  no_action: 'No Action',
};

export const ISSUE_RESOLUTION_CATEGORY_OPTIONS: Array<{
  value: IssueResolutionCategory;
  label: string;
}> = Object.entries(ISSUE_RESOLUTION_CATEGORY_LABELS).map(([value, label]) => ({
  value: value as IssueResolutionCategory,
  label,
}));

export const ISSUE_NEXT_ACTION_OPTIONS: Array<{
  value: IssueNextActionType;
  label: string;
}> = Object.entries(ISSUE_NEXT_ACTION_LABELS).map(([value, label]) => ({
  value: value as IssueNextActionType,
  label,
}));
