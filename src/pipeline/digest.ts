import { db } from '@/lib/db';
import { complete } from '@/lib/llm';
import { env } from '@/lib/env';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const digestOutputSchema = z.array(
  z.object({
    id: z.number(),
    relevant: z.boolean(),
    summary: z.string(),
    item_type: z.enum(['launch', 'review', 'deal', 'rumour', 'opinion', 'news', 'other']),
    brands: z.array(z.string()),
    products: z.array(z.string()),
    hype: z.number().min(0).max(5),
  })
);

export async function digestPendingItems(batchSize: number = 8, maxTotal: number = 80) {
  console.log(`[Digest Pipeline] Querying up to ${maxTotal} undigested items...`);

  const pendingItems = await db`
    SELECT id, title, snippet FROM items 
    WHERE digested_at IS NULL
    ORDER BY published_at DESC NULLS LAST, id DESC
    LIMIT ${maxTotal}
  `;

  if (pendingItems.length === 0) {
    console.log('[Digest Pipeline] No undigested items remaining.');
    return { digestedCount: 0, totalCostUsd: 0 };
  }

  console.log(`[Digest Pipeline] Processing ${pendingItems.length} items in batches of ${batchSize}...`);

  const digestSystemPrompt = fs.readFileSync(path.resolve(process.cwd(), 'prompts/digest.system.md'), 'utf8');

  let digestedCount = 0;
  let totalCostUsd = 0;

  for (let i = 0; i < pendingItems.length; i += batchSize) {
    const chunk = pendingItems.slice(i, i + batchSize);
    const userContent = chunk
      .map(it => `<item id="${it.id}"><title>${it.title}</title><snippet>${it.snippet}</snippet></item>`)
      .join('\n');

    try {
      const llmResult = await complete({
        model: env.MODEL_FAST || 'gemini-3.5-flash-lite',
        system: digestSystemPrompt,
        messages: [{ role: 'user', content: userContent }],
        purpose: `batch-digest-${i / batchSize + 1}`,
      });

      totalCostUsd += llmResult.costUsd;

      // Try Zod parsing of returned JSON
      let parsedJson: unknown;
      try {
        const cleanedText = llmResult.text.replace(/```json\n?|\n?```/g, '').trim();
        parsedJson = JSON.parse(cleanedText);
      } catch {
        parsedJson = null;
      }

      const validated = digestOutputSchema.safeParse(parsedJson);

      if (validated.success) {
        for (const itemResult of validated.data) {
          await db`
            UPDATE items 
            SET 
              digested_at = NOW(),
              relevant = ${itemResult.relevant},
              summary = ${itemResult.summary},
              item_type = ${itemResult.item_type},
              brands = ${itemResult.brands},
              products = ${itemResult.products},
              hype = ${itemResult.hype}
            WHERE id = ${itemResult.id}
          `;
          digestedCount++;
        }
      } else {
        console.warn(`[Digest Batch Warn] Zod validation failed for batch starting at item ${chunk[0]?.id}. Marking items fallback.`);
        for (const item of chunk) {
          await db`
            UPDATE items 
            SET 
              digested_at = NOW(),
              relevant = true,
              summary = ${item.snippet?.slice(0, 150) || item.title},
              item_type = 'news',
              brands = '{}',
              products = '{}',
              hype = 2
            WHERE id = ${item.id}
          `;
          digestedCount++;
        }
      }
    } catch (err: unknown) {
      console.error(`[Digest Error] Failed batch processing:`, err);
    }
  }

  console.log(`[Digest Complete] Digested: ${digestedCount} items | Total Digest Spend: $${totalCostUsd.toFixed(6)}`);
  return { digestedCount, totalCostUsd };
}
