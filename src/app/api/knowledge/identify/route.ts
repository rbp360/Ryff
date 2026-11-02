import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { identifyGearFromImage, loadImage } from '../../../../lib/knowledge/images';
import { db } from '../../../../lib/db';
import { env } from '../../../../lib/env';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * GET /api/knowledge/identify?rigItemId=123
 * Finds visual look-alikes for a registered gear item using its saved image vector.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rigItemId = searchParams.get('rigItemId');
  if (!rigItemId) {
    return NextResponse.json({ error: 'rigItemId required' }, { status: 400 });
  }

  const id = parseInt(rigItemId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid rigItemId' }, { status: 400 });
  }

  const [vectorRow] = await db`
    select image_embedding, image_url
    from rig_item_image_vectors
    where rig_item_id = ${id} and embedding_model = ${env.IMAGE_EMBEDDING_MODEL}
  `;

  if (!vectorRow) {
    return NextResponse.json({
      ok: true,
      hasVector: false,
      matches: [],
      message: 'No image vector indexed yet for this item.',
    });
  }

  const rows = await db`
    select v.rig_item_id, ri.brand, ri.model, ri.category, v.image_url,
           1 - (v.image_embedding <=> ${vectorRow.image_embedding}) as score
    from rig_item_image_vectors v
    join rig_items ri on ri.id = v.rig_item_id
    where v.embedding_model = ${env.IMAGE_EMBEDDING_MODEL}
      and v.rig_item_id <> ${id}
    order by v.image_embedding <=> ${vectorRow.image_embedding}
    limit 6
  `;

  return NextResponse.json({
    ok: true,
    hasVector: true,
    sourceImageUrl: vectorRow.image_url,
    matches: rows.map((r) => ({
      rig_item_id: Number(r.rig_item_id),
      brand: r.brand,
      model: r.model,
      category: r.category,
      image_url: r.image_url,
      score: Number(r.score),
    })),
  });
}

/**
 * POST /api/knowledge/identify
 * Accepts multipart/form-data (image: File) OR application/json ({ imageUrl: string }).
 * Returns the most likely brand/model and nearest community visual matches.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let bytes: Buffer | null = null;
    let mimeType: string = 'image/jpeg';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const imageUrl = body.imageUrl;
      if (!imageUrl || typeof imageUrl !== 'string') {
        return NextResponse.json({ error: 'imageUrl required in JSON body' }, { status: 400 });
      }
      const loaded = await loadImage(imageUrl);
      if (!loaded) {
        return NextResponse.json({ error: 'Unable to load or process image URL' }, { status: 400 });
      }
      bytes = loaded.bytes;
      mimeType = loaded.mimeType;
    } else {
      const form = await request.formData();
      const file = form.get('image');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'image file required' }, { status: 400 });
      }
      if (!ALLOWED.has(file.type)) {
        return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Image too large (max 8MB)' }, { status: 413 });
      }
      bytes = Buffer.from(await file.arrayBuffer());
      mimeType = file.type;
    }

    const result = await identifyGearFromImage(bytes, mimeType);
    return NextResponse.json({
      ok: true,
      best: result.best,
      matches: result.matches.map((m) => ({
        rig_item_id: m.rig_item_id,
        brand: m.brand,
        model: m.model,
        category: m.category,
        image_url: m.image_url,
        score: m.score,
      })),
    });
  } catch (err) {
    console.error('Identify error:', err);
    return NextResponse.json({ error: 'Failed to identify image' }, { status: 500 });
  }
}
