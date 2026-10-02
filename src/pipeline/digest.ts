import { db } from '@/lib/db';
import { complete } from '@/lib/llm';
import { env } from '@/lib/env';
import { fetchYouTubeTranscript, politeDelay } from '@/lib/youtube';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const digestOutputSchema = z.array(
  z.object({
    id: z.number(),
    relevant: z.boolean(),
    summary: z.string(),
    item_type: z.enum(['launch', 'review', 'deal', 'rumour', 'opinion', 'news', 'other']).default('news'),
    category: z.enum(['guitar', 'bass', 'amp', 'pedal', 'modeller', 'artist', 'deal', 'industry', 'other']).default('other'),
    brands: z.array(z.string()).default([]),
    products: z.array(z.string()).default([]),
    players: z.array(z.string()).default([]),
    hype: z.number().min(0).max(5).default(2),
    controversy: z.number().min(0).max(5).default(0),
  })
);

export async function digestPendingItems(batchSize: number = 10, maxTotal: number = 60) {
  console.log(`[Digest Pipeline] Querying up to ${maxTotal} high-priority undigested items...`);

  // Prioritize items with multi-source buzz, then recency
  const pendingItems = await db`
    SELECT 
      i.id, 
      i.title, 
      i.snippet, 
      i.url,
      i.transcript,
      i.brands, 
      i.players, 
      i.buzz_count,
      s.kind as source_kind,
      s.name as source_name
    FROM items i
    JOIN sources s ON i.source_id = s.id
    WHERE i.digested_at IS NULL
    ORDER BY i.buzz_count DESC, i.published_at DESC NULLS LAST, i.id DESC
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

    // Pre-fetch transcripts for YouTube items in this chunk if not already present
    const itemXmlBlocks: string[] = [];

    for (const it of chunk) {
      const isYoutube = it.source_kind === 'youtube' || it.url.includes('youtube.com') || it.url.includes('youtu.be');
      let transcriptText = it.transcript;

      if (isYoutube && !transcriptText) {
        // Fetch transcript with polite delay
        transcriptText = await fetchYouTubeTranscript(it.url);
        if (transcriptText) {
          // Cache transcript in database
          try {
            await db`UPDATE items SET transcript = ${transcriptText} WHERE id = ${it.id}`;
            it.transcript = transcriptText;
          } catch (err) {
            console.warn(`[Digest Warn] Could not save transcript for item #${it.id}:`, err);
          }
        }
        await politeDelay(500);
      }

      if (isYoutube) {
        if (transcriptText) {
          itemXmlBlocks.push(
            `<item id="${it.id}" type="youtube">\n<title>${it.title}</title>\n<channel>${it.source_name}</channel>\n<snippet>${it.snippet}</snippet>\n<transcript>\n${transcriptText}\n</transcript>\n</item>`
          );
        } else {
          itemXmlBlocks.push(
            `<item id="${it.id}" type="youtube">\n<title>${it.title}</title>\n<channel>${it.source_name}</channel>\n<snippet>${it.snippet}</snippet>\n</item>`
          );
        }
      } else {
        itemXmlBlocks.push(
          `<item id="${it.id}" type="article">\n<title>${it.title}</title>\n<source>${it.source_name}</source>\n<snippet>${it.snippet}</snippet>\n</item>`
        );
      }
    }

    const userContent = itemXmlBlocks.join('\n\n');

    try {
      const llmResult = await complete({
        model: env.MODEL_FAST || 'gemini-2.5-flash',
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
          const originalItem = chunk.find(it => Number(it.id) === Number(itemResult.id));
          const combinedBrands = Array.from(new Set([...(originalItem?.brands || []), ...itemResult.brands]));
          const combinedPlayers = Array.from(new Set([...(originalItem?.players || []), ...itemResult.players]));

          await db`
            UPDATE items 
            SET 
              digested_at = NOW(),
              relevant = ${itemResult.relevant},
              summary = ${itemResult.summary},
              item_type = ${itemResult.item_type},
              category = ${itemResult.category || 'other'},
              brands = ${combinedBrands},
              products = ${itemResult.products},
              players = ${combinedPlayers},
              hype = ${itemResult.hype},
              controversy = ${itemResult.controversy || 0}
            WHERE id = ${itemResult.id}
          `;
          digestedCount++;
        }
      } else {
        console.warn(`[Digest Batch Warn] Zod validation failed for batch starting at item ${chunk[0]?.id}:`, validated.error?.format());
        for (const item of chunk) {
          await db`
            UPDATE items 
            SET 
              digested_at = NOW(),
              relevant = true,
              summary = ${item.snippet?.slice(0, 150) || item.title},
              item_type = 'news',
              category = 'other',
              hype = 2,
              controversy = 0
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
