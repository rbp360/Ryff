import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../../../lib/db';
import { getSession, ensureUserExists } from '../../../lib/session';
import { checkUserUsage, recordMessageUsage } from '../../../lib/usage';
import { validateUserInput, renderTokens, sanitiseUntrusted } from '../../../lib/guard';
import { retrieveChatContext } from '../../../lib/retrieval';
import { complete, LLMMessage } from '../../../lib/llm';
import { logEvent } from '../../../lib/events';
import { env } from '../../../lib/env';

function loadPromptFile(filename: string): string {
  try {
    const fullPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'prompts', filename);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8').trim();
    }
  } catch (err) {
    console.warn(`Could not load prompt file ${filename}:`, err);
  }
  return '';
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserExists(session);

  const { searchParams } = new URL(request.url);
  const bot = searchParams.get('bot') || 'hank';

  const messages = await db`
    select id, conversation_id, bot, role, content, flagged, created_at
    from messages
    where user_id = ${session.userId} and bot = ${bot}
    order by created_at asc
    limit 50
  `;

  const usageCheck = await checkUserUsage(session.userId, session.cohort, bot as 'hank' | 'vee');

  return NextResponse.json({
    messages,
    usage: {
      msgsToday: usageCheck.msgsToday,
      dailyCap: usageCheck.dailyCap,
      costMonthUsd: usageCheck.costMonthUsd,
      monthlyBudgetUsd: usageCheck.monthlyBudgetUsd,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureUserExists(session);

    const body = await request.json();
    const { bot = 'hank', message, conversationId } = body;
    const cleanBot: 'hank' | 'vee' = bot === 'vee' ? 'vee' : 'hank';

    // 1. Check Usage Caps
    const usageCheck = await checkUserUsage(session.userId, session.cohort, cleanBot);
    if (!usageCheck.allowed) {
      return NextResponse.json({
        text: usageCheck.inCharacterMessage || "Message limit reached for today.",
        isCapped: true,
        usage: {
          msgsToday: usageCheck.msgsToday,
          dailyCap: usageCheck.dailyCap,
        },
      }, { status: 429 });
    }

    // 2. Validate & Sanitise User Input
    const inputValidation = validateUserInput(message, 500);
    if (!inputValidation.valid) {
      return NextResponse.json({ error: inputValidation.error }, { status: 400 });
    }
    const cleanUserText = inputValidation.sanitised;

    // 3. Retrieve Rich Context (Episode, News Items, Rig, Deals)
    const context = await retrieveChatContext(session.userId, cleanUserText);

    // 4. Build System & Context Blocks
    const personaPrompt = loadPromptFile(`persona.${cleanBot}.md`);
    const chatRules = loadPromptFile('chat.system.md');

    let systemInstruction = `${personaPrompt}\n\n${chatRules}`;

    if (context.episode) {
      systemInstruction += `\n\n<today_episode headline="${context.episode.headline}">\n`;
      for (const t of context.episode.topics) {
        systemInstruction += `Topic: ${t.title}\nHank Take: ${t.hank}\nVee Take: ${t.vee}\nDisagreement: ${t.disagreement}\n\n`;
      }
      systemInstruction += `</today_episode>`;
    }

    // Build Context XML for User prompt
    let contextXml = `<context>\n`;

    // Today's Episode Topics
    if (context.episode && context.episode.topics.length > 0) {
      contextXml += `  <today_episode id="${context.episode.id}" headline="${sanitiseUntrusted(context.episode.headline, 120)}">\n`;
      for (const t of context.episode.topics) {
        contextXml += `    <topic title="${sanitiseUntrusted(t.title, 100)}">\n`;
        contextXml += `      <hank_take>${sanitiseUntrusted(t.hank, 250)}</hank_take>\n`;
        contextXml += `      <vee_take>${sanitiseUntrusted(t.vee, 250)}</vee_take>\n`;
        contextXml += `      <disagreement>${sanitiseUntrusted(t.disagreement, 150)}</disagreement>\n`;
        contextXml += `    </topic>\n`;
      }
      contextXml += `  </today_episode>\n`;
    }

    // Ingested Items
    if (context.items.length > 0) {
      contextXml += `  <recent_gear_news>\n`;
      for (const item of context.items) {
        contextXml += `    <item id="${item.id}" source="${sanitiseUntrusted(item.source_name || 'News', 50)}">\n`;
        contextXml += `      <title>${sanitiseUntrusted(item.title, 120)}</title>\n`;
        if (item.summary) {
          contextXml += `      <summary>${sanitiseUntrusted(item.summary, 200)}</summary>\n`;
        }
        contextXml += `    </item>\n`;
      }
      contextXml += `  </recent_gear_news>\n`;
    }

    // User's Rig
    if (context.rigItems.length > 0) {
      contextXml += `  <user_rig>\n`;
      for (const r of context.rigItems) {
        if (r.kind === 'own') {
          contextXml += `    <owned brand="${sanitiseUntrusted(r.brand || '', 50)}" model="${sanitiseUntrusted(r.model || '', 80)}" category="${r.category}" />\n`;
        } else {
          const budget = r.budget_gbp ? ` budget_gbp="${r.budget_gbp}"` : '';
          contextXml += `    <want brand="${sanitiseUntrusted(r.brand || '', 50)}" model="${sanitiseUntrusted(r.model || '', 80)}"${budget} />\n`;
        }
      }
      contextXml += `  </user_rig>\n`;
    }

    // Live Reverb Deals
    if (context.deals.length > 0) {
      contextXml += `  <available_reverb_deals>\n`;
      for (const d of context.deals) {
        contextXml += `    <deal id="${d.id}" title="${sanitiseUntrusted(d.title, 100)}" price="${d.priceCurrency || '$'}${d.priceAmount || 'N/A'}" />\n`;
      }
      contextXml += `  </available_reverb_deals>\n`;
    }

    contextXml += `</context>`;

    // 5. Fetch previous conversation history turns
    const convId = conversationId || crypto.randomUUID();
    const historyRows = await db`
      select role, content
      from messages
      where user_id = ${session.userId} and bot = ${cleanBot} and conversation_id = ${convId}
      order by created_at asc
      limit 6
    `;

    const llmMessages: LLMMessage[] = [];

    for (const h of historyRows) {
      llmMessages.push({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      });
    }

    // Add current user prompt with context
    llmMessages.push({
      role: 'user',
      content: `${contextXml}\n\nUser Question: ${cleanUserText}`,
    });

    // 6. Complete via centralized llm.ts
    const result = await complete({
      model: env.MODEL_FAST,
      system: systemInstruction,
      messages: llmMessages,
      maxTokens: 350,
      temperature: 0.8,
      purpose: `chat_${cleanBot}`,
      userId: session.userId,
    });

    // 7. Render safe token links
    const renderedReply = renderTokens(result.text, {
      items: context.items,
      deals: context.deals,
      bot: cleanBot,
      episodeId: context.episode?.id,
    });

    // 8. Persist user & assistant messages
    await db`
      insert into messages (user_id, conversation_id, bot, role, content)
      values (${session.userId}, ${convId}, ${cleanBot}, 'user', ${cleanUserText})
    `;

    const [savedAssistant] = await db`
      insert into messages (
        user_id, conversation_id, bot, role, content, tokens_in, tokens_out, cost_usd
      )
      values (
        ${session.userId},
        ${convId},
        ${cleanBot},
        'assistant',
        ${renderedReply},
        ${result.usage.input_tokens},
        ${result.usage.output_tokens},
        ${result.costUsd}
      )
      returning id, created_at
    `;

    // 9. Update daily usage & log event
    await recordMessageUsage(session.userId, result.costUsd);
    await logEvent('chat_sent', { bot: cleanBot, costUsd: result.costUsd }, session.userId);

    return NextResponse.json({
      text: renderedReply,
      rawText: result.text,
      messageId: savedAssistant?.id,
      conversationId: convId,
      costUsd: result.costUsd,
      usage: {
        msgsToday: usageCheck.msgsToday + 1,
        dailyCap: usageCheck.dailyCap,
      },
      sources: context.items.map(i => ({ id: i.id, title: i.title, url: i.url })),
      deals: context.deals,
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chat error occurred' },
      { status: 500 }
    );
  }
}
