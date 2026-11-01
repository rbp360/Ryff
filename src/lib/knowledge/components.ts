import { db } from '../db';
import { complete } from '../llm';
import { env } from '../env';
import { sanitiseUntrusted } from '../guard';
import { embedText } from './embeddings';
import {
  ComponentCategory,
  DEDUP_THRESHOLD,
  NORMALIZER_SYSTEM_PROMPT,
  NormalizedGear,
  canonicalEmbeddingText,
  canonicalKey,
  fallbackNormalize,
  normalizeKey,
  parseNormalizedGear,
  toVectorLiteral,
} from './text';

export interface ResolvedComponent {
  id: number;
  created: boolean;
  via: 'alias' | 'vector' | 'exact' | 'new';
}

/**
 * Entity resolution for crowdsourced gear text.
 *  1. alias cache hit            -> link
 *  2. vector match >= threshold  -> link (+ remember alias)
 *  3. otherwise LLM-normalise, upsert canonical component, embed, remember alias.
 * Without an embedding key it degrades to exact normalised-key matching.
 */
export async function resolveComponent(args: {
  category: ComponentCategory;
  rawText: string;
  brandHint?: string | null;
}): Promise<ResolvedComponent | null> {
  const { category, brandHint } = args;
  const rawText = sanitiseUntrusted(args.rawText, 160).trim();
  const aliasKey = normalizeKey(rawText);
  if (!aliasKey) return null;

  // 1. Alias cache
  const [alias] = await db`
    select component_id from component_aliases
    where category = ${category} and alias_key = ${aliasKey}
  `;
  if (alias) return { id: Number(alias.component_id), created: false, via: 'alias' };

  // 2. Vector similarity against the catalog
  const rawVec = await embedText(`${category}: ${rawText}`, 'SEMANTIC_SIMILARITY');
  if (rawVec) {
    const [nearest] = await db`
      select id, 1 - (embedding <=> ${toVectorLiteral(rawVec)}::vector) as similarity
      from canonical_components
      where category = ${category} and embedding is not null
      order by embedding <=> ${toVectorLiteral(rawVec)}::vector
      limit 1
    `;
    if (nearest && Number(nearest.similarity) >= DEDUP_THRESHOLD) {
      await rememberAlias(category, aliasKey, Number(nearest.id));
      return { id: Number(nearest.id), created: false, via: 'vector' };
    }
  }

  // 3. Normalise (LLM, with deterministic fallback) and upsert
  const gear = await normalizeWithLlm(category, rawText, brandHint);
  const key = canonicalKey(gear);

  const [existing] = await db`
    select id from canonical_components where category = ${category} and normalized_key = ${key}
  `;
  if (existing) {
    await rememberAlias(category, aliasKey, Number(existing.id));
    return { id: Number(existing.id), created: false, via: 'exact' };
  }

  const canonicalText = canonicalEmbeddingText(category, gear);
  const canonVec = await embedText(canonicalText, 'SEMANTIC_SIMILARITY');
  const source = gear.canonical_description.startsWith(`${category}: `) ? 'fallback' : 'llm';

  const [row] = await db`
    insert into canonical_components
      (category, manufacturer, model_name, sub_type, normalized_key, specs, canonical_text, embedding, source)
    values (
      ${category}, ${gear.manufacturer}, ${gear.model_name}, ${gear.sub_type ?? null}, ${key},
      ${JSON.stringify(gear.specs || {})}::jsonb, ${canonicalText},
      ${canonVec ? toVectorLiteral(canonVec) : null}::vector, ${source}
    )
    on conflict (category, normalized_key) do update set updated_at = now()
    returning id, (xmax = 0) as inserted
  `;
  await rememberAlias(category, aliasKey, Number(row.id));
  return { id: Number(row.id), created: Boolean(row.inserted), via: 'new' };
}

async function rememberAlias(category: string, aliasKey: string, componentId: number) {
  await db`
    insert into component_aliases (category, alias_key, component_id)
    values (${category}, ${aliasKey}, ${componentId})
    on conflict (category, alias_key) do nothing
  `;
}

async function normalizeWithLlm(
  category: ComponentCategory,
  rawText: string,
  brandHint?: string | null
): Promise<NormalizedGear> {
  const hasKey = Boolean(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY);
  if (!hasKey) return fallbackNormalize(category, rawText, brandHint);
  try {
    const res = await complete({
      model: env.MODEL_FAST,
      system: NORMALIZER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Category hint: ${category}\n${brandHint ? `Brand hint: ${brandHint}\n` : ''}User submission: "${rawText}"`,
        },
      ],
      maxTokens: 400,
      temperature: 0,
      purpose: 'gear_normalize',
    });
    const parsed = parseNormalizedGear(res.text);
    if (parsed) return { ...parsed, category };
  } catch (err) {
    console.warn('[Knowledge] normalizer failed, using fallback:', err instanceof Error ? err.message : err);
  }
  return fallbackNormalize(category, rawText, brandHint);
}

