import { describe, it, expect } from 'vitest';
import { complete } from '../src/lib/llm';

describe('src/lib/llm.ts', () => {
  it('executes complete() call and returns token usage and cost calculation', async () => {
    const res = await complete({
      purpose: 'test-smoke-call',
      messages: [{ role: 'user', content: 'Guitar news smoke test' }],
    });

    expect(res).toBeDefined();
    expect(typeof res.text).toBe('string');
    expect(res.usage.input_tokens).toBeGreaterThan(0);
    expect(res.usage.output_tokens).toBeGreaterThan(0);
    expect(res.costUsd).toBeGreaterThanOrEqual(0);
  });
});
