import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...vals] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

loadEnv();

async function testModelCall(modelName: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY');
    return;
  }
  const ai = new GoogleGenAI({ apiKey });
  console.log(`Testing content generation on model: "${modelName}"...`);
  try {
    const res = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: 'Say hello in 5 words.' }] }],
    });
    console.log(`[SUCCESS - ${modelName}]: "${res.text?.trim()}"`);
  } catch (err: any) {
    console.log(`[FAILED - ${modelName}]: ${err.message}`);
  }
}

async function run() {
  const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.8-flash'
  ];

  for (const m of modelsToTest) {
    await testModelCall(m);
  }
}

run();
