import { db } from './db';
import { cleanGearText, formatGearTitle } from './gear-utils';

export { cleanGearText, formatGearTitle };


export interface ParsedRigLine {
  raw_text: string;
  kind: 'own' | 'want';
  brand: string | null;
  model: string | null;
  category: 'guitar' | 'bass' | 'amp' | 'pedal' | 'other';
  budget_gbp: number | null;
  want_key: string | null;
}

interface CachedBrand {
  id: number;
  name: string;
  normalized_name: string;
  categories: string[];
  is_canonical: boolean;
}

interface RigistryLookup {
  brands: CachedBrand[];
  aliasToBrand: Map<string, CachedBrand>;
  brandMap: Map<string, CachedBrand>;
}

let cachedLookup: RigistryLookup | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const STATIC_FALLBACK_BRANDS: Array<{
  id: number;
  name: string;
  normalized_name: string;
  categories: string[];
  is_canonical: boolean;
  aliases?: string[];
}> = [
  { id: 1, name: 'Fender', normalized_name: 'fender', categories: ['guitar', 'bass', 'amplifiers-effects'], is_canonical: true },
  { id: 2, name: 'Gibson', normalized_name: 'gibson', categories: ['guitar', 'bass'], is_canonical: true },
  { id: 3, name: 'PRS', normalized_name: 'prs', categories: ['guitar', 'bass', 'amplifiers-effects'], is_canonical: true, aliases: ['paul reed smith', 'prs guitars'] },
  { id: 4, name: 'Charvel', normalized_name: 'charvel', categories: ['guitar'], is_canonical: true },
  { id: 5, name: 'Soldano', normalized_name: 'soldano', categories: ['amplifiers-effects'], is_canonical: true, aliases: ['soldano amplification'] },
  { id: 6, name: 'Ibanez', normalized_name: 'ibanez', categories: ['guitar', 'bass', 'amplifiers-effects'], is_canonical: true },
  { id: 7, name: 'Marshall', normalized_name: 'marshall', categories: ['amplifiers-effects'], is_canonical: true },
  { id: 8, name: 'Boss', normalized_name: 'boss', categories: ['amplifiers-effects'], is_canonical: true },
  { id: 9, name: 'Strymon', normalized_name: 'strymon', categories: ['amplifiers-effects'], is_canonical: true },
  { id: 10, name: 'ESP', normalized_name: 'esp', categories: ['guitar', 'bass'], is_canonical: true, aliases: ['esp guitars', 'ltd'] },
  { id: 11, name: 'Jackson', normalized_name: 'jackson', categories: ['guitar', 'bass'], is_canonical: true },
  { id: 12, name: 'Epiphone', normalized_name: 'epiphone', categories: ['guitar', 'bass'], is_canonical: true },
  { id: 13, name: 'Music Man', normalized_name: 'music man', categories: ['guitar', 'bass'], is_canonical: true, aliases: ['ernie ball music man', 'ebmm'] },
  { id: 14, name: 'Schecter', normalized_name: 'schecter', categories: ['guitar', 'bass'], is_canonical: true },
  { id: 15, name: 'Yamaha', normalized_name: 'yamaha', categories: ['guitar', 'bass', 'keyboard-synth-sampler', 'drums'], is_canonical: true },
  { id: 16, name: 'Squier', normalized_name: 'squier', categories: ['guitar', 'bass'], is_canonical: true },
  { id: 17, name: 'Gretsch', normalized_name: 'gretsch', categories: ['guitar', 'drums'], is_canonical: true },
  { id: 18, name: 'Taylor', normalized_name: 'taylor', categories: ['guitar'], is_canonical: true },
  { id: 19, name: 'Martin', normalized_name: 'martin', categories: ['guitar'], is_canonical: true, aliases: ['c f martin', 'cf martin'] },
  { id: 20, name: 'Vox', normalized_name: 'vox', categories: ['amplifiers-effects', 'guitar'], is_canonical: true },
  { id: 21, name: 'Mesa/Boogie', normalized_name: 'mesa boogie', categories: ['amplifiers-effects'], is_canonical: true, aliases: ['mesa', 'boogie'] },
  { id: 22, name: 'Orange', normalized_name: 'orange', categories: ['amplifiers-effects'], is_canonical: true, aliases: ['orange amplification'] },
  { id: 23, name: 'Peavey', normalized_name: 'peavey', categories: ['amplifiers-effects', 'guitar', 'bass'], is_canonical: true },
  { id: 24, name: 'EVH', normalized_name: 'evh', categories: ['guitar', 'amplifiers-effects'], is_canonical: true },
  { id: 25, name: 'Suhr', normalized_name: 'suhr', categories: ['guitar', 'amplifiers-effects'], is_canonical: true },
  { id: 26, name: 'Duesenberg', normalized_name: 'duesenberg', categories: ['guitar', 'bass'], is_canonical: true },
  { id: 27, name: 'Rickenbacker', normalized_name: 'rickenbacker', categories: ['guitar', 'bass'], is_canonical: true },
  { id: 28, name: 'Electro-Harmonix', normalized_name: 'electro harmonix', categories: ['amplifiers-effects'], is_canonical: true, aliases: ['ehx'] },
  { id: 29, name: 'MXR', normalized_name: 'mxr', categories: ['amplifiers-effects'], is_canonical: true },
  { id: 30, name: 'TC Electronic', normalized_name: 'tc electronic', categories: ['amplifiers-effects'], is_canonical: true },
  { id: 31, name: 'Dunlop', normalized_name: 'dunlop', categories: ['amplifiers-effects', 'accessories'], is_canonical: true, aliases: ['jim dunlop'] },
  { id: 32, name: 'Korg', normalized_name: 'korg', categories: ['keyboard-synth-sampler', 'accessories'], is_canonical: true },
  { id: 33, name: 'Roland', normalized_name: 'roland', categories: ['keyboard-synth-sampler', 'drums', 'amplifiers-effects'], is_canonical: true },
  { id: 34, name: 'Moog', normalized_name: 'moog', categories: ['keyboard-synth-sampler'], is_canonical: true },
  { id: 35, name: 'Shure', normalized_name: 'shure', categories: ['vocals-microphone', 'live-sound'], is_canonical: true },
  { id: 36, name: 'Sennheiser', normalized_name: 'sennheiser', categories: ['vocals-microphone', 'live-sound', 'studio-sound'], is_canonical: true },
];

