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
import { getBot, buildBotSystemPrompt } from '../../../lib/bots';

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
  const botParam = searchParams.get('bot') || 'robbpaul';
  const bot = getBot(botParam);

  const messages = await db`
    select id, conversation_id, bot, role, content, flagged, created_at
    from messages
    where user_id = ${session.userId} and bot = ${bot.id}
    order by created_at asc
    limit 50
  `;

  const usageCheck = await checkUserUsage(session.userId, session.cohort, bot.id);

  return NextResponse.json({
    bot: {
      id: bot.id,
      name: bot.name,
      archetype: bot.archetype,
      irrational_hill_to_die_on: bot.irrational_hill_to_die_on,
      avatarText: bot.avatarText,
      temperature: bot.temperature,
    },
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
    const { bot: botParam, botId, message, conversationId } = body;
    const requestedId = botId || botParam || 'robbpaul';
    const targetBot = getBot(requestedId);

    // 1. Check Usage Caps
    const usageCheck = await checkUserUsage(session.userId, session.cohort, targetBot.id);
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
    const shouldDisagree = Math.random() < targetBot.disagreement_rate;
    const personaPrompt = buildBotSystemPrompt(targetBot, { disagreement: shouldDisagree });
    const chatRules = loadPromptFile('chat.system.md');

    let systemInstruction = `${personaPrompt}\n\n${chatRules}`;

    if (context.episode) {
      systemInstruction += `\n\n<today_episode headline="${context.episode.headline}">\n`;
      for (const t of context.episode.topics) {
        systemInstruction += `Topic: ${t.title}\nDisagreement: ${t.disagreement}\n`;
        if (t.takes && Array.isArray(t.takes)) {
          for (const take of t.takes) {
            systemInstruction += `${take.speaker_name} Take: ${take.text}\n`;
          }
        } else {
          if (t.hank) systemInstruction += `Hank Take: ${t.hank}\n`;
          if (t.vee) systemInstruction += `Vee Take: ${t.vee}\n`;
        }
        systemInstruction += '\n';
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
        if (t.takes && Array.isArray(t.takes)) {
          for (const take of t.takes) {
            contextXml += `      <take speaker="${sanitiseUntrusted(take.speaker_name, 50)}">${sanitiseUntrusted(take.text, 250)}</take>\n`;
          }
        } else {
          if (t.hank) contextXml += `      <hank_take>${sanitiseUntrusted(t.hank, 250)}</hank_take>\n`;
          if (t.vee) contextXml += `      <vee_take>${sanitiseUntrusted(t.vee, 250)}</vee_take>\n`;
        }
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

    // User Preferences (Favorite Players & Followed Brands)
    if (context.userPreferences) {
      if (context.userPreferences.favoritePlayers.length > 0 || context.userPreferences.followedBrands.length > 0) {
        contextXml += `  <user_tastes>\n`;
        if (context.userPreferences.favoritePlayers.length > 0) {
          contextXml += `    <favorite_players>${sanitiseUntrusted(context.userPreferences.favoritePlayers.join(', '), 150)}</favorite_players>\n`;
        }
        if (context.userPreferences.followedBrands.length > 0) {
          contextXml += `    <followed_brands>${sanitiseUntrusted(context.userPreferences.followedBrands.join(', '), 150)}</followed_brands>\n`;
        }
        contextXml += `  </user_tastes>\n`;
      }
    }

    contextXml += `</context>`;

    // 5. Fetch previous conversation history turns
    const convId = conversationId || crypto.randomUUID();
    const historyRows = await db`
      select role, content
      from messages
      where user_id = ${session.userId} and bot = ${targetBot.id} and conversation_id = ${convId}
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
      maxTokens: 300,
      temperature: targetBot.temperature,
      purpose: `chat_${targetBot.id}`,
      userId: session.userId,
    });

    // 7. Render safe token links (using compact "link" / "deal" text)
    const renderedReply = renderTokens(result.text, {
      items: context.items,
      deals: context.deals,
      bot: targetBot.id,
      episodeId: context.episode?.id,
      compactLinks: true,
    });

    // 8. Persist user & assistant messages
    await db`
      insert into messages (user_id, conversation_id, bot, role, content)
      values (${session.userId}, ${convId}, ${targetBot.id}, 'user', ${cleanUserText})
    `;

    const [savedAssistant] = await db`
      insert into messages (
        user_id, conversation_id, bot, role, content, tokens_in, tokens_out, cost_usd
      )
      values (
        ${session.userId},
        ${convId},
        ${targetBot.id},
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
    await logEvent('chat_sent', { bot: targetBot.id, costUsd: result.costUsd }, session.userId);

    return NextResponse.json({
      text: renderedReply,
      rawText: result.text,
      bot: {
        id: targetBot.id,
        name: targetBot.name,
      },
      disagreed: shouldDisagree,
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
