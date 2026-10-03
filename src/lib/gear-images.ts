export interface StockImageResult {
  imageUrl: string | null;
  source: 'custom' | 'reverb' | 'logo' | 'category';
  title?: string;
  totalMatches?: number;
  pickIndex?: number;
}

/**
 * Maps gear categories to static fallback illustrations in /public/images/
 */
export function getCategoryFallbackImage(category?: string | null): string {
  const cat = (category || '').toLowerCase().trim();
  if (cat === 'guitar' || cat === 'guitars' || cat === 'bass' || cat === 'basses' || cat === 'artist') {
    return '/images/Bass gear brand default.png';
  }
  if (cat === 'amp' || cat === 'amps' || cat === 'amplifier' || cat === 'amplifiers' || cat === 'cab' || cat === 'cabinet') {
    return '/images/Logo 1 landscape.jpg';
  }
  if (cat === 'pedal' || cat === 'pedals' || cat === 'effects' || cat === 'effect') {
    return '/images/Effects brand default.jpg';
  }
  if (cat === 'modeller' || cat === 'modellers' || cat === 'studio' || cat === 'tech' || cat === 'synth' || cat === 'keyboard') {
    return '/images/Studio gear brand default.png';
  }
  if (cat === 'drum' || cat === 'drums' || cat === 'percussion') {
    return '/images/Drum gear brand default.png';
  }
  return '/images/Logo 1 landscape.jpg';
}

/**
 * Returns a brand logo URL or fallback SVG data URI
 */
export function getBrandLogoUrl(brand?: string | null): string | null {
  if (!brand || !brand.trim()) return null;
  const cleanBrand = brand.trim();
  return `https://img.logo.dev/name/${encodeURIComponent(cleanBrand)}?fallback=monogram`;
}

/**
 * Strict exclusion patterns for accessories, covers, parts, pickups, packaging, etc.
 * Any listing matching these patterns will be DISQUALIFIED if the item searched is an instrument/amp/pedal.
 */
const DISQUALIFIED_ACCESSORIES_REGEX = /\b(cover|dust\s*cover|amp\s*cover|padded\s*cover|case|hardcase|hard\s*case|flight\s*case|road\s*case|gigbag|gig\s*bag|bag\s*only|cable|patch\s*cable|speaker\s*cable|pickup|pickups|humbucker|single\s*coil|p90|knob|knobs|potentiometer|potentiometers|pots|pickguard|scratchplate|backplate|switch\s*tip|strap|strap\s*locks|strings|guitar\s*strings|parts|parts\s*only|replacement\s*part|body\s*only|neck\s*only|loaded\s*pickguard|wiring\s*harness|bridge|tailpiece|tremolo\s*arm|whammy\s*bar|tuners|tuning\s*pegs|nut|frets|box\s*only|empty\s*box|original\s*box|manual|manual\s*only|schematic|t-shirt|shirt|hoodie|hat|poster|sticker|footswitch|foot\s*switch|foot\s*controller|switch\s*pedal|power\s*supply|power\s*adapter|wall\s*wart|transformer|chassis|valves\s*only|tubes\s*only|tube\s*set)\b/i;

/**
 * Strips noise/modifier keywords to find the core model family (e.g. "Peavey 5150mk2 modded" -> "Peavey 5150")
 */
