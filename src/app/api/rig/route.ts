import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { wantKey } from '../../../lib/reverb';
import { logEvent } from '../../../lib/events';
import { sanitiseUntrusted } from '../../../lib/guard';

interface ParsedRigLine {
  raw_text: string;
  kind: 'own' | 'want';
  brand: string | null;
  model: string | null;
  category: 'guitar' | 'bass' | 'amp' | 'pedal' | 'other';
  budget_gbp: number | null;
}

/**
 * Robust rule-based gear line parser that handles common formats instantly without mandatory LLM cost,
 * parsing "want/looking for/saving for" prefixes, budgets (e.g. "under £300", "$400"), brands and categories.
 */
function parseGearLine(line: string): ParsedRigLine {
  const clean = sanitiseUntrusted(line.trim(), 200);
  const lower = clean.toLowerCase();

  const isWant = /^(want|looking for|saving for|searching for|iso|wtb)\b/i.test(clean) || lower.includes('want') || lower.includes('under £') || lower.includes('budget');
  const kind: 'own' | 'want' = isWant ? 'want' : 'own';

  // Extract budget if present (e.g. "under £400", "£300", "$500")
  let budget_gbp: number | null = null;
  const budgetMatch = clean.match(/(?:under\s+)?(?:£|\$|€|gbp\s*)(\d+)/i) || clean.match(/(\d+)\s*(?:gbp|pounds|quid)/i);
  if (budgetMatch && budgetMatch[1]) {
    budget_gbp = parseInt(budgetMatch[1], 10);
  }

  // Detect category
  let category: 'guitar' | 'bass' | 'amp' | 'pedal' | 'other' = 'other';
  if (/telecaster|tele|stratocaster|strat|les paul|sg|prs|jazzmaster|mustang|dinky|soloist|guitar/i.test(clean)) {
    category = 'guitar';
  } else if (/precision bass|jazz bass|p bass|j bass|bass guitar|bass\b/i.test(clean)) {
    category = 'bass';
  } else if (/katana|deluxe reverb|marshall|vox|twin reverb|combo|head|cab|amplifier|amp\b/i.test(clean)) {
    category = 'amp';
  } else if (/overdrive|distortion|fuzz|delay|reverb|chorus|flanger|tuner|pedal|stomp/i.test(clean)) {
    category = 'pedal';
  }

  // Detect brand
  const knownBrands = [
    'Fender', 'Gibson', 'Squier', 'Epiphone', 'PRS', 'Ibanez', 'Boss',
    'Marshall', 'Vox', 'Strymon', 'Electro-Harmonix', 'EHX', 'Line 6',
    'Neural DSP', 'Kemper', 'Friedman', 'Orange', 'Mesa Boogie', 'Dunlop',
    'MXR', 'TC Electronic', 'Walrus Audio', 'Chase Bliss', 'Keeley', 'JHS'
  ];

  let brand: string | null = null;
  for (const b of knownBrands) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(clean)) {
      brand = b;
      break;
    }
  }

  // Strip prefix words for clean model name
  let model = clean
    .replace(/^(want|looking for|saving for|searching for|iso|wtb|i have|i own)\s*/i, '')
    .replace(/(?:under\s+)?(?:£|\$|€|gbp\s*)\d+/gi, '')
    .trim();

  if (brand && model.toLowerCase().startsWith(brand.toLowerCase())) {
    model = model.slice(brand.length).trim();
  }

  return {
    raw_text: clean,
    kind,
    brand,
    model: model || clean,
    category,
    budget_gbp,
  };
}

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

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { textLines, items: rawItems } = body;

    // Ensure dev user row exists
    await db`
      insert into users (id, email, consented_at, is_adult, uk_resident, cohort)
      values (${session.userId}, ${session.email}, now(), true, true, ${session.cohort})
      on conflict (id) do nothing
    `;

    let parsedItems: ParsedRigLine[] = [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      parsedItems = rawItems.slice(0, 30).map((item) => ({
        raw_text: item.raw_text || `${item.brand || ''} ${item.model || ''}`,
        kind: item.kind === 'want' ? 'want' : 'own',
        brand: item.brand || null,
        model: item.model || null,
        category: item.category || 'other',
        budget_gbp: item.budget_gbp ? parseInt(item.budget_gbp, 10) : null,
      }));
    } else if (typeof textLines === 'string') {
      const lines = textLines
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 30);

      parsedItems = lines.map(parseGearLine);
    }

    // Replace user's rig items
    await db.begin(async (sql) => {
      await sql`
        delete from rig_items
        where user_id = ${session.userId}
      `;

      for (const item of parsedItems) {
        const computedWantKey = item.kind === 'want' ? wantKey(item.brand, item.model) : null;

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
            ${computedWantKey}
          )
        `;
      }
    });

    await logEvent('rig_saved', { count: parsedItems.length }, session.userId);

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