function buildStaticFallbackLookup(): RigistryLookup {
  const brandMap = new Map<string, CachedBrand>();
  const aliasToBrand = new Map<string, CachedBrand>();

  for (const b of STATIC_FALLBACK_BRANDS) {
    brandMap.set(b.normalized_name, b);
    brandMap.set(b.name.toLowerCase().trim(), b);
    if (b.aliases) {
      for (const a of b.aliases) {
        aliasToBrand.set(normalizeKey(a), b);
        aliasToBrand.set(a.toLowerCase().trim(), b);
      }
    }
  }

  const sortedBrands = [...STATIC_FALLBACK_BRANDS].sort((a, b) => b.name.length - a.name.length);

  return {
    brands: sortedBrands,
    aliasToBrand,
    brandMap,
  };
}

/**
 * Load brands and aliases from the PostgreSQL Rigistry database into memory.
 */
export async function getRigistryLookup(): Promise<RigistryLookup> {
  const now = Date.now();
  if (cachedLookup && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedLookup;
  }

  try {
    const brandsRows = await db<CachedBrand[]>`
      select id, name, normalized_name, categories, is_canonical
      from brands
    `;

    if (!brandsRows || brandsRows.length === 0) {
      return buildStaticFallbackLookup();
    }

    const aliasRows = await db<{ alias: string; brand_id: number }[]>`
      select alias, brand_id
      from brand_aliases
    `;

    const brandMap = new Map<string, CachedBrand>();
    for (const b of brandsRows) {
      brandMap.set(b.normalized_name, b);
      // Also map the exact lowercase name
      brandMap.set(b.name.toLowerCase().trim(), b);
    }

    const aliasToBrand = new Map<string, CachedBrand>();
    const brandsById = new Map<number, CachedBrand>(brandsRows.map((b) => [b.id, b]));

    for (const a of aliasRows) {
      const b = brandsById.get(a.brand_id);
      if (b) {
        aliasToBrand.set(normalizeKey(a.alias), b);
        aliasToBrand.set(a.alias.toLowerCase().trim(), b);
      }
    }

    // Sort brands by length descending so multi-word brands (e.g. "Paul Reed Smith") match first
    const sortedBrands = [...brandsRows].sort((a, b) => b.name.length - a.name.length);

    cachedLookup = {
      brands: sortedBrands,
      aliasToBrand,
      brandMap,
    };
    lastCacheTime = now;
    return cachedLookup;
  } catch (err) {
    console.error('[RigistryParser] Failed to load brands from DB, using fallback:', err);
    return buildStaticFallbackLookup();
  }
}



