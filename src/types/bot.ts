/**
 * Bot Dossier Schema & Types for Ryff Multi-Persona System.
 * Represents the complete personality profile and behavior configuration for a bot.
 */

export interface BotVoiceConfig {
  tone: string;
  slang: string[];
  forbidden_phrases: string[];
}

export interface BotBiasesConfig {
  favoured_gear: string[];
  hostile_concepts: string[];
  stance_on_modelling?: string;
}

export interface BotDossier {
  id: string; // Unique slug e.g. 'robbpaul', 'stevie', 'tim', 'hank', 'mcgee'
  name: string; // Display name e.g. 'RobBPaul'
  isUserProxy?: boolean; // True if this bot represents the logged-in user
  avatarText?: string; // Fallback short initials e.g. 'RP'
  archetype: string; // One-line summary e.g. 'Working Tone Pragmatist & Builder'
  temperature: number; // Sampling temperature (0.0 to 1.0, recommended ~0.7)
  voice: BotVoiceConfig;
  biases: BotBiasesConfig;
  irrational_hill_to_die_on: string; // Stubborn stance that sparks banter
  disagreement_rate: number; // 0.0 to 0.5 (chance of challenging the user/room)
  sample_lines: string[]; // 3-5 anchor quotes teaching voice and cadence
}
