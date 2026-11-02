import { db } from '../db';
import { embedImage, embedTextForImageSearch } from './embeddings';
import { toVectorLiteral } from './text';
import { env } from '../env';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export interface LoadedImage {
  bytes: Buffer;
  mimeType: string;
}

function isPrivateHost(host: string): boolean {
  return (
    host === 'localhost' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host.endsWith('.internal') ||
    host.endsWith('.local') ||
    host === '[::1]'
  );
}

/** Loads image bytes from a data: URL or a public https URL (size/MIME capped, private hosts refused). */
export async function loadImage(url: string): Promise<LoadedImage | null> {
  try {
    if (url.startsWith('data:')) {
      const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(url.replace(/\n/g, ''));
      if (!m || !ALLOWED_MIME.has(m[1])) return null;
      const bytes = Buffer.from(m[2], 'base64');
      return bytes.length > 0 && bytes.length <= MAX_IMAGE_BYTES ? { bytes, mimeType: m[1] } : null;
    }
    const u = new URL(url);
    if (u.protocol !== 'https:' || isPrivateHost(u.hostname)) return null;
    const res = await fetch(u, { signal: AbortSignal.timeout(10_000), redirect: 'error' });
    if (!res.ok) return null;
    const mimeType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_MIME.has(mimeType)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length > 0 && bytes.length <= MAX_IMAGE_BYTES ? { bytes, mimeType } : null;
  } catch {
    return null;
  }
}

/** Embeds a rig item's image into the multimodal space. Skips if the URL is unchanged. */
export async function syncRigItemImage(rigItemId: number): Promise<{ embedded: boolean; reason?: string }> {
  const [item] = await db`select image_url, kind, deleted from rig_items where id = ${rigItemId}`;
  if (!item || item.kind !== 'own' || item.deleted || !item.image_url) {
    await db`delete from rig_item_image_vectors where rig_item_id = ${rigItemId}`;
    return { embedded: false, reason: 'no_image' };
  }
  const [prev] = await db`select image_url, embedding_model from rig_item_image_vectors where rig_item_id = ${rigItemId}`;
  if (prev && prev.image_url === item.image_url && prev.embedding_model === env.IMAGE_EMBEDDING_MODEL) {
    return { embedded: false, reason: 'unchanged' };
  }
  const img = await loadImage(item.image_url);
  if (!img) return { embedded: false, reason: 'unloadable' };
  const vec = await embedImage(img.bytes, img.mimeType);
  if (!vec) return { embedded: false, reason: 'embed_failed' };
  await db`
    insert into rig_item_image_vectors (rig_item_id, image_url, image_embedding, embedding_model)
    values (${rigItemId}, ${item.image_url}, ${toVectorLiteral(vec)}::vector, ${env.IMAGE_EMBEDDING_MODEL})
    on conflict (rig_item_id) do update set
      image_url = excluded.image_url, image_embedding = excluded.image_embedding,
      embedding_model = excluded.embedding_model, embedded_at = now()
  `;
  return { embedded: true };
}

export interface ImageMatch {
  rig_item_id: number;
  brand: string | null;
  model: string | null;
  category: string | null;
  image_url?: string | null;
  score: number;
}

export interface GearIdentification {
  best: { brand: string; model: string; confidence: number; votes: number } | null;
  matches: ImageMatch[];
}

async function nearestByVector(vec: number[], limit: number): Promise<ImageMatch[]> {
  const lit = toVectorLiteral(vec);
  const rows = await db`
    select v.rig_item_id, ri.brand, ri.model, ri.category, v.image_url, 1 - (v.image_embedding <=> ${lit}::vector) as score
    from rig_item_image_vectors v
    join rig_items ri on ri.id = v.rig_item_id
    where v.embedding_model = ${env.IMAGE_EMBEDDING_MODEL}
    order by v.image_embedding <=> ${lit}::vector
    limit ${limit}
  `;
  return rows.map((r) => ({
    rig_item_id: Number(r.rig_item_id),
    brand: r.brand,
    model: r.model,
    category: r.category,
    image_url: r.image_url,
    score: Number(r.score),
  }));
}

/**
 * Photo -> "what guitar is this?". Nearest-neighbour vote over brand+model, weighted by similarity.
 * Confidence is the winning share of the weighted vote; callers should treat low values as "unsure".
 */
export async function identifyGearFromImage(bytes: Buffer, mimeType: string, limit = 8): Promise<GearIdentification> {
  const vec = await embedImage(bytes, mimeType);
  if (!vec) return { best: null, matches: [] };
  const matches = (await nearestByVector(vec, limit)).filter((m) => m.score >= 0.5);
  const tally = new Map<string, { brand: string; model: string; weight: number; votes: number }>();
  let total = 0;
  for (const m of matches) {
    if (!m.brand || !m.model) continue;
    const key = `${m.brand.toLowerCase()}|${m.model.toLowerCase()}`;
    const t = tally.get(key) || { brand: m.brand, model: m.model, weight: 0, votes: 0 };
    t.weight += m.score;
    t.votes += 1;
    tally.set(key, t);
    total += m.score;
  }
  const top = [...tally.values()].sort((a, b) => b.weight - a.weight)[0];
  return {
    best: top ? { brand: top.brand, model: top.model, confidence: total ? top.weight / total : 0, votes: top.votes } : null,
    matches,
  };
}

/** Text -> look-alike images ("sunburst offset with a tremolo"). */
export async function searchGearByVisualDescription(query: string, limit = 5): Promise<ImageMatch[]> {
  const vec = await embedTextForImageSearch(query);
  return vec ? (await nearestByVector(vec, limit)).filter((m) => m.score >= 0.3) : [];
}

export async function syncDirtyRigItemImages(limit = 25): Promise<{ attempted: number; embedded: number }> {
  const rows = await db`
    select ri.id from rig_items ri
    left join rig_item_image_vectors v on v.rig_item_id = ri.id
    where ri.kind = 'own' and ri.deleted = false and ri.image_url ~* '^(https:|data:)'
      and (v.rig_item_id is null or v.image_url <> ri.image_url or v.embedding_model <> ${env.IMAGE_EMBEDDING_MODEL})
    order by ri.id
    limit ${limit}
  `;
  let embedded = 0;
  for (const r of rows) {
    try {
      if ((await syncRigItemImage(Number(r.id))).embedded) embedded++;
    } catch (err) {
      console.warn(`[Knowledge] image sync failed for ${r.id}:`, err instanceof Error ? err.message : err);
    }
  }
  return { attempted: rows.length, embedded };
}