/**
 * Determine instrument/gear category using regex keywords and SQL manufacturer taxonomy.
 */
function inferCategory(
  text: string,
  model: string,
  brandCategories: string[]
): 'guitar' | 'bass' | 'amp' | 'pedal' | 'other' {
  const combined = `${text} ${model}`.toLowerCase();

  // 1. Explicit pedal keywords
  if (
    /overdrive|distortion|fuzz|delay|reverb|chorus|flanger|phaser|tremolo|looper|compressor|booster|tuner|pedal|stomp|screamer|tubescreamer|ts9|ts808|wah\b|big muff|klon|drive\b/i.test(
      combined
    )
  ) {
    return 'pedal';
  }

  // 2. Explicit amp keywords
  if (
    /katana|deluxe reverb|twin reverb|combo|head\b|cab\b|cabinet|amplifier|amp\b|stack|half stack|preamp|power amp|50w|100w|20w|15w|watt|valve|tube|slo-?\d+|slo\b|dsl|jcm|rectifier|dual rec/i.test(
      combined
    )
  ) {
    return 'amp';
  }

  // 3. Explicit bass keywords
  if (/precision bass|jazz bass|p bass|j bass|bass guitar|bass\b/i.test(combined)) {
    return 'bass';
  }

  // 4. Explicit guitar keywords & models
  if (
    /stratocaster|strat\b|telecaster|tele\b|les paul|sg\b|jazzmaster|mustang|dinky|soloist|750xl|cx\d+|superstrat|flying v|explorer|electric guitar|acoustic guitar|guitar\b|cu24|custom 24|silver sky|rg\d+|s series|eg\b/i.test(
      combined
    )
  ) {
    return 'guitar';
  }

  // 5. Check Brand's categories from Rigistry database
  if (brandCategories && brandCategories.length > 0) {
    if (brandCategories.includes('guitar') && !brandCategories.includes('amplifiers-effects')) {
      return 'guitar';
    }
    if (brandCategories.includes('amplifiers-effects')) {
      return 'amp';
    }
    if (brandCategories.includes('bass')) {
      return 'bass';
    }
  }

  return 'other';
}



/**
 * Robust gear line parser that checks against 4,000+ brands and aliases in the SQL database.
 */
