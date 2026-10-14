import { NextRequest, NextResponse } from 'next/server';
import { complete } from '@/lib/llm';
import { env } from '@/lib/env';
import { BotDossier } from '@/types/bot';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      player_manifesto = '',
      favoured_gear = '',
      favoured_players = '',
      disliked_players = '',
      trusted_sources = '',
      distrusted_sources = '',
      pet_peeve = '',
      banned_cliche = '',
      banter_style = 'Dry & Cynical',
    } = body;

    const compilerPrompt = `You are the Ryff Persona Compiler. Your job is to convert raw questionnaire answers and a ~100-word musician manifesto into a rich, authentic guitar character dossier for a 1-on-1 sparring bot and pub debater.

CRITICAL RULES:
1. Do NOT generate bumper-sticker slogans or tired rock clichés (e.g. "play it like you stole it", "melt faces", "rock on", "toan").
2. Parse the ~100-word player description and answers to infer:
   - "temperature": number between 0.3 (surgical, precision tech) and 0.85 (loose, brash, rock-and-roll street swagger).
   - "disagreement_rate": number between 0.20 and 0.45 based on skepticism of posers, hype, or modern trends.
   - "archetype": A punchy 3-5 word label (e.g. "Sunset Strip Blues-Rock Renegade", "Benchtop Analog Cynic", "Working Gigging Pragmatist").
3. Extract explicit entities into arrays:
   - favoured_gear: Array of specific gear models, brands, or circuit types mentioned.
   - hostile_concepts: Array of gear trends, bad habits, or specs mocked or disliked.
   - favoured_players: Array of guitarists, heroes, and bands admired.
   - disliked_players: Array of players, posers, or scenes dismissed.
   - trusted_sources: Array of gear channels, magazines, or trusted sources.
   - distrusted_sources: Array of hype channels, clickbait, or corporate PR avoided.
4. Write EXACTLY 3 distinct "sample_lines" that demonstrate how this exact player ARGUES technical points about gear. Each line must debate a real hardware aspect (string gauge, pots, nut slots, valve sag, latency, capacitors, mix clarity, speaker breakup) in their authentic voice and cadence.
5. Derive 3-5 forbidden phrases from the user's hates and banned clichés so the bot never sounds like generic AI filler or a cliché machine.
6. Provide 4-6 natural British or player slang terms/phrases in "slang" fitting their vibe (e.g. "proper", "rubbish", "in the mix", "crank it", "mate").

USER INPUTS:
- Proposed Bot Name: ${name || 'User Custom Bot'}
- 100-Word Player Manifesto: "${player_manifesto}"
- Number One Rig / Favoured Gear: "${favoured_gear}"
- Favourite Players & Influences: "${favoured_players}"
- Disliked / Overrated Players & Scenes: "${disliked_players}"
- Trusted Sources / Channels: "${trusted_sources}"
- Distrusted / Hype Sources: "${distrusted_sources}"
- Pet Peeve & Hill to Die On: "${pet_peeve}"
- Banned Clichés: "${banned_cliche}"
- Banter Style: "${banter_style}"

OUTPUT FORMAT:
Return ONLY a valid, parseable JSON object matching this schema with no markdown formatting, no backticks, and no extra text:
{
  "name": string,
  "archetype": string,
  "player_manifesto": string,
  "temperature": number,
  "disagreement_rate": number,
  "voice": {
    "tone": string,
    "slang": string[],
    "forbidden_phrases": string[]
  },
  "biases": {
    "favoured_gear": string[],
    "hostile_concepts": string[],
    "favoured_players": string[],
    "disliked_players": string[],
    "trusted_sources": string[],
    "distrusted_sources": string[],
    "stance_on_modelling": string
  },
  "irrational_hill_to_die_on": string,
  "sample_lines": string[]
}`;

    const llmResult = await complete({
      model: env.MODEL_FAST || 'gemini-2.5-flash',
      messages: [{ role: 'user', content: compilerPrompt }],
      temperature: 0.4,
      purpose: 'persona_compile',
    });

    let rawText = llmResult.text.trim();
    // Clean code blocks if LLM wrapped in ```json
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    let parsedDossier: Partial<BotDossier>;
    try {
      parsedDossier = JSON.parse(rawText);
    } catch {
      console.warn('[Persona Compiler] Failed to parse raw JSON. Attempting regex extraction.');
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedDossier = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('LLM output could not be parsed as JSON');
      }
    }

    const botId = `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const finalName = parsedDossier.name || name || 'My Companion';
    const initials = finalName
      .split(' ')
      .map((w: string) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'UB';

    const fullDossier: BotDossier = {
      id: botId,
      name: finalName,
      isUserProxy: true,
      avatarText: initials,
      avatarImage: `/images/bots/${initials.toLowerCase()}.jpg`,
      archetype: parsedDossier.archetype || 'Working Tone Pragmatist',
      player_manifesto: player_manifesto || parsedDossier.player_manifesto,
      temperature: typeof parsedDossier.temperature === 'number' ? parsedDossier.temperature : 0.7,
      disagreement_rate: typeof parsedDossier.disagreement_rate === 'number' ? parsedDossier.disagreement_rate : 0.35,
      voice: {
        tone: parsedDossier.voice?.tone || 'Direct, practical, seasoned player banter',
        slang: Array.isArray(parsedDossier.voice?.slang) ? parsedDossier.voice.slang : ['mate', 'proper', 'in the mix'],
        forbidden_phrases: Array.isArray(parsedDossier.voice?.forbidden_phrases)
          ? parsedDossier.voice.forbidden_phrases
          : ['Certainly!', 'As an AI', 'Delve'],
      },
      biases: {
        favoured_gear: Array.isArray(parsedDossier.biases?.favoured_gear)
          ? parsedDossier.biases.favoured_gear
          : [favoured_gear].filter(Boolean),
        hostile_concepts: Array.isArray(parsedDossier.biases?.hostile_concepts)
          ? parsedDossier.biases.hostile_concepts
          : [pet_peeve].filter(Boolean),
        favoured_players: Array.isArray(parsedDossier.biases?.favoured_players)
          ? parsedDossier.biases.favoured_players
          : [favoured_players].filter(Boolean),
        disliked_players: Array.isArray(parsedDossier.biases?.disliked_players)
          ? parsedDossier.biases.disliked_players
          : [disliked_players].filter(Boolean),
        trusted_sources: Array.isArray(parsedDossier.biases?.trusted_sources)
          ? parsedDossier.biases.trusted_sources
          : [trusted_sources].filter(Boolean),
        distrusted_sources: Array.isArray(parsedDossier.biases?.distrusted_sources)
          ? parsedDossier.biases.distrusted_sources
          : [distrusted_sources].filter(Boolean),
        stance_on_modelling: parsedDossier.biases?.stance_on_modelling || 'Practical for convenience, but nothing replaces real speaker air.',
      },
      irrational_hill_to_die_on: parsedDossier.irrational_hill_to_die_on || pet_peeve || 'Real tone comes from hands and setups, not hype.',
      sample_lines: Array.isArray(parsedDossier.sample_lines) && parsedDossier.sample_lines.length > 0
        ? parsedDossier.sample_lines
        : [
            'Spend £80 on a proper setup and fresh strings before you waste £300 swapping pickups.',
            'If it sounds good in the band mix with a loud drummer, nobody in the venue cares about the headstock logo.',
            'Turn the gain down, push the midrange, and let the fingers do the work.',
          ],
    };

    return NextResponse.json({
      success: true,
      dossier: fullDossier,
    });
  } catch (err: unknown) {
    console.error('[POST /api/persona/generate] Error compiling persona:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate persona dossier' },
      { status: 500 }
    );
  }
}
