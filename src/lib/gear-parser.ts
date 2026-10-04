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
    tuning?: string | null;
    string_gauge?: string | null;
    string_manufacturer?: string | null;
    number_of_strings?: number | null;
    pickup_bridge?: string | null;
    pickup_middle?: string | null;
    pickup_neck?: string | null;
    nickname?: string | null;
    amp_settings?: string | null;
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

  const systemPrompt = `You are a professional guitar tech, luthier, and audio gear specialist parser.
Your job is to analyze a musician's log or voice memo about their gear and extract structured maintenance, modification, tuning, strings, or component spec data into valid JSON.

Context: ${gearContext}

Schema requirements:
Respond with ONLY a raw JSON object (no markdown, no backticks, no codeblocks):
{
  "transcript": string (the exact spoken/written text),
  "event_type": "string_change" | "modification" | "maintenance" | "repair" | "valve_change" | "setup" | "note" | "general",
  "title": string (concise, e.g. "Restrung with Elixir 9-46 in Standard Tuning", "Bridge Pickup Upgrade", "R2 Resistor Mod", "Valve Replacement"),
  "description": string (clear summary of what was logged or modified),
  "component": string or null (e.g. "Strings", "Bridge Pickup", "Tuning", "Power Valves", "Action / Truss Rod", "Pots"),
  "original_part": string or null (e.g. "Stock PRS HFS in case", "Stock 100k resistor", null),
  "event_date": string (YYYY-MM-DD format. If user mentions "Monday", "1st October", "last week", "November 2025", compute the appropriate date relative to today ${todayIso}),
  "gear_updates": {
    "current_strings": string or null (e.g. "Elixir 9-46", "Ernie Ball Regular Slinky 10-46"),
    "last_restrung_at": string or null (ISO timestamp like "YYYY-MM-DDT12:00:00Z" if a string change occurred or restring date mentioned),
    "tuning": string or null (Normalized tuning if mentioned: e.g. "Standard (E A D G B E)", "Drop D (D A D G B E)", "DADGAD", "Eb Standard", "Drop C", "Open G (D G D G B D)", "Drop A", etc.),
    "string_gauge": string or null (Normalized gauge string if mentioned: e.g. "010-046 (Regular Light)", "009-042 (Super Light)", "009-046 (Custom Light / Hybrid)", "010-052 (Light Top / Heavy Bottom)", "011-050 (Medium)"),
    "string_manufacturer": string or null (e.g. "Ernie Ball", "D'Addario", "Elixir", "DR Strings", "GHS", "Rotosound", "Martin", "Fender", "Gibson", "Dunlop"),
    "number_of_strings": number or null (e.g. 6, 7, 8, 12, 4, 5 if mentioned),
    "pickup_bridge": string or null (e.g. "Seymour Duncan JB", "Lavarack Custom 9k", "EMG 81"),
    "pickup_middle": string or null (e.g. "Fender Custom Shop '69 Single Coil"),
    "pickup_neck": string or null (e.g. "Seymour Duncan '59", "DiMarzio Air Norton"),
    "nickname": string or null (e.g. "Lucille", "Old Black", "Red Special" if user says "named it...", "call this..."),
    "amp_settings": string or null (amp knob/channel notes if mentioned),
    "pickups_summary": string or null (overall pickup summary),
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

      let response: { text?: string | null } | null = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          response = await ai.models.generateContent({
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
          break;
        } catch (callErr: unknown) {
          const msg = callErr instanceof Error ? callErr.message : String(callErr);
          if ((msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429')) && attempts < maxAttempts) {
            console.warn(`[gear-parser] Demand spike (${msg.slice(0, 50)}...). Retrying in 1.5s (${attempts}/${maxAttempts})...`);
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } else {
            throw callErr;
          }
        }
      }

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

    if (lower.includes('ernie ball')) gearUpdates.string_manufacturer = 'Ernie Ball';
    else if (lower.includes("d'addario") || lower.includes('nyxl')) gearUpdates.string_manufacturer = "D'Addario";
    else if (lower.includes('elixir')) gearUpdates.string_manufacturer = 'Elixir';
    else if (lower.includes('dr strings')) gearUpdates.string_manufacturer = 'DR Strings';

    if (lower.includes('10-46') || lower.includes('10 to 46')) gearUpdates.string_gauge = '010-046 (Regular Light)';
    else if (lower.includes('9-42') || lower.includes('9 to 42')) gearUpdates.string_gauge = '009-042 (Super Light)';
    else if (lower.includes('9-46') || lower.includes('9 to 46')) gearUpdates.string_gauge = '009-046 (Custom Light / Hybrid)';
    else if (lower.includes('10-52') || lower.includes('10 to 52')) gearUpdates.string_gauge = '010-052 (Light Top / Heavy Bottom)';
  } else if (lower.includes('pickup') || lower.includes('wound') || lower.includes('mod') || lower.includes('resistor')) {
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

  // Tuning detection
  if (lower.includes('drop d')) {
    gearUpdates.tuning = 'Drop D (D A D G B E)';
  } else if (lower.includes('drop c')) {
    gearUpdates.tuning = 'Drop C';
  } else if (lower.includes('dadgad')) {
    gearUpdates.tuning = 'DADGAD';
  } else if (lower.includes('eb standard') || lower.includes('half step down') || lower.includes('half-step down')) {
    gearUpdates.tuning = 'Eb Standard';
  } else if (lower.includes('standard tuning') || lower.includes('in standard') || lower.includes('tuned to standard')) {
    gearUpdates.tuning = 'Standard (E A D G B E)';
  }

  // Nickname detection
  const nickMatch = rawText.match(/(?:named|call(?:ed)?|nickname(?:d)?)\s+(?:it|her|this)?\s*["']?([A-Z][a-zA-Z0-9\s'-]+?)["']?(?:[,\.]|\s+and|\s+in|\s+with|$)/i);
  if (nickMatch && nickMatch[1]) {
    gearUpdates.nickname = nickMatch[1].trim();
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
