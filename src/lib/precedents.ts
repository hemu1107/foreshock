import { z } from 'zod';
import type { Status } from './scoring';
import { publicUrl } from './pipeline';

export const precedentSchema = z.object({
  document_id: z.string(), case_title: z.string(), outlet: z.string(),
  first_reported_at: z.string().nullable(), sourcing: z.string(), deal_type: z.string(),
  outcome: z.string(), resolved: z.boolean(), days_to_resolution: z.number().int().nonnegative().nullable(),
  resolution_source: z.string().nullable(),
});
export type Precedent = z.infer<typeof precedentSchema>;
export const ledgerSearchArgs = (query: string) => ({ query, source: 'connectors' as const, match: 'any' as const, limit: 10 });
const OUTLET_ALIASES: Record<string, string> = { wsj: 'Wall Street Journal', 'the wall street journal': 'Wall Street Journal', ft: 'Financial Times', 'the information': 'The Information', nyt: 'New York Times', 'the new york times': 'New York Times' };
export const outletFullName = (outlet: string) => OUTLET_ALIASES[outlet.trim().toLowerCase()] ?? outlet.trim();
export function precedentQueries(claim: string, entities: string[], outlet?: string) {
  const company = (entities[0] || claim.split(/\s+(?:in talks|to acquire|buys|acquires|reportedly|may|plans)\b/i)[0] || '').trim();
  return [...new Set([outlet ? `${outletFullName(outlet)} acquire` : '', company ? `${company} acquire` : '', 'talks acquire outcome'].filter(Boolean))];
}
export function parseCase(markdown: string, documentId: string): Precedent | null {
  const lines = markdown.split(/\r?\n/).map(l => l.trim());
  const field = (prefix: string) => { const line = lines.find(l => l.toLowerCase().startsWith(prefix.toLowerCase())); return line ? line.slice(prefix.length).trim().replace(/^["']|["']$/g, '') : ''; };
  const title = field('# Case:');
  const outcome = field('outcome:');
  if (!title || !outcome) return null;
  const days = field('days_to_resolution:');
  const source = field('resolution_source:');
  const url = source.match(/\]\((https?:\/\/[^\s)]+)\)/)?.[1] ?? source;
  const word = outcome.toLowerCase();
  return { document_id: documentId, case_title: title, outlet: outletFullName(field('first_reported_by:')),
    first_reported_at: field('date:') || null, sourcing: field('sourcing:'), deal_type: field('deal_type:'),
    outcome, resolved: /^(true|yes|1)$/i.test(field('resolved:')) || word === 'confirmed' || word === 'denied',
    days_to_resolution: /^\d+$/.test(days) ? Number(days) : null,
    resolution_source: publicUrl(url) ? url : null };
}
export function precedentStatus(outcome: string): Status {
  switch (outcome.trim().toLowerCase()) {
    case 'confirmed': return 'Confirmed';
    case 'denied': return 'Denied';
    case 'went cold': case 'went_cold': return 'Went cold';
    case 'corroborated': return 'Corroborated';
    case 'rumor': return 'Rumor';
    default: return 'Whisper';
  }
}
export function precedentSummary(rows: Precedent[], outlet?: string) {
  const tally = (cases: Precedent[]) => ({ confirmed: cases.filter(c => c.outcome.trim().toLowerCase() === 'confirmed').length, total: cases.length });
  const matching = outlet ? rows.filter(c => outletFullName(c.outlet).toLowerCase() === outletFullName(outlet).toLowerCase()) : [];
  return { ...tally(rows), outlet: matching.length ? { name: outlet, ...tally(matching) } : null };
}