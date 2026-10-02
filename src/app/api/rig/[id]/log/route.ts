import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { getSession } from '../../../../../lib/session';
import { parseGearVoiceOrText } from '../../../../../lib/gear-parser';

export async function POST(
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

  // Verify item belongs to user
  const items = await db`
    select * from rig_items
    where id = ${itemId} and user_id = ${session.userId}
    limit 1
  `;

  if (items.length === 0) {
    return NextResponse.json({ error: 'Gear item not found' }, { status: 404 });
  }

  const currentItem = items[0];

  try {
    const body = await request.json();
    const {
      text,
      audioBase64,
      audioMimeType,
      event_type,
      title: manualTitle,
      description: manualDescription,
      component: manualComponent,
      original_part: manualOriginalPart,
      event_date: manualEventDate,
    } = body;

    let logToInsert: {
      event_type: string;
      title: string;
      description: string | null;
      component: string | null;
      original_part: string | null;
      event_date: string;
      logged_via: 'manual' | 'audio' | 'text_prompt';
      audio_transcript?: string | null;
      metadata: Record<string, unknown>;
    };

    let gearUpdates: Record<string, unknown> = {};

    if (audioBase64 || (text && !manualTitle)) {
      // Natural language AI parsing
      const parsed = await parseGearVoiceOrText({
        item: {
          brand: currentItem.brand,
          model: currentItem.model,
          category: currentItem.category,
          raw_text: currentItem.raw_text,
        },
        text,
        audioBase64,
        audioMimeType,
      });

      logToInsert = {
        event_type: parsed.event_type || 'general',
        title: parsed.title || 'Gear Update',
        description: parsed.description || parsed.transcript,
        component: parsed.component,
        original_part: parsed.original_part,
        event_date: parsed.event_date || new Date().toISOString().split('T')[0],
        logged_via: audioBase64 ? 'audio' : 'text_prompt',
        audio_transcript: parsed.transcript,
        metadata: parsed.gear_updates?.specs || {},
      };

      gearUpdates = parsed.gear_updates || {};
    } else {
      // Direct manual form submission
      logToInsert = {
        event_type: event_type || 'general',
        title: manualTitle || 'Maintenance Entry',
        description: manualDescription || null,
        component: manualComponent || null,
        original_part: manualOriginalPart || null,
        event_date: manualEventDate || new Date().toISOString().split('T')[0],
        logged_via: 'manual',
        audio_transcript: null,
        metadata: {},
      };
    }

    // Insert the log record
    const insertedLog = await db`
      insert into rig_item_logs (
        rig_item_id, user_id, event_type, title, description,
        component, original_part, metadata, logged_via, audio_transcript, event_date
      )
      values (
        ${itemId},
        ${session.userId},
        ${logToInsert.event_type},
        ${logToInsert.title},
        ${logToInsert.description},
        ${logToInsert.component},
        ${logToInsert.original_part},
        ${JSON.stringify(logToInsert.metadata)},
        ${logToInsert.logged_via},
        ${logToInsert.audio_transcript || null},
        ${logToInsert.event_date}
      )
      returning *
    `;

    // Apply any detected spec / gear updates to the parent rig item
    if (Object.keys(gearUpdates).length > 0) {
      await db`
        update rig_items set
          current_strings = coalesce(${gearUpdates.current_strings ? String(gearUpdates.current_strings) : null}, current_strings),
          last_restrung_at = coalesce(${gearUpdates.last_restrung_at ? String(gearUpdates.last_restrung_at) : null}::timestamptz, last_restrung_at),
          pickups_summary = coalesce(${gearUpdates.pickups_summary ? String(gearUpdates.pickups_summary) : null}, pickups_summary),
          modifications_summary = coalesce(${gearUpdates.modifications_summary ? String(gearUpdates.modifications_summary) : null}, modifications_summary),
          valves_summary = coalesce(${gearUpdates.valves_summary ? String(gearUpdates.valves_summary) : null}, valves_summary),
          last_valves_changed_at = coalesce(${gearUpdates.last_valves_changed_at ? String(gearUpdates.last_valves_changed_at) : null}::timestamptz, last_valves_changed_at),
          serial_number = coalesce(${gearUpdates.serial_number ? String(gearUpdates.serial_number) : null}, serial_number),
          purchase_date = coalesce(${gearUpdates.purchase_date ? String(gearUpdates.purchase_date) : null}, purchase_date),
          updated_at = now()
        where id = ${itemId} and user_id = ${session.userId}
      `;
    }

    const updatedItem = await db`
      select * from rig_items
      where id = ${itemId} and user_id = ${session.userId}
      limit 1
    `;

    return NextResponse.json({
      ok: true,
      log: insertedLog[0],
      item: updatedItem[0],
    });
  } catch (err) {
    console.error('Failed to create rig item log:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record log' },
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
  const { searchParams } = new URL(request.url);
  const logId = searchParams.get('logId');

  if (!logId) {
    return NextResponse.json({ error: 'Log ID required' }, { status: 400 });
  }

  await db`
    delete from rig_item_logs
    where id = ${logId} and rig_item_id = ${itemId} and user_id = ${session.userId}
  `;

  return NextResponse.json({ ok: true });
}
