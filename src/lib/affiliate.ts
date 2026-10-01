import { env } from './env';

export interface BuildOutUrlParams {
  destUrl: string;
  bot?: string;
  episodeId?: string | number;
  dealId?: string | number;
  type?: 'deal' | 'item';
}

/**
 * Generates an internal /api/out redirect URL
 */
export function buildOutUrl(params: BuildOutUrlParams): string {
  const query = new URLSearchParams();
  query.set('u', params.destUrl);
  if (params.bot) query.set('b', params.bot);
  if (params.episodeId) query.set('e', String(params.episodeId));
  if (params.dealId) query.set('id', String(params.dealId));
  if (params.type) query.set('type', params.type);

  return `/api/out?${query.toString()}`;
}

/**
 * Wraps an approved outbound URL with Awin affiliate tags if enabled
 */
export function affiliateWrap(destUrl: string, clickref?: string): string {
  if (!env.AFFILIATE_ENABLED || !env.AWIN_MERCHANT_ID || !env.AWIN_AFFILIATE_ID) {
    return destUrl;
  }

  const cleanClickref = clickref ? encodeURIComponent(clickref) : 'guitarbot';
  const encodedDest = encodeURIComponent(destUrl);

  return `https://www.awin1.com/cread.php?awinmid=${env.AWIN_MERCHANT_ID}&awinaffid=${env.AWIN_AFFILIATE_ID}&clickref=${cleanClickref}&ued=${encodedDest}`;
}

/**
 * Validates that an outbound redirect destination is on the allowlist
 * (reverb.com or valid news publisher hosts)
 */
export function isAllowedDest(urlString: string, extraAllowedHosts: string[] = []): boolean {
  if (!urlString || typeof urlString !== 'string') return false;

  try {
    const parsed = new URL(urlString);

    // Require HTTP or HTTPS
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

    const hostname = parsed.hostname.toLowerCase();

    // Reverb allowlist
    if (
      hostname === 'reverb.com' ||
      hostname === 'www.reverb.com' ||
      hostname === 'api.reverb.com'
    ) {
      return true;
    }

    // Default trusted news feeds & platforms
    const trustedHosts = [
      'guitarworld.com',
      'www.guitarworld.com',
      'musicradar.com',
      'www.musicradar.com',
      'guitar.com',
      'www.guitar.com',
      'pedalhaven.com',
      'www.pedalhaven.com',
      'gazette.gibson.com',
      'premierguitar.com',
      'www.premierguitar.com',
      'youtube.com',
      'www.youtube.com',
      'youtu.be',
      'gearnews.com',
      'www.gearnews.com',
      'guitarplayer.com',
      'www.guitarplayer.com',
      ...extraAllowedHosts.map(h => h.toLowerCase()),
    ];

    if (trustedHosts.includes(hostname)) {
      return true;
    }

    // Allow subdomains of trusted feed platforms (e.g. blogspot, youtube)
    if (hostname.endsWith('.blogspot.com') || hostname.endsWith('.wordpress.com')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
