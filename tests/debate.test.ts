import { describe, it, expect, vi, beforeEach } from 'vitest';
import { selectDebatersForDebate, runDebatePipeline, CandidateItem } from '../src/pipeline/debate';
import { complete } from '../src/lib/llm';
import { db } from '../src/lib/db';

vi.mock('../src/lib/llm', () => ({
  complete: vi.fn(),
}));

vi.mock('../src/lib/db', () => ({
  db: vi.fn(),
}));

describe('Milestone M7.3: Multi-Bot Autonomous Debate Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dynamic Debater Selection', () => {
    it('honors explicitly requested 2-bot speakerIds', () => {
      const candidates: CandidateItem[] = [
        { id: 1, title: 'Generic Gear News', summary: 'Some news' },
      ];
      const debaters = selectDebatersForDebate(candidates, {
        speakerIds: ['robbpaul', 'mcgee'],
      });

      expect(debaters).toHaveLength(2);
      expect(debaters[0].id).toBe('robbpaul');
      expect(debaters[1].id).toBe('mcgee');
    });

    it('honors explicitly requested 3-bot speakerIds', () => {
      const candidates: CandidateItem[] = [
        { id: 1, title: 'Generic Gear News', summary: 'Some news' },
      ];
      const debaters = selectDebatersForDebate(candidates, {
        speakerIds: ['stevie', 'tim', 'hank'],
      });

      expect(debaters).toHaveLength(3);
      expect(debaters.map((d) => d.id)).toEqual(['stevie', 'tim', 'hank']);
    });

    it('deduplicates speakerIds and clamps to maximum 3 bots', () => {
      const candidates: CandidateItem[] = [
        { id: 1, title: 'Generic Gear News', summary: 'Some news' },
      ];
      const debaters = selectDebatersForDebate(candidates, {
        speakerIds: ['tim', 'tim', 'stevie', 'mcgee', 'robbpaul'],
      });

      expect(debaters).toHaveLength(3);
      expect(debaters[0].id).toBe('tim');
      expect(debaters[1].id).toBe('stevie');
      expect(debaters[2].id).toBe('mcgee');
    });

    it('dynamically selects Tim vs Stevie/Hank for digital modelling news', () => {
      const candidates: CandidateItem[] = [
        {
          id: 101,
          title: 'Neural DSP announces Quad Cortex firmware update with ultra-low latency modeller plugins',
          summary: 'The new DSP algorithms model valve power sag digitally with incredible precision.',
          brands: ['Neural DSP'],
          products: ['Quad Cortex'],
        },
      ];

      const debaters = selectDebatersForDebate(candidates);
      expect(debaters.length).toBeGreaterThanOrEqual(2);
      // Primary should be Tim due to DSP / modeller / plugin affinity
      expect(debaters[0].id).toBe('tim');
      // Natural opponent should be Stevie, Hank, or McGee
      expect(['stevie', 'hank', 'mcgee']).toContain(debaters[1].id);
    });

    it('dynamically selects McGee for high-gain metal and budget modding news', () => {
      const candidates: CandidateItem[] = [
        {
          id: 102,
          title: 'Peavey 5150 High-Gain Mod: Can this cheap pawnshop guitar chug?',
          summary: 'McGee tears into a budget Epiphone to see if high-gain pickups can make it rip for metal shred.',
          brands: ['Peavey'],
          products: ['5150'],
          controversy: 3,
        },
      ];

      const debaters = selectDebatersForDebate(candidates);
      expect(debaters.length).toBeGreaterThanOrEqual(2);
      expect(debaters[0].id).toBe('mcgee');
      expect(['robbpaul', 'stevie', 'hank']).toContain(debaters[1].id);
    });

    it('dynamically selects Stevie for vintage tube and nitro finish news', () => {
      const candidates: CandidateItem[] = [
        {
          id: 103,
          title: 'Fender Custom Shop vintage Stratocaster reissue with handwired nitro lacquer finish',
          summary: 'Pure vintage valve tone and dynamic touch sensitivity for blues purists.',
          brands: ['Fender'],
          products: ['Stratocaster'],
        },
      ];

      const debaters = selectDebatersForDebate(candidates);
      expect(debaters.length).toBeGreaterThanOrEqual(2);
      expect(debaters[0].id).toBe('stevie');
      expect(['tim', 'mcgee', 'robbpaul']).toContain(debaters[1].id);
    });
  });

  describe('Multi-Turn Sparring Pipeline Execution', () => {
    it('executes a 2-bot debate with 4 rounds and generic transcript schema', async () => {
      const mockComplete = vi.mocked(complete);
      const mockDb = vi.mocked(db);

      // Mock LLM turn responses
      mockComplete
        // Round 1: Opener
        .mockResolvedValueOnce({
          text: 'RobBPaul opening: Buying a £2,000 relic is madness. A working guitar needs good fretwork and reliable pots. [[item:1]]',
          costUsd: 0.001,
          usage: { input_tokens: 100, output_tokens: 40 },
        })
        // Round 2: Reaction
        .mockResolvedValueOnce({
          text: 'McGee countering: Who cares about relics? Plug a £100 beater into a cranked 5150 and chug until the speakers cry. [[item:1]]',
          costUsd: 0.001,
          usage: { input_tokens: 120, output_tokens: 35 },
        })
        // Round 3: Rebuttal
        .mockResolvedValueOnce({
          text: 'RobBPaul rebuttal: Sure, until your cheap pots crackle mid-gig and the tuning slips during the solo. Reliability matters on stage.',
          costUsd: 0.0008,
          usage: { input_tokens: 140, output_tokens: 30 },
        })
        // Round 4: Verdict
        .mockResolvedValueOnce({
          text: 'McGee verdict: Bottom line: spend your cash on pickups and high-gain amps, keep the axe cheap, and never buy snake oil.',
          costUsd: 0.0008,
          usage: { input_tokens: 160, output_tokens: 28 },
        })
        // Formatter JSON step
        .mockResolvedValueOnce({
          text: JSON.stringify({
            headline: 'RobBPaul vs McGee: Gigging Reliability vs High-Gain Modding',
            topics: [
              {
                title: 'The Great Budget Guitar Clash',
                disagreement: 'Rob prioritises live stage reliability while McGee prioritises raw gain and modded value.',
                source_item_ids: [1],
                takes: [
                  { speaker_id: 'robbpaul', speaker_name: 'RobBPaul', text: 'Reliability on stage beats cheap thrills.' },
                  { speaker_id: 'mcgee', speaker_name: 'McGee', text: 'Spend on gain and pickups, keep the axe cheap.' },
                ],
              },
            ],
          }),
          costUsd: 0.0004,
          usage: { input_tokens: 200, output_tokens: 50 },
        });

      // Mock database insertion
      (mockDb as any).mockImplementation((strings: any) => {
        const query = Array.isArray(strings) ? strings.join(' ') : String(strings);
        if (query.includes('INSERT INTO episodes')) {
          return Promise.resolve([
            { id: 99, created_at: new Date().toISOString(), headline: 'RobBPaul vs McGee' },
          ]);
        }
        return Promise.resolve([]);
      });

      const fixtureItems: CandidateItem[] = [
        { id: 1, title: 'Budget Guitar Test', summary: 'Testing cheap guitars' },
      ];

      // Run pipeline with explicit debaters RobBPaul vs McGee
      const result = await runDebatePipeline({
        items: fixtureItems,
        speakerIds: ['robbpaul', 'mcgee'],
        limitItems: 1,
      });

      expect(result).not.toBeNull();
      expect(result?.episodeId).toBe(99);
      expect(result?.debaters.map((d) => d.id)).toEqual(['robbpaul', 'mcgee']);
      expect(result?.topics[0].takes).toHaveLength(2);
      expect(result?.topics[0].robbpaul).toBe('Reliability on stage beats cheap thrills.');
      expect(result?.topics[0].mcgee).toBe('Spend on gain and pickups, keep the axe cheap.');
      // Backwards compatibility check
      expect(result?.topics[0].hank).toBeDefined();
      expect(result?.topics[0].vee).toBeDefined();

      // Inspect DB insert call args
      const dbCalls = (mockDb as any).mock.calls;
      const insertCall = dbCalls.find((c: any) => c[0].join(' ').includes('INSERT INTO episodes'));
      expect(insertCall).toBeDefined();

      // Check transcript stored in DB
      const transcriptArg = JSON.parse(insertCall![3] as string);
      expect(transcriptArg).toHaveLength(4);

      // Round 1
      expect(transcriptArg[0].speaker_id).toBe('robbpaul');
      expect(transcriptArg[0].round).toBe(1);
      expect(transcriptArg[0].speaker_name).toBe('RobBPaul');

      // Round 2
      expect(transcriptArg[1].speaker_id).toBe('mcgee');
      expect(transcriptArg[1].round).toBe(2);
      expect(transcriptArg[1].speaker_name).toBe('McGee');

      // Round 3 (rebuttal from Speaker A)
      expect(transcriptArg[2].speaker_id).toBe('robbpaul');
      expect(transcriptArg[2].round).toBe(3);

      // Round 4 (verdict)
      expect(transcriptArg[3].speaker_id).toBe('mcgee');
      expect(transcriptArg[3].round).toBe(4);
    });

    it('executes a 3-bot debate with Round 3 wildcard interjection', async () => {
      const mockComplete = vi.mocked(complete);
      const mockDb = vi.mocked(db);

      mockComplete
        // Round 1: Stevie opener
        .mockResolvedValueOnce({
          text: 'Stevie: Nothing breathes like a handwired tube amp. Digital cannot reproduce sag. [[item:2]]',
          costUsd: 0.001,
          usage: { input_tokens: 100, output_tokens: 30 },
        })
        // Round 2: Tim response
        .mockResolvedValueOnce({
          text: 'Tim: In a blind multitrack test, nobody can hear the difference between a Quad Cortex IR and a mic. [[item:2]]',
          costUsd: 0.001,
          usage: { input_tokens: 120, output_tokens: 30 },
        })
        // Round 3: McGee wildcard interjection
        .mockResolvedValueOnce({
          text: 'McGee: Both your rigs cost more than my car. Give me a boosted 5150 and let the crowd feel the punch.',
          costUsd: 0.001,
          usage: { input_tokens: 140, output_tokens: 30 },
        })
        // Round 4: Tim closing verdict
        .mockResolvedValueOnce({
          text: 'Tim: Verdict: tone is in the mix. The modern player wins on convenience and versatility.',
          costUsd: 0.001,
          usage: { input_tokens: 150, output_tokens: 30 },
        })
        // Formatter JSON
        .mockResolvedValueOnce({
          text: JSON.stringify({
            headline: 'Stevie, Tim & McGee: The 3-Way Valve vs Modeller Clash',
            topics: [
              {
                title: 'Tube Sag vs DSP Algorithms',
                disagreement: 'Stevie seeks dynamic analog feel, Tim seeks algorithmic studio perfection, and McGee demands sheer volume.',
                source_item_ids: [2],
                takes: [
                  { speaker_id: 'stevie', speaker_name: 'Stevie', text: 'Nothing breathes like handwired tube sag.' },
                  { speaker_id: 'tim', speaker_name: 'Tim', text: 'DSP algorithms provide undetectable studio clarity.' },
                  { speaker_id: 'mcgee', speaker_name: 'McGee', text: 'Crank the gain and skip the snobbery.' },
                ],
              },
            ],
          }),
          costUsd: 0.0005,
          usage: { input_tokens: 220, output_tokens: 60 },
        });

      (mockDb as any).mockImplementation((strings: any) => {
        const query = Array.isArray(strings) ? strings.join(' ') : String(strings);
        if (query.includes('INSERT INTO episodes')) {
          return Promise.resolve([{ id: 100, created_at: new Date().toISOString(), headline: '3-Way Clash' }]);
        }
        return Promise.resolve([]);
      });

      const fixtureItems: CandidateItem[] = [
        { id: 2, title: 'Tube Sag vs DSP Algorithms', summary: 'Testing 3-way clash' },
      ];

      const result = await runDebatePipeline({
        items: fixtureItems,
        speakerIds: ['stevie', 'tim', 'mcgee'],
        limitItems: 1,
      });

      expect(result).not.toBeNull();
      expect(result?.debaters.map((d) => d.id)).toEqual(['stevie', 'tim', 'mcgee']);
      expect(result?.topics[0].takes).toHaveLength(3);

      const dbCalls = (mockDb as any).mock.calls;
      const insertCall = dbCalls.find((c: any) => c[0].join(' ').includes('INSERT INTO episodes'));
      const transcriptArg = JSON.parse(insertCall![3] as string);

      expect(transcriptArg).toHaveLength(4);
      // Round 1: Stevie
      expect(transcriptArg[0].speaker_id).toBe('stevie');
      // Round 2: Tim
      expect(transcriptArg[1].speaker_id).toBe('tim');
      // Round 3: McGee (Wildcard Interjection)
      expect(transcriptArg[2].speaker_id).toBe('mcgee');
      // Round 4: Tim (Verdict)
      expect(transcriptArg[3].speaker_id).toBe('tim');
    });
  });
});
