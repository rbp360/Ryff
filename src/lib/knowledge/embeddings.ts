import { GoogleGenAI } from '@google/genai';
import { env } from '../env';
import { l2Normalize } from './text';

export const EMBEDDING_DIMS = 768;

export type EmbedTask = 'SEMANTIC_SIMILARITY' | 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

/**
 * Embeds texts with Gemini (768 dims). Returns null when no API key is configured or the call fails,
 * so every caller can degrade gracefully to exact-match / SQL-only behaviour.
 */
export async function embedTexts(texts: string[], task: EmbedTask): Promise<number[][] | null> {
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || texts.length === 0) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.embedContent({
      model: env.EMBEDDING_MODEL,
      contents: texts,
      config: { taskType: task, outputDimensionality: EMBEDDING_DIMS },
    });
    const vectors = (res.embeddings || []).map((e) => e.values || []);
    if (vectors.length !== texts.length || vectors.some((v) => v.length !== EMBEDDING_DIMS)) return null;
    return vectors.map(l2Normalize);
  } catch (err) {
    console.warn('[Embeddings] failed:', err instanceof Error ? err.message.slice(0, 120) : err);
    return null;
  }
}

export async function embedText(text: string, task: EmbedTask): Promise<number[] | null> {
  const out = await embedTexts([text], task);
  return out ? out[0] : null;
}



/** Multimodal embedding model; images and text share one space, so no taskType is passed. */
async function embedMultimodal(parts: Array<Record<string, unknown>>): Promise<number[] | null> {
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.embedContent({
      model: env.IMAGE_EMBEDDING_MODEL,
      contents: [{ parts }],
      config: { outputDimensionality: EMBEDDING_DIMS },
    });
    const v = res.embeddings?.[0]?.values || [];
    return v.length === EMBEDDING_DIMS ? l2Normalize(v) : null;
  } catch (err) {
    console.warn('[ImageEmbeddings] failed:', err instanceof Error ? err.message.slice(0, 120) : err);
    return null;
  }
}

export async function embedImage(bytes: Buffer, mimeType: string): Promise<number[] | null> {
  return embedMultimodal([{ inlineData: { data: bytes.toString('base64'), mimeType } }]);
}

/** Text embedded into the multimodal space, for text -> image search. */
export async function embedTextForImageSearch(text: string): Promise<number[] | null> {
  return embedMultimodal([{ text }]);
}
