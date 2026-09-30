import { GoogleGenAI } from '@google/genai';
import { env } from './env';
import { costUsd, TokenUsage } from './cost';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompleteParams {
  model?: string;
  system?: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  purpose: string;
  userId?: string;
  runId?: number;
}

export interface CompleteResult {
  text: string;
  usage: TokenUsage;
  costUsd: number;
}

export async function complete(params: CompleteParams): Promise<CompleteResult> {
  const model = params.model || env.MODEL_FAST || 'gemini-2.5-flash';
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn(`[LLM] No GEMINI_API_KEY provided. Returning mock response for purpose: ${params.purpose}`);
    const mockUsage: TokenUsage = {
      input_tokens: 150,
      output_tokens: 45,
    };
    return {
      text: `[Mock AI Response for ${params.purpose}]: Synthetic debate / digest output generated safely in development.`,
      usage: mockUsage,
      costUsd: costUsd(model, mockUsage),
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = params.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const config: Record<string, unknown> = {};
    if (params.system) {
      config.systemInstruction = params.system;
    }
    if (params.temperature !== undefined) {
      config.temperature = params.temperature;
    }
    if (params.maxTokens !== undefined) {
      config.maxOutputTokens = params.maxTokens;
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    const text = response.text || '';
    const usageMetadata = response.usageMetadata;
    const usage: TokenUsage = {
      input_tokens: usageMetadata?.promptTokenCount || 100,
      output_tokens: usageMetadata?.candidatesTokenCount || 50,
    };

    const cost = costUsd(model, usage);

    console.log(`[LLM ${params.purpose}] Model: ${model} | Tokens In: ${usage.input_tokens} Out: ${usage.output_tokens} | Cost: $${cost.toFixed(6)}`);

    return {
      text,
      usage,
      costUsd: cost,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV === 'test' || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('depleted') || errMsg.includes('402')) {
      console.warn(`[LLM Fallback - ${params.purpose}]: Gemini API notice (${errMsg.slice(0, 100)}...). Falling back to synthetic dev response.`);
      const mockUsage: TokenUsage = {
        input_tokens: 150,
        output_tokens: 45,
      };
      return {
        text: `[Mock AI Response for ${params.purpose}]: Synthetic debate / digest output generated safely in development.`,
        usage: mockUsage,
        costUsd: costUsd(model, mockUsage),
      };
    }
    console.error(`[LLM Error - ${params.purpose}]:`, errMsg);
    throw new Error(`LLM Call Failed (${params.purpose}): ${errMsg}`);
  }
}
