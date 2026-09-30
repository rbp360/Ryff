import { describe, it, expect } from 'vitest';
import { costUsd } from '../src/lib/cost';

describe('costUsd', () => {
  it('calculates expected cost for Gemini 2.5 Flash', () => {
    const cost = costUsd('gemini-2.5-flash', {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    expect(cost).toBe(0.75); // $0.15 in + $0.60 out
  });

  it('calculates expected cost with caching', () => {
    const cost = costUsd('gemini-2.5-flash', {
      input_tokens: 100_000,
      output_tokens: 10_000,
      cache_read_input_tokens: 500_000,
    });
    expect(cost).toBeGreaterThan(0);
  });
});
