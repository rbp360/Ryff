import { describe, it, expect, vi } from 'vitest';
import { getAllBots, getBot, buildBotSystemPrompt, DEFAULT_BOT_ID } from '../src/lib/bots';
import { checkUserUsage } from '../src/lib/usage';

// Mock DB for usage check
vi.mock('../src/lib/db', () => ({
  db: vi.fn((strings: TemplateStringsArray) => {
    const query = strings.join(' ');
    if (query.includes('where user_id =') && query.includes('and day = current_date')) {
      // Mock daily cap hit (e.g. 10 msgs)
      return Promise.resolve([{ msgs: 10, cost_usd: 0.05 }]);
    }
    if (query.includes('total_month_cost')) {
      return Promise.resolve([{ total_month_cost: 0.15 }]);
    }
    if (query.includes('total_chat_cost')) {
      return Promise.resolve([{ total_chat_cost: 0.20 }]);
    }
    if (query.includes('total_pipeline_cost')) {
      return Promise.resolve([{ total_pipeline_cost: 0.10 }]);
    }
    return Promise.resolve([]);
  }),
}));

describe('Milestone M7.2: Multi-Bot Backstage Upgrade', () => {
  it('defaults active companion bot to robbpaul', () => {
    const bot = getBot();
    expect(bot.id).toBe(DEFAULT_BOT_ID);
    expect(bot.name).toBe('RobBPaul');
    expect(bot.isUserProxy).toBe(true);
    expect(bot.avatarText).toBe('RP');
    expect(bot.irrational_hill_to_die_on).toContain('In-ear monitors');
  });

  it('provides distinct profiles and hills to die on for all 5 bots', () => {
    const bots = getAllBots();
    expect(bots).toHaveLength(5);

    const botMap = new Map(bots.map((b) => [b.id, b]));

    // 1. RobBPaul
    const rob = botMap.get('robbpaul')!;
    expect(rob.name).toBe('RobBPaul');
    expect(rob.temperature).toBe(0.6);
    expect(rob.irrational_hill_to_die_on).toContain('In-ear monitors');
    expect(rob.biases.favoured_gear).toContain('Marshall');

    // 2. Stevie
    const stevie = botMap.get('stevie')!;
    expect(stevie.name).toBe('Stevie');
    expect(stevie.temperature).toBe(0.25);
    expect(stevie.irrational_hill_to_die_on).toContain('Heavy string gauges');
    expect(stevie.voice.slang).toContain('sweet spot');

    // 3. Tim
    const tim = botMap.get('tim')!;
    expect(tim.name).toBe('Tim');
    expect(tim.temperature).toBe(0.68);
    expect(tim.irrational_hill_to_die_on).toContain('Brazilian rosewood');
    expect(tim.biases.favoured_gear).toContain('Neural DSP Quad Cortex');

    // 4. Hank
    const hank = botMap.get('hank')!;
    expect(hank.name).toBe('Hank');
    expect(hank.temperature).toBe(0.85);
    expect(hank.irrational_hill_to_die_on).toContain('soldering iron');
    expect(hank.voice.slang).toContain('point-to-point');

    // 5. McGee
    const mcgee = botMap.get('mcgee')!;
    expect(mcgee.name).toBe('McGee');
    expect(mcgee.temperature).toBe(0.80);
    expect(mcgee.irrational_hill_to_die_on).toContain('knockoff');
    expect(mcgee.voice.slang).toContain('does it chuggeth');
  });

  it('builds system prompt injecting disagreement directive when flagged', () => {
    const tim = getBot('tim');
    const promptWithoutDisagree = buildBotSystemPrompt(tim, { disagreement: false });
    expect(promptWithoutDisagree).not.toContain('Directive: Push back');

    const promptWithDisagree = buildBotSystemPrompt(tim, { disagreement: true });
    expect(promptWithDisagree).toContain('Directive: Push back');
    expect(promptWithDisagree).toContain('Spar honestly and with authentic banter');
  });

  it('returns persona-specific in-character cap messages for all 5 bots', async () => {
    // RobBPaul
    const robUsage = await checkUserUsage('user-1', 'public', 'robbpaul');
    expect(robUsage.allowed).toBe(false);
    expect(robUsage.inCharacterMessage).toContain("Rob's packed his gig bag");

    // Stevie
    const stevieUsage = await checkUserUsage('user-1', 'public', 'stevie');
    expect(stevieUsage.allowed).toBe(false);
    expect(stevieUsage.inCharacterMessage).toContain("Stevie's let the power tubes cool down");

    // Tim
    const timUsage = await checkUserUsage('user-1', 'public', 'tim');
    expect(timUsage.allowed).toBe(false);
    expect(timUsage.inCharacterMessage).toContain("Tim's audio buffer is maxed out");

    // Hank
    const hankUsage = await checkUserUsage('user-1', 'public', 'hank');
    expect(hankUsage.allowed).toBe(false);
    expect(hankUsage.inCharacterMessage).toContain("Hank's put his soldering iron away");

    // McGee
    const mcgeeUsage = await checkUserUsage('user-1', 'public', 'mcgee');
    expect(mcgeeUsage.allowed).toBe(false);
    expect(mcgeeUsage.inCharacterMessage).toContain('McGee blew another fuse on the 5150');
  });
});
