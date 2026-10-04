import { db } from '../db';
import { resolveGearReference, GearItem } from './resolve';
import { formatGearTitle } from '../gear-utils';
import { GoogleGenAI } from '@google/genai';
import { env } from '../env';
import { recordAssistantCost } from './cost-logger';
import { costUsd, TokenUsage } from '../cost';

export interface QueryRigInput {
  userId: string;
  gearRef?: string;
  question: string;
  activeGearId?: string;
}

export interface QueryRigResult {
  ok: boolean;
  status: 'answered' | 'ambiguous' | 'not_found';
  answer: string;
  gear?: { id: number; name: string };
  candidates?: Array<{ id: number; name: string }>;
  costUsd: number;
}

export interface QueryDealsInput {
  userId: string;
  wantRef?: string;
  question?: string;
}

export interface QueryDealsResult {
  ok: boolean;
  status: 'answered' | 'no_wants';
  answer: string;
  wantsCount: number;
  dealsCount: number;
  costUsd: number;
}

/**
 * Answers questions about the user's rig and maintenance history from real database records.
 * Deterministic query first; model only phrases the result.
 */
export async function queryRig(input: QueryRigInput): Promise<QueryRigResult> {
  const { userId, gearRef, question, activeGearId } = input;
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const modelName = env.MODEL_FAST || 'gemini-2.5-flash';

  // 1. Resolve gear if gearRef is provided, in question, or activeGearId exists
  let targetGear: GearItem | null = null;
  let targetGearTitle = '';

  let refToResolve = gearRef;
  if (!refToResolve && !activeGearId) {
    const owned = await db<GearItem[]>`
      select id, brand, model, nickname, category, raw_text
      from rig_items
      where user_id = ${userId} and kind = 'own'
    `;
    const qLower = question.toLowerCase();
    for (const item of owned) {
      if (item.nickname && qLower.includes(item.nickname.toLowerCase())) {
        refToResolve = item.nickname;
        break;
      }
      if (item.model && qLower.includes(item.model.toLowerCase())) {
        refToResolve = item.model;
        break;
      }
      if (item.brand && qLower.includes(item.brand.toLowerCase())) {
        refToResolve = item.brand;
        break;
      }
    }
  }

  if (refToResolve || activeGearId) {
    const resolution = await resolveGearReference(userId, refToResolve || 'this guitar', activeGearId);
    if (resolution.status === 'ambiguous') {
      const candidates = resolution.candidates.map((c) => ({
        id: c.id,
        name: formatGearTitle(c.brand, c.model, c.raw_text),
      }));
      return {
        ok: true,
        status: 'ambiguous',
        answer: `You have multiple matching instruments: ${candidates.map((c) => c.name).join(', ')}. Which one did you mean?`,
        candidates,
        costUsd: 0,
      };
    }
    if (resolution.status === 'resolved') {
      targetGear = resolution.gear;
      targetGearTitle = formatGearTitle(targetGear.brand, targetGear.model, targetGear.raw_text);
    }
  }

  // 2. Fetch facts deterministically
  let deterministicFacts = '';
  const qLower = question.toLowerCase();

  if (targetGear) {
    // Fetch logs for this gear
    const logs = await db`
      select id, event_type, event_date, description, title, component, created_at
      from rig_item_logs
      where rig_item_id = ${targetGear.id} and user_id = ${userId}
      order by event_date desc, id desc
      limit 10
    `;

    const stringLogs = logs.filter((l) => l.event_type === 'strings' || l.event_type === 'string_change');

    deterministicFacts = `Instrument: ${targetGearTitle}.
Nickname: ${targetGear.nickname || 'None'}.
Category: ${targetGear.category || 'guitar'}.
Tuning: ${targetGear.tuning || 'Not specified'}.
String Gauge: ${targetGear.string_gauge || 'Not specified'}.
String Brand: ${targetGear.string_manufacturer || 'Not specified'}.
Last Restrung Date: ${targetGear.last_restrung_at ? new Date(targetGear.last_restrung_at).toISOString().split('T')[0] : (stringLogs[0]?.event_date ? new Date(stringLogs[0].event_date).toISOString().split('T')[0] : 'None recorded')}.
Recent string change logs: ${stringLogs.length > 0 ? stringLogs.map((s) => `${s.event_date}: ${s.description || s.title || 'Strings changed'}`).join('; ') : 'No string change logs recorded'}.
All recent maintenance logs: ${logs.length > 0 ? logs.map((l) => `${l.event_date} [${l.event_type}]: ${l.description || l.title || 'Maintenance'}`).join('; ') : 'No logs recorded'}.
Pickups: Bridge: ${targetGear.pickup_bridge || 'Stock'}, Middle: ${targetGear.pickup_middle || 'Stock'}, Neck: ${targetGear.pickup_neck || 'Stock'}.
Amp Tone Settings: ${targetGear.amp_settings || 'None'}.`;
  } else {
    // No specific gear resolved - check if asking across all gear
    const allRecentLogs = await db`
      select l.event_type, l.event_date, l.description, l.title, r.brand, r.model, r.raw_text
      from rig_item_logs l
      join rig_items r on r.id = l.rig_item_id
      where l.user_id = ${userId}
      order by l.event_date desc, l.id desc
      limit 10
    `;

    if (allRecentLogs.length === 0) {
      return {
        ok: true,
        status: 'not_found',
        answer: "You haven't recorded any maintenance logs on your instruments yet.",
        costUsd: 0,
      };
    }

    deterministicFacts = `Recent maintenance logs across collection:
${allRecentLogs
  .map((l) => `${l.event_date}: ${formatGearTitle(l.brand, l.model, l.raw_text)} - [${l.event_type}] ${l.description || l.title || ''}`)
  .join('\n')}`;
  }

  // If asking about strings specifically and we have a deterministic string date:
  if (
    targetGear &&
    (qLower.includes('string') || qLower.includes('restring') || qLower.includes('changed strings'))
  ) {
    const lastDate = targetGear.last_restrung_at
      ? new Date(targetGear.last_restrung_at).toISOString().split('T')[0]
      : null;
    const stringDetails = [
      targetGear.string_manufacturer,
      targetGear.string_gauge,
    ]
      .filter(Boolean)
      .join(' ');

    if (!lastDate) {
      const answer = `No string changes have been logged yet for ${targetGearTitle}.`;
      await recordAssistantCost({
        userId,
        intent: 'query',
        toolName: 'query_rig',
        model: 'deterministic-facts',
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      });
      return {
        ok: true,
        status: 'answered',
        answer,
        gear: { id: targetGear.id, name: targetGearTitle },
        costUsd: 0,
      };
    }

    const answer = `You last changed the strings on ${targetGearTitle} on ${lastDate}${
      stringDetails ? ` with ${stringDetails}` : ''
    }.`;

    await recordAssistantCost({
      userId,
      intent: 'query',
      toolName: 'query_rig',
      model: 'deterministic-facts',
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    });

    return {
      ok: true,
      status: 'answered',
      answer,
      gear: { id: targetGear.id, name: targetGearTitle },
      costUsd: 0,
    };
  }

  // 3. Phrasing with LLM (or deterministic fallback)
  if (!apiKey) {
    const simpleAnswer = targetGear
      ? `Details for ${targetGearTitle}: Tuning: ${targetGear.tuning || 'Standard'}, Last Restrung: ${targetGear.last_restrung_at ? new Date(targetGear.last_restrung_at).toISOString().split('T')[0] : 'None recorded'}.`
      : 'Found your recent maintenance records in Passport.';

    return {
      ok: true,
      status: 'answered',
      answer: simpleAnswer,
      gear: targetGear ? { id: targetGear.id, name: targetGearTitle } : undefined,
      costUsd: 0,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are the neutral Ryff command engine answering questions about the user's instruments.
Answer the user's question using ONLY the factual database records provided.
Do NOT guess, speculate, or make up facts. Keep the tone concise, clear, and direct (1 to 2 sentences).
If the user's question cannot be answered by the records, state that clearly.

--- Real Database Facts ---
${deterministicFacts}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: question }] }],
      config: {
        systemInstruction,
        temperature: 0.1,
        maxOutputTokens: 150,
      },
    });

    const answer = response?.text?.trim() || `Found records for ${targetGearTitle || 'your gear'}.`;
    const usageMetadata = response?.usageMetadata;
    const usage: TokenUsage = {
      input_tokens: usageMetadata?.promptTokenCount || 120,
      output_tokens: usageMetadata?.candidatesTokenCount || 35,
    };
    const cost = costUsd(modelName, usage);

    await recordAssistantCost({
      userId,
      intent: 'query',
      toolName: 'query_rig',
      model: modelName,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      costUsd: cost,
    });

    return {
      ok: true,
      status: 'answered',
      answer,
      gear: targetGear ? { id: targetGear.id, name: targetGearTitle } : undefined,
      costUsd: cost,
    };
  } catch (err) {
    console.error('[Query Rig] LLM phrasing failed:', err);
    const lastDate = targetGear?.last_restrung_at ? new Date(targetGear.last_restrung_at).toISOString().split('T')[0] : null;
    const stringDetails = [targetGear?.string_manufacturer, targetGear?.string_gauge].filter(Boolean).join(' ');
    let fallback = `Records for ${targetGearTitle || 'your gear'}: Tuning: ${targetGear?.tuning || 'Standard'}.`;

    if (qLower.includes('string') || qLower.includes('restring')) {
      fallback = lastDate
        ? `You last changed the strings on ${targetGearTitle} on ${lastDate}${stringDetails ? ` with ${stringDetails}` : ''}.`
        : `No string changes have been logged yet for ${targetGearTitle}.`;
    }

    return {
      ok: true,
      status: 'answered',
      answer: fallback,
      gear: targetGear ? { id: targetGear.id, name: targetGearTitle } : undefined,
      costUsd: 0,
    };
  }
}

