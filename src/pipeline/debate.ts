import { db } from '../lib/db';
import { env } from '../lib/env';
import { complete } from '../lib/llm';
import { getBot, getAllBots, buildBotSystemPrompt } from '../lib/bots';
import { BotDossier } from '../types/bot';
import { DebateTurn, EpisodeTopic } from '../types/episode';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

export interface CandidateItem {
  id: number | string;
  title: string;
  summary: string;
  brands?: string[];
  products?: string[];
  hype?: number;
  item_type?: string;
  buzz_count?: number;
  controversy?: number;
}

const formattedEpisodeSchema = z.object({
  headline: z.string(),
  topics: z.array(
    z.object({
      title: z.string(),
      disagreement: z.string(),
      source_item_ids: z.array(z.number()),
      takes: z.array(
        z.object({
          speaker_id: z.string(),
          speaker_name: z.string(),
          text: z.string(),
        })
      ).optional(),
      hank: z.string().optional(),
      vee: z.string().optional(),
    }).passthrough()
  ),
});

export interface DebateOptions {
  limitItems?: number;
  fromFixture?: string;
  items?: CandidateItem[];
  promptVersion?: string; // e.g. 'v1', 'v2'
  speakerIds?: string[]; // e.g. ['robbpaul', 'mcgee'] or ['stevie', 'tim', 'hank']
}

// Bot keyword affinities for topic scoring
const BOT_KEYWORDS: Record<string, string[]> = {
  tim: [
    'digital', 'modeller', 'modelling', 'dsp', 'quad cortex', 'neural', 'kemper',
    'fractal', 'helix', 'line 6', 'tonex', 'plugin', 'software', 'vst', 'latency',
    'interface', 'daw', 'multiscale', 'headless', 'strandberg', 'active pickup', 'dps',
  ],
  stevie: [
    'tube', 'tubes', 'valve', 'valves', 'vintage', 'fender', 'strat', 'stratocaster',
    'tele', 'telecaster', 'blues', 'nitro', 'nitrocellulose', 'lacquer', 'handwired',
    'point to point', 'reissue', 'custom shop', 'analog', 'tonewood', 'sag', 'rectifier',
  ],
  hank: [
    'gibson', 'les paul', 'luthier', 'fret', 'frets', 'truss rod', 'wood', 'brazilian',
    'rosewood', 'pawnshop', 'soldering', 'repair', 'setup', 'intonation', 'cork',
    'cork-sniffer', 'snake oil', 'overpriced', 'craft', 'craftsmanship', 'workbench',
  ],
  mcgee: [
    'metal', 'shred', 'high-gain', 'gain', 'peavey', '5150', '6505', 'evh', 'schecter',
    'esp', 'ltd', 'jackson', 'ibanez', 'chug', 'chuggeth', 'mod', 'modding', 'cheap',
    'budget', 'squier', 'epiphone', 'chibson', 'harley benton', 'drop tune', 'pawn',
  ],
  robbpaul: [
    'gig', 'gigging', 'stage', 'live', 'workhorse', 'marshall', 'boss', 'practical',
    'pragmatist', 'value', 'reliable', 'pedalboard', 'in-ear', 'iem', 'pub', 'club',
    'mix', 'band', 'tuner', 'setup',
  ],
};

// Natural ideological pairings for maximum contrast
const NATURAL_OPPONENTS: Record<string, string[]> = {
  tim: ['stevie', 'hank', 'mcgee'],
  stevie: ['tim', 'mcgee', 'robbpaul'],
  hank: ['tim', 'robbpaul', 'mcgee'],
  mcgee: ['robbpaul', 'stevie', 'hank'],
  robbpaul: ['mcgee', 'hank', 'stevie'],
};

/**
 * Dynamically selects 2 or 3 debaters from the 5-bot roster based on
 * item topics, keyword affinities, and philosophical friction.
 */
