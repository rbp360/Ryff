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

    // Handle number_of_strings casting
    if (updates.number_of_strings !== undefined && updates.number_of_strings !== null) {
      updates.number_of_strings = parseInt(String(updates.number_of_strings), 10);
    }

    // Handle JSON serialization for arrays/objects
    if (updates.drum_pieces !== undefined && typeof updates.drum_pieces !== 'string') {
      updates.drum_pieces = JSON.stringify(updates.drum_pieces);
    }
    if (updates.cymbal_pieces !== undefined && typeof updates.cymbal_pieces !== 'string') {
      updates.cymbal_pieces = JSON.stringify(updates.cymbal_pieces);
    }
    if (updates.snapshots !== undefined && typeof updates.snapshots !== 'string') {
      updates.snapshots = JSON.stringify(updates.snapshots);
    }
    updates.updated_at = new Date();

    const updated = await db`
      update rig_items set ${db(updates)}
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
