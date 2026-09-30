import { db } from '../lib/db';
import { complete } from '../lib/llm';

export async function generateDebateEpisode(items: Array<{ id: number; title: string; summary: string }>) {
  console.log(`[Debate] Preparing 4-turn Hank vs Vee debate for ${items.length} items...`);

  const itemContext = items.map(it => `<item id="${it.id}">${it.title}: ${it.summary}</item>`).join('\n');

  console.log('\n================ GUARDIAN CHECK BEFORE LLM CALL ================');
  console.log(`[PAUSE] Ready to run 4-turn debate on Gemini model.`);
  console.log(`Items count: ${items.length}`);
  console.log(`Context preview: ${itemContext.slice(0, 150)}...`);
  console.log('=================================================================\n');

  return {
    headline: "Hank & Vee Clash Over Today's Gear News",
    topics: [
      {
        title: items[0]?.title || "Guitar Gear Innovation vs Craft",
        hank: "Hank: Fancy marketing won't fix poor build quality and weak solder joints.",
        vee: "Vee: Hank, modern modellers and digital tools give gigging players real versatility!",
        disagreement: "Build quality and vintage craft vs modern digital convenience.",
        source_item_ids: items.map(i => Number(i.id))
      }
    ]
  };
}
