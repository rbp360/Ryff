import { db } from '../db';
import { embedText } from './embeddings';
import { normalizeKey, toVectorLiteral } from './text';

export interface ComponentHit {
  id: number;
  category: string;
  manufacturer: string;
  model_name: string;
  sub_type: string | null;
  canonical_text: string;
  owners: number;
  score: number;
}

export interface PassportHit {
  rig_item_id: number;
  document_chunk: string;
  score: number;
}

export interface GearKnowledge {
  components: ComponentHit[];
  passports: PassportHit[];
}

/**
 * Pattern A: semantic retrieval ("What is that obscure pickup?", "guitars built for sludgy doom").
 * Qualitative only: never use this for counting; use getPlayerRegistryStats.
 */
export async function searchGearKnowledge(
  query: string,
  opts: { limit?: number; minScore?: number } = {}
): Promise<GearKnowledge> {
  const limit = opts.limit ?? 3;
  const minScore = opts.minScore ?? 0.6;
  const q = query.trim();
  if (!q) return { components: [], passports: [] };

  const compVec = await embedText(q, 'SEMANTIC_SIMILARITY');
  const passVec = await embedText(q, 'RETRIEVAL_QUERY');

  let components: ComponentHit[] = [];
  if (compVec) {
    const lit = toVectorLiteral(compVec);
    const rows = await db`
      select c.id, c.category, c.manufacturer, c.model_name, c.sub_type, c.canonical_text,
             (select count(*) from rig_item_components rc where rc.component_id = c.id) as owners,
             1 - (c.embedding <=> ${lit}::vector) as score
      from canonical_components c
      where c.embedding is not null
      order by c.embedding <=> ${lit}::vector
      limit ${limit}
    `;
    components = rows
      .filter((r) => Number(r.score) >= minScore)
      .map((r) => ({
        id: Number(r.id),
        category: r.category,
        manufacturer: r.manufacturer,
        model_name: r.model_name,
        sub_type: r.sub_type,
        canonical_text: r.canonical_text,
        owners: Number(r.owners),
        score: Number(r.score),
      }));
  } else {
    // Lexical fallback when embeddings are unavailable.
    const key = normalizeKey(q);
    if (key) {
      const rows = await db`
        select c.id, c.category, c.manufacturer, c.model_name, c.sub_type, c.canonical_text,
               (select count(*) from rig_item_components rc where rc.component_id = c.id) as owners
        from canonical_components c
        where ${key} like '%' || lower(c.model_name) || '%' and length(c.model_name) > 2
        limit ${limit}
      `;
      components = rows.map((r) => ({
        id: Number(r.id),
        category: r.category,
        manufacturer: r.manufacturer,
        model_name: r.model_name,
        sub_type: r.sub_type,
        canonical_text: r.canonical_text,
        owners: Number(r.owners),
        score: 1,
      }));
    }
  }

  let passports: PassportHit[] = [];
  if (passVec) {
    const lit = toVectorLiteral(passVec);
    const rows = await db`
      select rig_item_id, document_chunk, 1 - (text_embedding <=> ${lit}::vector) as score
      from rig_item_knowledge
      where text_embedding is not null
      order by text_embedding <=> ${lit}::vector
      limit ${limit}
    `;
    passports = rows
      .filter((r) => Number(r.score) >= minScore)
      .map((r) => ({ rig_item_id: Number(r.rig_item_id), document_chunk: r.document_chunk, score: Number(r.score) }));
  }

  return { components, passports };
}

export type StatMetric = 'string_gauge' | 'tuning' | 'string_brand' | 'bridge_pickup' | 'neck_pickup';

export interface StatFilters {
  brand?: string | null;
  numberOfStrings?: number | null;
  scaleLength?: number | null;
  limit?: number;
}

export interface StatRow {
  value: string;
  count: number;
  percentage: number;
}

export interface RegistryStats {
  metric: StatMetric;
  sampleSize: number;
  rows: StatRow[];
}

