import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

function getDbUrl() {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      return line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return process.env.DATABASE_URL!;
}

async function analyzeDbImages() {
  const sql = postgres(getDbUrl(), { ssl: 'require' });
  
  const stats = await sql`
    SELECT 
      s.id as source_id,
      s.name as source_name,
      s.kind as source_kind,
      COUNT(i.id) as total_items,
      COUNT(i.image_url) as items_with_image,
      COUNT(i.id) - COUNT(i.image_url) as items_without_image
    FROM sources s
    LEFT JOIN items i ON s.id = i.source_id
    GROUP BY s.id, s.name, s.kind
    ORDER BY total_items DESC
  `;

  console.log('=== SOURCE IMAGE STATS IN DB ===\n');
  let grandTotal = 0;
  let grandWithImage = 0;

  for (const row of stats) {
    const total = Number(row.total_items);
    const withImg = Number(row.items_with_image);
    const withoutImg = Number(row.items_without_image);
    const pct = total > 0 ? Math.round((withImg / total) * 100) : 0;
    
    grandTotal += total;
    grandWithImage += withImg;

    console.log(`[${row.source_kind}] ${row.source_name}: ${withImg}/${total} with image (${pct}%) | Missing: ${withoutImg}`);
  }

  const grandPct = grandTotal > 0 ? Math.round((grandWithImage / grandTotal) * 100) : 0;
  console.log(`\nGRAND TOTAL: ${grandWithImage}/${grandTotal} with image (${grandPct}%) | Missing: ${grandTotal - grandWithImage}`);

  // Sample items missing images
  const sampleMissing = await sql`
    SELECT i.id, i.title, i.url, s.name as source_name, s.kind as source_kind
    FROM items i
    JOIN sources s ON i.source_id = s.id
    WHERE i.image_url IS NULL
    LIMIT 15
  `;

  console.log('\n=== SAMPLE ITEMS MISSING IMAGES ===');
  for (const m of sampleMissing) {
    console.log(`- [${m.source_name}] (${m.source_kind}) ${m.title.slice(0, 60)} -> ${m.url.slice(0, 60)}`);
  }

  await sql.end();
}

analyzeDbImages();
