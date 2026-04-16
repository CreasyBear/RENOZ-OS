import type {
  WarrantyClaimantModeValue,
  WarrantyClaimantRoleValue,
  WarrantyClaimQuickFilterValue,
  WarrantyClaimStatusValue,
  WarrantyClaimTypeValue,
} from '@/lib/schemas/warranty';
import { claimStatusConfig, claimTypeConfig } from '@/lib/warranty/claims-utils';

export const WARRANTY_CLAIM_STATUS_OPTIONS: Array<{
  value: WarrantyClaimStatusValue;
  label: string;
}> = Object.entries(claimStatusConfig).map(([value, config]) => ({
  value: value as WarrantyClaimStatusValue,
  label: config.label,
}));

export const WARRANTY_CLAIM_TYPE_OPTIONS: Array<{
  value: WarrantyClaimTypeValue;
  label: string;
  description: string;
}> = Object.entries(claimTypeConfig).map(([value, config]) => ({
  value: value as WarrantyClaimTypeValue,
  label: config.label,
  description: config.description,
}));

export const WARRANTY_CLAIMANT_ROLE_LABELS: Record<WarrantyClaimantRoleValue, string> = {
  channel_partner: 'Channel Partner',
  owner: 'Owner',
  internal: 'Internal',
  other: 'Other',
};

export const WARRANTY_CLAIMANT_ROLE_OPTIONS: Array<{
  value: WarrantyClaimantRoleValue;
  label: string;
  description: string;
}> = [
  {
    value: 'channel_partner',
    label: 'Retailer / Installer',
    description: 'Default claimant path through the commercial channel',
  },
  {
    value: 'owner',
    label: 'Owner of Record',
    description: 'Direct owner claim when the channel path has broken down',
  },
  {
    value: 'internal',
    label: 'Internal Team',
    description: 'RENOZ staff lodging the claim on someone else’s behalf',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'A non-channel claimant that still needs to be recorded explicitly',
  },
];

export const WARRANTY_CLAIMANT_MODE_OPTIONS: Array<{
  value: WarrantyClaimantModeValue;
  label: string;
}> = [
  { value: 'channel_partner', label: 'Channel Claims' },
  { value: 'direct', label: 'Direct Claims' },
];

export const WARRANTY_CLAIM_QUICK_FILTER_OPTIONS: Array<{
  value: WarrantyClaimQuickFilterValue;
  label: string;
}> = [
  { value: 'submitted', label: 'New' },
  { value: 'at_risk_sla', label: 'At Risk SLA' },
  { value: 'awaiting_decision', label: 'Awaiting Decision' },
];
