import { describe, it, expect } from 'vitest';
import { checkPipelineSpendCap, getCapsForCohort } from '../src/lib/usage';

describe('Usage & Spend Caps Guardrails', () => {
  it('loads cohort caps correctly', () => {
    const cadre = getCapsForCohort('cadre');
    expect(cadre.dailyMsgs).toBe(10);
    expect(cadre.maxOutputTokens).toBe(350);

    const pub = getCapsForCohort('public');
    expect(pub.dailyMsgs).toBe(3);
    expect(pub.maxOutputTokens).toBe(300);
  });

  it('enforces pipeline run limit cap ($2.00)', () => {
    expect(checkPipelineSpendCap(1.50, 3.00).allowed).toBe(true);
    const breach = checkPipelineSpendCap(2.05, 3.00);
    expect(breach.allowed).toBe(false);
    expect(breach.reason).toContain('reached max allowed limit');
  });

  it('enforces global daily spend cap ($8.00)', () => {
    expect(checkPipelineSpendCap(0.50, 7.50).allowed).toBe(true);
    const breach = checkPipelineSpendCap(0.50, 8.10);
    expect(breach.allowed).toBe(false);
    expect(breach.reason).toContain('reached max allowed daily limit');
  });
});
