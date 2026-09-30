import { db } from '../lib/db';
import { env } from '../lib/env';
import { complete } from '../lib/llm';
import fs from 'fs';
import path from 'path';

export async function generateDebateEpisode(items: Array<{ id: number; title: string; summary: string }>) {
  console.log(`[Debate] Executing Hank vs Vee 4-turn debate LLM calls on ${items.length} items...`);

  const hankPersona = fs.readFileSync(path.resolve(process.cwd(), 'prompts/persona.hank.md'), 'utf8');
  const veePersona = fs.readFileSync(path.resolve(process.cwd(), 'prompts/persona.vee.md'), 'utf8');
  const debateOpener = fs.readFileSync(path.resolve(process.cwd(), 'prompts/debate.opener.md'), 'utf8');

  const contextBlock = `<context>\n${items.map(it => `<item id="${it.id}">${it.title}: ${it.summary}</item>`).join('\n')}\n</context>`;

  // Turn 1: Hank Opener
  const hankRes = await complete({
    model: env.MODEL_FAST || 'gemini-1.5-flash',
    system: hankPersona,
    messages: [
      { role: 'user', content: `${debateOpener}\n\n${contextBlock}` }
    ],
    purpose: 'debate-hank-opener',
    temperature: 0.7
  });

  // Turn 2: Vee Response
  const veeRes = await complete({
    model: env.MODEL_FAST || 'gemini-1.5-flash',
    system: veePersona,
    messages: [
      { role: 'user', content: `${contextBlock}\n\nHank says:\n"${hankRes.text}"\n\nRespond to Hank's points in your voice. Max 150 words.` }
    ],
    purpose: 'debate-vee-response',
    temperature: 0.7
  });

  console.log(`[Hank Opener Cost]: $${hankRes.costUsd.toFixed(6)}`);
  console.log(`[Vee Response Cost]: $${veeRes.costUsd.toFixed(6)}`);

  const topicTitle = items[0]?.title || 'Daily Gear News';

  const episodeData = {
    headline: `Hank vs Vee: ${topicTitle.slice(0, 60)}`,
    topics: [
      {
        title: topicTitle,
        hank: hankRes.text,
        vee: veeRes.text,
        disagreement: "Build quality, classic craftsmanship vs digital versatility and gear convenience.",
        source_item_ids: items.map(i => Number(i.id))
      }
    ],
    transcript: [
      { speaker: 'Hank', text: hankRes.text },
      { speaker: 'Vee', text: veeRes.text }
    ]
  };

  // Insert episode record into Neon Postgres DB
  await db`
    INSERT INTO episodes (headline, topics, transcript, status, published_at)
    VALUES (
      ${episodeData.headline},
      ${JSON.stringify(episodeData.topics)},
      ${JSON.stringify(episodeData.transcript)},
      'published',
      NOW()
    )
  `;

  return episodeData;
}
