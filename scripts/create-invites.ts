import { db } from '../src/lib/db';
import crypto from 'crypto';

async function main() {
  const args = process.argv.slice(2);
  let count = 100;
  const countIdx = args.indexOf('--count');
  if (countIdx !== -1 && args[countIdx + 1]) {
    count = parseInt(args[countIdx + 1], 10) || 100;
  }

  console.log(`Generating ${count} invite codes...`);

  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    codes.push(`CADRE-${rand}`);
  }

  // Also ensure a master dev code exists
  codes.push('CADRE-DEV01');

  for (const code of codes) {
    await db`
      insert into invite_codes (code)
      values (${code})
      on conflict (code) do nothing
    `;
  }

  console.log(`Successfully generated and stored ${codes.length} invite codes.`);
  console.log(`Sample codes: ${codes.slice(0, 5).join(', ')}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error generating invite codes:', err);
  process.exit(1);
});
