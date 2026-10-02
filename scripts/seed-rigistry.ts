import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...vals] = trimmed.split('=');
        if (key) {
          const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 10 });

function normalizeBrandKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  { category: 'guitar', keywords: ['guitar', 'telecaster', 'stratocaster', 'les paul', 'sg'] },
  { category: 'bass', keywords: ['bass guitar', 'bass'] },
  { category: 'drums', keywords: ['drum', 'snare', 'kick', 'tom', 'tom-tom', 'cymbal', 'hi-hat', 'hi hat', 'ride', 'floor tom', 'drum set', 'drum kit'] },
  { category: 'vocals-microphone', keywords: ['microphone', 'mic', 'vocal'] },
  { category: 'piano', keywords: ['piano', 'grand piano', 'upright piano', 'electric grand'] },
  { category: 'decks-dj', keywords: ['turntable', 'cdj', 'mixdeck', 'dj controller', 'dj mixer', 'decks'] },
  { category: 'laptop-electronic', keywords: ['laptop', 'computer', 'workstation', 'macbook', 'pc'] },
  { category: 'keyboard-synth-sampler', keywords: ['synth', 'synthesizer', 'keyboard', 'sampler', 'analog synthesizer', 'moog', 'korg', 'roland', 'midi controller'] },
  { category: 'percussion', keywords: ['tambourine', 'shaker', 'cowbell', 'triangle', 'bongo', 'bongos', 'conga', 'congas', 'clave', 'percussion'] },
  { category: 'strings', keywords: ['violin', 'viola', 'cello', 'double bass', 'harp', 'mandolin', 'ukulele', 'strings'] },
  { category: 'woodwind', keywords: ['flute', 'clarinet', 'oboe', 'bassoon', 'piccolo', 'saxophone'] },
  { category: 'brass', keywords: ['trumpet', 'trombone', 'tuba', 'french horn', 'cornet', 'euphonium', 'brass'] },
  { category: 'live-sound', keywords: [
    'pa', 'line array', 'front of house', 'foh', 'mixing console', 'stage monitor', 'powered speaker', 'active speaker', 'passive speaker',
    'subwoofer', 'fill speaker', 'side fill', 'delay tower', 'crossover', 'speaker management', 'wireless microphone', 'iem', 'in-ear', 'stage box', 'snake',
    'power amplifier', 'powered mixer', 'stage lighting', 'lighting console', 'lighting controller', 'fog machine', 'hazer', 'strobe', 'moving head', 'par can',
    'spotlight', 'fresnel', 'gobo projector', 'dmx', 'truss', 'led par', 'led bar', 'pixel bar', 'blinder', 'laser projector', 'uv fixture', 'blacklight'
  ] },
  { category: 'studio-sound', keywords: [
    'interface', 'audio interface', 'preamp', 'compressor', 'limiter', 'eq', 'equalizer', 'channel strip', 'monitoring', 'studio monitor', 'headphones', 'control surface',
    'daw controller', 'outboard', 'outboard effects', 'di box', 'patchbay', 'power conditioner', 'acoustic treatment', 'studio furniture', 'recording media',
    'storage', 'clock', 'converter', 'clocks & converters', 'software'
  ] },
  { category: 'amplifiers-effects', keywords: ['amp', 'amplifier', 'pedal', 'effects', 'stomp', 'cab', 'cabinet', 'reverb', 'delay', 'distortion', 'overdrive', 'fuzz', 'chorus', 'flanger', 'phaser', 'looper'] },
  { category: 'accessories', keywords: ['stand', 'case', 'bag', 'strap', 'pick', 'string', 'cable', 'capo', 'tuner', 'power distribution unit', 'pdu'] },
];

function categorizeInstrument(name: string): string {
  const lower = name.toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some(kw => lower.includes(kw))) return entry.category;
  }
  return 'other';
}

const COMMON_INSTRUMENTS = new Set([
  'saxophone',
  'acoustic guitar',
  'ukulele',
  'bass guitar',
  'electric grand piano',
  'electric guitar',
  'grand piano',
  'upright piano',
  'cymbal',
  'drums (drum set)',
  'electronic drum set',
  'percussion',
  'analog synthesizer',
  'keyboard',
  'sampler',
  'synthesizer',
  'turntable',
].map(normalizeName));

