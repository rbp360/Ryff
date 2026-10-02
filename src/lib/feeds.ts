import Parser from 'rss-parser';
import crypto from 'crypto';

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

export interface ParsedFeedItem {
  url: string;
  urlHash: string;
  title: string;
  snippet: string;
  imageUrl: string | null;
  publishedAt: Date | null;
}

export function extractImageUrl(item: any): string | null {
  // 1. YouTube watch link thumbnail
  const rawUrl = item.link || item.guid || '';
  if (rawUrl && (rawUrl.includes('youtube.com/watch') || rawUrl.includes('youtu.be/'))) {
    const vMatch = rawUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    if (vMatch && vMatch[1]) {
      return `https://i.ytimg.com/vi/${vMatch[1]}/hqdefault.jpg`;
    }
  }

  // 2. Media:content tags
  if (item.mediaContent) {
    const list = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent];
    for (const mc of list) {
      if (mc?.$?.url) return mc.$.url;
      if (mc?.url) return mc.url;
    }
  }

  // 3. Media:thumbnail tags
  if (item.mediaThumbnail) {
    const list = Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail : [item.mediaThumbnail];
    for (const mt of list) {
      if (mt?.$?.url) return mt.$.url;
      if (mt?.url) return mt.url;
    }
  }

  // 4. Enclosure tags (image types)
  if (item.enclosure && item.enclosure.url) {
    const type = item.enclosure.type || '';
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)/i.test(item.enclosure.url)) {
      return item.enclosure.url;
    }
  }

  // 5. HTML img tags in content or description
  const htmlCandidates = [item.contentEncoded, item.content, item.description, item.summary];
  for (const html of htmlCandidates) {
    if (typeof html === 'string') {
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        const src = imgMatch[1];
        if (!src.includes('feedburner') && !src.includes('statcounter') && !src.includes('pixel')) {
          return src;
        }
      }
    }
  }

  return null;
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

export async function fetchFeed(feedUrl: string, keywordPrefilter: string[] | null = null): Promise<{ items: ParsedFeedItem[]; status: string }> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { items: [], status: `error: HTTP ${res.status} (${res.statusText || 'Fetch failed'})` };
    }

    const xmlText = await res.text();
    if (xmlText.trim().startsWith('<!doctype html') || xmlText.trim().startsWith('<html')) {
      return { items: [], status: 'error: Returned HTML page instead of RSS feed' };
    }

    const feed = await parser.parseString(xmlText);
    const items: ParsedFeedItem[] = [];

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

      items.push({
        url,
        urlHash: computeUrlHash(url),
        title,
        snippet,
        imageUrl,
        publishedAt: pubDate && !isNaN(pubDate.getTime()) ? pubDate : null,
      });
    }

    return { items, status: 'ok' };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { items: [], status: `error: ${errMsg.slice(0, 100)}` };
  }
}