export function selectDebatersForDebate(
  candidateItems: CandidateItem[],
  options?: { speakerIds?: string[] }
): BotDossier[] {
  // 1. If explicit speaker IDs passed, resolve and return them (clamped to 2-3 bots)
  if (options?.speakerIds && options.speakerIds.length >= 2) {
    const requested = options.speakerIds
      .map((id) => getBot(id))
      .filter((b, idx, arr) => arr.findIndex((x) => x.id === b.id) === idx);

    if (requested.length >= 2) {
      return requested.slice(0, 3);
    }
  }

  // 2. Score each bot against the candidate items text
  const itemText = candidateItems
    .map((it) => `${it.title} ${it.summary} ${(it.brands || []).join(' ')} ${(it.products || []).join(' ')}`)
    .join(' ')
    .toLowerCase();

  const scores: Record<string, number> = {
    robbpaul: 0,
    stevie: 0,
    tim: 0,
    hank: 0,
    mcgee: 0,
  };

  for (const [botId, keywords] of Object.entries(BOT_KEYWORDS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const matches = itemText.match(regex);
      if (matches) {
        scores[botId] += matches.length;
      }
    }
  }

  // Sort bots by highest topic affinity
  const rankedBots = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primaryBotId = rankedBots[0][1] > 0 ? rankedBots[0][0] : 'robbpaul';
  const speakerA = getBot(primaryBotId);

  // 3. Select Speaker B from natural opponents
  const possibleOpponents = NATURAL_OPPONENTS[speakerA.id] || ['hank', 'tim'];
  // Pick opponent with highest score among natural opponents, or first
  const speakerBId = possibleOpponents.sort((a, b) => (scores[b] || 0) - (scores[a] || 0))[0];
  const speakerB = getBot(speakerBId);

  // 4. Decide whether to add a 3rd wildcard speaker
  // If Act 2 has controversy or candidate items mention multiple opposing concepts
  const act2 = candidateItems[1];
  const shouldAddWildcard = Boolean(
    (act2 && (act2.controversy || 0) > 1) ||
    rankedBots[2]?.[1] > 0
  );

  if (shouldAddWildcard) {
    // Find third distinct bot with highest score or complementary viewpoint
    const remainingBots = getAllBots().filter(
      (b) => b.id !== speakerA.id && b.id !== speakerB.id
    );
    const speakerC = remainingBots.sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))[0];
    if (speakerC) {
      return [speakerA, speakerB, speakerC];
    }
  }

  return [speakerA, speakerB];
}

