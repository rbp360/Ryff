import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

// Load .env.local / .env if DATABASE_URL is not set
function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
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

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const sql = postgres(dbUrl);

async function runMigrations() {
  try {
    console.log('Ensuring schema_migrations table exists...');
    await sql`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    const migrationsDir = path.resolve(process.cwd(), 'db/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No db/migrations directory found.');
      process.exit(0);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const appliedRows = await sql<{ name: string }[]>`select name from schema_migrations`;
    const appliedSet = new Set(appliedRows.map(r => r.name));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      await sql.begin(async (tx) => {
        await tx.unsafe(sqlContent);
        await tx`insert into schema_migrations (name) values (${file})`;
      });

      console.log(`Successfully applied: ${file}`);
    }

    console.log('All migrations executed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
