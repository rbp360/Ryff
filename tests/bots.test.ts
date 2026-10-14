import { describe, it, expect } from 'vitest';
import { getAllBots, getBot, buildBotSystemPrompt, DEFAULT_BOT_ID } from '../src/lib/bots';

describe('Bot Registry and Dossiers', () => {
  it('loads all 5 starter bots successfully', () => {
    const bots = getAllBots();
    expect(bots.length).toBe(5);

    const ids = bots.map((b) => b.id);
    expect(ids).toContain('robbpaul');
    expect(ids).toContain('stevie');
    expect(ids).toContain('tim');
    expect(ids).toContain('hank');
    expect(ids).toContain('mcgee');
  });

  it('validates each bot dossier has required attributes and valid temperature', () => {
    const bots = getAllBots();
    for (const b of bots) {
      expect(b.name).toBeTruthy();
      expect(b.archetype).toBeTruthy();
      expect(b.temperature).toBeGreaterThanOrEqual(0.0);
      expect(b.temperature).toBeLessThanOrEqual(1.0);
      expect(b.voice.tone).toBeTruthy();
      expect(b.voice.forbidden_phrases.length).toBeGreaterThan(0);
      expect(b.biases.favoured_gear.length).toBeGreaterThan(0);
      expect(b.biases.hostile_concepts.length).toBeGreaterThan(0);
      expect(b.sample_lines.length).toBeGreaterThanOrEqual(3);
      expect(b.disagreement_rate).toBeGreaterThan(0);
      expect(b.avatarImage).toBeTruthy();
    }
  });

  it('retrieves RobBPaul by default when no bot ID or invalid bot ID is provided', () => {
    const defaultBot = getBot();
    expect(defaultBot.id).toBe(DEFAULT_BOT_ID);
    expect(defaultBot.name).toBe('RobBPaul');

    const invalidBot = getBot('nonexistent_bot');
    expect(invalidBot.id).toBe(DEFAULT_BOT_ID);
  });

  it('assembles a rich system prompt with anchor lines and rules', () => {
    const mcgee = getBot('mcgee');
    const prompt = buildBotSystemPrompt(mcgee, { disagreement: true });

    expect(prompt).toContain('McGee');
    expect(prompt).toContain('Chibson');
    expect(prompt).toContain('Directive: Push back');
    expect(prompt).toContain('Banned phrases');
    expect(prompt).toContain('Anti-Caricature Law');
    expect(prompt).toContain('Natural Flow');
    expect(prompt).toContain('No Obligatory Ending Questions');
    expect(prompt).toContain('Anti-Plagiarism (Sample Lines & Manifesto)');
    expect(prompt).toContain('No Parroting / Summarizing Context');
    expect(prompt).toContain('Hardware Grounding');
  });

  it('supports registering a custom user companion bot with 100-word manifesto and player affinities', () => {
    const customDossier = {
      id: 'user_sunset_87',
      name: 'Sunset Renegade',
      isUserProxy: true,
      avatarText: 'SR',
      archetype: 'Sunset Strip Blues-Rock Renegade',
      player_manifesto: "I'm Slash, 1987 Sunset Strip, copied Les Paul, dirty blues gone bad, hate posers like Motley Crue.",
      temperature: 0.8,
      disagreement_rate: 0.4,
      voice: {
        tone: 'Brash, visceral, loose street swagger',
        slang: ['mate', 'chug', 'crank it'],
        forbidden_phrases: ['Toan is in the fingers', 'Melt faces', 'As an AI'],
      },
      biases: {
        favoured_gear: ['1959 Les Paul replica', 'Marshall Jubilee'],
        hostile_concepts: ['Hairspray glam bands', 'Sterile sweep-picking'],
        favoured_players: ['Keith Richards', 'Rory Gallagher', 'Joe Perry'],
        disliked_players: ['Motley Crue', 'Glam posers'],
        trusted_sources: ['Underground bootlegs', 'Old vinyl'],
        distrusted_sources: ['Commercial gloss magazines'],
        stance_on_modelling: 'Real rock requires real speaker air.',
      },
      irrational_hill_to_die_on: 'Rock died when bands cared more about hairspray than groove.',
      sample_lines: [
        'Crank the gain to 7 and hit an open G with some blood.',
        'If I wanted a typewriter, I would buy an office supply store.',
        'A copied Les Paul beats any £5k case queen.',
      ],
    };

    const prompt = buildBotSystemPrompt(customDossier, { disagreement: true });

    expect(prompt).toContain('Sunset Renegade');
    expect(prompt).toContain('Sunset Strip Blues-Rock Renegade');
    expect(prompt).toContain('Core Player Ethos / Manifesto: "I\'m Slash, 1987 Sunset Strip');
    expect(prompt).toContain('Guitarists, heroes, and inspirations you admire and defend: Keith Richards, Rory Gallagher, Joe Perry');
    expect(prompt).toContain('Players, posers, or scenes you dismiss or critique: Motley Crue, Glam posers');
    expect(prompt).toContain('Publications, channels, and sources you trust: Underground bootlegs, Old vinyl');
    expect(prompt).toContain('Hype channels, clickbait, and sources you distrust: Commercial gloss magazines');
  });
});
