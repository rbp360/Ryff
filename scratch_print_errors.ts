import postgres from 'postgres';
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

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const runs = await sql`
    SELECT id, started_at, status, error
    FROM pipeline_runs
    ORDER BY id DESC
    LIMIT 5
  `;
  for (const r of runs) {
    console.log(`\n--- Run #${r.id} (${r.started_at}) Status: ${r.status} ---`);
    console.log(r.error);
  }
  await sql.end();
}

main().catch(console.error);
