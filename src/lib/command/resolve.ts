import { db } from '../db';
import { getRigistryLookup } from '../rigistry-parser';

export interface GearItem {
  id: number;
  brand: string | null;
  model: string | null;
  nickname?: string | null;
  category: string;
  raw_text: string;
  tuning?: string | null;
  string_gauge?: string | null;
  string_manufacturer?: string | null;
  last_restrung_at?: Date | string | null;
  pickup_bridge?: string | null;
  pickup_middle?: string | null;
  pickup_neck?: string | null;
  amp_settings?: string | null;
}

export type ResolveGearResult =
  | { status: 'resolved'; gear: GearItem }
  | { status: 'ambiguous'; candidates: GearItem[]; ref: string }
  | { status: 'unresolved'; ref: string };

function cleanRef(str: string): string {
  return str
    .toLowerCase()
    .replace(/^(the|my|this|an|a)\s+/i, '')
    .replace(/[^\w\s-]/g, '')
    .trim();
}

/**
 * Resolves a colloquial gear reference (e.g. "the PRS", "my Strat", "5150", "this guitar")
 * against the user's owned gear in the database.
 * 
 * Rules:
 * 1. If activeGearId is present and reference is generic ("this", "this guitar") or matches it, prefer it.
 * 2. If exactly one owned gear item matches, return resolved.
 * 3. If two or more owned gear items match, return ambiguous with candidates. Never guess.
 * 4. If no gear matches, return unresolved.
 */
export async function resolveGearReference(
  userId: string,
  gearRef?: string | null,
  activeGearId?: string | number | null
): Promise<ResolveGearResult> {
  // Load user's owned gear items
  const rawItems = await db`
    select id, brand, model, nickname, category, raw_text,
           tuning, string_gauge, string_manufacturer, last_restrung_at,
           pickup_bridge, pickup_middle, pickup_neck, amp_settings
    from rig_items
    where user_id = ${userId} and kind = 'own'
    order by id asc
  `;

  const items: GearItem[] = rawItems.map((r: any) => ({
    id: Number(r.id),
    brand: r.brand,
    model: r.model,
    nickname: r.nickname,
    category: r.category,
    raw_text: r.raw_text,
    tuning: r.tuning,
    string_gauge: r.string_gauge,
    string_manufacturer: r.string_manufacturer,
    last_restrung_at: r.last_restrung_at,
    pickup_bridge: r.pickup_bridge,
    pickup_middle: r.pickup_middle,
    pickup_neck: r.pickup_neck,
    amp_settings: r.amp_settings,
  }));

  if (items.length === 0) {
    return { status: 'unresolved', ref: gearRef || 'gear' };
  }

  // 1. Context preference: if activeGearId is provided
  if (activeGearId) {
    const targetId = Number(activeGearId);
    const activeItem = items.find((it) => it.id === targetId);

    if (activeItem) {
      if (!gearRef) {
        return { status: 'resolved', gear: activeItem };
      }

      const clean = cleanRef(gearRef);
      const rawLower = gearRef.toLowerCase().trim();
      const isGeneric =
        [
          'this',
          'this guitar',
          'this instrument',
          'this gear',
          'this amp',
          'this pedal',
          'guitar',
          'instrument',
          'gear',
          'amp',
          'pedal',
          'it',
          '',
        ].includes(clean) ||
        ['this', 'this guitar', 'this instrument', 'this gear', 'this amp', 'this pedal'].includes(rawLower);

      if (isGeneric) {
        return { status: 'resolved', gear: activeItem };
      }

      // Check if reference explicitly matches the active item
      const activeBrand = (activeItem.brand || '').toLowerCase();
      const activeModel = (activeItem.model || '').toLowerCase();
      const activeNick = (activeItem.nickname || '').toLowerCase();
      const activeRaw = (activeItem.raw_text || '').toLowerCase();

      if (
        (activeNick && activeNick.includes(clean)) ||
        (activeModel && activeModel.includes(clean)) ||
        (activeBrand && activeBrand.includes(clean)) ||
        activeRaw.includes(clean)
      ) {
        return { status: 'resolved', gear: activeItem };
      }
    }
  }

  if (!gearRef) {
    // If user only owns exactly 1 piece of gear, resolve to it
    if (items.length === 1) {
      return { status: 'resolved', gear: items[0] };
    }
    return { status: 'ambiguous', candidates: items, ref: '' };
  }

  const rawClean = cleanRef(gearRef);
  if (!rawClean) {
    if (items.length === 1) return { status: 'resolved', gear: items[0] };
    return { status: 'ambiguous', candidates: items, ref: gearRef };
  }

  // 2. Check nickname matches first (e.g. "Lucille", "Old Black", "Red Special")
  const nicknameMatches = items.filter(
    (it) => it.nickname && it.nickname.toLowerCase().includes(rawClean)
  );
  if (nicknameMatches.length === 1) {
    return { status: 'resolved', gear: nicknameMatches[0] };
  } else if (nicknameMatches.length > 1) {
    return { status: 'ambiguous', candidates: nicknameMatches, ref: gearRef };
  }

  // 3. Exact and substring matching against model and raw_text
  const modelMatches = items.filter((it) => {
    const model = (it.model || '').toLowerCase();
    const raw = (it.raw_text || '').toLowerCase();
    return model.includes(rawClean) || raw.includes(rawClean);
  });

  if (modelMatches.length === 1) {
    return { status: 'resolved', gear: modelMatches[0] };
  } else if (modelMatches.length > 1) {
    return { status: 'ambiguous', candidates: modelMatches, ref: gearRef };
  }

  // 4. Match brand and brand aliases (e.g. "PRS", "Strat", "Paul Reed Smith", "Fender")
  let normalizedBrandQuery = rawClean;
  try {
    const lookup = await getRigistryLookup();
    const aliasMatch = lookup.aliasToBrand.get(rawClean);
    if (aliasMatch) {
      normalizedBrandQuery = aliasMatch.name.toLowerCase();
    }
  } catch {
    // Fall back to direct string matching
  }

  const brandMatches = items.filter((it) => {
    const brand = (it.brand || '').toLowerCase();
    return (
      brand.includes(rawClean) ||
      brand.includes(normalizedBrandQuery) ||
      rawClean.includes(brand)
    );
  });

  if (brandMatches.length === 1) {
    return { status: 'resolved', gear: brandMatches[0] };
  } else if (brandMatches.length > 1) {
    return { status: 'ambiguous', candidates: brandMatches, ref: gearRef };
  }

  // 5. Category matching (e.g. "the acoustic", "the bass", "my amp")
  const categoryMatches = items.filter((it) => {
    const cat = (it.category || '').toLowerCase();
    return cat.includes(rawClean) || rawClean.includes(cat);
  });

  if (categoryMatches.length === 1) {
    return { status: 'resolved', gear: categoryMatches[0] };
  } else if (categoryMatches.length > 1) {
    return { status: 'ambiguous', candidates: categoryMatches, ref: gearRef };
  }

  return { status: 'unresolved', ref: gearRef };
}