export async function runDebatePipeline(options: DebateOptions = {}) {
  const limitItems = options.limitItems || 8;
  const promptVer = options.promptVersion || process.env.PROMPT_VERSION || 'v1';
  const promptDir = path.resolve(process.cwd(), 'prompts', promptVer);
  const fallbackPromptDir = path.resolve(process.cwd(), 'prompts');

  const getPrompt = (file: string) => {
    const versionedPath = path.join(promptDir, file);
    if (fs.existsSync(versionedPath)) {
      return fs.readFileSync(versionedPath, 'utf8');
    }
    return fs.readFileSync(path.join(fallbackPromptDir, file), 'utf8');
  };

  let candidateItems: CandidateItem[] = [];

  if (options.items && options.items.length > 0) {
    candidateItems = options.items.slice(0, limitItems);
  } else if (options.fromFixture) {
    const fixturePath = path.isAbsolute(options.fromFixture)
      ? options.fromFixture
      : path.resolve(process.cwd(), 'fixtures/frozen', options.fromFixture);
    console.log(`[Debate Pipeline] Loading frozen items from fixture: ${fixturePath}`);
    const rawFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    candidateItems = rawFixture.slice(0, limitItems);
  } else {
    console.log(`[Debate Pipeline] Selecting Act 1 Main Event and Act 2 Wildcard items...`);

    // Act 1: The Main Event (Highest buzz cluster & hype)
    const act1Rows = await db`
      SELECT id, title, summary, brands, products, hype, item_type, buzz_count, controversy
      FROM items 
      WHERE digested_at IS NOT NULL AND relevant = true
      ORDER BY buzz_count DESC, hype DESC, published_at DESC NULLS LAST, id DESC 
      LIMIT 1
    `;

    const act1Item = act1Rows[0];
    const excludeIds = act1Item ? [Number(act1Item.id)] : [0];

    // Act 2: Community Wildcard (Highest controversy or spicy debate)
    const act2Rows = await db`
      SELECT id, title, summary, brands, products, hype, item_type, buzz_count, controversy
      FROM items 
      WHERE digested_at IS NOT NULL AND relevant = true
        AND id != ALL(${excludeIds}::bigint[])
      ORDER BY controversy DESC, hype DESC, published_at DESC NULLS LAST, id DESC 
      LIMIT 1
    `;

    const act2Item = act2Rows[0];
    if (act2Item) excludeIds.push(Number(act2Item.id));

    // Supporting items
    const supportingRows = await db`
      SELECT id, title, summary, brands, products, hype, item_type, buzz_count, controversy
      FROM items 
      WHERE digested_at IS NOT NULL AND relevant = true
        AND id != ALL(${excludeIds}::bigint[])
      ORDER BY buzz_count DESC, published_at DESC NULLS LAST, id DESC 
      LIMIT ${Math.max(1, limitItems - 2)}
    `;

    candidateItems = [
      ...(act1Item ? [act1Item] : []),
      ...(act2Item ? [act2Item] : []),
      ...supportingRows,
    ] as CandidateItem[];
  }

  if (candidateItems.length === 0) {
    console.log('[Debate Pipeline] No relevant digested items found.');
    return null;
  }

  console.log(`[Debate Pipeline (Prompt: ${promptVer})] Selected ${candidateItems.length} items for debate:`);
  candidateItems.forEach((it) => console.log(` - [ID ${it.id}] (Hype: ${it.hype}) ${it.title}`));

  // 1. Dynamic Speaker Selection
  const debaters = selectDebatersForDebate(candidateItems, { speakerIds: options.speakerIds });
  const [speakerA, speakerB, speakerC] = debaters;
  const isTriad = Boolean(speakerC);

  console.log(`\n[Debate Pipeline] Selected Debaters (${debaters.length} bots):`);
  debaters.forEach((d, idx) => console.log(` [Speaker ${String.fromCharCode(65 + idx)}] ${d.name} (${d.archetype})`));

  const act1 = candidateItems[0];
  const act2 = candidateItems[1] || candidateItems[0];
  const supporting = candidateItems.slice(2);

  const contextBlock = `<context>
  <act1_main_event>
    <item id="${act1.id}" brands="${(act1.brands || []).join(',')}">${act1.title}: ${act1.summary}</item>
  </act1_main_event>
  <act2_community_wildcard>
    <item id="${act2.id}" brands="${(act2.brands || []).join(',')}">${act2.title}: ${act2.summary}</item>
  </act2_community_wildcard>
  ${supporting.length > 0 ? `<supporting_news>\n${supporting.map((it) => `    <item id="${it.id}" brands="${(it.brands || []).join(',')}">${it.title}: ${it.summary}</item>`).join('\n')}\n  </supporting_news>` : ''}
</context>`;

  let totalCostUsd = 0;
  const transcript: DebateTurn[] = [];

  // Round 1: Opening hot take from Speaker A
  console.log(`\n[Debate] Round 1: ${speakerA.name} Opening...`);
  const speakerASystem = buildBotSystemPrompt(speakerA);
  const turn1 = await complete({
    model: env.MODEL_SMART || 'gemini-2.5-pro',
    system: speakerASystem,
    messages: [
      {
        role: 'user',
        content: `Opener: You are opening today's 2-Act gear debate.\nAct 1 (The Main Event): Deliver your passionate take on the #1 headline industry story. Cite supporting items as [[item:ID]].\nAct 2 (The Community Wildcard): Deliver your take on the secondary controversy or gear deal. Cite supporting items as [[item:ID]].\nSpeak strictly in your authentic character voice (${speakerA.archetype}). Do not invent facts. Max 220 words.\n\n${contextBlock}`,
      },
    ],
    purpose: `debate-round1-${speakerA.id}-opener`,
    temperature: speakerA.temperature,
  });
  totalCostUsd += turn1.costUsd;
  transcript.push({
    speaker_id: speakerA.id,
    speaker_name: speakerA.name,
    speaker: speakerA.name,
    text: turn1.text,
    round: 1,
    turn: 1,
  });

  // Round 2: Counter / reaction from Speaker B
  console.log(`[Debate] Round 2: ${speakerB.name} Responding...`);
  const speakerBSystem = buildBotSystemPrompt(speakerB, { disagreement: true });
  const turn2 = await complete({
    model: env.MODEL_SMART || 'gemini-2.5-pro',
    system: speakerBSystem,
    messages: [
      {
        role: 'user',
        content: `${contextBlock}\n\nReply: Respond directly to ${speakerA.name}'s opening arguments for both Act 1 (The Main Event) and Act 2 (The Community Wildcard).\nDisagree where your philosophy (${speakerB.archetype}) clashes with theirs, concede where they make a fair point, and counter with your own perspective.\nCite items as [[item:ID]]. Max 200 words.\n\n${speakerA.name} argues:\n"${turn1.text}"`,
      },
    ],
    purpose: `debate-round2-${speakerB.id}-response`,
    temperature: speakerB.temperature,
  });
  totalCostUsd += turn2.costUsd;
  transcript.push({
    speaker_id: speakerB.id,
    speaker_name: speakerB.name,
    speaker: speakerB.name,
    text: turn2.text,
    round: 2,
    turn: 2,
  });

  // Round 3: Wildcard interjection from Speaker C (if 3-way) OR rebuttal from Speaker A (if 2-way)
  const round3Speaker = isTriad ? speakerC! : speakerA;
  console.log(`[Debate] Round 3: ${round3Speaker.name} ${isTriad ? 'Wildcard Interjection' : 'Rebuttal'}...`);
  const round3System = buildBotSystemPrompt(round3Speaker);
  const round3Prompt = isTriad
    ? `${contextBlock}\n\nWildcard Interjection: You are joining the debate as the third voice.\nBoth ${speakerA.name} and ${speakerB.name} have made their cases:\n${speakerA.name} opened with:\n"${turn1.text}"\n\n${speakerB.name} countered with:\n"${turn2.text}"\n\nJump in with your own unfiltered perspective (${round3Speaker.archetype}). Call out where both ${speakerA.name} and ${speakerB.name} are missing the point. Max 140 words.`
    : `${contextBlock}\n\nRebuttal: Rebut ${speakerB.name}'s counter-arguments briefly in your character voice (${speakerA.archetype}). Defend your stance while keeping the sparring sharp. Max 140 words.\n\nYour opening was:\n"${turn1.text}"\n\n${speakerB.name} replied:\n"${turn2.text}"`;

  const turn3 = await complete({
    model: env.MODEL_SMART || 'gemini-2.5-pro',
    system: round3System,
    messages: [{ role: 'user', content: round3Prompt }],
    purpose: `debate-round3-${round3Speaker.id}-${isTriad ? 'wildcard' : 'rebuttal'}`,
    temperature: round3Speaker.temperature,
  });
  totalCostUsd += turn3.costUsd;
  transcript.push({
    speaker_id: round3Speaker.id,
    speaker_name: round3Speaker.name,
    speaker: round3Speaker.name,
    text: turn3.text,
    round: 3,
    turn: 3,
  });

  // Round 4: Room consensus & verdict summary
  const verdictSpeaker = speakerB;
  console.log(`[Debate] Round 4: ${verdictSpeaker.name} Closing Verdict & Consensus...`);
  const verdictSystem = buildBotSystemPrompt(verdictSpeaker);
  const turn4 = await complete({
    model: env.MODEL_SMART || 'gemini-2.5-pro',
    system: verdictSystem,
    messages: [
      {
        role: 'user',
        content: `${contextBlock}\n\nDebate summary so far:\n${speakerA.name} (Round 1): "${turn1.text}"\n${speakerB.name} (Round 2): "${turn2.text}"\n${round3Speaker.name} (Round 3): "${turn3.text}"\n\nDeliver the closing verdict for today's debate in your authentic character voice (${verdictSpeaker.archetype}).\nSummarize where the room lands (or the core irreconcilable difference between the viewpoints) on Act 1 and Act 2.\nGive the player listening the practical takeaway or bottom line. Max 130 words.`,
      },
    ],
    purpose: `debate-round4-${verdictSpeaker.id}-verdict`,
    temperature: verdictSpeaker.temperature,
  });
  totalCostUsd += turn4.costUsd;
  transcript.push({
    speaker_id: verdictSpeaker.id,
    speaker_name: verdictSpeaker.name,
    speaker: verdictSpeaker.name,
    text: turn4.text,
    round: 4,
    turn: 4,
  });

  // Round 5 / Structuring: Format full multi-turn transcript into structured episode schema
  console.log('\n[Debate] Formatting full 4-turn transcript into structured episode schema...');
  const fullTranscriptText = transcript
    .map((t) => `${t.speaker_name} (Round ${t.round}):\n${t.text}`)
    .join('\n\n');

  const debaterDescriptions = debaters.map((d) => `${d.name} (${d.archetype})`).join(', ');
  const formatPrompt = `Convert the debate transcript between ${debaterDescriptions} into valid JSON only:
{
  "headline": string,
  "topics": [
    {
      "title": string,
      "disagreement": string,
      "source_item_ids": number[],
      "takes": [
        { "speaker_id": string, "speaker_name": string, "text": string }
      ]
    }
  ]
}

Format guidelines:
1. "headline": Catchy, punchy overall episode title capturing the central clash.
2. "topics": Exactly 2 distinct topic objects:
   - Topic 1: Act 1 - The Main Event (the major industry headline).
   - Topic 2: Act 2 - The Community Wildcard (the controversy or gear deal).
3. "disagreement": One concise, razor-sharp sentence defining where the debaters' philosophies clash.
4. "source_item_ids": Array of item IDs cited in the discussion.
5. "takes": Array containing each debater's distilled in-character take for this topic.`;

  const formatRes = await complete({
    model: env.MODEL_FAST || 'gemini-2.5-flash',
    system: formatPrompt,
    messages: [
      { role: 'user', content: `Here is the debate transcript to structure into JSON:\n\n${fullTranscriptText}` },
    ],
    purpose: 'debate-format-json',
    temperature: 0.2,
  });
  totalCostUsd += formatRes.costUsd;

  let parsedEpisode: z.infer<typeof formattedEpisodeSchema>;
  try {
    const cleaned = formatRes.text.replace(/```json\n?|\n?```/g, '').trim();
    parsedEpisode = JSON.parse(cleaned);
  } catch {
    console.warn('[Debate Warn] JSON parsing failed on formatted episode. Constructing structured fallback.');
    parsedEpisode = {
      headline: `${speakerA.name} vs ${speakerB.name}: Clash Over Today's Gear News`,
      topics: [
        {
          title: candidateItems[0]?.title || "Daily Gear Showdown",
          disagreement: `${speakerA.name} and ${speakerB.name} disagree on modern tech value versus traditional craftsmanship.`,
          source_item_ids: candidateItems.map((it) => Number(it.id)),
          takes: debaters.map((d) => ({
            speaker_id: d.id,
            speaker_name: d.name,
            text: d.id === speakerA.id ? turn1.text.slice(0, 300) : turn2.text.slice(0, 300),
          })),
        },
      ],
    };
  }

  const validEpisode = formattedEpisodeSchema.safeParse(parsedEpisode);
  const rawTopics = validEpisode.success ? validEpisode.data.topics : parsedEpisode.topics;

  // Enrich each topic with dynamic bot keys and backwards-compatible hank/vee keys
  const enrichedTopics: EpisodeTopic[] = rawTopics.map((top) => {
    const topicTakes = top.takes && top.takes.length > 0
      ? top.takes
      : debaters.map((d) => ({
          speaker_id: d.id,
          speaker_name: d.name,
          text: d.id === speakerA.id ? turn1.text.slice(0, 300) : turn2.text.slice(0, 300),
        }));

    const resultTopic: EpisodeTopic = {
      title: top.title,
      disagreement: top.disagreement,
      source_item_ids: top.source_item_ids || candidateItems.map((it) => Number(it.id)),
      takes: topicTakes,
    };

    // Attach keyed fields for every participating bot (e.g. topic.robbpaul, topic.stevie, etc.)
    for (const take of topicTakes) {
      resultTopic[take.speaker_id] = take.text;
    }

    // Maintain backwards compatibility:
    // If hank or vee are in the takes, their fields are already set.
    // If not, map the first two debaters to hank and vee so legacy consumers never crash.
    if (!resultTopic.hank) {
      const takeA = topicTakes.find((t) => t.speaker_id === speakerA.id) || topicTakes[0];
      resultTopic.hank = takeA?.text || turn1.text.slice(0, 300);
    }
    if (!resultTopic.vee) {
      const takeB = topicTakes.find((t) => t.speaker_id === speakerB.id) || topicTakes[1] || topicTakes[0];
      resultTopic.vee = takeB?.text || turn2.text.slice(0, 300);
    }

    return resultTopic;
  });

  const finalHeadline = validEpisode.success ? validEpisode.data.headline : parsedEpisode.headline;

  // Persist episode to Neon database
  const insertRes = await db`
    INSERT INTO episodes (headline, topics, transcript, status, published_at)
    VALUES (
      ${finalHeadline},
      ${JSON.stringify(enrichedTopics)},
      ${JSON.stringify(transcript)},
      'published',
      NOW()
    )
    RETURNING id, created_at, headline
  `;

  console.log(`\n[Debate Complete] Episode ID #${insertRes[0]?.id} published to database.`);
  console.log(`Headline: "${insertRes[0]?.headline}"`);
  console.log(`Debaters: ${debaters.map((d) => d.name).join(', ')}`);
  console.log(`Total 4-Turn Debate Cost: $${totalCostUsd.toFixed(6)}`);

  return {
    episodeId: insertRes[0]?.id,
    headline: finalHeadline,
    topics: enrichedTopics,
    debaters: debaters.map((d) => ({ id: d.id, name: d.name })),
    totalCostUsd,
  };
}
