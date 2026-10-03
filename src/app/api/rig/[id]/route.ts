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
        serial_number = coalesce(${updates.serial_number !== undefined ? (updates.serial_number as string) : null}, serial_number),
        purchase_date = coalesce(${updates.purchase_date !== undefined ? (updates.purchase_date as string) : null}, purchase_date),
        purchase_price = coalesce(${updates.purchase_price !== undefined ? (updates.purchase_price as string) : null}, purchase_price),
        condition = coalesce(${updates.condition !== undefined ? (updates.condition as string) : null}, condition),
        year_manufacture = coalesce(${updates.year_manufacture !== undefined ? (updates.year_manufacture as string) : null}, year_manufacture),
        current_strings = coalesce(${updates.current_strings !== undefined ? (updates.current_strings as string) : null}, current_strings),
        last_restrung_at = coalesce(${updates.last_restrung_at !== undefined ? (updates.last_restrung_at as string) : null}::timestamptz, last_restrung_at),
        pickups_summary = coalesce(${updates.pickups_summary !== undefined ? (updates.pickups_summary as string) : null}, pickups_summary),
        modifications_summary = coalesce(${updates.modifications_summary !== undefined ? (updates.modifications_summary as string) : null}, modifications_summary),
        valves_summary = coalesce(${updates.valves_summary !== undefined ? (updates.valves_summary as string) : null}, valves_summary),
        last_valves_changed_at = coalesce(${updates.last_valves_changed_at !== undefined ? (updates.last_valves_changed_at as string) : null}::timestamptz, last_valves_changed_at),
        last_serviced_at = coalesce(${updates.last_serviced_at !== undefined ? (updates.last_serviced_at as string) : null}::timestamptz, last_serviced_at),
        notes = coalesce(${updates.notes !== undefined ? (updates.notes as string) : null}, notes),
        color = coalesce(${updates.color !== undefined ? (updates.color as string) : null}, color),
        nickname = coalesce(${updates.nickname !== undefined ? (updates.nickname as string) : null}, nickname),
        brand = coalesce(${updates.brand !== undefined ? (updates.brand as string) : null}, brand),
        model = coalesce(${updates.model !== undefined ? (updates.model as string) : null}, model),
        category = coalesce(${updates.category !== undefined ? (updates.category as string) : null}, category),
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
