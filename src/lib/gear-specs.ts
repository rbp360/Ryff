// Comprehensive gear specifications, tunings, gauges, manufacturers, and preset helpers

export interface TuningOption {
  name: string;
  notes: string[];
}

export const GUITAR_TUNINGS: Record<number, TuningOption[]> = {
  6: [
    { name: 'Standard (E A D G B E)', notes: ['E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Eb Standard', notes: ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'] },
    { name: 'D Standard', notes: ['D', 'G', 'C', 'F', 'A', 'D'] },
    { name: 'C Standard', notes: ['C', 'F', 'Bb', 'Eb', 'G', 'C'] },
    { name: 'Drop D (D A D G B E)', notes: ['D', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Drop C', notes: ['C', 'G', 'C', 'F', 'A', 'D'] },
    { name: 'Drop B', notes: ['B', 'F#', 'B', 'E', 'G#', 'C#'] },
    { name: 'Drop A', notes: ['A', 'E', 'A', 'D', 'F#', 'B'] },
    { name: 'Open D (D A D F# A D)', notes: ['D', 'A', 'D', 'F#', 'A', 'D'] },
    { name: 'Open G (D G D G B D)', notes: ['D', 'G', 'D', 'G', 'B', 'D'] },
    { name: 'Open C', notes: ['C', 'G', 'C', 'G', 'C', 'E'] },
    { name: 'Open E', notes: ['E', 'B', 'E', 'G#', 'B', 'E'] },
    { name: 'Open A', notes: ['E', 'A', 'E', 'A', 'C#', 'E'] },
    { name: 'DADGAD', notes: ['D', 'A', 'D', 'G', 'A', 'D'] },
    { name: 'Double Drop D', notes: ['D', 'A', 'D', 'G', 'B', 'D'] },
    { name: 'Drop Db', notes: ['Db', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'] },
    { name: 'Nashville Tuning', notes: ['E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Baritone A Standard', notes: ['A', 'D', 'G', 'C', 'E', 'A'] },
    { name: 'Modal C', notes: ['C', 'G', 'C', 'G', 'C', 'E'] },
    { name: 'Orkney (CGDGAD)', notes: ['C', 'G', 'D', 'G', 'A', 'D'] },
  ],
  7: [
    { name: 'Standard 7 (B E A D G B E)', notes: ['B', 'E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Drop A (A E A D G B E)', notes: ['A', 'E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Drop G', notes: ['G', 'D', 'G', 'C', 'F', 'A', 'D'] },
    { name: 'Drop Ab / G#', notes: ['Ab', 'Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'] },
    { name: 'A Standard', notes: ['A', 'D', 'G', 'C', 'F', 'A', 'D'] },
    { name: 'G Standard', notes: ['G', 'C', 'F', 'Bb', 'D', 'G', 'C'] },
    { name: 'C Standard 7', notes: ['C', 'F', 'Bb', 'Eb', 'G', 'C', 'F'] },
    { name: 'Loomis / Archspire (Bb)', notes: ['Bb', 'F', 'Bb', 'Eb', 'G', 'C', 'F'] },
    { name: 'Misha Mansoor (G#)', notes: ['G#', 'D#', 'G#', 'C#', 'F#', 'A#', 'D#'] },
    { name: 'Open C 7', notes: ['C', 'G', 'C', 'G', 'C', 'E', 'G'] },
    { name: 'Open G 7', notes: ['G', 'D', 'G', 'D', 'G', 'B', 'D'] },
    { name: 'Open D 7', notes: ['D', 'A', 'D', 'F#', 'A', 'D', 'F#'] },
    { name: 'DADGAD + Low A', notes: ['A', 'D', 'A', 'D', 'G', 'A', 'D'] },
    { name: 'Half-step Down 7', notes: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'] },
    { name: 'Whole-step Down 7', notes: ['A', 'D', 'G', 'C', 'F', 'A', 'D'] },
    { name: 'Slipknot Style (Drop A)', notes: ['A', 'E', 'A', 'D', 'G', 'B', 'E'] },
  ],
  8: [
    { name: 'Standard 8 (F# B E A D G B E)', notes: ['F#', 'B', 'E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Drop E (E B E A D G B E)', notes: ['E', 'B', 'E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Drop D#', notes: ['D#', 'B', 'E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Drop D', notes: ['D', 'A', 'D', 'G', 'C', 'F', 'A', 'D'] },
    { name: 'Eb Standard 8', notes: ['Eb', 'Ab', 'Db', 'Gb', 'B', 'Eb', 'Ab', 'Db'] },
    { name: 'Meshuggah Standard (F)', notes: ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'] },
    { name: 'Drop C#', notes: ['C#', 'G#', 'C#', 'F#', 'B', 'E', 'G#', 'C#'] },
    { name: 'Drop C', notes: ['C', 'G', 'C', 'F', 'A#', 'D', 'G', 'C'] },
    { name: 'Animals as Leaders', notes: ['E', 'A', 'E', 'A', 'D', 'F#', 'B', 'E'] },
  ],
  12: [
    { name: 'Standard 12 (EADGBE x2)', notes: ['E', 'E', 'A', 'A', 'D', 'D', 'G', 'G', 'B', 'B', 'E', 'E'] },
    { name: 'Open G 12', notes: ['D', 'D', 'G', 'G', 'D', 'D', 'G', 'G', 'B', 'B', 'D', 'D'] },
  ],
};

export const BASS_TUNINGS: Record<number, TuningOption[]> = {
  4: [
    { name: 'Standard (E A D G)', notes: ['E', 'A', 'D', 'G'] },
    { name: 'Drop D (D A D G)', notes: ['D', 'A', 'D', 'G'] },
    { name: 'Eb Standard', notes: ['Eb', 'Ab', 'Db', 'Gb'] },
    { name: 'D Standard', notes: ['D', 'G', 'C', 'F'] },
    { name: 'C Standard', notes: ['C', 'F', 'Bb', 'Eb'] },
    { name: 'E Standard (Alt Octave)', notes: ['E', 'A', 'D', 'G'] },
  ],
  5: [
    { name: 'Standard 5 (B E A D G)', notes: ['B', 'E', 'A', 'D', 'G'] },
    { name: 'High C Variant (E A D G C)', notes: ['E', 'A', 'D', 'G', 'C'] },
    { name: 'Drop A (A E A D G)', notes: ['A', 'E', 'A', 'D', 'G'] },
    { name: 'Half-step Down 5', notes: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'] },
    { name: 'Whole-step Down 5', notes: ['A', 'D', 'G', 'C', 'F'] },
  ],
  6: [
    { name: 'Standard 6 (B E A D G C)', notes: ['B', 'E', 'A', 'D', 'G', 'C'] },
    { name: 'Drop A 6 (A E A D G C)', notes: ['A', 'E', 'A', 'D', 'G', 'C'] },
    { name: 'Eb Standard 6', notes: ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'] },
    { name: 'Whole-step Down 6', notes: ['A', 'D', 'G', 'C', 'F', 'Bb'] },
  ],
};

export const GUITAR_STRING_GAUGES: Record<number, string[]> = {
  6: [
    '008-038 (Extra Light)',
    '009-042 (Super Light)',
    '009-046 (Custom Light / Hybrid)',
    '010-046 (Regular Light)',
    '010-052 (Light Top / Heavy Bottom)',
    '011-048 (Medium Light)',
    '011-050 (Medium)',
    '011-052 (Heavy Top / Bottom)',
    '012-054 (Heavy)',
    '013-056 (Extra Heavy / Baritone)',
    '013-062 (Baritone Heavy)',
    '014-068 (Drop Tuning)',
    'CUSTOM',
  ],
  7: [
    '009-052',
    '009-054',
    '009-056',
    '010-056',
    '010-059',
    '010-062',
    '011-058',
    '011-064',
    'CUSTOM',
  ],
  8: [
    '009-065',
    '009-074',
    '010-074',
    '010-080',
    'CUSTOM',
  ],
  12: [
    '009-046 (12-String Light)',
    '010-047 (12-String Regular)',
    '010-050 (12-String Medium)',
    'CUSTOM',
  ],
};

export const BASS_STRING_GAUGES: Record<number, string[]> = {
  4: [
    '040-095 (Extra Light)',
    '040-100 (Light)',
    '045-100 (Medium Light)',
    '045-105 (Regular / Medium)',
    '050-105 (Medium Heavy)',
    '050-110 (Heavy)',
    '055-115 (Extra Heavy)',
    'CUSTOM',
  ],
  5: [
    '040-125 (Light 5)',
    '045-125 (Medium Light 5)',
    '045-130 (Regular 5)',
    '045-135 (Regular Heavy B)',
    '050-135 (Heavy 5)',
    'CUSTOM',
  ],
  6: [
    '030-125 (Light 6)',
    '032-130 (Regular 6)',
    '034-132 (Medium 6)',
    'CUSTOM',
  ],
};

export const STRING_MANUFACTURERS = [
  'Ernie Ball',
  "D'Addario",
  'Elixir',
  'DR Strings',
  'GHS',
  'Rotosound',
  'Martin',
  'Gibson',
  'Fender',
  'Cleartone',
  'La Bella',
  'Dunlop',
  'SIT Strings',
  'Stringjoy',
  'Thomastik-Infeld',
  'Pyramid',
  'CUSTOM',
] as const;

export const PICKUP_MANUFACTURERS = [
  'Seymour Duncan',
  'DiMarzio',
  'EMG',
  'Fender',
  'Gibson',
  'Bare Knuckle Pickups',
  'Fishman (Fluence)',
  'Lollar Pickups',
  'TV Jones',
  'Lindy Fralin Pickups',
  'Mojotone',
  'Suhr Pickups',
  'PRS (Paul Reed Smith)',
  'Railhammer Pickups',
  'Wilkinson',
  'Gretsch',
  'Kent Armstrong',
  'Bill Lawrence (Wilde)',
  'Häussel',
  'ToneRider',
  'Nordstrand (Bass)',
  'Bartolini (Bass)',
  'Aguilar (Bass)',
  'Not installed',
  'CUSTOM',
] as const;

export interface DetectedProvider {
  id: string;
  label: string;
  badge: string;
  color: string;
}

export function detectSettingsProvider(rawUrl: string): DetectedProvider | null {
  if (!rawUrl) return null;
  let url: URL | null = null;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const full = rawUrl.toLowerCase();

  const patterns: Array<{
    test: (h: string, f: string) => boolean;
    id: string;
    label: string;
    badge: string;
    color: string;
  }> = [
    { test: (h) => h.includes('line6') || h.includes('helix'), id: 'helix', label: 'Line 6 Helix', badge: 'HELIX', color: '#ff2222' },
    { test: (h) => h.includes('kemper'), id: 'kemper', label: 'Kemper Profiler', badge: 'KEMPER', color: '#16a34a' },
    { test: (h) => h.includes('fractal') || h.includes('axe'), id: 'axe-fx', label: 'Fractal / Axe-Fx', badge: 'AXE-FX', color: '#ea580c' },
    { test: (h, f) => h.includes('tonex') || f.includes('tonex') || h.includes('ikmultimedia'), id: 'tonex', label: 'ToneX / Amplitube', badge: 'TONEX', color: '#eab308' },
    { test: (h) => h.includes('neural') || h.includes('quad-cortex') || h.includes('cortex-cloud'), id: 'quad-cortex', label: 'Neural DSP Quad Cortex', badge: 'CORTEX', color: '#06b6d4' },
    { test: (h) => h.includes('tonelib'), id: 'tonelib', label: 'ToneLib', badge: 'TONELIB', color: '#8b5cf6' },
    { test: (h) => h.includes('strymon'), id: 'strymon', label: 'Strymon Nixie', badge: 'STRYMON', color: '#3b82f6' },
    { test: (h) => h.includes('boss') || h.includes('roland'), id: 'boss', label: 'Boss Tone Studio', badge: 'BOSS', color: '#2563eb' },
    { test: (h) => h.includes('github') || h.includes('gist'), id: 'github', label: 'GitHub Preset', badge: 'GITHUB', color: '#6b7280' },
    { test: (h) => h.includes('drive.google'), id: 'gdrive', label: 'Google Drive', badge: 'GDRIVE', color: '#22c55e' },
    { test: (h) => h.includes('dropbox'), id: 'dropbox', label: 'Dropbox', badge: 'DROPBOX', color: '#0284c7' },
    { test: (h) => h.includes('onedrive'), id: 'onedrive', label: 'OneDrive', badge: 'ONEDRIVE', color: '#0369a1' },
    { test: (h) => h.includes('mega.nz'), id: 'mega', label: 'Mega Cloud', badge: 'MEGA', color: '#dc2626' },
  ];

  for (const p of patterns) {
    if (p.test(host, full)) {
      return { id: p.id, label: p.label, badge: p.badge, color: p.color };
    }
  }

  return { id: 'generic', label: url.hostname, badge: 'LINK', color: 'var(--ac)' };
}

// Maps category or room to high-res ambient room backdrop
export function getBackdropForCategory(category?: string | null, room?: string | null): string | null {
  if (category) {
    const k = category.toLowerCase().trim();
    if (k === 'guitar' || k === 'guitars' || k === 'bass' || k === 'basses') return '/branding/Guitar backdrop.png';
    if (k === 'drums' || k === 'percussion') return '/branding/drum room.png';
    if (k === 'amp' || k === 'amps' || k === 'amplifiers-effects' || k === 'cab' || k === 'pedal' || k === 'pedals') return '/branding/Amp backdrop.png';
    if (k === 'live-sound' || k === 'vocals-microphone' || k === 'microphone' || k === 'vocals') return '/branding/Live backdrop.png';
    if (k === 'studio-sound' || k === 'interface') return '/branding/Studio backdrop.png';
    if (k === 'decks-dj' || k === 'laptop-electronic' || k === 'dj') return '/branding/DJbooth.png';
    if (k === 'keyboard-synth-sampler' || k === 'synthesizer' || k === 'keyboard' || k === 'sampler' || k === 'keys') return '/branding/Synthzone.png';
    if (k === 'strings' || k === 'woodwind' || k === 'brass' || k === 'piano' || k === 'orchestral') return '/branding/Orchestra backdrop.png';
    if (k === 'accessories' || k === 'accessory' || k === 'other') return '/branding/Studio backdrop.png';
  }
  if (room) {
    const r = room.toLowerCase().trim();
    if (r.includes('guitar') || r.includes('amp')) return '/branding/Guitar backdrop.png';
    if (r.includes('drum')) return '/branding/drum room.png';
    if (r.includes('control') || r.includes('studio')) return '/branding/Studio backdrop.png';
    if (r.includes('synth')) return '/branding/Synthzone.png';
    if (r.includes('dj')) return '/branding/DJbooth.png';
    if (r.includes('orchestra')) return '/branding/Orchestra backdrop.png';
    if (r.includes('stage') || r.includes('live')) return '/branding/Live backdrop.png';
  }
  return null;
}

// Maps category to default brand artwork card when no photo is uploaded
export function getCategoryDefaultImage(category?: string | null): string {
  if (!category) return '/branding/Guitar room.png';
  const k = category.toLowerCase().trim();
  if (k === 'guitar' || k === 'guitars' || k === 'bass' || k === 'basses') return '/branding/Bass gear brand default.png';
  if (k === 'drums' || k === 'percussion') return '/branding/Drum gear brand default.png';
  if (k === 'amp' || k === 'amps' || k === 'amplifiers-effects' || k === 'pedal' || k === 'pedals' || k === 'cab') return '/branding/Effects brand default.jpg';
  if (k === 'microphone' || k === 'vocals' || k === 'vocals-microphone') return '/branding/Microphone default branding.jpg';
  if (k === 'decks-dj' || k === 'dj') return '/branding/DJ brand default.jpg';
  if (k === 'keyboard-synth-sampler' || k === 'synthesizer' || k === 'keyboard' || k === 'piano') return '/branding/Keyboard gear brand default.png';
  if (k === 'strings' || k === 'orchestral') return '/branding/Orchestra brand default.png';
  if (k === 'brass' || k === 'woodwind') return '/branding/Brass brand default.png';
  if (k === 'live-sound') return '/branding/Live gear brand default.png';
  return '/branding/Studio gear brand default.png';
}

// Smart date parser: converts ddmmyy, ddmmyyyy, or dd/mm into standardized DD/MM/YYYY
export function autocompleteDate(val: string): string {
  let digits = val.replace(/[^\d]/g, '');
  if (digits.length === 4) {
    const yearYY = String(new Date().getFullYear()).slice(-2);
    digits = digits + yearYY;
  }
  if (digits.length === 5) digits = '0' + digits;
  if (digits.length === 3) digits = '0' + digits;

  if (digits.length === 6 || digits.length === 8) {
    let day = parseInt(digits.slice(0, 2), 10);
    let month = parseInt(digits.slice(2, 4), 10);
    let yStr = digits.slice(4);

    if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }

    day = Math.max(1, Math.min(day, 31));
    month = Math.max(1, Math.min(month, 12));
    if (yStr.length === 2) yStr = '20' + yStr;

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${yStr}`;
  }
  return val;
}

const GAUGE_NORMALIZATIONS: Record<string, string> = {
  '8-38': '008-038 (Extra Light)',
  '08-38': '008-038 (Extra Light)',
  '008-038': '008-038 (Extra Light)',
  '9-42': '009-042 (Super Light)',
  '09-42': '009-042 (Super Light)',
  '009-042': '009-042 (Super Light)',
  '9-46': '009-046 (Custom Light / Hybrid)',
  '09-46': '009-046 (Custom Light / Hybrid)',
  '009-046': '009-046 (Custom Light / Hybrid)',
  '10-46': '010-046 (Regular Light)',
  '010-046': '010-046 (Regular Light)',
  '10-52': '010-052 (Light Top / Heavy Bottom)',
  '010-052': '010-052 (Light Top / Heavy Bottom)',
  '11-48': '011-048 (Medium Light)',
  '011-048': '011-048 (Medium Light)',
  '11-50': '011-050 (Medium)',
  '011-050': '011-050 (Medium)',
  '11-52': '011-052 (Heavy Top / Bottom)',
  '011-052': '011-052 (Heavy Top / Bottom)',
  '12-54': '012-054 (Heavy)',
  '012-054': '012-054 (Heavy)',
  '13-56': '013-056 (Extra Heavy / Baritone)',
  '013-056': '013-056 (Extra Heavy / Baritone)',
};

// Intelligently separates gauge and brand even if stored combined in legacy current_strings
export function resolveStringSpecs(
  gauge?: string | null,
  manufacturer?: string | null,
  currentStrings?: string | null
): { gauge: string; manufacturer: string; normalizedGauge: string } {
  let g = (gauge || '').trim();
  let m = (manufacturer || '').trim();
  const raw = (currentStrings || '').trim();

  // 1. If explicit gauge is missing, extract gauge pattern (e.g. 9-42, 10-46, 11-52, 009-042)
  if (!g) {
    const combined = `${m} ${raw}`;
    const match = combined.match(/\b(\d{1,3}\s*[-–]\s*\d{2,3})\b/);
    if (match) {
      g = match[1].replace(/\s+/g, '');
    }
  }

  // 2. If manufacturer is missing, check raw current_strings for brand
  if (!m && raw) {
    const lower = raw.toLowerCase();
    const brands = [
      'Elixir', "D'Addario", 'Ernie Ball', 'DR Strings', 'GHS', 'Rotosound',
      'Martin', 'Fender', 'Gibson', 'Dunlop', 'Curt Mangan', 'Thomastik', 'Cleartone'
    ];
    const found = brands.find((b) => lower.includes(b.toLowerCase()));
    if (found) {
      m = found;
    } else {
      // Strip gauge digits if present
      m = raw.replace(/\b\d{1,3}\s*[-–]\s*\d{2,3}\b/g, '').trim();
    }
  } else if (m) {
    // If manufacturer string accidentally contains the gauge (e.g. "Elixir 9-42"), clean off the gauge
    m = m.replace(/\b\d{1,3}\s*[-–]\s*\d{2,3}\b/g, '').trim();
  }

  const cleanGaugeKey = g.toLowerCase().replace(/\s*\(.*\)/, '').trim();
  const normalized = GAUGE_NORMALIZATIONS[cleanGaugeKey] || g;

  return {
    gauge: normalized || g || '',
    manufacturer: m || raw || '',
    normalizedGauge: normalized || g || '',
  };
}
