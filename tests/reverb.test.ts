import { describe, it, expect } from 'vitest';
import { wantKey, loadFixtureListings } from '../src/lib/reverb';

describe('Reverb Integration & Want Keys', () => {
  it('generates normalised lowercase want keys', () => {
    expect(wantKey('Fender', 'Player Telecaster')).toBe('fender player telecaster');
    expect(wantKey('  Boss ', '  Katana 50 MkII  ')).toBe('boss katana 50 mkii');
    expect(wantKey(null, 'Gibson Les Paul')).toBe('gibson les paul');
    expect(wantKey('Ibanez', null)).toBe('ibanez');
  });

  it('correctly maps raw fixture data into typed Reverb listings', () => {
    const listings = loadFixtureListings('fender', 5);
    expect(listings.length).toBeGreaterThan(0);

    const first = listings[0];
    expect(first).toHaveProperty('listingId');
    expect(first).toHaveProperty('url');
    expect(first).toHaveProperty('title');
    expect(first).toHaveProperty('condition');
    expect(first.priceAmount).toBeGreaterThan(0);
    expect(first.priceCurrency).toBeDefined();
  });
});
