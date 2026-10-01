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

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found in .env.local');
    process.exit(1);
  }

  console.log('Querying Google GenAI SDK for available models using GEMINI_API_KEY...');

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.list();
    console.log('\n=== Available Gemini Models ===');
    for await (const m of response) {
      console.log(`- Name: ${m.name}`);
      console.log(`  DisplayName: ${m.displayName}`);
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Error querying ai.models.list():', errMsg);

    // Fallback direct fetch to REST API endpoint if SDK method differs
    console.log('\nTrying direct REST query to https://generativelanguage.googleapis.com/v1beta/models...');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = (await res.json()) as { models?: Array<{ name?: string; displayName?: string }> };
      if (data.models) {
        console.log('\n=== Available Models via REST ===');
        data.models.forEach((m) => {
          console.log(`- ${m.name} (${m.displayName})`);
        });
      } else {
        console.error('REST Response error:', JSON.stringify(data));
      }
    } catch (fetchErr: unknown) {
      const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error('REST Fetch Error:', fetchMsg);
    }
  }
}

listModels();
