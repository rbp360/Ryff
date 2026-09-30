import pricingConfig from '../../config/pricing.json';

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export function costUsd(model: string, usage: TokenUsage): number {
  const modelRates = (pricingConfig.usd_per_mtok as Record<string, { in: number; out: number; cache_read: number; cache_write_5m: number }>)[model]
    || (pricingConfig.usd_per_mtok as Record<string, { in: number; out: number; cache_read: number; cache_write_5m: number }>)[pricingConfig.usd_per_mtok['gemini-2.5-flash'] ? 'gemini-2.5-flash' : 'claude-haiku-4-5-20251001'];

  const inCost = ((usage.input_tokens || 0) / 1_000_000) * (modelRates?.in || 0.15);
  const outCost = ((usage.output_tokens || 0) / 1_000_000) * (modelRates?.out || 0.60);
  const cacheReadCost = ((usage.cache_read_input_tokens || 0) / 1_000_000) * (modelRates?.cache_read || 0.0375);
  const cacheWriteCost = ((usage.cache_creation_input_tokens || 0) / 1_000_000) * (modelRates?.cache_write_5m || 0.15);

  const total = inCost + outCost + cacheReadCost + cacheWriteCost;
  return Number(total.toFixed(6));
}
