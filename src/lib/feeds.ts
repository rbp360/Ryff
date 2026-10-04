import Parser from 'rss-parser';
import crypto from 'crypto';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['media:group', 'mediaGroup'],
      ['content:encoded', 'contentEncoded'],
      ['enclosure', 'enclosure'],
    ],
  },
});

export interface ParsedFeedItem {
  url: string;
  urlHash: string;
  title: string;
  snippet: string;
  imageUrl: string | null;
  publishedAt: Date | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractImageUrl(item: any): string | null {
  // 1. YouTube video URL or ID check (watch links, shorts, embeds, yt:video IDs)
  const rawUrl = typeof item.link === 'string' ? item.link : (item.link?.href || item.guid || item.id || '');
  const ytMatch = String(rawUrl).match(/(?:v=|\/|vi\/|shorts\/|yt:video:)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  // 2. Media:group tags (YouTube RSS feed format)
  if (item.mediaGroup) {
    const mg = item.mediaGroup;
    if (mg['media:thumbnail']) {
      const thumbs = Array.isArray(mg['media:thumbnail']) ? mg['media:thumbnail'] : [mg['media:thumbnail']];
      const url = thumbs[0]?.$?.url || thumbs[0]?.url;
      if (url) return url;
    }
    if (mg['media:content']) {
      const contents = Array.isArray(mg['media:content']) ? mg['media:content'] : [mg['media:content']];
      const url = contents[0]?.$?.url || contents[0]?.url;
      if (url) return url;
    }
  }

  // 3. Media:content tags
  if (item.mediaContent) {
    const list = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent];
    for (const mc of list) {
      if (mc?.$?.url) return mc.$.url;
      if (mc?.url) return mc.url;
    }
  }

  // 4. Media:thumbnail tags
  if (item.mediaThumbnail) {
    const list = Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail : [item.mediaThumbnail];
    for (const mt of list) {
      if (mt?.$?.url) return mt.$.url;
      if (mt?.url) return mt.url;
    }
  }

  // 5. Enclosure tags (image types)
  if (item.enclosure && item.enclosure.url) {
    const type = item.enclosure.type || '';
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)/i.test(item.enclosure.url)) {
      return item.enclosure.url;
    }
  }

  // 6. HTML img tags in content, contentEncoded, description, summary
  const htmlCandidates = [item.contentEncoded, item.content, item.description, item.summary];
  for (const html of htmlCandidates) {
    if (typeof html === 'string') {
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        const src = imgMatch[1].replace(/&amp;/g, '&');
        if (!src.includes('feedburner') && !src.includes('statcounter') && !src.includes('pixel') && !src.includes('beacon')) {
          return src;
        }
      }
    }
  }

  return null;
}

export async function fetchOgImage(url: string): Promise<string | null> {
  if (!url || url.includes('localhost') || url.includes('example.com')) return null;

  // YouTube fast check
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const match = url.match(/(?:v=|\/|vi\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }

  const fetchPromise = (async (): Promise<string | null> => {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENTS[0],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(1500),
      });

      if (!res.ok) return null;
      const html = await res.text();

      const ogMatch =
        html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i) ||
        html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i) ||
        html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);

      if (ogMatch && ogMatch[1]) {
        let img = ogMatch[1].trim().replace(/&amp;/g, '&');
        if (img.startsWith('//')) {
          img = 'https:' + img;
        } else if (img.startsWith('/')) {
          try {
            const parsed = new URL(url);
            img = `${parsed.protocol}//${parsed.host}${img}`;
          } catch {
            // ignore
          }
        }
        return img;
      }
    } catch {
      // Ignore fetch errors
    }
    return null;
  })();

  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));

  return Promise.race([fetchPromise, timeoutPromise]);
}

export function canonicaliseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    const searchParams = new URLSearchParams(parsed.search);
    for (const key of Array.from(searchParams.keys())) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'fbclid') {
        searchParams.delete(key);
      }
    }
    parsed.search = searchParams.toString();
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function computeUrlHash(url: string): string {
  return crypto.createHash('sha256').update(canonicaliseUrl(url)).digest('hex');
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

export async function fetchFeed(feedUrl: string, keywordPrefilter: string[] | null = null): Promise<{ items: ParsedFeedItem[]; status: string }> {
  let lastErrorStatus = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const ua = USER_AGENTS[(attempt - 1) % USER_AGENTS.length];
      const res = await fetch(feedUrl, {
        headers: {
          'User-Agent': ua,
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        lastErrorStatus = `error: HTTP ${res.status} (${res.statusText || 'Fetch failed'})`;
        if (attempt < 2 && (res.status === 404 || res.status === 500 || res.status === 429 || res.status === 409)) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        return { items: [], status: lastErrorStatus };
      }

      const xmlText = await res.text();
      if (xmlText.trim().startsWith('<!doctype html') || xmlText.trim().startsWith('<html')) {
        return { items: [], status: 'error: Returned HTML page instead of RSS feed' };
      }

      const feed = await parser.parseString(xmlText);
      const items: ParsedFeedItem[] = [];
      const itemsNeedingOgImage: { itemIndex: number; url: string }[] = [];

      for (const entry of feed.items || []) {
        const rawUrl = entry.link || entry.guid || '';
        if (!rawUrl) continue;

        const url = canonicaliseUrl(rawUrl);
        const title = (entry.title || '').trim();
        if (!title) continue;

        // Apply keyword prefilter if defined
        if (keywordPrefilter && keywordPrefilter.length > 0) {
          const textToMatch = `${title} ${entry.contentSnippet || ''}`.toLowerCase();
          const matches = keywordPrefilter.some(kw => textToMatch.includes(kw.toLowerCase()));
          if (!matches) continue;
        }

        const snippet = (entry.contentSnippet || entry.summary || title).slice(0, 500).trim();
        const pubDate = entry.isoDate || entry.pubDate ? new Date(entry.isoDate || entry.pubDate!) : null;
        const imageUrl = extractImageUrl(entry);

        const itemIdx = items.length;
        items.push({
          url,
          urlHash: computeUrlHash(url),
          title,
          snippet,
          imageUrl,
          publishedAt: pubDate && !isNaN(pubDate.getTime()) ? pubDate : null,
        });

        if (!imageUrl && (!pubDate || (Date.now() - pubDate.getTime()) < 7 * 24 * 60 * 60 * 1000)) {
          itemsNeedingOgImage.push({ itemIndex: itemIdx, url });
        }
      }

      if (itemsNeedingOgImage.length > 0) {
        const ogResults = await Promise.all(
          itemsNeedingOgImage.slice(0, 5).map(async (target) => {
            const og = await fetchOgImage(target.url);
            return { itemIndex: target.itemIndex, og };
          })
        );
        for (const r of ogResults) {
          if (r.og) {
            items[r.itemIndex].imageUrl = r.og;
          }
        }
      }

      return { items, status: 'ok' };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      lastErrorStatus = `error: ${errMsg.slice(0, 100)}`;
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
    }
  }

  return { items: [], status: lastErrorStatus || 'error: Failed after retries' };
}
