import { db } from '../src/lib/db';
import { getBot } from '../src/lib/bots';
import { EpisodeTopic, DebateTurn } from '../src/types/episode';

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

    if (topic.takes && Array.isArray(topic.takes) && topic.takes.length > 0) {
      for (const take of topic.takes) {
        const bot = getBot(take.speaker_id);
        console.log(`🎸 ${take.speaker_name.toUpperCase()} (${bot.archetype}):`);
        console.log(`"${take.text}"\n`);
      }
    } else {
      // Dynamic keys or legacy Hank & Vee
      const knownIds = ['robbpaul', 'stevie', 'tim', 'hank', 'mcgee'];
      let foundAny = false;
      for (const id of knownIds) {
        if (topic[id] && typeof topic[id] === 'string') {
          foundAny = true;
          const bot = getBot(id);
          console.log(`🎸 ${bot.name.toUpperCase()} (${bot.archetype}):`);
          console.log(`"${topic[id]}"\n`);
        }
      }
      if (!foundAny) {
        if (topic.hank) {
          console.log(`🧔 HANK (Grumpy Vintage Luthier):\n"${topic.hank}"\n`);
        }
        if (topic.vee) {
          console.log(`⚡ VEE (Modern Modeller & Tech Fan):\n"${topic.vee}"\n`);
        }
      }
    }

    if (topic.source_item_ids && topic.source_item_ids.length > 0) {
      console.log(`🔗 CITED SOURCES:`);
      const sourceItems = await db`
        SELECT i.id, i.title, i.url, s.name as source_name 
        FROM items i 
        JOIN sources s ON i.source_id = s.id 
        WHERE i.id = ANY(${topic.source_item_ids})
      `;
      sourceItems.forEach((si) => {
        console.log(` - [[item:${si.id}]] ${si.title} (${si.source_name}) -> ${si.url}`);
      });
      console.log('');
    }
  }

  // Print Transcript Summary if available
  if (ep.transcript) {
    const turns: DebateTurn[] = typeof ep.transcript === 'string' ? JSON.parse(ep.transcript) : ep.transcript;
    if (Array.isArray(turns) && turns.length > 0) {
      console.log(`----------------------------------------------------------------`);
      console.log(`📜 FULL 4-ROUND SPARRING TRANSCRIPT`);
      console.log(`----------------------------------------------------------------`);
      for (const t of turns) {
        const speaker = t.speaker_name || t.speaker || t.speaker_id;
        const roundNum = t.round || t.turn;
        console.log(`\n[Round ${roundNum}] ${speaker}:`);
        console.log(`"${t.text}"`);
      }
      console.log('');
    }
  }

  console.log('================================================================\n');
  process.exit(0);
}

printLatestEpisode().catch((err) => {
  console.error('Error printing episode:', err);
  process.exit(1);
});