/**
 * Pattern B: deterministic aggregates over registered instruments ("what gauge do most 25.5" players use?").
 * Pure SQL so the LLM never has to count.
 */
export async function getPlayerRegistryStats(metric: StatMetric, filters: StatFilters = {}): Promise<RegistryStats> {
  const limit = Math.min(Math.max(filters.limit ?? 5, 1), 20);
  const brand = filters.brand?.trim() || null;
  const nStrings = filters.numberOfStrings ?? null;
  const scale = filters.scaleLength ?? null;

  const where = db`
    ri.kind = 'own' and ri.deleted = false
    ${brand ? db`and ri.brand ilike ${brand}` : db``}
    ${nStrings ? db`and ri.number_of_strings = ${nStrings}` : db``}
    ${scale ? db`and (ri.specs->>'scale_length')::numeric = ${scale}` : db``}
  `;

  let rows;
  if (metric === 'string_gauge' || metric === 'tuning') {
    const col = metric === 'string_gauge' ? db`ri.string_gauge` : db`ri.tuning`;
    rows = await db`
      select ${col} as value, count(*)::int as count,
             round(count(*) * 100.0 / sum(count(*)) over (), 1) as percentage
      from rig_items ri
      where ${where} and ${col} is not null and ${col} <> ''
      group by ${col}
      order by count desc, value
      limit ${limit}
    `;
  } else {
    const join =
      metric === 'string_brand'
        ? db`rc.slot = 'strings'`
        : metric === 'bridge_pickup'
          ? db`rc.slot = 'pickup_bridge'`
          : db`rc.slot = 'pickup_neck'`;
    rows = await db`
      select c.manufacturer || ' ' || c.model_name as value, count(*)::int as count,
             round(count(*) * 100.0 / sum(count(*)) over (), 1) as percentage
      from rig_items ri
      join rig_item_components rc on rc.rig_item_id = ri.id and ${join}
      join canonical_components c on c.id = rc.component_id
      where ${where}
      group by c.id, c.manufacturer, c.model_name
      order by count desc, value
      limit ${limit}
    `;
  }

  const [{ n }] = await db`select count(*)::int as n from rig_items ri where ${where}`;
  return {
    metric,
    sampleSize: Number(n),
    rows: rows.map((r) => ({ value: String(r.value), count: Number(r.count), percentage: Number(r.percentage) })),
  };
}

/** Heuristic: which aggregate (if any) a free-text question is asking about. */
export function detectStatMetric(message: string): StatMetric | null {
  const m = message.toLowerCase();
  if (!/(most|common|popular|typical|usually|average|what do (people|players)|how many|which .* use)/.test(m)) return null;
  if (/gauge|\b\d{2}\s?-\s?\d{2}\b/.test(m)) return 'string_gauge';
  if (/tuning|drop [a-g]|tune/.test(m)) return 'tuning';
  if (/string(s)?\b.*(brand|make)|(brand|make).*string/.test(m)) return 'string_brand';
  if (/neck pickup/.test(m)) return 'neck_pickup';
  if (/pickup|humbucker|single.?coil|p90/.test(m)) return 'bridge_pickup';
  return null;
}

export interface KnowledgeContext {
  components: ComponentHit[];
  passports: PassportHit[];
  stats: RegistryStats | null;
}

/** One-call helper for bots: semantic hits + (when the question is quantitative) SQL stats. */
export async function retrieveKnowledgeContext(message: string): Promise<KnowledgeContext> {
  try {
    const metric = detectStatMetric(message);
    const [knowledge, stats] = await Promise.all([
      searchGearKnowledge(message, { limit: 3 }),
      metric ? getPlayerRegistryStats(metric) : Promise.resolve(null),
    ]);
    return { ...knowledge, stats: stats && stats.rows.length > 0 ? stats : null };
  } catch (err) {
    console.warn('[Knowledge] retrieval failed:', err instanceof Error ? err.message : err);
    return { components: [], passports: [], stats: null };
  }
}

