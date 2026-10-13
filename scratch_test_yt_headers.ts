async function testYtHeaders() {
  const channelId = 'UCSNxIry_FPFcQDFRbi3VOAw'; // Andertons
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const headerVariations = [
    { name: 'No headers', headers: {} },
    { name: 'Standard curl', headers: { 'User-Agent': 'curl/7.88.1' } },
    { name: 'Browser UA only', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
    { name: 'Full browser headers', headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    }},
  ];

  for (const v of headerVariations) {
    try {
      const res = await fetch(url, { headers: v.headers });
      console.log(`[${v.name}] HTTP ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`[${v.name}] Got XML length: ${text.length}`);
      }
    } catch (e: any) {
      console.log(`[${v.name}] Fetch error: ${e.message}`);
    }
  }

  // Also test BERNTH (which succeeded earlier) vs Andertons
  const bernthRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=UC8hYW4SLPuoogUCQ7DTGgrQ`);
  console.log('[BERNTH check] HTTP', bernthRes.status);
}

testYtHeaders().catch(console.error);
