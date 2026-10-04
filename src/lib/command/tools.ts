import { z } from 'zod';

export const logMaintenanceSchema = z.object({
  gear_ref: z.string().min(1, 'Gear reference is required'),
  event_type: z.enum([
    'strings',
    'setup',
    'fret_work',
    'electronics',
    'pickups',
    'hardware',
    'repair',
    'valve_change',
    'other',
  ]),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Event date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable(),
  component: z.string().max(100).optional().nullable(),
  original_part: z.string().max(100).optional().nullable(),
});

export type LogMaintenanceArgs = z.infer<typeof logMaintenanceSchema>;

export const addWantSchema = z.object({
  item_text: z.string().min(2, 'Item description is required'),
  region: z.enum(['UK_ONLY', 'SHIPS_TO_UK', 'US_ONLY', 'WORLDWIDE']).optional().nullable(),
  max_price: z.number().positive('Max price must be a positive number').optional().nullable(),
  currency: z.string().max(5).optional().nullable().default('GBP'),
  alert: z.boolean().optional().nullable().default(true),
});

export type AddWantArgs = z.infer<typeof addWantSchema>;

export const ALLOWED_PREFERENCE_KEYS = [
  'reverbRegion',
  'personality',
  'followedBrands',
  'favoritePlayers',
] as const;

export type AllowedPreferenceKey = (typeof ALLOWED_PREFERENCE_KEYS)[number];

export const setPreferenceSchema = z.object({
  key: z.enum(ALLOWED_PREFERENCE_KEYS),
  value: z.union([z.string(), z.array(z.string())]),
});

export type SetPreferenceArgs = z.infer<typeof setPreferenceSchema>;

export const importNotesSchema = z.object({
  text: z.string().min(1, 'Notes content is required').max(20000, 'Max 20,000 characters allowed'),
  format: z.enum(['pasted_notes', 'csv', 'tsv']).optional().default('pasted_notes'),
});

export type ImportNotesArgs = z.infer<typeof importNotesSchema>;

export type CommandToolName = 'log_maintenance' | 'add_want' | 'set_preference' | 'import_notes';

/**
 * Validates and normalizes preference values against allow-list and schemas.
 * Throws an error if key or value is invalid.
 */
export function validateAndNormalizePreference(
  key: string,
  value: string | string[]
): { key: AllowedPreferenceKey; normalizedValue: string | string[] } {
  if (!ALLOWED_PREFERENCE_KEYS.includes(key as AllowedPreferenceKey)) {
    throw new Error(`Preference key '${key}' is not allowed. Allowed keys: ${ALLOWED_PREFERENCE_KEYS.join(', ')}`);
  }

  const typedKey = key as AllowedPreferenceKey;

  if (typedKey === 'reverbRegion') {
    const rawStr = Array.isArray(value) ? value[0] : value;
    const normalized = normalizeRegion(rawStr);
    if (!normalized) {
      throw new Error(`Invalid reverb region: '${rawStr}'. Expected UK_ONLY, SHIPS_TO_UK, US_ONLY, or WORLDWIDE`);
    }
    return { key: typedKey, normalizedValue: normalized };
  }

  if (typedKey === 'personality') {
    const rawStr = (Array.isArray(value) ? value[0] : value)?.toLowerCase().trim();
    const validPersonalities = ['hank', 'vee', 'dry', 'blunt', 'chatty'];
    if (!validPersonalities.includes(rawStr)) {
      throw new Error(`Invalid personality: '${rawStr}'. Allowed modes: ${validPersonalities.join(', ')}`);
    }
    return { key: typedKey, normalizedValue: rawStr };
  }

  if (typedKey === 'followedBrands' || typedKey === 'favoritePlayers') {
    const list = Array.isArray(value) ? value : [value];
    const cleaned = Array.from(
      new Set(
        list
          .flatMap((item) => (typeof item === 'string' ? item.split(/,| and /i) : []))
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
    if (cleaned.length === 0) {
      throw new Error(`Value for '${typedKey}' must contain at least one non-empty name`);
    }
    return { key: typedKey, normalizedValue: cleaned };
  }

  throw new Error(`Unsupported preference key '${key}'`);
}

export interface ProposedAction {
  id?: number | string;
  tool: CommandToolName;
  title: string;
  summary: string;
  arguments: Record<string, string | number | boolean | string[] | null | undefined>;
  targetGear?: {
    id: number;
    name: string;
  };
  ambiguousCandidates?: Array<{
    id: number;
    name: string;
  }>;
  batchId?: string;
  status?: 'proposed' | 'ambiguous';
}

/**
 * Normalizes colloquial region mentions into the Reverb region enum
 */
export function normalizeRegion(region?: string | null): 'UK_ONLY' | 'SHIPS_TO_UK' | 'US_ONLY' | 'WORLDWIDE' | undefined {
  if (!region) return undefined;
  const clean = region.toLowerCase().trim().replace(/[-_]/g, ' ');

  if (['uk', 'england', 'britain', 'great britain', 'scotland', 'wales', 'uk only'].includes(clean)) {
    return 'UK_ONLY';
  }
  if (['ships to uk', 'europe to uk', 'eu to uk'].includes(clean)) {
    return 'SHIPS_TO_UK';
  }
  if (['us', 'usa', 'united states', 'america', 'states', 'us only'].includes(clean)) {
    return 'US_ONLY';
  }
  if (['worldwide', 'global', 'anywhere', 'international'].includes(clean)) {
    return 'WORLDWIDE';
  }

  return undefined;
}

/**
 * Currency symbol formatter
 */
export function formatCurrency(amount: number, currency = 'GBP'): string {
  if (currency === 'USD') return `$${amount.toLocaleString()}`;
  if (currency === 'EUR') return `€${amount.toLocaleString()}`;
  return `£${amount.toLocaleString()}`;
}

/**
 * Formats event type label cleanly
 */
export function formatEventType(type: string): string {
  switch (type) {
    case 'strings':
      return 'String change';
    case 'setup':
      return 'Action & truss rod setup';
    case 'fret_work':
      return 'Fret work / levelling';
    case 'electronics':
      return 'Pots / wiring modification';
    case 'pickups':
      return 'Pickup swap';
    case 'hardware':
      return 'Bridge / hardware adjustment';
    case 'valve_change':
      return 'Valve service';
    case 'repair':
      return 'Instrument repair';
    default:
      return 'Maintenance update';
  }
}
