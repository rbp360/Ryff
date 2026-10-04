import { describe, it, expect } from 'vitest';
import { parseGearVoiceOrText } from '../src/lib/gear-parser';

describe('gear-parser', () => {
  it('parses string changes and updates string specs', async () => {
    const result = await parseGearVoiceOrText({
      item: {
        brand: 'Washburn',
        model: 'N2',
        category: 'guitar',
      },
      text: 'Just restrung the N2 with Elixir 9-46s on Monday',
    });

    expect(result.event_type).toBe('string_change');
    expect(result.title.toLowerCase()).toContain('elixir 9-46');
    expect(result.component?.toLowerCase()).toContain('string');
    expect(result.gear_updates.current_strings).toBeDefined();
  }, 30000);

  it('parses hardware pickup swap and retains original part note', async () => {
    const result = await parseGearVoiceOrText({
      item: {
        brand: 'PRS',
        model: 'CE 24',
        category: 'guitar',
      },
      text: 'Bridge pickup replaced with a Lavarack custom wound to 9k, original HFS is in the guitar case',
    });

    expect(result.event_type).toBe('modification');
    expect(result.component?.toLowerCase()).toContain('pickup');
  }, 30000);

  it('parses pedal resistor modifications', async () => {
    const result = await parseGearVoiceOrText({
      item: {
        brand: 'Ibanez',
        model: 'TS9 Tube Screamer',
        category: 'pedal',
      },
      text: 'Original R2 resistor replaced with 280k for more sweep',
    });

    expect(result.event_type).toBe('modification');
    expect(result.title.toLowerCase()).toContain('mod');
  }, 30000);

  it('parses spoken restring date, string gauge, brand, and standard tuning', async () => {
    const result = await parseGearVoiceOrText({
      item: {
        brand: 'Fender',
        model: 'Stratocaster',
        category: 'guitar',
      },
      text: 'Restrung on 1st October with Ernie Ball 10-46 and tuned to standard tuning',
    });

    expect(result.event_type).toBe('string_change');
    expect(result.gear_updates.tuning).toBeDefined();
    expect(result.gear_updates.tuning?.toLowerCase()).toContain('standard');
    expect(result.gear_updates.string_gauge).toBeDefined();
    expect(result.gear_updates.string_manufacturer?.toLowerCase()).toContain('ernie ball');
  }, 30000);
});
