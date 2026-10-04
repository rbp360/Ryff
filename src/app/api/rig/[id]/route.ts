import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { getSession } from '../../../../lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const items = await db`
    select * from rig_items
    where id = ${itemId} and user_id = ${session.userId}
    limit 1
  `;

  if (items.length === 0) {
    return NextResponse.json({ error: 'Gear item not found' }, { status: 404 });
  }

  const item = items[0];

  const logs = await db`
    select * from rig_item_logs
    where rig_item_id = ${itemId} and user_id = ${session.userId}
    order by event_date desc, created_at desc
  `;

  return NextResponse.json({ item, logs });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await request.json();

    const allowedFields = [
      'serial_number',
      'purchase_date',
      'purchase_price',
      'condition',
      'year_manufacture',
      'current_strings',
      'last_restrung_at',
      'pickups_summary',
      'modifications_summary',
      'valves_summary',
      'last_valves_changed_at',
      'last_serviced_at',
      'notes',
      'color',
      'nickname',
      'brand',
      'model',
      'category',
      'specs',
      'image_url',
      'amp_settings',
      'settings_file_url',
      'number_of_strings',
      'tuning',
      'string_gauge',
      'string_manufacturer',
      'pickup_bridge',
      'pickup_middle',
      'pickup_neck',
      'drum_head_details',
      'drum_head_tension',
      'drum_head_change_date',
      'drum_body',
      'drum_mods_muffles',
      'drum_pieces',
      'cymbal_pieces',
      'snapshots',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Direct update query with coalesce/overrides
    const updated = await db`
      update rig_items set
        serial_number = CASE WHEN ${updates.serial_number !== undefined} THEN ${updates.serial_number as string | null} ELSE serial_number END,
        purchase_date = CASE WHEN ${updates.purchase_date !== undefined} THEN ${updates.purchase_date as string | null} ELSE purchase_date END,
        purchase_price = CASE WHEN ${updates.purchase_price !== undefined} THEN ${updates.purchase_price as string | null} ELSE purchase_price END,
        condition = CASE WHEN ${updates.condition !== undefined} THEN ${updates.condition as string | null} ELSE condition END,
        year_manufacture = CASE WHEN ${updates.year_manufacture !== undefined} THEN ${updates.year_manufacture as string | null} ELSE year_manufacture END,
        current_strings = CASE WHEN ${updates.current_strings !== undefined} THEN ${updates.current_strings as string | null} ELSE current_strings END,
        last_restrung_at = CASE WHEN ${updates.last_restrung_at !== undefined} THEN ${updates.last_restrung_at as string | null}::timestamptz ELSE last_restrung_at END,
        pickups_summary = CASE WHEN ${updates.pickups_summary !== undefined} THEN ${updates.pickups_summary as string | null} ELSE pickups_summary END,
        modifications_summary = CASE WHEN ${updates.modifications_summary !== undefined} THEN ${updates.modifications_summary as string | null} ELSE modifications_summary END,
        valves_summary = CASE WHEN ${updates.valves_summary !== undefined} THEN ${updates.valves_summary as string | null} ELSE valves_summary END,
        last_valves_changed_at = CASE WHEN ${updates.last_valves_changed_at !== undefined} THEN ${updates.last_valves_changed_at as string | null}::timestamptz ELSE last_valves_changed_at END,
        last_serviced_at = CASE WHEN ${updates.last_serviced_at !== undefined} THEN ${updates.last_serviced_at as string | null}::timestamptz ELSE last_serviced_at END,
        notes = CASE WHEN ${updates.notes !== undefined} THEN ${updates.notes as string | null} ELSE notes END,
        color = CASE WHEN ${updates.color !== undefined} THEN ${updates.color as string | null} ELSE color END,
        nickname = CASE WHEN ${updates.nickname !== undefined} THEN ${updates.nickname as string | null} ELSE nickname END,
        brand = CASE WHEN ${updates.brand !== undefined} THEN ${updates.brand as string | null} ELSE brand END,
        model = CASE WHEN ${updates.model !== undefined} THEN ${updates.model as string | null} ELSE model END,
        category = CASE WHEN ${updates.category !== undefined} THEN ${updates.category as string | null} ELSE category END,
        amp_settings = CASE WHEN ${updates.amp_settings !== undefined} THEN ${updates.amp_settings as string | null} ELSE amp_settings END,
        settings_file_url = CASE WHEN ${updates.settings_file_url !== undefined} THEN ${updates.settings_file_url as string | null} ELSE settings_file_url END,
        number_of_strings = CASE WHEN ${updates.number_of_strings !== undefined} THEN ${typeof updates.number_of_strings === 'number' ? updates.number_of_strings : (updates.number_of_strings ? parseInt(String(updates.number_of_strings), 10) : null)} ELSE number_of_strings END,
        tuning = CASE WHEN ${updates.tuning !== undefined} THEN ${updates.tuning as string | null} ELSE tuning END,
        string_gauge = CASE WHEN ${updates.string_gauge !== undefined} THEN ${updates.string_gauge as string | null} ELSE string_gauge END,
        string_manufacturer = CASE WHEN ${updates.string_manufacturer !== undefined} THEN ${updates.string_manufacturer as string | null} ELSE string_manufacturer END,
        pickup_bridge = CASE WHEN ${updates.pickup_bridge !== undefined} THEN ${updates.pickup_bridge as string | null} ELSE pickup_bridge END,
        pickup_middle = CASE WHEN ${updates.pickup_middle !== undefined} THEN ${updates.pickup_middle as string | null} ELSE pickup_middle END,
        pickup_neck = CASE WHEN ${updates.pickup_neck !== undefined} THEN ${updates.pickup_neck as string | null} ELSE pickup_neck END,
        drum_head_details = CASE WHEN ${updates.drum_head_details !== undefined} THEN ${updates.drum_head_details as string | null} ELSE drum_head_details END,
        drum_head_tension = CASE WHEN ${updates.drum_head_tension !== undefined} THEN ${updates.drum_head_tension as string | null} ELSE drum_head_tension END,
        drum_head_change_date = CASE WHEN ${updates.drum_head_change_date !== undefined} THEN ${updates.drum_head_change_date as string | null} ELSE drum_head_change_date END,
        drum_body = CASE WHEN ${updates.drum_body !== undefined} THEN ${updates.drum_body as string | null} ELSE drum_body END,
        drum_mods_muffles = CASE WHEN ${updates.drum_mods_muffles !== undefined} THEN ${updates.drum_mods_muffles as string | null} ELSE drum_mods_muffles END,
        drum_pieces = CASE WHEN ${updates.drum_pieces !== undefined} THEN ${JSON.stringify(updates.drum_pieces)}::jsonb ELSE drum_pieces END,
        cymbal_pieces = CASE WHEN ${updates.cymbal_pieces !== undefined} THEN ${JSON.stringify(updates.cymbal_pieces)}::jsonb ELSE cymbal_pieces END,
        snapshots = CASE WHEN ${updates.snapshots !== undefined} THEN ${JSON.stringify(updates.snapshots)}::jsonb ELSE snapshots END,
        image_url = CASE WHEN ${updates.image_url !== undefined} THEN ${updates.image_url !== undefined ? (updates.image_url as string | null) : null} ELSE image_url END,
        updated_at = now()
      where id = ${itemId} and user_id = ${session.userId}
      returning *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Gear item not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: updated[0] });
  } catch (err) {
    console.error('Failed to update rig item:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  await db`
    delete from rig_items
    where id = ${itemId} and user_id = ${session.userId}
  `;

  return NextResponse.json({ ok: true });
}
