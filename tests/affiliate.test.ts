import { describe, it, expect } from 'vitest';
import { isAllowedDest, affiliateWrap, buildOutUrl } from '../src/lib/affiliate';

describe('Affiliate & Outbound Redirection', () => {
  it('allows reverb.com domains and trusted news hosts', () => {
    expect(isAllowedDest('https://reverb.com/item/123456')).toBe(true);
    expect(isAllowedDest('https://www.reverb.com/listings/abc')).toBe(true);
    expect(isAllowedDest('https://guitarworld.com/news/123')).toBe(true);
    expect(isAllowedDest('https://musicradar.com/reviews/abc')).toBe(true);
    expect(isAllowedDest('http://stompboxsteals.blogspot.com/2026/09/post.html')).toBe(true);
  });

  it('rejects disallowed, non-web, or phishing domains', () => {
    expect(isAllowedDest('https://fake-reverb.com/phishing')).toBe(false);
    expect(isAllowedDest('https://evil-site.com')).toBe(false);
    expect(isAllowedDest('javascript:alert(1)')).toBe(false);
  });

  it('builds internal /api/out URLs correctly', () => {
    const url = buildOutUrl({
      destUrl: 'https://reverb.com/item/123',
      bot: 'hank',
      episodeId: 42,
      type: 'deal',
    });
    expect(url).toBe('/api/out?u=https%3A%2F%2Freverb.com%2Fitem%2F123&b=hank&e=42&type=deal');
  });

  it('returns plain destination url when AFFILIATE_ENABLED is false', () => {
    const direct = affiliateWrap('https://reverb.com/item/123', 'hank-42');
    expect(direct).toBe('https://reverb.com/item/123');
  });
});
