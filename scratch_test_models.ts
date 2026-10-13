import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...vals] = trimmed.split('=');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

loadEnv();

const apiKey = process.env.GEMINI_API_KEY!;
console.log('Using API key prefix:', apiKey.slice(0, 8));

const candidates = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
];

async function main() {
  const ai = new GoogleGenAI({ apiKey });
  for (const model of candidates) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: 'Respond with just "OK"' }] }],
      });
      console.log(`[SUCCESS] Model "${model}" works! Output:`, res.text?.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[FAILED] Model "${model}":`, msg.slice(0, 100));
    }
  }
}

main().catch(console.error);
