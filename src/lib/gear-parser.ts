import { GoogleGenAI } from '@google/genai';
import { env } from './env';

export interface ParsedGearLog {
  transcript: string;
  event_type: 'string_change' | 'modification' | 'maintenance' | 'repair' | 'valve_change' | 'setup' | 'note' | 'general';
  title: string;
  description: string;
  component: string | null;
  original_part: string | null;
  event_date: string; // YYYY-MM-DD
  gear_updates: {
    current_strings?: string | null;
    last_restrung_at?: string | null;
    pickups_summary?: string | null;
    modifications_summary?: string | null;
    valves_summary?: string | null;
    last_valves_changed_at?: string | null;
    serial_number?: string | null;
    purchase_date?: string | null;
    condition?: string | null;
    specs?: Record<string, unknown>;
  };
}

export interface ParseGearLogInput {
  item: {
    brand?: string | null;
    model?: string | null;
    category?: string | null;
    raw_text?: string;
  };
  text?: string;
  audioBase64?: string;
  audioMimeType?: string;
}

export async function parseGearVoiceOrText(input: ParseGearLogInput): Promise<ParsedGearLog> {
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const modelName = env.MODEL_FAST || 'gemini-2.5-flash';
  const todayIso = new Date().toISOString().split('T')[0];

  const gearContext = `Target Gear: ${input.item.brand || ''} ${input.item.model || input.item.raw_text || 'Gear'} (Category: ${input.item.category || 'Instrument/Audio Gear'}). Today's Date: ${todayIso}.`;

  const systemPrompt = `You are a guitar tech and music gear specialist parser.
Your job is to analyze a musician's log or voice memo about their gear and extract structured maintenance, modification, or spec data into valid JSON.

Context: ${gearContext}

Schema requirements:
Respond with ONLY a raw JSON object (no markdown, no backticks, no codeblocks):
{
  "transcript": string (the exact spoken/written text),
  "event_type": "string_change" | "modification" | "maintenance" | "repair" | "valve_change" | "setup" | "note" | "general",
  "title": string (concise, e.g. "Restrung with Elixir 9-46", "Bridge Pickup Upgrade", "R2 Resistor Mod", "Valve Replacement"),
  "description": string (clear summary of what was logged or modified),
  "component": string or null (e.g. "Strings", "Bridge Pickup", "R2 Resistor", "Power Valves", "Action / Truss Rod", "Pots"),
  "original_part": string or null (e.g. "Stock PRS HFS in case", "Stock 100k resistor", null),
  "event_date": string (YYYY-MM-DD format. If user mentions "Monday", "last week", "November 2025", "August 2017", compute the appropriate date relative to today ${todayIso}),
  "gear_updates": {
    "current_strings": string or null (e.g. "Elixir 9-46", "Ernie Ball Regular Slinky 10-46"),
    "last_restrung_at": string or null (ISO timestamp like "${todayIso}T12:00:00Z" if string change occurred),
    "pickups_summary": string or null (e.g. "Lavarack Custom ~9k Bridge, stock neck"),
    "modifications_summary": string or null,
    "valves_summary": string or null,
    "last_valves_changed_at": string or null,
    "serial_number": string or null,
    "purchase_date": string or null,
    "condition": string or null,
    "specs": object (any additional key-values e.g. { "bridge_pickup_dcr": "9k", "string_gauge": "9-46" })
  }
}`;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      if (input.audioBase64) {
        parts.push({
          inlineData: {
            mimeType: input.audioMimeType || 'audio/webm',
            data: input.audioBase64,
          },
        });
        parts.push({
          text: `Parse this gear audio note for ${input.item.brand || ''} ${input.item.model || ''}. Extract transcript and all structured event & spec updates.`,
        });
      } else if (input.text) {
        parts.push({
          text: input.text,
        });
      } else {
        throw new Error('Either text or audioBase64 must be provided');
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const rawJson = (response?.text || '').trim();
      if (rawJson) {
        const cleaned = rawJson.replace(/^```json\s*|\s*```$/g, '').trim();
        const parsed = JSON.parse(cleaned) as ParsedGearLog;
        if (parsed.title) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[gear-parser] AI parse failed or unavailable, falling back to rule-based parser:', err);
    }
  }

  // Fallback rule-based parsing
  const rawText = input.text || 'Voice update recorded';
  const lower = rawText.toLowerCase();

  let eventType: ParsedGearLog['event_type'] = 'general';
  let title = 'Gear Log Entry';
  let component: string | null = null;
  let originalPart: string | null = null;
  const gearUpdates: ParsedGearLog['gear_updates'] = {};

  if (lower.includes('restrung') || lower.includes('string') || lower.includes('strings') || lower.includes('gauge')) {
    eventType = 'string_change';
    component = 'Strings';
    const gaugeMatch = rawText.match(/(elixir|d'addario|ernie ball|nyxl|optiweb|nanoweb)?\s*(\d{1,2}\s*[-–]\s*\d{2}s?)/i);
    const stringName = gaugeMatch ? gaugeMatch[0].trim() : 'New Strings';
    title = `Restrung with ${stringName}`;
    gearUpdates.current_strings = stringName;
    gearUpdates.last_restrung_at = new Date().toISOString();
  } else if (lower.includes('pickup') || lower.includes('pickup') || lower.includes('wound') || lower.includes('mod') || lower.includes('resistor')) {
    eventType = 'modification';
    title = 'Hardware Modification';
    if (lower.includes('pickup')) component = 'Pickups';
    if (lower.includes('resistor')) component = 'Circuit';
    gearUpdates.modifications_summary = rawText;
  } else if (lower.includes('valve') || lower.includes('tube')) {
    eventType = 'valve_change';
    component = 'Valves / Tubes';
    title = 'Valves / Tubes Serviced';
    gearUpdates.valves_summary = rawText;
    gearUpdates.last_valves_changed_at = new Date().toISOString();
  }

  if (lower.includes('original') && lower.includes('case')) {
    originalPart = 'Original part stored in case';
  }

  return {
    transcript: rawText,
    event_type: eventType,
    title,
    description: rawText,
    component,
    original_part: originalPart,
    event_date: todayIso,
    gear_updates: gearUpdates,
  };
}