/**
 * Queries the user's active wants and matches from the deals table.
 */
export async function queryDeals(input: QueryDealsInput): Promise<QueryDealsResult> {
  const { userId, wantRef } = input;
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const modelName = env.MODEL_FAST || 'gemini-2.5-flash';

  // 1. Fetch user's wants
  const wantsRaw = await db<any[]>`
    select id, brand, model, raw_text, budget_gbp, currency, alert, want_key
    from rig_items
    where user_id = ${userId} and kind = 'want'
    order by id desc
  `;
  let wants: any[] = [...wantsRaw];

  if (wants.length === 0) {
    return {
      ok: true,
      status: 'no_wants',
      answer: "You don't have any items on your Wants list yet. You can add one by saying: 'Looking for a Soldano SLO-100 in the UK under £2,000'.",
      wantsCount: 0,
      dealsCount: 0,
      costUsd: 0,
    };
  }

  // Filter if wantRef specified
  if (wantRef) {
    const refClean = wantRef.toLowerCase();
    const filtered = wants.filter(
      (w) =>
        (w.brand && w.brand.toLowerCase().includes(refClean)) ||
        (w.model && w.model.toLowerCase().includes(refClean)) ||
        (w.raw_text && w.raw_text.toLowerCase().includes(refClean))
    );
    if (filtered.length > 0) {
      wants = filtered;
    }
  }

  // 2. Fetch recent matching deals
  const deals = await db`
    select d.id, d.title, d.price_amount, d.price_currency, d.price_drop_text, d.listing_url, d.published_at
    from deals d
    order by d.published_at desc nulls last, d.id desc
    limit 5
  `;

  const wantsSummary = wants
    .map(
      (w) =>
        `${formatGearTitle(w.brand, w.model, w.raw_text)}${
          w.budget_gbp ? ` (Max ${w.currency || 'GBP'} ${w.budget_gbp})` : ''
        }`
    )
    .join(', ');

  const dealsSummary =
    deals.length > 0
      ? deals
          .map((d) => {
            const dom = d.published_at
              ? Math.max(0, Math.floor((Date.now() - new Date(d.published_at).getTime()) / (1000 * 60 * 60 * 24)))
              : null;
            return `• ${d.title}: ${d.price_currency || 'GBP'} ${d.price_amount}${
              dom !== null ? ` · ${dom}d on Reverb` : ''
            }${d.price_drop_text ? ` · ${d.price_drop_text}` : ''}`;
          })
          .join('\n')
      : 'No live marketplace listings currently matched in database.';

  const facts = `Active tracked wants: ${wantsSummary}.\nMatches in Trader:\n${dealsSummary}`;

  if (!apiKey) {
    const simpleAnswer = `You have ${wants.length} active want(s): ${wantsSummary}.\n${
      deals.length > 0 ? `Found ${deals.length} listings in Trader.` : 'No matching listings found yet.'
    }`;
    return {
      ok: true,
      status: 'answered',
      answer: simpleAnswer,
      wantsCount: wants.length,
      dealsCount: deals.length,
      costUsd: 0,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are the neutral Ryff command engine answering questions about marketplace deals and wants.
Summarize the user's active wants and any current deal matches clearly in 2 to 3 concise sentences.
Include prices and regions where available. Keep it direct.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: facts }] }],
      config: {
        systemInstruction,
        temperature: 0.1,
        maxOutputTokens: 150,
      },
    });

    const answer = response?.text?.trim() || `Tracked wants: ${wantsSummary}.\n${dealsSummary}`;
    const usageMetadata = response?.usageMetadata;
    const usage: TokenUsage = {
      input_tokens: usageMetadata?.promptTokenCount || 100,
      output_tokens: usageMetadata?.candidatesTokenCount || 40,
    };
    const cost = costUsd(modelName, usage);

    await recordAssistantCost({
      userId,
      intent: 'query',
      toolName: 'query_deals',
      model: modelName,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      costUsd: cost,
    });

    return {
      ok: true,
      status: 'answered',
      answer,
      wantsCount: wants.length,
      dealsCount: deals.length,
      costUsd: cost,
    };
  } catch (err) {
    console.error('[Query Deals] LLM phrasing failed:', err);
    return {
      ok: true,
      status: 'answered',
      answer: `Active wants: ${wantsSummary}.\n${dealsSummary}`,
      wantsCount: wants.length,
      dealsCount: deals.length,
      costUsd: 0,
    };
  }
}
