import { describe, it, expect } from 'vitest';
import {
  normalizeKey,
  parseNormalizedGear,
  fallbackNormalize,
  buildPassportDocument,
  canonicalKey,
} from '../src/lib/knowledge/text';
import { detectStatMetric } from '../src/lib/knowledge/search';

describe('gear knowledge: text helpers', () => {
  it('normalizes keys', () => {
    expect(normalizeKey("D'Addario  NYXL!")).toBe('d addario nyxl');
    expect(normalizeKey('Bare Knuckle & Co')).toBe('bare knuckle and co');
  });

  it('parses fenced LLM JSON and rejects junk', () => {
    const ok = parseNormalizedGear(
      '```json\n{"category":"pickup","manufacturer":"Keeley","model_name":"Custom 59","sub_type":"humbucker","specs":{"output_level":"medium"},"canonical_description":"PAF style humbucker"}\n```'
    );
    expect(ok?.manufacturer).toBe('Keeley');
    expect(parseNormalizedGear('[Mock AI Response]')).toBeNull();
    expect(parseNormalizedGear('{"manufacturer":"x"}')).toBeNull();
  });

  it('falls back deterministically', () => {
    const g = fallbackNormalize('pickup', 'Bare Knuckle Warpig', 'Bare Knuckle');
    expect(g.manufacturer).toBe('Bare Knuckle');
    expect(g.model_name).toBe('Warpig');
    expect(canonicalKey(g)).toBe('bare knuckle warpig');
  });

  it('builds an anonymous passport document', () => {
    const doc = buildPassportDocument(
      { brand: 'Gibson', model: 'Les Paul Standard', year_manufacture: '2021', tuning: 'Drop C', string_gauge: '11-54', number_of_strings: 6 },
      { pickup_bridge: 'Bare Knuckle Warpig' }
    );
    expect(doc).toContain('2021 Gibson Les Paul Standard');
    expect(doc).toContain('Bare Knuckle Warpig (bridge)');
    expect(doc).toContain('11-54 gauge');
  });

  it('routes quantitative questions to SQL metrics', () => {
    expect(detectStatMetric('what string gauge do most people use?')).toBe('string_gauge');
    expect(detectStatMetric('most popular tuning for metal')).toBe('tuning');
    expect(detectStatMetric('tell me about the Warpig')).toBeNull();
  });
});
