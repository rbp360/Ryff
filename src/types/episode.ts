/**
 * Episode & Debate Schema Types for Ryff Multi-Persona System.
 */

export interface DebateTurn {
  speaker_id: string; // e.g. 'robbpaul', 'stevie', 'tim', 'hank', 'mcgee'
  speaker_name: string; // e.g. 'RobBPaul', 'Stevie'
  speaker: string; // backwards-compatible alias for speaker_name
  text: string;
  round: number; // 1, 2, 3, 4
  turn: number; // backwards-compatible alias for round
}

export interface EpisodeTake {
  speaker_id: string;
  speaker_name: string;
  text: string;
}

export interface EpisodeTopic {
  title: string;
  disagreement: string;
  source_item_ids: number[];
  takes?: EpisodeTake[];
  // Backwards-compatible legacy fields
  hank?: string;
  vee?: string;
  [key: string]: unknown;
}

export interface EpisodeData {
  id: number;
  headline: string;
  topics: EpisodeTopic[];
  transcript: DebateTurn[];
  published_at: string | null;
  status: string;
}
