import { describe, it, expect } from 'vitest';
import { loadImage } from '../src/lib/knowledge/images';

describe('gear image loading guards', () => {
  it('refuses private hosts, non-https and bad data URLs', async () => {
    expect(await loadImage('https://localhost/a.jpg')).toBeNull();
    expect(await loadImage('https://192.168.1.5/a.jpg')).toBeNull();
    expect(await loadImage('http://example.com/a.jpg')).toBeNull();
    expect(await loadImage('data:text/html;base64,AAAA')).toBeNull();
  });
  it('accepts a small base64 image data URL', async () => {
    const img = await loadImage('data:image/png;base64,iVBORw0KGgo=');
    expect(img?.mimeType).toBe('image/png');
  });
});
