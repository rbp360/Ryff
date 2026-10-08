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
  });
});