function cleanCoreQuery(text: string): string {
  return text
    .replace(/\(.*?\)/g, ' ') // Remove parenthesized notes like (JCM 2000)
    .replace(/\b(modded|mod|modified|custom|reissue|vintage|original|relic|heavy\s*relic)\b/gi, ' ')
    .replace(/\b(mk2|mkii|mk3|mkiii|mk4|mkiv|v2|v3|gen\s*2|edition|series)\b/gi, ' ')
    .replace(/\b(50w|100w|20w|15w|watt|valve|tube)\b/gi, ' ')
    .replace(/\b(combo|head|stack|half\s*stack|cabinet|cab)\b/gi, ' ')
    .replace(/\b(overdrive|distortion|delay|reverb|chorus|pedal|stompbox)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Common gear synonym dictionary for normalization
 */
function normalizeSynonyms(brand: string, model: string, category: string): { brand: string; model: string } {
  let b = brand;
  let m = model;

  // Tube Screamer
  if (/tubescreamer|tube\s*screamer|ts9|ts808|ts-9|ts-808/i.test(m) || /tubescreamer|ts9|ts808/i.test(b)) {
    if (!b) b = 'Ibanez';
    m = 'Tube Screamer';
  }

  // 5150
  if (/5150/i.test(m)) {
    m = '5150';
    if (!b) b = 'Peavey';
  }

  // Dual Rectifier
  if (/dual\s*rec|dual\s*rectifier|recto/i.test(m)) {
    m = 'Dual Rectifier';
    if (!b) b = 'Mesa Boogie';
  }

  // Soldano SLO
  if (/slo-?\d+|slo\b/i.test(m)) {
    m = 'SLO';
    if (!b) b = 'Soldano';
  }

  // Boss Katana
  if (/katana/i.test(m)) {
    m = 'Katana';
    if (!b) b = 'Boss';
  }

  // Marshall DSL
  if (/dsl\d+|dsl\b/i.test(m)) {
    m = 'DSL';
    if (!b) b = 'Marshall';
  }

  return { brand: b, model: m };
}

/**
 * Builds an ordered list of search queries from most specific to broadest fallback
 */
function buildSearchQueries(
  brand?: string | null,
  model?: string | null,
  category?: string | null
): string[] {
  const rawBrand = (brand || '').trim();
  const rawModel = (model || '').trim();
  const cat = (category || '').toLowerCase().trim();

  const queries: string[] = [];

  const rawCombined = `${rawBrand} ${rawModel}`.trim();
  if (rawCombined) {
    queries.push(rawCombined);
  }

  // Apply synonym normalization
  const normalized = normalizeSynonyms(rawBrand, rawModel, cat);
  const normCombined = `${normalized.brand} ${normalized.model}`.trim();
  if (normCombined && !queries.includes(normCombined)) {
    queries.push(normCombined);
  }

  // Clean core query without noise
  const coreBrand = cleanCoreQuery(rawBrand);
  const coreModel = cleanCoreQuery(rawModel);
  const coreCombined = `${coreBrand} ${coreModel}`.trim();
  if (coreCombined && !queries.includes(coreCombined)) {
    queries.push(coreCombined);
  }

  // If we have brand + category (e.g. "Marshall amp" or "Charvel guitar")
  if (rawBrand && cat && ['guitar', 'bass', 'amp', 'pedal'].includes(cat)) {
    const brandCatQuery = `${rawBrand} ${cat}`;
    if (!queries.includes(brandCatQuery)) {
      queries.push(brandCatQuery);
    }
  }

  return queries;
}

/**
 * Executes a Reverb listings search for a single query string and scores/filters listings
 */
async function searchReverbWithFilters(
  query: string,
  targetCategory?: string | null,
  timeoutMs: number = 3500
): Promise<Array<{ title: string; photoUrl: string; score: number }>> {
  const url = `https://api.reverb.com/api/listings?query=${encodeURIComponent(query)}&per_page=20`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/hal+json',
        'Accept-Version': '3.0',
        'User-Agent': `Ryff/1.0 (contact: ${process.env.CONTACT_EMAIL || 'bedlamthebandbedlam@gmail.com'})`,
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json();
    const listings: Array<{
      title?: string;
      categories?: Array<{ full_name?: string; slug?: string }>;
      photos?: Array<{
        _links?: {
          large_crop?: { href?: string };
          full?: { href?: string };
          photo?: { href?: string };
          thumbnail?: { href?: string };
        };
      }>;
      _links?: {
        photo?: { href?: string };
      };
    }> = data.listings || [];

    const scored: Array<{ title: string; photoUrl: string; score: number }> = [];

    for (const item of listings) {
      const title = (item.title || '').trim();
      if (!title) continue;

      // STRICT DISQUALIFICATION: Disqualify accessories, covers, parts, pickups, boxes
      if (DISQUALIFIED_ACCESSORIES_REGEX.test(title)) {
        continue;
      }

      // Extract photo URL
      const photoObj = item.photos && item.photos[0];
      const photoUrl =
        photoObj?._links?.large_crop?.href ||
        photoObj?._links?.full?.href ||
        photoObj?._links?.photo?.href ||
        item._links?.photo?.href;

      if (!photoUrl) continue;

      let score = 100;
      const lowerTitle = title.toLowerCase();
      const lowerQuery = query.toLowerCase();

      // Check category match if known
      const itemCategorySlug = (item.categories?.[0]?.slug || '').toLowerCase();
      if (targetCategory === 'amp' && (itemCategorySlug.includes('amp') || lowerTitle.includes('amp'))) {
        score += 30;
      }
      if ((targetCategory === 'guitar' || targetCategory === 'bass') && (itemCategorySlug.includes('guitar') || itemCategorySlug.includes('bass'))) {
        score += 30;
      }
      if (targetCategory === 'pedal' && (itemCategorySlug.includes('effects') || itemCategorySlug.includes('pedal'))) {
        score += 30;
      }

      // Boost words from query present in listing title
      const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 2);
      for (const word of queryWords) {
        if (lowerTitle.includes(word)) {
          score += 15;
        }
      }

      scored.push({ title, photoUrl, score });
    }

    return scored.sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

/**
 * Queries Reverb listings API with intelligent query cascading, accessory disqualification,
 * and graceful fallback to Brand Logo or Category Artwork.
 */
export async function fetchReverbStockImage(
  brand?: string | null,
  model?: string | null,
  category?: string | null,
  options: { pickIndex?: number; timeoutMs?: number } = {}
): Promise<StockImageResult> {
  const b = (brand || '').trim();
  const m = (model || '').trim();
  const cat = (category || '').trim();

  const queries = buildSearchQueries(b, m, cat);
  if (queries.length === 0) {
    return {
      imageUrl: getCategoryFallbackImage(cat),
      source: 'category',
      pickIndex: 0,
      totalMatches: 0,
    };
  }

  const pickIndex = Math.max(0, options.pickIndex || 0);
  const timeoutMs = options.timeoutMs || 3500;

  // Try each search query in order
  for (const query of queries) {
    const scoredListings = await searchReverbWithFilters(query, cat, timeoutMs);
    if (scoredListings.length > 0) {
      const selectedIndex = pickIndex % scoredListings.length;
      const selected = scoredListings[selectedIndex];
      return {
        imageUrl: selected.photoUrl,
        source: 'reverb',
        title: selected.title,
        pickIndex: selectedIndex,
        totalMatches: scoredListings.length,
      };
    }
  }

  // If Reverb yielded 0 clean non-accessory matches (e.g. obscure Charvel CX692),
  // fall back to Brand Logo or Category Artwork
  const logoUrl = getBrandLogoUrl(b);
  if (logoUrl && b) {
    return {
      imageUrl: logoUrl,
      source: 'logo',
      pickIndex: 0,
      totalMatches: 0,
    };
  }

  return {
    imageUrl: getCategoryFallbackImage(cat),
    source: 'category',
    pickIndex: 0,
    totalMatches: 0,
  };
}
