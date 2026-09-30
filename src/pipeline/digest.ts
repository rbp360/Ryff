import { db } from '../lib/db';
import { complete } from '../lib/llm';
import fs from 'fs';
import path from 'path';

export async function digestPendingItems(sampleLimit: number = 3) {
  console.log(`[Digest] Fetching up to ${sampleLimit} undigested items...`);

  const items = await db`
    SELECT id, title, snippet FROM items 
    WHERE digested_at IS NULL OR summary IS NULL 
    LIMIT ${sampleLimit}
  `;

  if (items.length === 0) {
    console.log('[Digest] No pending undigested items found.');
    return [];
  }

  console.log(`[Digest] Found ${items.length} items to digest with live LLM call.`);

  const digestSystemPrompt = fs.readFileSync(path.resolve(process.cwd(), 'prompts/digest.system.md'), 'utf8');

  const userContent = items.map(it => `<item id="${it.id}"><title>${it.title}</title><snippet>${it.snippet}</snippet></item>`).join('\n');

  const llmResult = await complete({
    model: env.MODEL_FAST || 'gemini-1.5-flash',
    system: digestSystemPrompt,
    messages: [{ role: 'user', content: userContent }],
    purpose: 'ingest-digest-sample',
  });

  console.log(`[Digest LLM Output]:\n${llmResult.text}`);
  console.log(`[Digest Cost]: $${llmResult.costUsd.toFixed(6)} | Tokens In: ${llmResult.usage.input_tokens} Out: ${llmResult.usage.output_tokens}`);

  // Mark items as digested in DB
  for (const item of items) {
    await db`
      UPDATE items 
      SET digested_at = NOW(), summary = ${item.snippet?.slice(0, 150) || item.title}
      WHERE id = ${item.id}
    `;
  }

  return items;
}
