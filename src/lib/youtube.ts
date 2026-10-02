import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Extracts an 11-character YouTube video ID from various YouTube URL formats.
 */
export function extractYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already an 11-character identifier
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /(?:v=|\/v\/|embed\/|shorts\/|youtu\.be\/|\/e\/|watch\?v=|\&v=)([\w-]{11})/,
    /^([\w-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && v.length === 11) return v;
    }
  } catch {
    // Ignore invalid URL parse
  }

  return null;
}

export interface TranscriptOptions {
  maxChars?: number;
  timeoutMs?: number;
  lang?: string;
}

/**
 * Decodes HTML entities and normalizes whitespace in transcript text.
 */
export function cleanTranscriptText(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches and formats the closed-caption transcript of a YouTube video.
 * Uses a primary InnerTube strategy with a fallback watch-page caption track parser.
 * Returns null if captions are unavailable, disabled, or if fetching fails.
 */
export async function fetchYouTubeTranscript(
  videoIdOrUrl: string,
  options: TranscriptOptions = {}
): Promise<string | null> {
  const videoId = extractYouTubeVideoId(videoIdOrUrl);
  if (!videoId) {
    return null;
  }

  const maxChars = options.maxChars ?? 12000;
  const timeoutMs = options.timeoutMs ?? 8000;

  // 1. Try youtube-transcript package (InnerTube strategy)
  try {
    const fetchPromise = YoutubeTranscript.fetchTranscript(videoId, {
      lang: options.lang || 'en',
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('YouTube transcript fetch timeout')), timeoutMs)
    );

    const segments = await Promise.race([fetchPromise, timeoutPromise]);

    if (segments && segments.length > 0) {
      const rawText = cleanTranscriptText(
        segments
          .map((s) => (s.text || '').trim())
          .filter(Boolean)
          .join(' ')
      );

      if (rawText.length > 0) {
        return truncateTranscript(rawText, maxChars);
      }
    }
  } catch {
    // Fall back to direct watch page caption track fetch
  }

  // 2. Fallback: Parse captionTracks directly from public watch page HTML
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
      if (match) {
        const tracks = JSON.parse(match[1]);
        const track =
          tracks.find(
            (t: any) =>
              t.languageCode === (options.lang || 'en') ||
              t.vssId?.includes(`.${options.lang || 'en'}`)
          ) || tracks[0];

        if (track?.baseUrl) {
          const xmlRes = await fetch(track.baseUrl, { signal: AbortSignal.timeout(timeoutMs) });
          const xml = await xmlRes.text();
          const textMatches = Array.from(xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)).map(
            (m) => m[1]
          );
          if (textMatches.length > 0) {
            const rawText = cleanTranscriptText(textMatches.join(' '));
            if (rawText.length > 0) {
              return truncateTranscript(rawText, maxChars);
            }
          }
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[YouTube CC Fallback Warn] Video ID ${videoId}: ${msg}`);
  }

  return null;
}

/**
 * Truncates text cleanly at sentence or word boundary to stay within token budget.
 */
function truncateTranscript(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  const truncated = text.slice(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > maxChars * 0.75) {
    return truncated.slice(0, lastPeriod + 1);
  }
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

/**
 * Polite delay utility for rate-limiting consecutive API/scraper calls.
 */
export function politeDelay(ms: number = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
