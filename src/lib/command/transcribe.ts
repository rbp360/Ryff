import { GoogleGenAI } from '@google/genai';
import { env } from '../env';

export interface TranscribeAudioInput {
  audioBase64: string;
  audioMimeType?: string;
  gearContext?: string;
}

export interface TranscribeAudioResult {
  text: string;
}

/**
 * Transcribes user speech verbatim via Gemini Flash with inline audio data.
 */
export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioResult> {
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const model = env.MODEL_FAST || 'gemini-2.5-flash';

  if (!apiKey) {
    console.warn('[Command Transcribe] No GEMINI_API_KEY found, returning synthetic transcript for dev/testing');
    return {
      text: 'Changed strings on the Strat with 10-46 D\'Addarios yesterday',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const mimeType = input.audioMimeType || 'audio/webm';

    const systemInstruction = `You are a high-accuracy, verbatim audio transcriber specializing in music, guitars, amplifiers, effects pedals, and audio equipment.
Accurately transcribe the user's speech. Pay special attention to instrument and audio brands (e.g., Fender, Gibson, PRS, Ibanez, Soldano, Marshall, Strymon, Boss, Dunlop, Elixir, Ernie Ball, D'Addario), model names (e.g., Stratocaster, Les Paul, CE24, 5150, SLO-100, Helix, ToneX), gauges (e.g., 9-42, 10-46), pickups, valves, dates, and prices.
Output ONLY the raw transcribed sentence or question. Do not include quotes, explanatory notes, markdown formatting, or timestamps.`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: input.audioBase64,
            },
          },
          {
            text: input.gearContext
              ? `Transcribe this audio memo. Active gear context: ${input.gearContext}. Output verbatim text only.`
              : 'Transcribe this voice command. Output verbatim text only.',
          },
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.1,
        maxOutputTokens: 200,
      },
    });

    const transcribed = response?.text?.trim() || '';
    // Strip any accidental wrapping quotes
    const cleaned = transcribed.replace(/^["']|["']$/g, '').trim();

    return { text: cleaned };
  } catch (err: unknown) {
    console.error('[Command Transcribe] Transcription error:', err);
    throw new Error(err instanceof Error ? err.message : 'Audio transcription failed');
  }
}
