import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { logEvent } from '../../../lib/events';
import { parseGearLineWithRigistry, ParsedRigLine } from '../../../lib/rigistry-parser';

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure user exists if using dev session
  await db`
    insert into users (id, email, consented_at, is_adult, uk_resident, cohort)
    values (${session.userId}, ${session.email}, now(), true, true, ${session.cohort})
    on conflict (id) do nothing
  `;

  const items = await db`
    select id, raw_text, brand, model, category, kind, budget_gbp, want_key,
           current_strings, last_restrung_at, serial_number, purchase_date, modifications_summary, created_at
    from rig_items
    where user_id = ${session.userId}
    order by kind asc, created_at asc
  `;

  const logs = await db`
    select l.*, coalesce(r.model, r.raw_text) as item_name, r.brand as item_brand
    from rig_item_logs l
    join rig_items r on r.id = l.rig_item_id
    where l.user_id = ${session.userId}
    order by l.event_date desc, l.created_at desc
  `.catch(() => []);

  return NextResponse.json({ items, logs });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { textLines, items: rawItems, mode } = body;

    // Ensure dev user row exists
    await db`
      insert into users (id, email, consented_at, is_adult, uk_resident, cohort)
      values (${session.userId}, ${session.email}, now(), true, true, ${session.cohort})
      on conflict (id) do nothing
    `;

    let parsedItems: ParsedRigLine[] = [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      for (const item of rawItems.slice(0, 30)) {
        const text = item.raw_text || `${item.brand || ''} ${item.model || ''}`;
        const parsed = await parseGearLineWithRigistry(text);
        parsedItems.push({
          raw_text: parsed.raw_text,
          kind: item.kind === 'want' ? 'want' : 'own',
          brand: item.brand || parsed.brand,
          model: item.model || parsed.model,
          category: (item.category && item.category !== 'other') ? item.category : parsed.category,
          budget_gbp: item.budget_gbp ? parseInt(item.budget_gbp, 10) : parsed.budget_gbp,
          want_key: item.kind === 'want' ? (parsed.want_key || null) : null,
        });
      }
    } else if (typeof textLines === 'string') {
      const lines = textLines
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 30);

      for (const line of lines) {
        parsedItems.push(await parseGearLineWithRigistry(line));
      }
    }

    // Determine whether to append or replace existing rig
    const shouldAppend = mode === 'append' || (!mode && typeof textLines === 'string' && textLines.split('\n').filter(Boolean).length <= 2);

    await db.begin(async (sql) => {
      if (!shouldAppend) {
        await sql`
          delete from rig_items
          where user_id = ${session.userId}
        `;
      }

      for (const item of parsedItems) {
        await sql`
          insert into rig_items (
            user_id, raw_text, brand, model, category, kind, budget_gbp, want_key
          )
          values (
            ${session.userId},
            ${item.raw_text},
            ${item.brand},
            ${item.model},
            ${item.category},
            ${item.kind},
            ${item.budget_gbp},
            ${item.want_key}
          )
        `;
      }
    });

    await logEvent('rig_saved', { count: parsedItems.length, mode: shouldAppend ? 'append' : 'replace' }, session.userId);

    const updated = await db`
      select id, raw_text, brand, model, category, kind, budget_gbp, want_key,
             current_strings, last_restrung_at, serial_number, purchase_date, modifications_summary, created_at
      from rig_items
      where user_id = ${session.userId}
      order by kind asc, created_at asc
    `;

    return NextResponse.json({ ok: true, items: updated });
  } catch (err) {
    console.error('Rig update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update rig' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
  }

  await db`
    delete from rig_items
    where id = ${id} and user_id = ${session.userId}
  `;

  return NextResponse.json({ ok: true });
}
