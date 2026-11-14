import type { LiveTrace } from './live';
export const FEATURED_CLAIMS = ['Samsung in talks to acquire Modine', 'Netflix acquiring NBCUniversal', 'Netflix to acquire Warner Bros'] as const;
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['talks', 'acquire', 'acquiring', 'the', 'and'].includes(w));
/** Latest finished trace whose claim mentions every key name in the example. */
export function featuredTrace(example: string, traces: LiveTrace[]) {
  const keys = words(example);
  return traces.filter(t => t.stage === 'done' && keys.every(k => `${t.claim} ${t.query}`.toLowerCase().includes(k)))
    .sort((a, b) => b.checked_at.localeCompare(a.checked_at))[0] ?? null;
}
export function claimType(claim: string) {
  const c = claim.toLowerCase();
  if (/acqui|merge|buy|takeover|deal|bid/.test(c)) return 'M&A';
  if (/layoff|workforce|job cut/.test(c)) return 'Layoffs';
  if (/funding|raise|valuation|ipo/.test(c)) return 'Funding';
  if (/launch|release|product/.test(c)) return 'Product';
  return 'Business';
}
export function evidenceLabel(score: number) { return score >= 75 ? 'Strong evidence' : score >= 45 ? 'Moderate evidence' : 'Weak evidence'; }
export function bottomLine(summary: string) {
  const text = summary.replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim();
  const parts = text.split(/(?<=[a-z0-9)][.!?])\s+(?=[A-Z])/).filter(x => !/^(rules-based status|status|bottom line)\b[^.]*\.$/i.test(x.trim()) && !/assessment differs/i.test(x));
  const first = parts[0] ?? '';
  return first.length > 160 ? `${first.slice(0, 157)}…` : first;
}
const FICTIONAL = /northwind|helix vision|aster labs/i;
/** Hide leftover traces of the fictional demo companies from live lists. */
export const isRealTrace = (t: { claim: string }) => !FICTIONAL.test(t.claim);
