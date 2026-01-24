export type TemplateCategory =
  | 'welcome'
  | 'follow_up'
  | 'complaint_resolution'
  | 'upsell'
  | 'reactivation'
  | 'general';

export type TemplateType = 'email' | 'sms' | 'note';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  type: TemplateType;
  subject?: string;
  body: string;
  variables: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}
