import { describe, it, expect } from 'vitest';
import { sanitiseUntrusted, renderTokens, validateUserInput } from '../src/lib/guard';

describe('Guard & Content Integrity', () => {
  it('strips HTML tags and escapes XML delimiters', () => {
    const raw = '<script>alert("hack")</script> <b>Great tone</b> &amp; clarity <item>';
    const clean = sanitiseUntrusted(raw, 200);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('<b>');
    expect(clean).toContain('&lt;item&gt;');
    expect(clean).toContain('Great tone & clarity');
  });

  it('truncates oversized strings safely', () => {
    const longText = 'a'.repeat(600);
    const clean = sanitiseUntrusted(longText, 100);
    expect(clean.length).toBeLessThanOrEqual(100);
  });

  it('validates user input constraints', () => {
    expect(validateUserInput('').valid).toBe(false);
    expect(validateUserInput('   ').valid).toBe(false);
    expect(validateUserInput('a'.repeat(600), 500).valid).toBe(false);
    expect(validateUserInput('What about Fender?').valid).toBe(true);
  });

  it('renders authorized [[item:ID]] and [[deal:ID]] tokens', () => {
    const text = 'Check out [[item:101]] and this deal: [[deal:202]] on Reverb.';
    const context = {
      items: [{ id: 101, url: 'https://guitarworld.com/new-fender', title: 'New Fender Launch' }],
      deals: [{ id: 202, listingUrl: 'https://reverb.com/item/12345', title: 'Used Strat', priceAmount: 450, priceCurrency: '£' }],
      bot: 'vee',
    };

    const rendered = renderTokens(text, context);
    expect(rendered).toContain('[New Fender Launch](/api/out?u=https%3A%2F%2Fguitarworld.com%2Fnew-fender&type=item&id=101)');
    expect(rendered).toContain('[Used Strat (£450)](/api/out?u=https%3A%2F%2Freverb.com%2Fitem%2F12345&type=deal&id=202&b=vee)');
  });

  it('strips unauthorized [[...]] tokens and raw arbitrary URLs from model output', () => {
    const text = 'Check [[item:999]] and [[fake_token]] and visit https://evil-scam.com now!';
    const rendered = renderTokens(text, { items: [], deals: [] });
    expect(rendered).not.toContain('[[item:999]]');
    expect(rendered).not.toContain('[[fake_token]]');
    expect(rendered).not.toContain('https://evil-scam.com');
  });
});
