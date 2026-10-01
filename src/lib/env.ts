import fs from 'fs';
import path from 'path';
import { z } from 'zod';

function loadEnv() {
  // Next.js automatically loads .env files in web server environments
  if (process.env.NEXT_RUNTIME || (process.env.DATABASE_URL && (process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY))) {
    return;
  }
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...vals] = trimmed.split('=');
        if (key) {
          const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  NEON_BRANCH: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  PROJECT_NAME: z.string().optional(),
  PROJECT_NUMBER: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  SESSION_SECRET: z.string().default('default-super-secret-session-key-32-chars-min'),
  MODEL_FAST: z.string().default('gemini-3.5-flash-lite'),
  MODEL_SMART: z.string().default('gemini-3.5-flash'),
  CONTACT_EMAIL: z.string().default('bedlamthebandbedlam@gmail.com'),
  SITE_URL: z.string().default('http://localhost:3000'),
  ADMIN_EMAILS: z.string().optional(),
  AFFILIATE_ENABLED: z.string().transform(v => v === 'true').default(false),
  AWIN_MERCHANT_ID: z.string().optional(),
  AWIN_AFFILIATE_ID: z.string().optional(),
});

export const env = envSchema.parse(process.env);
