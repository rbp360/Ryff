import crypto from 'crypto';
import { db } from '../db';
import { resolveComponent } from './components';
import { embedText } from './embeddings';
import { syncRigItemImage, syncDirtyRigItemImages } from './images';
import {
  ComponentSlot,
  PassportDocComponents,
  buildPassportDocument,
  toVectorLiteral,
} from './text';

interface SlotSource {
  slot: ComponentSlot;
  category: 'pickup' | 'strings';
  raw: string | null;
  brandHint?: string | null;
}

/**
 * Resolves a rig item's free-text pickups/strings to canonical components, rebuilds its anonymous
 * passport document and (re)embeds it. Idempotent: skips the embedding call when the document is unchanged.
 */
export async function syncRigItemKnowledge(rigItemId: number): Promise<{ synced: boolean; reason?: string }> {
  const res = await syncRigItemText(rigItemId);
  await syncRigItemImage(rigItemId).catch((err) =>
    console.warn('[Knowledge] image sync failed:', err instanceof Error ? err.message : err)
  );
  return res;
}

async function syncRigItemText(rigItemId: number): Promise<{ synced: boolean; reason?: string }> {
  const [item] = await db`
    select id, brand, model, category, kind, deleted, year_manufacture, color, number_of_strings, tuning,
           string_gauge, string_type, string_manufacturer, pickup_bridge, pickup_middle, pickup_neck,
           pickups_summary, modifications_summary, specs
    from rig_items where id = ${rigItemId}
  `;
  if (!item) return { synced: false, reason: 'not_found' };
  if (item.kind !== 'own' || item.deleted) {
    await db`delete from rig_item_knowledge where rig_item_id = ${rigItemId}`;
    await db`delete from rig_item_components where rig_item_id = ${rigItemId}`;
    return { synced: false, reason: 'not_owned' };
  }

  const strRaw = [item.string_manufacturer, item.string_type].filter(Boolean).join(' ').trim();
  const sources: SlotSource[] = [
    { slot: 'pickup_bridge', category: 'pickup', raw: clean(item.pickup_bridge) },
    { slot: 'pickup_middle', category: 'pickup', raw: clean(item.pickup_middle) },
    { slot: 'pickup_neck', category: 'pickup', raw: clean(item.pickup_neck) },
    { slot: 'strings', category: 'strings', raw: strRaw || null, brandHint: clean(item.string_manufacturer) },
  ];

  const compNames: PassportDocComponents = {};
  const componentIds: Record<string, number> = {};

  for (const s of sources) {
    if (!s.raw) {
      await db`delete from rig_item_components where rig_item_id = ${rigItemId} and slot = ${s.slot}`;
      continue;
    }
    const resolved = await resolveComponent({ category: s.category, rawText: s.raw, brandHint: s.brandHint });
    if (!resolved) continue;
    const [comp] = await db`select manufacturer, model_name from canonical_components where id = ${resolved.id}`;
    compNames[s.slot] = `${comp.manufacturer} ${comp.model_name}`.trim();
    componentIds[s.slot] = resolved.id;
    await db`
      insert into rig_item_components (rig_item_id, slot, component_id, raw_text)
      values (${rigItemId}, ${s.slot}, ${resolved.id}, ${s.raw})
      on conflict (rig_item_id, slot) do update set component_id = excluded.component_id, raw_text = excluded.raw_text, linked_at = now()
    `;
  }

  const specs = (item.specs || {}) as Record<string, unknown>;
  const scale = specs.scale_length ?? null;
  const doc = buildPassportDocument(
    { ...item, scale_length: scale as string | number | null },
    compNames
  );
  const hash = crypto.createHash('sha256').update(doc).digest('hex');

  const [prev] = await db`select content_hash, text_embedding is not null as has_vec from rig_item_knowledge where rig_item_id = ${rigItemId}`;
  if (prev && prev.content_hash === hash && prev.has_vec) return { synced: false, reason: 'unchanged' };

  const vec = await embedText(doc, 'RETRIEVAL_DOCUMENT');
  const metadata = {
    brand: item.brand,
    model: item.model,
    category: item.category,
    tuning: item.tuning,
    string_gauge: item.string_gauge,
    number_of_strings: item.number_of_strings,
    scale_length: scale,
    component_ids: componentIds,
  };

  await db`
    insert into rig_item_knowledge (rig_item_id, document_chunk, content_hash, text_embedding, metadata, synced_at)
    values (${rigItemId}, ${doc}, ${hash}, ${vec ? toVectorLiteral(vec) : null}::vector, ${JSON.stringify(metadata)}::jsonb, now())
    on conflict (rig_item_id) do update set
      document_chunk = excluded.document_chunk, content_hash = excluded.content_hash,
      text_embedding = excluded.text_embedding, metadata = excluded.metadata, synced_at = now()
  `;
  return { synced: true };
}

/** Sweeps owned items that were never synced or changed since their last sync. */
export async function syncDirtyRigItems(limit = 25): Promise<{ attempted: number; synced: number; failed: number; images: { attempted: number; embedded: number } }> {
  const rows = await db`
    select ri.id from rig_items ri
    left join rig_item_knowledge k on k.rig_item_id = ri.id
    where ri.kind = 'own' and ri.deleted = false
      and (k.rig_item_id is null or k.text_embedding is null or ri.updated_at > k.synced_at)
    order by ri.id
    limit ${limit}
  `;
  let synced = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      const res = await syncRigItemKnowledge(Number(r.id));
      if (res.synced) synced++;
    } catch (err) {
      failed++;
      console.warn(`[Knowledge] sync failed for rig_item ${r.id}:`, err instanceof Error ? err.message : err);
    }
  }
  const images = await syncDirtyRigItemImages(limit);
  return { attempted: rows.length, synced, failed, images };
}

function clean(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : null;
}

