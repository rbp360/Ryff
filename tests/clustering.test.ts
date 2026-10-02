import { describe, it, expect } from 'vitest';
import {
  extractSalientKeywords,
  extractPlayers,
  extractBrandsFromText,
  generateClusterKey
} from '../src/lib/clustering';

describe('src/lib/clustering.ts', () => {
  it('extracts notable players including Chris Impellitteri and Slash', () => {
    const text1 = 'Watch: Chris Impellitteri plays insane shred solos on new signature model';
    const players1 = extractPlayers(text1);
    expect(players1).toContain('Chris Impellitteri');

    const text2 = 'Slash speaks out on moving from Marshall to Magnatone amps';
    const players2 = extractPlayers(text2);
    expect(players2).toContain('Slash');
  });

  it('extracts custom user favorite players', () => {
    const text = 'Local hero Dave McShred headlines guitar festival';
    const players = extractPlayers(text, ['Dave McShred']);
    expect(players).toContain('Dave McShred');
  });

  it('extracts brands from text using known brand list', () => {
    const text = 'New Gibson Les Paul Standard plugged into a vintage Marshall JCM800 and Magnatone combo';
    const brands = extractBrandsFromText(text, ['Gibson', 'Fender', 'Marshall', 'Magnatone', 'Boss']);
    expect(brands).toContain('Gibson');
    expect(brands).toContain('Marshall');
    expect(brands).toContain('Magnatone');
    expect(brands).not.toContain('Fender');
  });

  it('strips noise prefixes and extracts salient keywords', () => {
    const title = 'Watch: Breaking Review - Slash teams up with Magnatone for legendary tube amplifier!';
    const keywords = extractSalientKeywords(title);
    expect(keywords).toContain('slash');
    expect(keywords).toContain('teams');
    expect(keywords).toContain('magnatone');
    expect(keywords).not.toContain('watch');
    expect(keywords).not.toContain('breaking');
    expect(keywords).not.toContain('review');
    expect(keywords).not.toContain('with');
  });

  it('generates deterministic cluster fingerprints for same-day stories on the same topic', () => {
    const date = new Date('2026-10-02T12:00:00Z');
    const key1 = generateClusterKey(
      'Slash unveils brand new Magnatone signature amp at gear expo',
      ['Magnatone'],
      ['Slash'],
      date
    );
    const key2 = generateClusterKey(
      'Exclusive: Slash unveils brand new Magnatone signature amplifier',
      ['Magnatone'],
      ['Slash'],
      date
    );
    expect(key1).toBe(key2);
  });
});
