import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { complete } from '@/lib/llm';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const formattedEpisodeSchema = z.object({
  headline: z.string(),
  topics: z.array(
    z.object({
      title: z.string(),
      hank: z.string(),
      vee: z.string(),
      disagreement: z.string(),
      source_item_ids: z.array(z.number()),
    })
  ),
});

export interface DebateOptions {
  limitItems?: number;
  fromFixture?: string;
  promptVersion?: string; // e.g. 'v1', 'v2'
}

export async function runDebatePipeline(options: DebateOptions = {}) {
  const limitItems = options.limitItems || 8;
  const promptVer = options.promptVersion || process.env.PROMPT_VERSION || 'v1';
  const promptDir = path.resolve(process.cwd(), 'prompts', promptVer);
  const fallbackPromptDir = path.resolve(process.cwd(), 'prompts');

  const getPrompt = (file: string) => {
    const versionedPath = path.join(promptDir, file);
    if (fs.existsSync(versionedPath)) {
      return fs.readFileSync(versionedPath, 'utf8');
    }
    return fs.readFileSync(path.join(fallbackPromptDir, file), 'utf8');
  };

  let candidateItems: any[] = [];

  if (options.fromFixture) {
    const fixturePath = path.isAbsolute(options.fromFixture) 
      ? options.fromFixture 
      : path.resolve(process.cwd(), 'fixtures/frozen', options.fromFixture);
    console.log(`[Debate Pipeline] Loading frozen items from fixture: ${fixturePath}`);
    const rawFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    candidateItems = rawFixture.slice(0, limitItems);
  } else {
    console.log(`[Debate Pipeline] Selecting top ${limitItems} relevant digested items from the last 48 hours...`);
    candidateItems = await db`
      SELECT id, title, summary, brands, products, hype, item_type 
      FROM items 
      WHERE digested_at IS NOT NULL AND relevant = true
      ORDER BY hype DESC, published_at DESC NULLS LAST, id DESC 
      LIMIT ${limitItems}
    `;
  }

  if (candidateItems.length === 0) {
    console.log('[Debate Pipeline] No relevant digested items found.');
    return null;
  }

  console.log(`[Debate Pipeline (Prompt: ${promptVer})] Selected ${candidateItems.length} items for debate:`);
  candidateItems.forEach(it => console.log(` - [ID ${it.id}] (Hype: ${it.hype}) ${it.title}`));

  // 2. Load Prompts from Versioned Directory
  const hankPersona = getPrompt('persona.hank.md');
  const veePersona = getPrompt('persona.vee.md');
  const openerPrompt = getPrompt('debate.opener.md');
  const replyPrompt = getPrompt('debate.reply.md');
  const formatPrompt = getPrompt('format.system.md');

  const contextItems = candidateItems
    .map(it => `<item id="${it.id}" brands="${(it.brands || []).join(',')}">${it.title}: ${it.summary}</item>`)
    .join('\n');
  const contextBlock = `<context>\n${contextItems}\n</context>`;

  let totalCostUsd = 0;
  const transcript: Array<{ speaker: 'Hank' | 'Vee'; text: string; turn: number }> = [];

  // Turn 1: Hank Opener
  console.log('\n[Debate] Turn 1: Hank Opening...');
  const turn1 = await complete({
    model: env.MODEL_SMART || 'gemini-pro-latest',
    system: hankPersona,
    messages: [
      { role: 'user', content: `${openerPrompt}\n\n${contextBlock}` }
    ],
    purpose: 'debate-turn1-hank-opener',
    temperature: 0.8,
  });
  totalCostUsd += turn1.costUsd;
  transcript.push({ speaker: 'Hank', text: turn1.text, turn: 1 });

  // Turn 2: Vee Response
  console.log('[Debate] Turn 2: Vee Responding...');
  const turn2 = await complete({
    model: env.MODEL_SMART || 'gemini-pro-latest',
    system: veePersona,
    messages: [
      { role: 'user', content: `${contextBlock}\n\n${replyPrompt}\n\nHank argues:\n"${turn1.text}"` }
    ],
    purpose: 'debate-turn2-vee-response',
    temperature: 0.8,
  });
  totalCostUsd += turn2.costUsd;
  transcript.push({ speaker: 'Vee', text: turn2.text, turn: 2 });

  // Turn 3: Hank Rebuttal
  console.log('[Debate] Turn 3: Hank Rebuttal...');
  const turn3 = await complete({
    model: env.MODEL_SMART || 'gemini-pro-latest',
    system: hankPersona,
    messages: [
      { 
        role: 'user', 
        content: `${contextBlock}\n\nYour opening was:\n"${turn1.text}"\n\nVee replied:\n"${turn2.text}"\n\nRebut Vee's points briefly in character. Max 120 words.` 
      }
    ],
    purpose: 'debate-turn3-hank-rebuttal',
    temperature: 0.7,
  });
  totalCostUsd += turn3.costUsd;
  transcript.push({ speaker: 'Hank', text: turn3.text, turn: 3 });

  // Turn 4: Vee Closing
  console.log('[Debate] Turn 4: Vee Closing...');
  const turn4 = await complete({
    model: env.MODEL_SMART || 'gemini-pro-latest',
    system: veePersona,
    messages: [
      { 
        role: 'user', 
        content: `${contextBlock}\n\nHank rebutted:\n"${turn3.text}"\n\nDeliver your closing take on today's gear news. Max 120 words.` 
      }
    ],
    purpose: 'debate-turn4-vee-closing',
    temperature: 0.7,
  });
  totalCostUsd += turn4.costUsd;
  transcript.push({ speaker: 'Vee', text: turn4.text, turn: 4 });

  // Step 5: JSON Formatter with MODEL_FAST
  console.log('\n[Debate] Formatting full 4-turn transcript into structured episode schema...');
  const fullTranscriptText = transcript.map(t => `${t.speaker} (Turn ${t.turn}):\n${t.text}`).join('\n\n');

  const formatRes = await complete({
    model: env.MODEL_FAST || 'gemini-3.5-flash-lite',
    system: formatPrompt,
    messages: [
      { role: 'user', content: `Here is the debate transcript to structure into JSON:\n\n${fullTranscriptText}` }
    ],
    purpose: 'debate-format-json',
    temperature: 0.2,
  });
  totalCostUsd += formatRes.costUsd;

  let parsedEpisode: any;
  try {
    const cleaned = formatRes.text.replace(/```json\n?|\n?```/g, '').trim();
    parsedEpisode = JSON.parse(cleaned);
  } catch {
    console.warn('[Debate Warn] JSON parsing failed on formatted episode. Constructing structured fallback.');
    parsedEpisode = {
      headline: "Hank vs Vee: Clash Over Today's Gear & Vintage Hype",
      topics: [
        {
          title: candidateItems[0]?.title || "Daily Gear Showdown",
          hank: turn1.text.slice(0, 300),
          vee: turn2.text.slice(0, 300),
          disagreement: "Classic guitar craftsmanship vs modern modelling convenience and tech value.",
          source_item_ids: candidateItems.map(it => Number(it.id))
        }
      ]
    };
  }

  const validEpisode = formattedEpisodeSchema.safeParse(parsedEpisode);
  const finalEpisodeData = validEpisode.success ? validEpisode.data : parsedEpisode;

  // Step 6: Persist episode to Neon database
  const insertRes = await db`
    INSERT INTO episodes (headline, topics, transcript, status, published_at)
    VALUES (
      ${finalEpisodeData.headline},
      ${JSON.stringify(finalEpisodeData.topics)},
      ${JSON.stringify(transcript)},
      'published',
      NOW()
    )
    RETURNING id, created_at, headline
  `;

  console.log(`\n[Debate Complete] Episode ID #${insertRes[0]?.id} published to database.`);
  console.log(`Headline: "${insertRes[0]?.headline}"`);
  console.log(`Total 4-Turn Debate Cost: $${totalCostUsd.toFixed(6)}`);

  return {
    episodeId: insertRes[0]?.id,
    headline: finalEpisodeData.headline,
    topics: finalEpisodeData.topics,
    totalCostUsd,
  };
}
