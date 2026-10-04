import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { env } from '../env';
import { recordAssistantCost } from './cost-logger';
import { costUsd, TokenUsage } from '../cost';

// In-memory cache for app-help answers by normalized question
const helpCache = new Map<string, string>();

/**
 * Normalizes question string for caching and intent matching:
 * lowercase, stripped punctuation, collapsed whitespace.
 */
export function normalizeHelpQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[?!.,;:()'"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reads static help markdown document.
 */
let cachedHelpDoc: string | null = null;
export function getHelpDocument(): string {
  if (cachedHelpDoc) return cachedHelpDoc;
  try {
    const helpPath = path.resolve(process.cwd(), 'src/lib/command/help.md');
    if (fs.existsSync(helpPath)) {
      cachedHelpDoc = fs.readFileSync(helpPath, 'utf8');
      return cachedHelpDoc;
    }
  } catch (err) {
    console.warn('[Help System] Could not load help.md from disk:', err);
  }
  return 'Ryff is a guitar gear assistant featuring Rig Passport, Trader wants, Backstage bots, and maintenance logs.';
}

export interface AnswerHelpResult {
  answer: string;
  cached: boolean;
  costUsd: number;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Answers questions about Ryff functionality strictly grounded in help.md.
 * Caches answers by normalized question to eliminate redundant LLM spend.
 */
export async function answerAppHelp(userId: string, question: string): Promise<AnswerHelpResult> {
  const normalized = normalizeHelpQuestion(question);

  // 1. Check in-memory question cache
  if (helpCache.has(normalized)) {
    return {
      answer: helpCache.get(normalized)!,
      cached: true,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  // 2. High-speed rule-based exact answers for frequent help queries (0 LLM cost)
  const ruleAnswer = matchStaticHelpRule(normalized);
  if (ruleAnswer) {
    helpCache.set(normalized, ruleAnswer);
    await recordAssistantCost({
      userId,
      intent: 'app_help',
      toolName: 'explain_app',
      model: 'rule-engine',
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    });
    return {
      answer: ruleAnswer,
      cached: false,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  const helpDoc = getHelpDocument();
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const modelName = env.MODEL_FAST || 'gemini-2.5-flash';

  if (!apiKey) {
    const fallbackAnswer = "I couldn't find information on that in the Ryff help guide. Check Setup or ask in Backstage.";
    helpCache.set(normalized, fallbackAnswer);
    return {
      answer: fallbackAnswer,
      cached: false,
      costUsd: 0,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are the Ryff Help Assistant.
Your ONLY job is to answer user questions about the Ryff application using STRICTLY AND ONLY the provided help documentation below.
Rules:
1. Keep your answer concise (2 to 4 sentences maximum), direct, and polite.
2. If the user asks how to do something, state the exact steps from the help document.
3. If the answer is NOT present or covered in the help document, you MUST answer EXACTLY:
   "I couldn't find information on that in the Ryff help guide. Check Setup or ask in Backstage."
4. Do NOT use outside knowledge or make up features that are not in the document.

--- Help Documentation ---
${helpDoc}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: question }] }],
      config: {
        systemInstruction,
        temperature: 0.1,
        maxOutputTokens: 250,
      },
    });

    const answer = response?.text?.trim() || "I couldn't find information on that in the Ryff help guide. Check Setup or ask in Backstage.";
    const usageMetadata = response?.usageMetadata;
    const usage: TokenUsage = {
      input_tokens: usageMetadata?.promptTokenCount || 200,
      output_tokens: usageMetadata?.candidatesTokenCount || 40,
    };

    const cost = costUsd(modelName, usage);

    // Save to cache
    helpCache.set(normalized, answer);

    // Record audit cost
    await recordAssistantCost({
      userId,
      intent: 'app_help',
      toolName: 'explain_app',
      model: modelName,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      costUsd: cost,
    });

    return {
      answer,
      cached: false,
      costUsd: cost,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    };
  } catch (err) {
    console.error('[Help Assistant] LLM generation error:', err);
    const fallback = "I couldn't find information on that in the Ryff help guide. Check Setup or ask in Backstage.";
    helpCache.set(normalized, fallback);
    return {
      answer: fallback,
      cached: false,
      costUsd: 0,
    };
  }
}

/**
 * Fast deterministic matcher for common app help questions.
 * Eliminates LLM calls and network latency for straightforward topics.
 */
function matchStaticHelpRule(normalized: string): string | null {
  if (
    normalized.includes('change my region') ||
    normalized.includes('change shipping region') ||
    normalized.includes('change marketplace region') ||
    normalized.includes('how do i change region') ||
    normalized.includes('shipping region')
  ) {
    return 'To change your marketplace shipping region: Go to Setup, locate the Marketplace & Shipping Region card, and choose from UK Only, Ships to UK, US Only, or Worldwide. Changes take effect immediately.';
  }

  if (
    normalized.includes('hank and vee') ||
    normalized.includes('who is hank') ||
    normalized.includes('who is vee') ||
    normalized.includes('difference between hank and vee')
  ) {
    return 'Hank is a vintage tube amp luthier and analog tone purist who is cynical about digital modeling. Vee is a modern digital tone architect enthusiastic about quad-core DSP profilers, active pickups, and IRs. You can debate with them in Backstage.';
  }

  if (
    normalized.includes('serial number') ||
    normalized.includes('serial privacy') ||
    normalized.includes('are serial numbers public')
  ) {
    return 'Serial numbers in your Rig Passport are private by default and hidden from others. They are only shown publicly if you explicitly toggle "Show serial number on public passport" in the gear settings modal.';
  }

  if (
    normalized.includes('how to undo') ||
    normalized.includes('how do i undo') ||
    normalized.includes('undo an action')
  ) {
    return 'You can undo any confirmed action immediately using the floating Undo toast after saving, or by navigating to Setup > Assistant Activity and tapping Undo next to any past action.';
  }

  if (
    normalized.includes('how to log maintenance') ||
    normalized.includes('how do i log maintenance') ||
    normalized.includes('how to change strings')
  ) {
    return 'You can log maintenance or string changes in two taps: use the ⚡ Tell Ryff command launcher (shortcut: ⌘K) and speak or type your update (e.g. "Restrung the PRS today"), or tap the 🎙️ Quick Mic button on any gear passport page.';
  }

  if (
    normalized.includes('command input mode') ||
    normalized.includes('voice input mode')
  ) {
    return 'You can configure your command input mode in Setup under Global Command Input: choose between "Text and voice" (default), "Text only", or "Off".';
  }

  return null;
}

/**
 * Clears the help cache (useful for testing or doc updates).
 */
export function clearHelpCache(): void {
  helpCache.clear();
}