export async function parseGearLineWithRigistry(line: string): Promise<ParsedRigLine> {
  const { cleaned, isWant, budget_gbp } = cleanGearText(line);
  const kind: 'own' | 'want' = isWant ? 'want' : 'own';

  if (!cleaned) {
    return {
      raw_text: line.trim(),
      kind,
      brand: null,
      model: line.trim(),
      category: 'other',
      budget_gbp,
      want_key: null,
    };
  }

  const lookup = await getRigistryLookup();
  const normalizedInput = normalizeKey(cleaned);
  const words = normalizedInput.split(' ').filter(Boolean);

  let matchedBrand: CachedBrand | null = null;

  // 1. Check exact brand match first if the whole input is just a brand name (e.g. "Soldano", "Charvel", "PRS")
  if (lookup.brandMap.has(normalizedInput)) {
    matchedBrand = lookup.brandMap.get(normalizedInput)!;
  } else if (lookup.aliasToBrand.has(normalizedInput)) {
    matchedBrand = lookup.aliasToBrand.get(normalizedInput)!;
  }

  // 2. Check alias or brand prefix matching from longest candidate prefix
  if (!matchedBrand) {
    for (let i = Math.min(words.length, 5); i >= 1; i--) {
      const candidate = words.slice(0, i).join(' ');

      if (lookup.brandMap.has(candidate)) {
        matchedBrand = lookup.brandMap.get(candidate)!;
        break;
      }
      if (lookup.aliasToBrand.has(candidate)) {
        matchedBrand = lookup.aliasToBrand.get(candidate)!;
        break;
      }
    }
  }

  // 3. Fallback: check if any canonical brand name is at the start of cleaned
  if (!matchedBrand) {
    const lowerClean = cleaned.toLowerCase();
    for (const b of lookup.brands) {
      const bLower = b.name.toLowerCase();
      // Match whole word at beginning
      if (lowerClean === bLower || lowerClean.startsWith(bLower + ' ') || lowerClean.startsWith(bLower + '-')) {
        matchedBrand = b;
        break;
      }
    }
  }

  // 4. Fallback: check if well-known brand alias or brand name appears anywhere in the string
  if (!matchedBrand) {
    for (const b of lookup.brands) {
      if (b.is_canonical || b.name.length > 4) {
        const regex = new RegExp(`\\b${b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(cleaned)) {
          matchedBrand = b;
          break;
        }
      }
    }
  }

  // Extract clean model
  let brandName = matchedBrand ? matchedBrand.name : null;
  let model: string = cleaned;

  if (matchedBrand) {
    // If the input started with the brand/alias, strip it from the model
    const lowerClean = cleaned.toLowerCase();
    const bLower = matchedBrand.name.toLowerCase();
    const normName = matchedBrand.normalized_name;

    if (lowerClean.startsWith(bLower)) {
      model = cleaned.slice(matchedBrand.name.length).trim();
    } else if (lowerClean.startsWith(normName)) {
      model = cleaned.slice(normName.length).trim();
    } else {
      // Check if alias matched at start
      const firstWord = lowerClean.split(/[\s:–—-]+/)[0];
      if (firstWord && lookup.aliasToBrand.has(firstWord)) {
        model = cleaned.slice(firstWord.length).trim();
      }
    }

    // Clean remaining leading colons/punctuation
    model = model.replace(/^[\s:–—•·\-,;]+/g, '').trim();

    // If model is empty (e.g. user just typed "Soldano"), model is brand name
    if (!model) {
      model = matchedBrand.name;
    }

    // Canonical display adjustments (e.g., PRS is widely known as PRS)
    if (matchedBrand.normalized_name === 'paul reed smith' || matchedBrand.normalized_name === 'prs') {
      brandName = 'PRS';
    }
  }

  // Infer category
  const category = inferCategory(cleaned, model, matchedBrand?.categories || []);

  // The search term for Reverb is directly the cleaned string entered by the user
  const computedWantKey = kind === 'want' ? cleaned.toLowerCase() : null;

  return {
    raw_text: cleaned,
    kind,
    brand: brandName,
    model: model || cleaned,
    category,
    budget_gbp,
    want_key: computedWantKey,
  };
}

/**
 * Batch parse multiple gear lines.
 */
export async function parseGearLinesWithRigistry(lines: string[]): Promise<ParsedRigLine[]> {
  const results: ParsedRigLine[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    results.push(await parseGearLineWithRigistry(line));
  }
  return results;
}
