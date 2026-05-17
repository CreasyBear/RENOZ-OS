import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_TEMPLATE_OPTIONS,
  createCampaignWizardFormData,
  createEmptyCampaignWizardFormData,
  getCampaignWizardScheduledAt,
  hasInvalidCampaignWizardTemplate,
  validateCampaignWizardStep,
} from '@/components/domain/communications/campaigns/campaign-wizard-model';

import type { Campaign } from '@/lib/schemas/communications';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('campaign wizard model', () => {
  it('creates isolated empty form defaults for new campaigns', () => {
    const first = createEmptyCampaignWizardFormData();
    const second = createEmptyCampaignWizardFormData();

    first.templateData.subjectOverride = 'Changed';
    first.recipientCriteria.tags = ['dealer'];

    expect(second).toMatchObject({
      name: '',
      description: '',
      templateType: 'newsletter',
      templateData: {},
      recipientCriteria: {},
      scheduleEnabled: false,
      scheduledAt: null,
    });
    expect(second.timezone).toEqual(expect.any(String));
  });

  it('maps an existing campaign into wizard form state without changing persistence shape', () => {
    const scheduledAt = new Date('2026-06-01T04:00:00.000Z');
    const campaign = {
      name: 'Dealer launch',
      description: null,
      templateType: 'newsletter',
      templateData: { templateId: 'template-1', signatureId: 'signature-1' },
      recipientCriteria: { tags: ['dealer'] },
      scheduledAt,
    } as Campaign;

    expect(createCampaignWizardFormData(campaign)).toMatchObject({
      name: 'Dealer launch',
      description: '',
      templateType: 'newsletter',
      templateData: { templateId: 'template-1', signatureId: 'signature-1' },
      recipientCriteria: { tags: ['dealer'] },
      scheduleEnabled: true,
      scheduledAt,
    });
  });

  it('keeps step validation behavior in the campaign-owned model', () => {
    const form = createEmptyCampaignWizardFormData();

    expect(validateCampaignWizardStep('details', form)).toEqual([
      'Campaign name is required',
    ]);

    expect(
      validateCampaignWizardStep('template', {
        ...form,
        name: 'Dealer launch',
        templateType: 'custom',
      })
    ).toEqual([
      'Subject line is required for custom templates',
      'Email body is required for custom templates',
    ]);

    expect(
      validateCampaignWizardStep('template', {
        ...form,
        name: 'Dealer launch',
        templateType: '',
        templateData: { templateId: 'template-1' },
      })
    ).toEqual([]);
  });

  it('centralizes template availability and scheduled send decisions', () => {
    const scheduledAt = new Date('2026-06-01T04:00:00.000Z');
    const form = {
      ...createEmptyCampaignWizardFormData(),
      templateData: { templateId: 'template-1' },
      scheduleEnabled: true,
      scheduledAt,
    };

    expect(
      hasInvalidCampaignWizardTemplate(form, {
        hasLoadedTemplates: true,
        hasSelectedTemplate: false,
      })
    ).toBe(true);
    expect(
      hasInvalidCampaignWizardTemplate(form, {
        hasLoadedTemplates: false,
        hasSelectedTemplate: false,
      })
    ).toBe(false);
    expect(getCampaignWizardScheduledAt(form)).toBe(scheduledAt);
    expect(
      getCampaignWizardScheduledAt({
        ...form,
        scheduleEnabled: false,
      })
    ).toBeUndefined();
  });

  it('keeps the wizard component on the extracted model boundary', () => {
    const wizard = read(
      'src/components/domain/communications/campaigns/campaign-wizard.tsx'
    );

    expect(CAMPAIGN_TEMPLATE_OPTIONS.map((option) => option.value)).toEqual([
      'newsletter',
      'promotion',
      'announcement',
      'follow_up',
      'welcome',
      'custom',
    ]);
    expect(wizard).toContain('from "./campaign-wizard-model"');
    expect(wizard).toContain('validateCampaignWizardStep(currentStep, formData)');
    expect(wizard).toContain('createCampaignWizardFormData(initialCampaign)');
    expect(wizard).not.toContain('function validateStep(');
    expect(wizard).not.toContain('const initialFormData');
  });
});
