async function testAndertons() {
  const res = await fetch('https://www.youtube.com/@Andertons', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  const rssLink = html.match(/<link[^>]+type="application\/rss\+xml"[^>]*>/i);
  console.log('RSS link tag:', rssLink ? rssLink[0] : 'None');

  const feedMatches = html.match(/feeds\/videos\.xml[^"'\s<]+/g);
  console.log('Feed matches in HTML:', feedMatches);

  const channelMatches = [...html.matchAll(/"browseId":"(UC[a-zA-Z0-9_-]{22})"/g)].map(m => m[1]);
  console.log('BrowseIds found:', Array.from(new Set(channelMatches)));

  for (const cid of Array.from(new Set(channelMatches))) {
    const testRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${cid}`);
    console.log(`Testing browseId ${cid}: status ${testRes.status}`);
  }
}

testAndertons().catch(console.error);
