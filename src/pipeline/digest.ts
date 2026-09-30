import { db } from '../lib/db';
import { complete } from '../lib/llm';
import { checkPipelineSpendCap } from '../lib/usage';

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

  console.log(`[Digest] Found ${items.length} items to digest.`);

  const promptText = items.map(it => `[Item ID ${it.id}]: ${it.title} - ${it.snippet}`).join('\n');

  console.log('\n================ GUARDIAN CHECK BEFORE LLM CALL ================');
  console.log(`[PAUSE] Ready to call LLM for digesting ${items.length} items.`);
  console.log(`Model target: gemini-2.5-flash`);
  console.log(`Sample prompt preview: "${promptText.slice(0, 120)}..."`);
  console.log('=================================================================\n');

  return items;
}
