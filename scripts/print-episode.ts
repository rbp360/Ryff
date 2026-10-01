import { db } from '../src/lib/db';

interface EpisodeTopic {
  title: string;
  hank: string;
  vee: string;
  disagreement: string;
  source_item_ids: number[];
}

async function printLatestEpisode() {
  const episodes = await db`
    SELECT id, headline, topics, transcript, status, published_at 
    FROM episodes 
    ORDER BY id DESC 
    LIMIT 1
  `;

  if (episodes.length === 0) {
    console.log('No published episodes found in database.');
    process.exit(0);
  }

  const ep = episodes[0];
  console.log('\n================================================================');
  console.log(`🎙️  RYFF DAILY EPISODE #${ep.id}`);
  console.log(`📌  Headline: "${ep.headline}"`);
  console.log(`📅  Published: ${new Date(ep.published_at).toLocaleString()}`);
  console.log('================================================================\n');

  const topics: EpisodeTopic[] = typeof ep.topics === 'string' ? JSON.parse(ep.topics) : ep.topics;

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    console.log(`----------------------------------------------------------------`);
    console.log(`🔥 TOPIC ${i + 1}: ${topic.title.toUpperCase()}`);
    console.log(`----------------------------------------------------------------`);
    console.log(`⚡ Disagreement: ${topic.disagreement}\n`);
    console.log(`🧔 HANK:\n"${topic.hank}"\n`);
    console.log(`⚡ VEE:\n"${topic.vee}"\n`);

    if (topic.source_item_ids && topic.source_item_ids.length > 0) {
      console.log(`🔗 CITED SOURCES:`);
      const sourceItems = await db`
        SELECT i.id, i.title, i.url, s.name as source_name 
        FROM items i 
        JOIN sources s ON i.source_id = s.id 
        WHERE i.id = ANY(${topic.source_item_ids})
      `;
      sourceItems.forEach(si => {
        console.log(` - [[item:${si.id}]] ${si.title} (${si.source_name}) -> ${si.url}`);
      });
      console.log('');
    }
  }

  console.log('================================================================\n');
  process.exit(0);
}

printLatestEpisode().catch(err => {
  console.error('Error printing episode:', err);
  process.exit(1);
});
