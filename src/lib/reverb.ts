import fs from 'fs';
import path from 'path';
import { env } from './env';

export interface ReverbListing {
  listingId: string;
  url: string;
  title: string;
  priceAmount: number | null;
  originalPriceAmount?: number | null;
  priceCurrency: string;
  condition: string;
  publishedAt?: string | null;
  daysOnMarket?: number | null;
  priceDropText?: string | null;
}

export function wantKey(brand?: string | null, model?: string | null): string {
  const b = (brand || '').trim().toLowerCase();
  const m = (model || '').trim().toLowerCase().replace(/^[:\s-]+/, '').trim();
  if (!b) return m;
  if (!m) return b;
  if (m === b) return b;
  if (m.startsWith(b)) return m;
  return `${b} ${m}`.replace(/\s+/g, ' ');
}

export interface ReverbSearchOptions {
  condition?: string;
  limit?: number;
  timeoutMs?: number;
  itemRegion?: string; // e.g. 'GB', 'US'
  shipsTo?: string;    // e.g. 'GB', 'US'
}

export async function searchListings(
  query: string,
  options: ReverbSearchOptions = {}
): Promise<ReverbListing[]> {
  const condition = options.condition || 'used';
  const limit = options.limit || 24;
  const timeoutMs = options.timeoutMs || 5000;

  let url = `https://api.reverb.com/api/listings?query=${encodeURIComponent(query)}&condition=${encodeURIComponent(condition)}&per_page=${Math.min(limit, 50)}`;

  if (options.itemRegion) {
    url += `&item_region=${encodeURIComponent(options.itemRegion)}`;
  }
  if (options.shipsTo) {
    url += `&ships_to=${encodeURIComponent(options.shipsTo)}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/hal+json',
        'Accept-Version': '3.0',
        'User-Agent': `GuitarBot/0.1 (contact: ${env.CONTACT_EMAIL})`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Reverb API] Request returned HTTP ${res.status}: ${res.statusText}`);
      return loadFixtureListings(query, limit);
    }

    const data = await res.json();
    return parseReverbResponse(data, limit);
  } catch (err) {
    console.warn(`[Reverb API] Fetch failed (${err instanceof Error ? err.message : String(err)}). Using fixture backup.`);
    return loadFixtureListings(query, limit);
  }
}

interface RawReverbListing {
  id?: number | string;
  title?: string;
  price?: { amount?: string | number; currency?: string };
  buyer_price?: { amount?: string | number; currency?: string };
  original_price?: { amount?: string | number; currency?: string };
  ribbon?: { display?: string; reason?: string };
  created_at?: string;
  published_at?: string;
  condition?: { display_name?: string; slug?: string } | string;
  _links?: { web?: { href?: string } };
  slug?: string;
}

function calculateDaysOnMarket(publishedAtStr?: string | null): number | null {
  if (!publishedAtStr) return null;
  const publishedDate = new Date(publishedAtStr);
  if (isNaN(publishedDate.getTime())) return null;
  const diffMs = Date.now() - publishedDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : 0;
}

function parseReverbResponse(data: { listings?: RawReverbListing[] }, limit: number): ReverbListing[] {
  if (!data || !Array.isArray(data.listings)) return [];

  const results: ReverbListing[] = [];
  for (const item of data.listings.slice(0, limit)) {
    if (!item.id || !item.title) continue;

    const listingId = String(item.id);
    const url = item._links?.web?.href || `https://reverb.com/item/${listingId}`;
    const priceAmount = item.buyer_price?.amount
      ? parseFloat(String(item.buyer_price.amount))
      : item.price?.amount
      ? parseFloat(String(item.price.amount))
      : null;
    const priceCurrency = item.buyer_price?.currency || item.price?.currency || 'USD';
    const condition = typeof item.condition === 'object'
      ? item.condition.display_name || item.condition.slug || 'Used'
      : (typeof item.condition === 'string' ? item.condition : 'Used');

    const originalPriceAmount = item.original_price?.amount
      ? parseFloat(String(item.original_price.amount))
      : null;

    const priceDropText = item.ribbon?.display || null;
    const publishedAt = item.published_at || item.created_at || null;
    const daysOnMarket = calculateDaysOnMarket(publishedAt);

    results.push({
      listingId,
      url,
      title: item.title,
      priceAmount,
      originalPriceAmount,
      priceCurrency,
      condition,
      publishedAt,
      daysOnMarket,
      priceDropText,
    });
  }

  return results;
}

export function loadFixtureListings(query: string, limit = 24): ReverbListing[] {
  try {
    const fixturePath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'fixtures/reverb-listings.sample.json');
    if (fs.existsSync(fixturePath)) {
      const raw = fs.readFileSync(fixturePath, 'utf8');
      const data = JSON.parse(raw);
      const all = parseReverbResponse(data, 100);
      const q = query.toLowerCase();
      const filtered = all.filter(l => l.title.toLowerCase().includes(q) || q.includes(l.title.toLowerCase().slice(0, 10)));
      return (filtered.length > 0 ? filtered : all).slice(0, limit);
    }
  } catch (err) {
    console.error('Failed to load Reverb sample fixture:', err);
  }
  return [];
}
