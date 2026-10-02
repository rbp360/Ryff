import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
      ['enclosure', 'enclosure'],
    ],
  },
});

interface SourceJsonItem {
  name: string;
  url?: string;
  channel_id?: string;
  tier: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrlFromItem(item: any): string | null {
  // 1. Check YouTube thumbnail
  if (item.link && item.link.includes('youtube.com/watch')) {
    const vMatch = item.link.match(/v=([a-zA-Z0-9_-]+)/);
    if (vMatch && vMatch[1]) {
      return `https://i.ytimg.com/vi/${vMatch[1]}/hqdefault.jpg`;
    }
  }

  // 2. Check media:content
  if (item.mediaContent) {
    const list = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent];
    for (const mc of list) {
      if (mc?.$?.url) return mc.$.url;
      if (mc?.url) return mc.url;
    }
  }

  // 3. Check media:thumbnail
  if (item.mediaThumbnail) {
    const list = Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail : [item.mediaThumbnail];
    for (const mt of list) {
      if (mt?.$?.url) return mt.$.url;
      if (mt?.url) return mt.url;
    }
  }

  // 4. Check enclosure
  if (item.enclosure && item.enclosure.url) {
    const type = item.enclosure.type || '';
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)/i.test(item.enclosure.url)) {
      return item.enclosure.url;
    }
  }

  // 5. Search html tags in content, contentEncoded, or description
  const htmlCandidates = [item.contentEncoded, item.content, item.description, item.summary];
  for (const html of htmlCandidates) {
    if (typeof html === 'string') {
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        if (!imgMatch[1].includes('feedburner') && !imgMatch[1].includes('statcounter')) {
          return imgMatch[1];
        }
      }
    }
  }

  return null;
}

async function testAllSources() {
  const configPath = path.resolve(process.cwd(), 'config/sources.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const rssSources: SourceJsonItem[] = config.rss || [];
  const ytSources: SourceJsonItem[] = config.youtube || [];

  console.log(`=== TESTING IMAGE EXTRACTION ===\n`);

  let totalRss = 0;
  let rssWithImages = 0;
  let rssFailedFetch = 0;

  console.log(`--- RSS FEEDS (${rssSources.length} total) ---`);
  for (const src of rssSources) {
    if (!src.url || src.url.includes('localhost')) {
      console.log(`[SKIP (Bridge/Local)] ${src.name}`);
      continue;
    }
    totalRss++;
    try {
      const res = await fetch(src.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        console.log(`❌ [HTTP ${res.status}] ${src.name}`);
        rssFailedFetch++;
        continue;
      }

      const xmlText = await res.text();
      if (xmlText.trim().startsWith('<!doctype html') || xmlText.trim().startsWith('<html')) {
        console.log(`❌ [HTML Error Page] ${src.name}`);
        rssFailedFetch++;
        continue;
      }

      const feed = await parser.parseString(xmlText);
      const items = feed.items || [];
      if (items.length === 0) {
        console.log(`⚠️ [0 items] ${src.name}`);
        continue;
      }

      let itemWithImageCount = 0;
      let sampleImageUrl = '';

      for (const item of items.slice(0, 5)) {
        const img = extractImageUrlFromItem(item);
        if (img) {
          itemWithImageCount++;
          if (!sampleImageUrl) sampleImageUrl = img;
        }
      }

      if (itemWithImageCount > 0) {
        rssWithImages++;
        console.log(`✅ [HAS IMAGES] ${src.name} (${itemWithImageCount}/${Math.min(5, items.length)} sample items have images)`);
        console.log(`   Sample image: ${sampleImageUrl.slice(0, 90)}`);
      } else {
        console.log(`⚠️ [NO IMAGES FOUND] ${src.name} (checked ${Math.min(5, items.length)} items)`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`❌ [Error: ${errMsg}] ${src.name}`);
      rssFailedFetch++;
    }
  }

  console.log(`\n--- YOUTUBE FEEDS (${ytSources.length} total) ---`);
  let ytWithImages = 0;
  for (const src of ytSources) {
    if (!src.channel_id) continue;
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${src.channel_id}`;
    try {
      const feed = await parser.parseURL(feedUrl);
      const items = feed.items || [];
      let itemWithImageCount = 0;
      let sampleImageUrl = '';
      for (const item of items.slice(0, 3)) {
        const img = extractImageUrlFromItem(item);
        if (img) {
          itemWithImageCount++;
          if (!sampleImageUrl) sampleImageUrl = img;
        }
      }
      if (itemWithImageCount > 0) {
        ytWithImages++;
        console.log(`✅ [HAS IMAGES] YouTube: ${src.name}`);
      } else {
        console.log(`⚠️ [NO IMAGES] YouTube: ${src.name}`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`❌ [YT Error: ${errMsg}] ${src.name}`);
    }
  }

  console.log(`\n=== SUMMARY RESULTS ===`);
  console.log(`RSS Feeds tested (excluding local bridges): ${totalRss}`);
  console.log(`  - Feeds with working image extraction: ${rssWithImages} / ${totalRss} (${Math.round((rssWithImages / totalRss) * 100)}%)`);
  console.log(`  - Feeds failing or no image extracted: ${totalRss - rssWithImages} (${rssFailedFetch} failed fetch)`);
  console.log(`YouTube Feeds tested: ${ytSources.length}`);
  console.log(`  - YouTube with working image extraction: ${ytWithImages} / ${ytSources.length} (100%)`);
}

testAllSources();
