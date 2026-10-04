import { describe, it, expect } from 'vitest';
import {
  detectSettingsProvider,
  getBackdropForCategory,
  getCategoryDefaultImage,
  autocompleteDate,
  GUITAR_TUNINGS,
  BASS_TUNINGS,
  GUITAR_STRING_GAUGES,
  STRING_MANUFACTURERS,
  PICKUP_MANUFACTURERS,
  resolveStringSpecs,
} from '../src/lib/gear-specs';

describe('gear-specs', () => {
  describe('detectSettingsProvider', () => {
    it('detects Helix link', () => {
      const p = detectSettingsProvider('https://line6.com/customtone/tone/12345');
      expect(p?.id).toBe('helix');
      expect(p?.badge).toBe('HELIX');
    });

    it('detects Quad Cortex link', () => {
      const p = detectSettingsProvider('https://cloud.neuraldsp.com/preset/abcde');
      expect(p?.id).toBe('quad-cortex');
      expect(p?.badge).toBe('CORTEX');
    });

    it('detects ToneX link', () => {
      const p = detectSettingsProvider('https://www.ikmultimedia.com/tonex/tones/999');
      expect(p?.id).toBe('tonex');
      expect(p?.badge).toBe('TONEX');
    });

    it('detects Kemper link', () => {
      const p = detectSettingsProvider('https://www.kemper-amps.com/rigs/profile1');
      expect(p?.id).toBe('kemper');
      expect(p?.badge).toBe('KEMPER');
    });

    it('detects Google Drive and Dropbox', () => {
      expect(detectSettingsProvider('https://drive.google.com/file/d/xyz')?.id).toBe('gdrive');
      expect(detectSettingsProvider('https://dropbox.com/s/xyz')?.id).toBe('dropbox');
    });

    it('returns generic for unknown valid URL and null for invalid', () => {
      expect(detectSettingsProvider('https://mytones.com/preset.json')?.id).toBe('generic');
      expect(detectSettingsProvider('invalid-url')).toBeNull();
      expect(detectSettingsProvider('')).toBeNull();
    });
  });

  describe('getBackdropForCategory', () => {
    it('returns guitar backdrop for guitar and bass', () => {
      expect(getBackdropForCategory('guitar')).toBe('/branding/Guitar backdrop.png');
      expect(getBackdropForCategory('bass')).toBe('/branding/Guitar backdrop.png');
    });

    it('returns drum room for drums', () => {
      expect(getBackdropForCategory('drums')).toBe('/branding/drum room.png');
    });

    it('returns amp backdrop for amplifiers and pedals', () => {
      expect(getBackdropForCategory('amp')).toBe('/branding/Amp backdrop.png');
      expect(getBackdropForCategory('pedal')).toBe('/branding/Amp backdrop.png');
    });

    it('falls back to room if category not recognized', () => {
      expect(getBackdropForCategory(undefined, 'control-room')).toBe('/branding/Studio backdrop.png');
      expect(getBackdropForCategory(undefined, 'synthzone')).toBe('/branding/Synthzone.png');
    });
  });

  describe('getCategoryDefaultImage', () => {
    it('returns category artwork', () => {
      expect(getCategoryDefaultImage('guitar')).toBe('/branding/Bass gear brand default.png');
      expect(getCategoryDefaultImage('drums')).toBe('/branding/Drum gear brand default.png');
      expect(getCategoryDefaultImage('amp')).toBe('/branding/Effects brand default.jpg');
    });
  });

  describe('autocompleteDate', () => {
    it('expands 6-digit ddmmyy to dd/mm/20yy', () => {
      expect(autocompleteDate('151024')).toBe('15/10/2024');
    });

    it('expands 8-digit ddmmyyyy to dd/mm/yyyy', () => {
      expect(autocompleteDate('04102026')).toBe('04/10/2026');
    });

    it('swaps obvious month/day inversion like 1024 to current year with day/month', () => {
      const year = String(new Date().getFullYear()).slice(-2);
      expect(autocompleteDate(`2510${year}`)).toBe(`25/10/20${year}`);
    });
  });

  describe('constants catalog check', () => {
    it('contains comprehensive tunings and string gauges', () => {
      expect(GUITAR_TUNINGS[6].length).toBeGreaterThan(10);
      expect(GUITAR_TUNINGS[7].length).toBeGreaterThan(5);
      expect(GUITAR_TUNINGS[8].length).toBeGreaterThan(5);
      expect(BASS_TUNINGS[4].length).toBeGreaterThan(4);
      expect(GUITAR_STRING_GAUGES[6]).toContain('010-046 (Regular Light)');
      expect(STRING_MANUFACTURERS).toContain('Ernie Ball');
      expect(STRING_MANUFACTURERS).toContain("D'Addario");
      expect(PICKUP_MANUFACTURERS).toContain('Seymour Duncan');
      expect(PICKUP_MANUFACTURERS).toContain('Bare Knuckle Pickups');
    });
  });

  describe('resolveStringSpecs', () => {
    it('intelligently separates brand and gauge from combined string name like "Elixir 9-42"', () => {
      const res = resolveStringSpecs(null, null, 'Elixir 9-42');
      expect(res.manufacturer).toBe('Elixir');
      expect(res.gauge).toBe('009-042 (Super Light)');
      expect(res.normalizedGauge).toBe('009-042 (Super Light)');
    });

    it('extracts gauge when manufacturer mistakenly contains it', () => {
      const res = resolveStringSpecs(null, 'Elixir 9-42', null);
      expect(res.manufacturer).toBe('Elixir');
      expect(res.gauge).toBe('009-042 (Super Light)');
    });

    it('preserves explicitly configured gauge and manufacturer', () => {
      const res = resolveStringSpecs('010-046 (Regular Light)', 'D\'Addario', 'D\'Addario 10-46');
      expect(res.manufacturer).toBe('D\'Addario');
      expect(res.gauge).toBe('010-046 (Regular Light)');
    });

    it('handles empty data with blank strings without falling back to hardcoded 10-46', () => {
      const res = resolveStringSpecs(null, null, null);
      expect(res.manufacturer).toBe('');
      expect(res.gauge).toBe('');
    });
  });
});
