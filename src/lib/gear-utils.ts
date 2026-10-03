import { sanitiseUntrusted } from './guard';

/**
 * Cleanly formats brand and model for display without stutter or duplicate prefixes.
 */
export function formatGearTitle(
  brand?: string | null,
  model?: string | null,
  rawText?: string | null
): string {
  const b = (brand || '').trim();
  const m = (model || '').trim().replace(/^[:\s–—•·\-,;]+/, '').trim();
  if (!b && !m) return (rawText || '').replace(/^[:\s–—•·\-,;]+/, '').trim();
  if (!b) return m;
  if (!m) return b;
  if (m.toLowerCase() === b.toLowerCase()) return b;
  if (m.toLowerCase().startsWith(b.toLowerCase())) return m;
  return `${b} ${m}`;
}

/**
 * Strip common prefixes, punctuation, and leading/trailing colons from a gear text line.
 */
export function cleanGearText(input: string): {
  cleaned: string;
  isWant: boolean;
  budget_gbp: number | null;
} {
  let clean = sanitiseUntrusted(input.trim(), 200);

  // Detect want/looking for
  const isWant =
    /^(want|looking for|saving for|searching for|iso|wtb)\b/i.test(clean) ||
    /\b(want|looking for|wtb|iso)\b/i.test(clean) ||
    /under\s+[£$€]/i.test(clean) ||
    /budget\b/i.test(clean);

  // Extract budget if present
  let budget_gbp: number | null = null;
  const budgetMatch =
    clean.match(/(?:under\s+)?(?:£|\$|€|gbp\s*)(\d+)/i) ||
    clean.match(/(\d+)\s*(?:gbp|pounds|quid)/i);
  if (budgetMatch && budgetMatch[1]) {
    budget_gbp = parseInt(budgetMatch[1], 10);
  }

  // Remove budget phrases
  clean = clean.replace(/(?:under\s+)?(?:£|\$|€|gbp\s*)\d+/gi, '').replace(/\d+\s*(?:gbp|pounds|quid)/gi, '');

  // Repeatedly strip leading want/own prefix keywords and any colons/dashes/spaces
  let previous = '';
  while (previous !== clean) {
    previous = clean;
    clean = clean
      .replace(/^(want|looking for|saving for|searching for|iso|wtb|i have|i own)\b/i, '')
      .replace(/^[\s:–—•·\-,;]+/g, '')
      .replace(/[\s:–—•·\-,;]+$/g, '')
      .trim();
  }

  return { cleaned: clean, isWant, budget_gbp };
}
