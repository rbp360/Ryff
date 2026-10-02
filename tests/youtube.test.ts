import { describe, it, expect } from 'vitest';
import {
  extractYouTubeVideoId,
  cleanTranscriptText,
  fetchYouTubeTranscript,
  politeDelay,
} from '../src/lib/youtube';

describe('YouTube CC & Transcript Module', () => {
  describe('extractYouTubeVideoId', () => {
    it('extracts ID from standard watch URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=FVKF3HnExkg')).toBe('FVKF3HnExkg');
      expect(extractYouTubeVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from shortened youtu.be URL', () => {
      expect(extractYouTubeVideoId('https://youtu.be/FVKF3HnExkg')).toBe('FVKF3HnExkg');
      expect(extractYouTubeVideoId('http://youtu.be/dQw4w9WgXcQ?si=123')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from shorts URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/shorts/bYyQmUbJjE4')).toBe('bYyQmUbJjE4');
    });

    it('extracts ID from embed URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/embed/9J5uCDNS4-s')).toBe('9J5uCDNS4-s');
    });

    it('handles raw 11-character video ID', () => {
      expect(extractYouTubeVideoId('FVKF3HnExkg')).toBe('FVKF3HnExkg');
    });

    it('returns null for invalid or non-YouTube URLs', () => {
      expect(extractYouTubeVideoId('')).toBeNull();
      expect(extractYouTubeVideoId('https://guitarworld.com/news/123')).toBeNull();
      expect(extractYouTubeVideoId('not_a_valid_id')).toBeNull();
    });
  });

  describe('cleanTranscriptText', () => {
    it('decodes HTML entities and normalizes whitespace', () => {
      const input = 'This &amp; that &quot;tone&quot; isn&#39;t   bad &lt;loud&gt; \n and clean.';
      const expected = "This & that \"tone\" isn't bad <loud> and clean.";
      expect(cleanTranscriptText(input)).toBe(expected);
    });
  });

  describe('politeDelay', () => {
    it('resolves after specified milliseconds', async () => {
      const start = Date.now();
      await politeDelay(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  describe('fetchYouTubeTranscript fallback behavior', () => {
    it('returns null gracefully for invalid video URLs', async () => {
      const result = await fetchYouTubeTranscript('https://example.com/invalid');
      expect(result).toBeNull();
    });
  });
});
