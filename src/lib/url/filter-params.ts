/**
 * Filter chips URL serialization
 *
 * Converts filter chips to URL search params and back for shareable filter state.
 * Use with FilterChipOverflow in schedule/timeline views.
 *
 * @see docs/design-system/TIMELINE-SCHEDULE-DESIGN-SYSTEM.md
 * @source project-management-reference/lib/url/filters.ts
 */

export type FilterChip = { key: string; value: string };

/**
 * Mapping from URL param keys to filter chip display keys.
 * paramKey -> chipKey (for paramsToChips)
 */
export type FilterParamMapping = Record<string, string>;

/**
 * Mapping from chip keys to URL param keys.
 * chipKey -> paramKey (for chipsToParams)
 * If not provided, chip key is lowercased and used as param key.
 */
export type ChipToParamMapping = Record<string, string>;

function normalizeKey(key: string, mapping?: Record<string, string>): string {
  const s = key.trim().toLowerCase();
  if (mapping) {
    const entry = Object.entries(mapping).find(
      ([mappedKey]) => mappedKey.toLowerCase() === s
    );
    if (entry) return entry[1];
  }
  if (s.startsWith('status')) return 'status';
  if (s.startsWith('priority')) return 'priority';
  if (s.startsWith('tag')) return 'tags';
  if (s.startsWith('member') || s === 'pic') return 'members';
  if (s.startsWith('installer')) return 'installerId';
  if (s.startsWith('visit') && s.includes('type')) return 'visitType';
  if (s.startsWith('project')) return 'projectId';
  return s;
}

/**
 * Convert filter chips to URLSearchParams.
 *
 * @param chips - Array of { key, value } filter chips
 * @param chipToParam - Optional mapping from chip key to URL param key
 */
export function chipsToParams(
  chips: FilterChip[],
  chipToParam?: ChipToParamMapping
): URLSearchParams {
  const params = new URLSearchParams();
  const buckets: Record<string, string[]> = {};

  for (const chip of chips) {
    const paramKey = chipToParam
      ? chipToParam[chip.key] ?? chip.key.toLowerCase()
      : normalizeKey(chip.key);
    buckets[paramKey] = buckets[paramKey] || [];
    buckets[paramKey].push(chip.value);
  }

  for (const [key, values] of Object.entries(buckets)) {
    if (values.length) {
      params.set(key, values.join(','));
    }
  }

  return params;
}

/**
 * Convert URLSearchParams to filter chips.
 *
 * @param params - URL search params (e.g. from useSearch)
 * @param paramToChip - Mapping from URL param key to chip display key.
 *   e.g. { status: 'Status', installerId: 'Installer', visitType: 'Visit Type' }
 */
export function paramsToChips(
  params: URLSearchParams,
  paramToChip?: FilterParamMapping
): FilterChip[] {
  const chips: FilterChip[] = [];

  const add = (_paramKey: string, chipKey: string, values?: string | null) => {
    if (!values) return;
    values.split(',').forEach((value) => {
      if (!value.trim()) return;
      chips.push({ key: chipKey, value: value.trim() });
    });
  };

  const defaultMapping: FilterParamMapping = {
    status: 'Status',
    priority: 'Priority',
    tags: 'Tag',
    members: 'Member',
    installerId: 'Installer',
    visitType: 'Visit Type',
    projectId: 'Project',
  };

  const mapping = paramToChip ?? defaultMapping;

  for (const [paramKey, chipKey] of Object.entries(mapping)) {
    add(paramKey, chipKey, params.get(paramKey));
  }

  return chips;
}