const ROOM_ASSIGNMENTS: Record<string, string[]> = {
  guitar: ['guitar-amp'],
  bass: ['guitar-amp'],
  'amplifiers-effects': ['guitar-amp'],
  drums: ['drum'],
  percussion: ['drum', 'orchestral-pit'],
  'keyboard-synth-sampler': ['synthzone'],
  piano: ['orchestral-pit', 'synthzone'],
  'decks-dj': ['dj-booth'],
  'laptop-electronic': ['dj-booth', 'control'],
  'studio-sound': ['control'],
  'live-sound': ['stage'],
  'vocals-microphone': ['control', 'stage'],
  strings: ['orchestral-pit'],
  woodwind: ['orchestral-pit'],
  brass: ['orchestral-pit'],
};

async function seed() {
  const dataDir = path.resolve(process.cwd(), 'data/rigistry');

  console.log('--- Starting Rigistry Reference Seeding ---');

  // 1. Seed Brands
  const mfgIndexPath = path.join(dataDir, 'manufacturers.index.json');
  if (fs.existsSync(mfgIndexPath)) {
    console.log('Seeding Brands / Manufacturers...');
    const mfgList: Array<{ name: string; categories?: string[] }> = JSON.parse(
      fs.readFileSync(mfgIndexPath, 'utf8')
    );

    const canonicalBrandsList = [
      'Paul Reed Smith', 'Fender', 'Gibson', 'Ibanez', 'Yamaha', 'Marshall',
      'Mesa Boogie', 'Orange', 'Line 6', 'Boss', 'Electro-Harmonix', 'Roland',
      'Korg', 'Moog', 'Novation', 'Taylor', 'Martin', 'Gretsch', 'Rickenbacker'
    ];
    const canonicalSet = new Set(canonicalBrandsList.map(b => normalizeBrandKey(b)));

    // Deduplicate by normalized name
    const brandMap = new Map<string, { name: string; normalized_name: string; categories: string[]; is_canonical: boolean }>();

    for (const b of mfgList) {
      if (!b.name || !b.name.trim()) continue;
      const name = b.name.trim();
      const norm = normalizeBrandKey(name);
      if (!norm) continue;

      if (!brandMap.has(norm)) {
        brandMap.set(norm, {
          name,
          normalized_name: norm,
          categories: b.categories || [],
          is_canonical: canonicalSet.has(norm)
        });
      } else {
        const existing = brandMap.get(norm)!;
        if (b.categories && b.categories.length) {
          const merged = Array.from(new Set([...existing.categories, ...b.categories]));
          existing.categories = merged;
        }
      }
    }

    // Ensure all canonical brands are added
    for (const cb of canonicalBrandsList) {
      const norm = normalizeBrandKey(cb);
      if (!brandMap.has(norm)) {
        brandMap.set(norm, {
          name: cb,
          normalized_name: norm,
          categories: ['guitar', 'bass', 'amplifiers-effects'],
          is_canonical: true
        });
      } else {
        brandMap.get(norm)!.is_canonical = true;
      }
    }

    const brandArray = Array.from(brandMap.values());
    console.log(`Prepared ${brandArray.length} unique brands for database insertion.`);

    // Batch insert in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < brandArray.length; i += chunkSize) {
      const chunk = brandArray.slice(i, i + chunkSize);
      await sql`
        insert into brands ${sql(chunk, 'name', 'normalized_name', 'categories', 'is_canonical')}
        on conflict (normalized_name) do update set
          categories = excluded.categories,
          is_canonical = excluded.is_canonical
      `;
    }
    console.log(`Inserted/Updated ${brandArray.length} brands successfully.`);
  }

  // 2. Seed Brand Aliases
  console.log('Seeding Brand Aliases...');
  const aliasMappings: Array<{ alias: string; canonicalName: string }> = [
    { alias: 'prs', canonicalName: 'Paul Reed Smith' },
    { alias: 'prs guitars', canonicalName: 'Paul Reed Smith' },
    { alias: 'paul reed smith guitars', canonicalName: 'Paul Reed Smith' },
    { alias: 'fender musical instruments corporation', canonicalName: 'Fender' },
    { alias: 'fender music corporation', canonicalName: 'Fender' },
    { alias: 'fmic', canonicalName: 'Fender' },
    { alias: 'mesa boogie', canonicalName: 'Mesa Boogie' },
    { alias: 'mesa boogie', canonicalName: 'Mesa Boogie' },
    { alias: 'mesa engineering', canonicalName: 'Mesa Boogie' },
    { alias: 'gibson guitars', canonicalName: 'Gibson' },
    { alias: 'gibson guitar corp', canonicalName: 'Gibson' },
    { alias: 'ehx', canonicalName: 'Electro-Harmonix' },
    { alias: 'line6', canonicalName: 'Line 6' },
  ];

  for (const { alias, canonicalName } of aliasMappings) {
    const brand = await sql<{ id: number }[]>`
      select id from brands where normalized_name = ${normalizeBrandKey(canonicalName)} limit 1
    `;
    if (brand.length > 0) {
      await sql`
        insert into brand_aliases (brand_id, alias)
        values (${brand[0].id}, ${normalizeBrandKey(alias)})
        on conflict (alias) do update set
          brand_id = excluded.brand_id
      `;
    }
  }
  console.log(`Inserted brand aliases successfully.`);

  // 3. Seed Instrument Taxonomy
  const instListPath = path.join(dataDir, 'instrument-list.txt');
  if (fs.existsSync(instListPath)) {
    console.log('Seeding Instrument Taxonomy...');
    const rawLines = fs.readFileSync(instListPath, 'utf8')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);

    const instMap = new Map<string, { name: string; normalized_name: string; category: string; room_keys: string[]; is_common: boolean }>();

    for (const raw of rawLines) {
      const norm = normalizeName(raw);
      if (!norm) continue;
      if (!instMap.has(norm)) {
        const cat = categorizeInstrument(raw);
        const rooms = ROOM_ASSIGNMENTS[cat] || [];
        const isCommon = COMMON_INSTRUMENTS.has(norm);
        instMap.set(norm, {
          name: raw,
          normalized_name: norm,
          category: cat,
          room_keys: rooms,
          is_common: isCommon
        });
      }
    }

    const instArray = Array.from(instMap.values());
    console.log(`Prepared ${instArray.length} instrument taxonomy records.`);

    const chunkSize = 300;
    for (let i = 0; i < instArray.length; i += chunkSize) {
      const chunk = instArray.slice(i, i + chunkSize);
      await sql`
        insert into instrument_taxonomy ${sql(chunk, 'name', 'normalized_name', 'category', 'room_keys', 'is_common')}
        on conflict (normalized_name) do update set
          name = excluded.name,
          category = excluded.category,
          room_keys = excluded.room_keys,
          is_common = excluded.is_common
      `;
    }
    console.log(`Inserted/Updated ${instArray.length} instrument taxonomy records.`);
  }

  // 4. Seed Tuning Presets
  const tuningsPath = path.join(dataDir, 'tunings.json');
  if (fs.existsSync(tuningsPath)) {
    console.log('Seeding Tuning Presets...');
    const tuningsData: Record<string, Array<{ name: string; notes: string[] }>> = JSON.parse(
      fs.readFileSync(tuningsPath, 'utf8')
    );

    let count = 0;
    for (const [stringCountStr, list] of Object.entries(tuningsData)) {
      const stringCount = parseInt(stringCountStr, 10);
      for (const t of list) {
        await sql`
          insert into tuning_presets (instrument_kind, string_count, name, notes)
          values ('guitar', ${stringCount}, ${t.name}, ${t.notes})
          on conflict (instrument_kind, string_count, name) do update set
            notes = excluded.notes
        `;
        count++;
      }
    }
    console.log(`Inserted/Updated ${count} tuning presets.`);
  }

  // 5. Seed String Gauge Presets
  const gaugesPath = path.join(dataDir, 'string_gauges.json');
  if (fs.existsSync(gaugesPath)) {
    console.log('Seeding String Gauge Presets...');
    const gaugesData: {
      guitar: Record<string, string[]>;
      bass: Record<string, string[]>;
    } = JSON.parse(fs.readFileSync(gaugesPath, 'utf8'));

    let count = 0;
    // Guitar gauges
    for (const [strCount, list] of Object.entries(gaugesData.guitar || {})) {
      const stringCount = parseInt(strCount, 10);
      for (const g of list) {
        await sql`
          insert into string_gauge_presets (instrument_kind, string_count, gauge_set, label)
          values ('guitar', ${stringCount}, ${g}, ${g === 'CUSTOM' ? 'Custom' : null})
          on conflict (instrument_kind, string_count, gauge_set) do nothing
        `;
        count++;
      }
    }
    // Bass gauges
    for (const [strCount, list] of Object.entries(gaugesData.bass || {})) {
      const stringCount = parseInt(strCount, 10);
      for (const g of list) {
        await sql`
          insert into string_gauge_presets (instrument_kind, string_count, gauge_set, label)
          values ('bass', ${stringCount}, ${g}, ${g === 'CUSTOM' ? 'Custom' : null})
          on conflict (instrument_kind, string_count, gauge_set) do nothing
        `;
        count++;
      }
    }
    console.log(`Inserted/Updated ${count} string gauge presets.`);
  }

  console.log('--- Rigistry Reference Seeding Completed Successfully ---');
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
